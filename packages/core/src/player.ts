import { Bot, Fragment, Middleware, Session, sleep } from 'koishi'
import { Room } from './room'
import Lobby from '.'

export class Player {
  id: number
  inc: number
  name: string
  locale: string
  bot: Bot
  userId: string
  platform: string
  room: Room
  lobby: Lobby
  player = this

  private sendTask = Promise.resolve()

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

  flush() {
    return this.sendTask
  }

  send(content: Fragment) {
    const session = this.bot.session({
      subtype: 'private',
      type: 'message',
      userId: this.userId,
      platform: this.platform,
      locale: this.locale,
    })
    return this.sendTask = this.sendTask.then(async () => {
      await this.bot.sendPrivateMessage(this.userId, content, { session })
      await sleep(this.lobby.config.delay.message)
    })
  }

  middleware(middleware: Middleware) {
    return this.lobby.ctx.middleware((session, next) => {
      if (session.subtype !== 'private') return next()
      if (session.userId !== this.userId || session.platform !== this.platform) return next()
      return middleware(session, next)
    }, true)
  }

  toString() {
    return `player ${this.name}`
  }
}
