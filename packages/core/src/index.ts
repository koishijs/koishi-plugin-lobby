import { Computed, Context, Dict, h, Schema, Service, Session } from 'koishi'
import { Assert } from './assert'
import { Room } from './room'
import { Player } from './player'
import { Corridor } from './corridor'

export * from './corridor'
export * from './game'
export * from './player'
export * from './room'

declare module 'koishi' {
  interface Context {
    lobby: Lobby
  }
}

class Lobby extends Service {
  public assert = new Assert(this)
  public rooms: Dict<Room> = Object.create(null)
  public players: Dict<Player> = Object.create(null)
  public corridors: Dict<Corridor> = Object.create(null)

  constructor(ctx: Context, public config: Lobby.Config) {
    super(ctx, 'lobby', true)
    ctx.i18n.define('zh', require('./locales/zh-CN'))

    ctx.private().before('attach-user', (session, fields) => {
      fields.add('id')
    })

    ctx.private().middleware((session, next) => {
      const player = this.players[session.user['id']]
      if (player?.room.speech !== Room.SpeechMode.command) return next()
      const content = this._stripPrefix(session)
      if (!content) return next()
      return session.execute({
        name: 'talk',
        args: [content],
        session,
      })
    })

    ctx.private().command('game')

    const room = ctx.private().command('room')
      .userFields(['id', 'name', 'locale'])
      .action(({ session }) => {
        const player = this.assert.busy(session.user.id)
        return session.text('.overview', {
          ...player.room,
          players: Object.values(player.room.players).map(player => player.name).join(', '),
        })
      })

    room.subcommand('.create')
      .userFields(['id', 'name', 'locale'])
      .action(({ session }) => {
        this.assert.idle(session.user.id)
        const room = new Room(new Player(session))
        return session.text('.success', room)
      })

    room.subcommand('.join <id:number>')
      .userFields(['id', 'name', 'locale'])
      .action(({ session }, id) => {
        this.assert.idle(session.user.id)
        const room = this.assert.room(id)
        room.join(new Player(session))
      })

    room.subcommand('.leave')
      .userFields(['id', 'name'])
      .action(async ({ session }) => {
        const player = this.assert.busy(session.user.id)
        if (player.room.host !== player) {
          player.room.leave(player.id)
        } else if (Object.keys(player.room.players).length === 1) {
          player.room.destroy()
          return
        } else {
          const choices = Object
            .values(player.room.players)
            .map(({ name, id }) => id !== player.id ? [name, id] as const : null)
            .filter(Boolean)
          choices.unshift([session.text('commands.room.destroy.description'), null])
          await session.send(session.text('.transfer-or-destroy', [
            choices.map(([text], index) => `${index}. ${text}`).join('\n'),
          ]))
          const content = (await session.prompt())?.trim()
          const index = +content
          if (!(content && index in choices)) {
            return session.text('.timeout')
          } else if (!index) {
            player.room.destroy()
            return
          } else {
            player.room.transfer(choices[index][1], true)
          }
        }
        return session.text('.success')
      })

    room.subcommand('.kick [id:number]')
      .userFields(['id', 'name'])
      .action(({ session }, id) => {
        const player = this.assert.host(session.user.id)
        player.room.leave(id, player)
      })

    room.subcommand('.transfer [id:number]')
      .userFields(['id', 'name'])
      .action(({ session }, id) => {
        const player = this.assert.host(session.user.id)
        player.room.transfer(id)
      })

    room.subcommand('.destroy')
      .userFields(['id', 'name'])
      .action(({ session }) => {
        const player = this.assert.host(session.user.id)
        player.room.destroy()
      })

    room.subcommand('talk <content:text>')
      .userFields(['id', 'name'])
      .action(({ session }, content) => {
        const player = this.assert.busy(session.user.id)
        if (player.room.speech === Room.SpeechMode.disabled) {
          return session.text('.disabled')
        }
        player.talk(content)
      })
  }

  private _stripPrefix(session: Session) {
    const value = session.resolve(this.config.speech.prefix)
    const result = Array.isArray(value) ? value : [value || '']
    const content = session.parsed.content
    for (const prefix of result.map(source => h.escape(source))) {
      if (!content.startsWith(prefix)) continue
      return content.slice(prefix.length).trim()
    }
  }
}

namespace Lobby {
  export const using = ['database']

  export interface Config {
    speech: {
      prefix: Computed<string[]>
    }
  }

  export const Config: Schema<Config> = Schema.object({
    speech: Schema.object({
      prefix: Schema.computed(Schema.array(String).role('table')).default([':', '：']).description('带有此前缀的消息将被广播到房间内。'),
    }).description('聊天设置'),
  })
}

export default Lobby
