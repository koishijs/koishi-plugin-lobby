import { Logger, Random, SessionError } from 'koishi'
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
  // game: Game = null
  players: Player[] = []
  guests: Player[] = []
  messages: Message[] = []

  constructor(host: Player) {
    this.name = this.id = Random.id()
    this.lobby = host.lobby
    this.lobby.rooms[this.id] = this
    logger.debug(`${this} created`)
    this.join(host)
  }

  getPlayer(id: string) {
    return this.players.find(player => id === player.id)
  }

  validatePlayer(player: Player) {
    if (player.room && (player.room !== this || this.players.includes(player))) {
      return 'already-in-room'
    } else if (this.players.length >= this.options.capacity) {
      return 'fully-occupied'
    } else if (this.game) {
      return 'currently-gaming'
    }
  }

  private _join(player: Player) {
    player.room = this
  }

  join(player: Player) {
    const index = this.guests.indexOf(player)
    if (index >= 0) {
      this.guests.splice(index, 1)
    } else {
      this._join(player)
    }

    player.isReady = false
    this.players.push(player)
    this.messages.push({
      type: 'system.join',
      param: {
        target: player.name,
      },
    })
    logger.debug(`${player} joined ${this}`)
  }

  visit(player: Player) {
    this._join(player)
    this.guests.push(player)
    player.updateRoom()
  }

  private _leave(player: Player) {
    player.socket.leave(this.id)
    player.room = null
  }

  leave(player: Player, source?: Player) {
    this._leave(player)
    const index = this.players.indexOf(player)

    // guest
    if (index === -1) {
      const index = this.guests.indexOf(player)
      if (index >= 0) {
        this.guests.splice(index, 1)
      }
      return
    }

    logger.debug(`${player} left ${this}`)
    this.players.splice(index, 1)

    if (!this.players.length) {
      this.destroy()
      return
    }

    if (source) {
      this.messages.push({
        type: 'system.kick',
        param: {
          target: player.name,
          source: source.name,
        },
      })
    } else if (index === 0) {
      this.messages.push({
        type: 'system.leave-transfer',
        param: {
          source: player.name,
          target: this.players[0].name,
        },
      })
    } else {
      this.messages.push({
        type: 'system.leave',
        param: {
          target: player.name,
        },
      })
    }

    if (this.game && this.options.terminateOnLeave) {
      this.messages.push({
        type: 'system.terminated',
        param: {
          id: this.game.id,
        },
      })
      this.game.dispose()
      this.game = null
      this.players.forEach(player => player.emit('game-end'))
      this.guests.forEach(player => player.emit('game-end'))
      logger.debug(`game in ${this} was terminated`)
    }
  }

  transfer(id: number) {
    const oldHost = this.players[0]
    const index = this.players.findIndex(player => id === player.id)
    if (index <= 0) throw new SessionError('lobby.player-not-found', [id])
    const [host] = this.players.splice(index, 1)
    this.players.unshift(host)
    this.messages.push({
      type: 'system.transfer',
      param: {
        target: host.name,
        source: oldHost.name,
      },
    })
  }

  destroy() {
    delete this.lobby.rooms[this.id]
    this.players.forEach(p => this._leave(p))
    this.guests.forEach(p => this._leave(p))
    logger.debug(`${this} destroyed`)
  }

  chat(player: Player, content: string, type = 'player') {
    if (!content) return
    this.messages.push({
      type: 'chat.' + type,
      param: {
        content,
        source: player.name,
      },
    })
  }

  message(type: string, param = {}) {
    const message: Message = { type, param }
    this.messages.push(message)
    return message
  }

  async startGame() {
    this.game = new Game(this)

    const meta = {
      id: this.game.id,
    }

    this.message('system.start', meta)
    logger.debug(`game in ${this} was started`)
    try {
      await this.game.start()
      this.message('system.end', meta)
      logger.debug(`game in ${this} was finished`)
    } catch (error) {
      logger.debug(this, 'encounted an error:\n', error.stack)
      logger.debug(`game in ${this} was terminated`)
      this.message('system.terminated', meta)
      this.players.forEach(player => player.emit('game-end'))
      this.guests.forEach(player => player.emit('game-end'))
    }
    this.game.dispose()
    this.game = null
  }

  toString() {
    return `room ${this.id}`
  }
}
