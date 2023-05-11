import { Bot, Fragment, h, Session, sleep } from 'koishi'
import Lobby from '.'

export abstract class Guest {
  bot: Bot
  subtype: string
  platform: string
  userId: string
  channelId: string
  guildId: string
  locale: string
  lobby: Lobby

  private sendTask = Promise.resolve()

  constructor(session: Session) {
    this.bot = session.bot
    this.subtype = session.subtype
    this.platform = session.platform
    this.userId = session.userId
    this.channelId = session.channelId
    this.guildId = session.guildId
    this.lobby = session.app.lobby
  }

  abstract _send(session: Session): Promise<any>

  flush() {
    return this.sendTask
  }

  send(content: Fragment) {
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

  _send(session: Session) {
    return this.bot.sendMessage(session.channelId, session.elements, session.guildId, { session })
  }
}
