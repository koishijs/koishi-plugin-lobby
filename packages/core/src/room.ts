import { Dict, Logger, Random, SessionError } from 'koishi'
import { Player } from './player'
import Lobby from '.'

const logger = new Logger('lobby')

export interface Message<T = any> {
  type: string
  param?: T
}

export class Room {
  id: string
  name: string
  lobby: Lobby
  players: Dict<Player> = Object.create(null)
  messages: Message[] = []

  constructor(public host: Player) {
    this.name = this.id = Random.id(6, 10)
    this.lobby = host.lobby
    this.lobby.rooms[this.id] = this
    logger.debug(`${this} created`)
    this.join(host)
  }

  message(type: string, param = {}) {
    const message: Message = { type, param }
    this.messages.push(message)
    return message
  }

  getPlayer(id: number) {
    const player = this.players[id]
    if (!player) throw new SessionError('lobby.assert.player-not-found', [id])
    return player
  }

  join(player: Player) {
    player.room = this
    this.players[player.id] = player
    this.message('system.join', {
      target: player.name,
    })
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
      this.message('system.kick', {
        target: player.name,
        source: source.name,
      })
    } else {
      this.message('system.leave', {
        target: player.name,
      })
    }
  }

  transfer(id: number, leave = false) {
    const oldHost = this.host
    this.host = this.getPlayer(id)
    if (leave) {
      oldHost.room = null
      delete this.players[oldHost.id]
      logger.debug(`${oldHost} left ${this}`)
      this.message('system.leave-transfer', {
        target: this.host.name,
        source: oldHost.name,
      })
    } else {
      this.message('system.transfer', {
        target: this.host.name,
        source: oldHost.name,
      })
    }
  }

  destroy() {
    delete this.lobby.rooms[this.id]
    for (const id in this.players) {
      delete this.lobby.players[id]
    }
    logger.debug(`${this} destroyed`)
  }

  chat(player: Player, content: string, type = 'player') {
    if (!content) return
    this.message('chat.' + type, {
      content,
      source: player.name,
    })
  }

  toString() {
    return `room ${this.id}`
  }
}
