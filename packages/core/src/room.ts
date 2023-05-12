import { Dict, h, Logger, Random, SessionError } from 'koishi'
import { Player } from './player'
import { Game } from './game'
import { Group } from './group'
import { Guest } from './guest'
import Lobby from '.'

const logger = new Logger('lobby')

const t = (path: string, param?: any) => h.i18n('lobby.system.' + path, param)

export class Room extends Group {
  private inc = 0

  id: string
  name: string
  lobby: Lobby
  guests = new Set<Guest>()
  players: Dict<Player> = Object.create(null)
  messages: h[] = []
  game: Game
  allowSpeech = true
  locked = false

  constructor(public host: Player, public options: Room.Options) {
    super(null, () => true)
    this.room = this
    this.name = this.id = Random.id(6, 10)
    this.lobby = host.lobby
    this.lobby.rooms[this.id] = this
    logger.debug(`${this} created`)
    this._join(host)
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
    this.broadcast(t('join', [player.name]))
    logger.debug(`${player} joined ${this}`)
  }

  _leave(player: Player) {
    delete this.players[player.inc]
    delete this.lobby.guests[player.cid]
    logger.debug(`${player} left ${this}`)
  }

  kick(ids: number[]) {
    const players = this.getByInc(ids)
    for (const player of players) {
      this._leave(player)
      player.send(t('kick-self', [this.host.name]))
    }
    this.broadcast(t('kick', [players.map(p => p.name).join(', '), this.host.name]))
  }

  leave(player: Player) {
    this._leave(player)
    if (!this.size) {
      this.destroy()
    } else {
      this.broadcast(t('leave', [player.name]))
    }
  }

  transfer(id: number, leave = false) {
    const oldHost = this.host
    this.host = this.getByInc([id])[0]
    if (leave) {
      this._leave(oldHost)
      this.broadcast(t('leave-transfer', [this.host.name, oldHost.name]))
    } else {
      this.broadcast(t('transfer', [this.host.name, oldHost.name]))
    }
  }

  destroy() {
    this.broadcast(t('destroy'))
    delete this.lobby.rooms[this.id]
    for (const player of Object.values(this.players)) {
      delete this.lobby.guests[player.inc]
    }
    logger.debug(`${this} destroyed`)
  }

  async start() {
    if (!this.game) throw new SessionError('lobby.exception.game-not-found')
    await this.game.check()
    const results = await Promise.all(this.values().map((player) => {
      return player.pause(600000, t('ready'), true)
    }))
    if (!results.every(Boolean)) {
      return this.broadcast(t('cancel'))
    }
    logger.debug(`game in ${this} was started`)
    const oldAllowSpeech = this.allowSpeech
    const oldLocked = this.locked
    try {
      this.locked = true
      await this.game.start()
      logger.debug(`game in ${this} was finished`)
    } catch (error) {
      logger.debug(`game in ${this} was terminated`)
      logger.debug(error.stack)
      await this.broadcast(t('terminated'))
    } finally {
      this.allowSpeech = oldAllowSpeech
      this.locked = oldLocked
    }
  }

  toString() {
    return `room ${this.id}`
  }
}

export namespace Room {
  export type Status = 'playing' | 'waiting'

  export interface Options {
    capacity?: number
    private?: boolean
  }
}
