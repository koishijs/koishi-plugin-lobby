import { Awaitable, Fragment, h, Next, Session } from 'koishi'
import { Guest } from './guest'

export class Player extends Guest {
  inc: number
  name: string
  player = this
  allowSpeech: boolean
  privateSpeech: boolean

  constructor(session: Session<'name' | 'locales'>) {
    super(session)
    this.name = session.username
    this.locales = session.user?.locales
  }

  prompt<T = void>(callback: (session: Session, next: Next, done: (value: T) => void) => Awaitable<void | Fragment>, timeout: number, post = false) {
    return new Promise<T>((resolve, reject) => {
      const dispose1 = this.lobby.ctx.middleware(async (session, next) => {
        if (!session.isDirect) return next()
        if (session.userId !== this.userId || session.platform !== this.platform) return next()
        if (!post) return callback(session, next, done)
        return next((next) => callback(session, next, done))
      }, true)
      const dispose2 = this.lobby.ctx.setTimeout(() => done(undefined), timeout)
      const dispose3 = this.lobby.ctx.on('lobby/leave', (player) => {
        if (player.room !== this.room) return
        try {
          this.room.game?.leave(player)
        } catch (error) {
          reject(error)
          dispose()
        }
      })
      const dispose = () => {
        dispose1()
        dispose2()
        dispose3()
      }
      const done = (value: T) => {
        resolve(value)
        dispose()
      }
    })
  }

  async pause(timeout: number, content?: Fragment, response?: boolean) {
    content = h.normalize(content)
    content.push(h('p', h.i18n('lobby.system.pause')))
    await this.send(content)
    const result = await this.prompt<boolean>(async (session, next, done) => {
      return session.content ? done(true) : next()
    }, timeout, true)
    if (result && response) {
      await this.send(h.i18n('lobby.system.pause-response'))
    }
    return result
  }

  async confirm(timeout: number, content?: Fragment, override = false) {
    content = h.normalize(content)
    if (!override) content.push(h('p', h.i18n('lobby.system.confirm')))
    await this.send(content)
    return this.prompt<boolean>(async (session, next, done) => {
      const content = session.content.trim().toLowerCase()
      if (!['y', 'n'].includes(content)) return next()
      done(content === 'y')
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
