import { Bot, Fragment, Session } from 'koishi'
import { Room } from './room'
import Lobby from '.'

export class Player {
  id: number
  name: string
  locale: string
  bot: Bot
  userId: string
  platform: string
  room: Room
  lobby: Lobby

  constructor(session: Session<'id' | 'name' | 'locale'>) {
    this.lobby = session.app.lobby
    this.name = session.username
    this.id = session.user.id
    this.locale = session.locale
    this.platform = session.platform
    this.userId = session.userId
    this.bot = session.bot
    this.lobby.players[this.id] = this
  }

  send(content: Fragment) {
    const session = this.bot.session({
      subtype: 'private',
      type: 'message',
      userId: this.userId,
      platform: this.platform,
      locale: this.locale,
    })
    return this.bot.sendPrivateMessage(this.userId, content, { session })
  }

  talk(content: string, type = 'player') {
    if (!content) return
    this.room.broadcast('talk.' + type, [content, this.name])
  }

  toString() {
    return `player ${this.name}`
  }
}
