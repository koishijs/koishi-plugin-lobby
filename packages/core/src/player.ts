import { Awaitable, Bot, Fragment, h, Next, Session, sleep } from 'koishi'
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

  prompt<T = void>(callback: (session: Session, next: Next, done: (value: T) => void) => Awaitable<void | Fragment>, timeout: number) {
    return new Promise<T>((resolve) => {
      const dispose1 = this.lobby.ctx.middleware(async (session, next) => {
        if (session.subtype !== 'private') return next()
        if (session.userId !== this.userId || session.platform !== this.platform) return next()
        return callback(session, next, done)
      }, true)
      const dispose2 = this.lobby.ctx.setTimeout(() => done(undefined), timeout)
      const done = (value: T) => {
        resolve(value)
        dispose1()
        dispose2()
      }
    })
  }

  async pause(timeout: number, content?: Fragment, override = false) {
    content = h.normalize(content)
    if (!override) content.push(h('p', h.i18n('lobby.system.pause')))
    await this.send(content)
    return this.prompt<boolean>(async (session, next, done) => {
      return session.content ? done(true) : next()
    }, timeout)
  }

  async confirm(timeout: number, content?: Fragment, override = false) {
    content = h.normalize(content)
    if (!override) content.push(h('p', h.i18n('lobby.system.confirm')))
    await this.send(content)
    return this.prompt<boolean>(async (session, next, done) => {
      const content = session.content.trim().toUpperCase()
      if (!['Y', 'N'].includes(content)) return next()
      done(content === 'Y')
    }, timeout)
  }

  select(choices: string[], timeout: number) {
    return this.prompt<string>(async (session, next, done) => {
      const content = session.content.trim().toUpperCase()
      if (!choices.includes(content)) return next()
      done(content)
    }, timeout)
  }

  toString() {
    return `player ${this.name}`
  }
}
