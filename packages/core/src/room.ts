import { Dict, h, Logger, Random, SessionError } from 'koishi'
import { Player } from './player'
import { Game } from './game'
import Lobby from '.'

const logger = new Logger('lobby')

export interface Message {
  type: string
  param?: any[]
}

export class Room {
  id: string
  name: string
  lobby: Lobby
  players: Dict<Player> = Object.create(null)
  messages: Message[] = []
  game: Game
  speech: Room.SpeechMode = Room.SpeechMode.command

  constructor(public host: Player) {
    this.name = this.id = Random.id(6, 10)
    this.lobby = host.lobby
    this.lobby.rooms[this.id] = this
    logger.debug(`${this} created`)
    this._join(host)
  }

  broadcast(type: string, param = []) {
    const message: Message = { type, param }
    this.messages.push(message)
    for (const id in this.players) {
      this.players[id].send(h('i18n', { path: 'lobby.' + type }, param))
    }
    return message
  }

  listPlayers(ignoreHost = false) {
    return Object.values(this.players)
      .filter(player => !ignoreHost || player !== this.host)
      .map(({ name, id }) => `    ${id}. ${name}`)
      .join('\n')
  }

  getPlayers(ids: number[]) {
    const notFound: number[] = []
    const result: Player[] = []
    for (const id of ids) {
      const player = this.players[id]
      if (!player) {
        notFound.push(id)
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
    this.players[player.id] = player
  }

  join(player: Player) {
    this._join(player)
    this.broadcast('system.join', [player.name])
    logger.debug(`${player} joined ${this}`)
  }

  _leave(player: Player) {
    delete this.players[player.id]
    delete this.lobby.players[player.id]
    logger.debug(`${player} left ${this}`)
  }

  kick(ids: number[]) {
    const players = this.getPlayers(ids)
    for (const player of players) {
      this._leave(player)
      player.send(h('i18n', { path: 'lobby.system.kick-self' }, [this.host.name]))
    }
    this.broadcast('system.kick', [players.map(p => p.name).join(', '), this.host.name])
  }

  leave(player: Player) {
    this._leave(player)
    if (!Object.keys(this.players).length) {
      this.destroy()
    } else {
      this.broadcast('system.leave', [player.name])
    }
  }

  transfer(id: number, leave = false) {
    const oldHost = this.host
    this.host = this.getPlayers([id])[0]
    if (leave) {
      delete this.players[oldHost.id]
      delete this.lobby.players[oldHost.id]
      logger.debug(`${oldHost} left ${this}`)
      this.broadcast('system.leave-transfer', [this.host.name, oldHost.name])
    } else {
      this.broadcast('system.transfer', [this.host.name, oldHost.name])
    }
  }

  destroy() {
    this.broadcast('system.destroy')
    delete this.lobby.rooms[this.id]
    for (const id in this.players) {
      delete this.lobby.players[id]
    }
    logger.debug(`${this} destroyed`)
  }

  toString() {
    return `room ${this.id}`
  }
}

export namespace Room {
  export const enum SpeechMode {
    free,
    command,
    disabled,
  }
}
