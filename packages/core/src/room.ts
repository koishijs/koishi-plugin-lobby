import { Dict, h, Logger, Random, Session, SessionError } from 'koishi'
import { Player } from './player'
import { Game } from './game'
import { Future } from './future'
import Lobby from '.'
import { Group } from './group'

const logger = new Logger('lobby')

export interface Message {
  type: string
  param: any[]
}

export class Room extends Group {
  private inc = 0

  id: string
  name: string
  lobby: Lobby
  players: Dict<Player> = Object.create(null)
  messages: Message[] = []
  game: Game
  speech: Room.SpeechMode = Room.SpeechMode.command

  constructor(public host: Player, public options: Room.Options) {
    super(null, () => true)
    this.room = this
    this.name = this.id = Random.id(6, 10)
    this.lobby = host.lobby
    this.lobby.rooms[this.id] = this
    logger.debug(`${this} created`)
    this._join(host)
  }

  group(predicate: (player: Player) => boolean) {
    return new Group(this, predicate)
  }

  task() {
    return new Future()
  }

  async prompt<T>(players: Player[], accept: (session: Session, player: Player) => T, timeout: number) {
    const result = new Map<Player, T>()
    const task = new Future()
    task.timeout(timeout)
    for (const player of players) {
      task.defer(player.middleware((session, next) => {
        const content = accept(session, player)
        if (!content) return next()
        result.set(player, content)
        if (result.size === players.length) task.done()
      }))
    }
    await task.execute()
    return result
  }

  get size() {
    return Object.keys(this.players).length
  }

  get status(): Room.Status {
    return this.game ? 'playing' : 'waiting'
  }

  listPlayers(ignoreHost = false) {
    return Object.values(this.players)
      .filter(player => !ignoreHost || player !== this.host)
      .map(({ name, inc }) => `    ${inc}. ${name}`)
      .join('\n')
  }

  getByInc(incs: number[]) {
    const notFound: number[] = []
    const result: Player[] = []
    for (const inc of incs) {
      const player = this.players[inc]
      if (!player) {
        notFound.push(inc)
      } else if (player === this.host) {
        throw new SessionError('lobby.exception.target-host')
      } else {
        result.push(player)
      }
    }
    if (!notFound.length) return result
    throw new SessionError('lobby.exception.player-not-found', [notFound.join(', ')])
  }

  _join(player: Player) {
    player.room = this
    player.inc = ++this.inc
    this.players[player.inc] = player
  }

  join(player: Player) {
    this._join(player)
    this.broadcast('system.join', [player.name])
    logger.debug(`${player} joined ${this}`)
  }

  _leave(player: Player) {
    delete this.players[player.inc]
    delete this.lobby.players[player.id]
    logger.debug(`${player} left ${this}`)
  }

  kick(ids: number[]) {
    const players = this.getByInc(ids)
    for (const player of players) {
      this._leave(player)
      player.send(h.i18n('lobby.system.kick-self', [this.host.name]))
    }
    this.broadcast('system.kick', [players.map(p => p.name).join(', '), this.host.name])
  }

  leave(player: Player) {
    this._leave(player)
    if (!this.size) {
      this.destroy()
    } else {
      this.broadcast('system.leave', [player.name])
    }
  }

  transfer(id: number, leave = false) {
    const oldHost = this.host
    this.host = this.getByInc([id])[0]
    if (leave) {
      this._leave(oldHost)
      this.broadcast('system.leave-transfer', [this.host.name, oldHost.name])
    } else {
      this.broadcast('system.transfer', [this.host.name, oldHost.name])
    }
  }

  destroy() {
    this.broadcast('system.destroy')
    delete this.lobby.rooms[this.id]
    for (const player of Object.values(this.players)) {
      delete this.lobby.players[player.inc]
    }
    logger.debug(`${this} destroyed`)
  }

  async start() {
    if (!this.game) throw new SessionError('lobby.exception.game-not-found')
    await this.game.check()
    await this.broadcast('system.confirm')
    const result = await this.prompt(Object.values(this.players), (session) => {
      return session.content.trim()
    }, 60000)
    if (result.size !== this.size) {
      return this.broadcast('system.cancel')
    }
    await this.broadcast('system.start')
    logger.debug(`game in ${this} was started`)
    try {
      await this.game.start()
      logger.debug(`game in ${this} was finished`)
    } catch (error) {
      logger.debug(`game in ${this} was terminated`)
      logger.debug(error.stack)
      await this.broadcast('system.terminated')
    }
  }

  toString() {
    return `room ${this.id}`
  }
}

export namespace Room {
  export type Status = 'playing' | 'waiting'

  export const enum SpeechMode {
    free,
    command,
    disabled,
  }

  export interface Options {
    capacity?: number
    private?: boolean
  }
}
