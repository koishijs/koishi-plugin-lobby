import { Bot, Context, Fragment, h, Session, sleep } from 'koishi'
import { Room } from './room'
import Lobby from '.'

export abstract class Guest {
  cid: string
  bot: Bot<Context>
  isDirect: boolean
  platform: string
  userId: string
  channelId: string
  guildId: string
  locales: string[]
  lobby: Lobby
  room: Room

  private sendTask = Promise.resolve()

  constructor(session: Session) {
    this.bot = session.bot
    this.cid = session.cid
    this.isDirect = session.isDirect
    this.platform = session.platform
    this.userId = session.userId
    this.channelId = session.channelId
    this.guildId = session.guildId
    this.lobby = session.app.lobby
    this.lobby.guests[this.cid] = this
  }

  private async _send(session: Session) {
    await this.bot.sendMessage(session.channelId, session.elements, session.guildId, { session })
  }

  flush() {
    return this.sendTask
  }

  send(content: Fragment, queued = true) {
    const session = this.bot.session()
    session.type = 'message'
    session.userId = this.userId
    session.channelId = this.channelId
    session.guildId = this.guildId
    session.platform = this.platform
    session.locales = this.locales
    session.elements = h.normalize(content)
    session.isDirect = false
    if (!queued) return this._send(session)
    return this.sendTask = this.sendTask.then(async () => {
      await this._send(session)
      await sleep(this.lobby.config.delay.message)
    })
  }
}

export class GuestChannel extends Guest {
  constructor(session: Session<never, 'locales'>) {
    super(session)
    this.locales = session.channel?.locales
  }
}
