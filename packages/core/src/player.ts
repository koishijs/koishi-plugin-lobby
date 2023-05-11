import { Awaitable, Fragment, h, Next, Session } from 'koishi'
import { Room } from './room'
import { Guest } from './guest'

export class Player extends Guest {
  id: number
  inc: number
  name: string
  room: Room
  player = this
  allowSpeech: boolean

  constructor(session: Session<'id' | 'name' | 'locale'>) {
    super(session)
    this.name = session.username
    this.id = session.user.id
    this.locale = session.user?.locale
    this.lobby.players[this.id] = this
  }

  _send(session: Session) {
    return this.bot.sendPrivateMessage(session.userId, session.elements, { session })
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
      const content = session.content.trim().toLowerCase()
      if (!['y', 'n'].includes(content)) return next()
      done(content === 'Y')
    }, timeout)
  }

  select(choices: string[], timeout: number) {
    return this.prompt<string>(async (session, next, done) => {
      const content = session.content.trim().toLowerCase()
      if (!choices.includes(content)) return next()
      done(content)
    }, timeout)
  }

  toString() {
    return `player ${this.name}`
  }
}
