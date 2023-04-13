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
  speech: Room.SpeechMode = Room.SpeechMode.free

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

  getPlayer(id: number) {
    const player = this.players[id]
    if (!player) throw new SessionError('lobby.exception.player-not-found', [id])
    return player
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

  leave(id: number, source?: Player) {
    const player = this.getPlayer(id)
    delete this.players[player.id]
    delete this.lobby.players[player.id]
    logger.debug(`${player} left ${this}`)

    if (!Object.keys(this.players).length) {
      this.destroy()
      return
    }

    if (source) {
      this.broadcast('system.kick', [player.name, source.name])
      player.send(h('i18n', { path: 'lobby.system.kick-self' }, [source.name]))
    } else {
      this.broadcast('system.leave', [player.name])
    }
  }

  transfer(id: number, leave = false) {
    const oldHost = this.host
    this.host = this.getPlayer(id)
    if (leave) {
      oldHost.room = null
      delete this.players[oldHost.id]
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
