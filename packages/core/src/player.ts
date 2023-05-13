import { Awaitable, Fragment, h, Next, Session } from 'koishi'
import { Room } from './room'
import { Guest } from './guest'

export class Player extends Guest {
  inc: number
  name: string
  room: Room
  player = this
  allowSpeech: boolean
  privateSpeech: boolean

  constructor(session: Session<'name' | 'locale'>) {
    super(session)
    this.name = session.username
    this.locale = session.user?.locale
  }

  prompt<T = void>(callback: (session: Session, next: Next, done: (value: T) => void) => Awaitable<void | Fragment>, timeout: number, post = false) {
    return new Promise<T>((resolve) => {
      const dispose1 = this.lobby.ctx.middleware(async (session, next) => {
        if (session.subtype !== 'private') return next()
        if (session.userId !== this.userId || session.platform !== this.platform) return next()
        if (!post) return callback(session, next, done)
        return next((next) => callback(session, next, done))
      }, true)
      const dispose2 = this.lobby.ctx.setTimeout(() => done(undefined), timeout)
      const done = (value: T) => {
        resolve(value)
        dispose1()
        dispose2()
      }
    })
  }

  async pause(timeout: number, content?: Fragment, response?: boolean) {
    content = h.normalize(content)
    content.push(h('p', h.i18n('lobby.system.pause')))
    await this.send(content)
    const result = this.prompt<boolean>(async (session, next, done) => {
      return session.content ? done(true) : next()
    }, timeout, true)
    if (result && response) {
      await this.send(h.i18n('lobby.system.pause-response'))
    }
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
