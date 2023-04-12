import { Bot, Session } from 'koishi'
import { Room } from './room'
import Lobby from '.'

export class Player {
  id: number
  name: string
  bot: Bot
  userId: string
  platform: string
  room: Room = null
  lobby: Lobby

  constructor(session: Session<'id' | 'name'>) {
    this.lobby = session.app.lobby
    this.name = session.username
    this.id = session.user.id
    this.platform = session.platform
    this.userId = session.userId
    this.bot = session.bot
  }

  toString() {
    return `player ${this.name}`
  }
}
