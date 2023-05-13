import { Bot, Fragment, h, Session, sleep } from 'koishi'
import { Room } from './room'
import Lobby from '.'

export abstract class Guest {
  cid: string
  bot: Bot
  subtype: string
  platform: string
  userId: string
  channelId: string
  guildId: string
  locale: string
  lobby: Lobby
  room: Room

  private sendTask = Promise.resolve()

  constructor(session: Session) {
    this.bot = session.bot
    this.cid = session.cid
    this.subtype = session.subtype
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
    const session = this.bot.session({
      subtype: 'group',
      type: 'message',
      userId: this.userId,
      channelId: this.channelId,
      guildId: this.guildId,
      platform: this.platform,
      locale: this.locale,
      elements: h.normalize(content),
    })
    if (!queued) return this._send(session)
    return this.sendTask = this.sendTask.then(async () => {
      await this._send(session)
      await sleep(this.lobby.config.delay.message)
    })
  }
}

export class GuestChannel extends Guest {
  constructor(session: Session<never, 'locale'>) {
    super(session)
    this.locale = session.channel?.locale
  }
}
