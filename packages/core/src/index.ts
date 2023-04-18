import { Computed, Context, Dict, h, Schema, Service, Session } from 'koishi'
import {} from '@koishijs/plugin-help'
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

  constructor(public ctx: Context, public config: Lobby.Config) {
    super(ctx, 'lobby', true)
    ctx.i18n.define('zh', require('./locales/zh-CN'))

    ctx.private().before('attach-user', (session, fields) => {
      fields.add('id')
    })

    ctx.private().middleware((session, next) => {
      const player = this.players[session.user['id']]
      if (player?.room.speech === Room.SpeechMode.disabled) return next()
      const content = this._stripPrefix(session)
      if (!content) return next()
      return session.execute({
        name: 'talk',
        args: [content],
        session,
      })
    })

    ctx.private().command('game')

    const cmd = ctx.private().command('lobby')

    cmd.subcommand('.room')
      .userFields(['id', 'name', 'locale'])
      .action(({ session }) => {
        const player = this.assert.busy(session.user.id)
        const output = [session.text('.overview', {
          id: player.room.id,
          host: player.room.host.name,
          players: player.room.listPlayers(),
        })]
        if (player.room.speech !== Room.SpeechMode.disabled) {
          const prefix = this._resolvePrefix(session)?.[0]
          if (prefix) {
            output.push(session.text('.talk-prefix', [prefix]))
          } else {
            output.push(session.text('.talk-free'))
          }
        }
        return output.join('\n')
      })

    cmd.subcommand('.create')
      .userFields(['id', 'name', 'locale'])
      .option('capacity', '-c [count:number]')
      .action(({ session, options }) => {
        this.assert.idle(session.user.id)
        const room = new Room(new Player(session), options)
        return session.text('.success', room)
      })

    cmd.subcommand('.config')
      .userFields(['id', 'name', 'locale'])
      .option('capacity', '-c [count:number]')
      .action(({ session, options }) => {
        const player = this.assert.host(session.user.id)
        Object.assign(player.room.options, options)
        return session.text('.success')
      })

    cmd.subcommand('.join <id:string>')
      .userFields(['id', 'name', 'locale'])
      .action(({ session }, id) => {
        this.assert.idle(session.user.id)
        const room = this.assert.room(id)
        if (room.size >= (room.options.capacity || Infinity)) {
          return session.text('.full')
        }
        room.join(new Player(session))
      })

    cmd.subcommand('.leave')
      .userFields(['id', 'name'])
      .action(async ({ session }) => {
        const player = this.assert.busy(session.user.id)
        if (player.room.host !== player) {
          player.room.leave(player)
        } else if (player.room.size === 1) {
          player.room.destroy()
          return
        } else {
          await session.send(session.text('.transfer-or-destroy', {
            players: player.room.listPlayers(true),
          }))
          const content = (await session.prompt())?.trim()
          const index = +content
          if (!(content && index !== player.inc && (!index || index in player.room.players))) {
            return session.text('.timeout')
          } else if (!index) {
            player.room.destroy()
            return
          } else {
            player.room.transfer(index, true)
          }
        }
        return session.text('.success')
      })

    cmd.subcommand('.kick <...id:number>')
      .userFields(['id', 'name'])
      .action(({ session }, ...incs) => {
        const player = this.assert.host(session.user.id)
        if (!incs.length) return session.text('.expect-id')
        player.room.kick(incs)
      })

    cmd.subcommand('.transfer <id:number>')
      .userFields(['id', 'name'])
      .action(({ session }, inc) => {
        const player = this.assert.host(session.user.id)
        if (!inc) return session.text('.expect-id')
        player.room.transfer(inc)
      })

    cmd.subcommand('.destroy')
      .userFields(['id', 'name'])
      .action(({ session }) => {
        const player = this.assert.host(session.user.id)
        player.room.destroy()
      })

    cmd.subcommand('.start')
      .userFields(['id', 'name'])
      .action(({ session }) => {
        const player = this.assert.host(session.user.id)
        player.room.start()
      })

    cmd.subcommand('talk <content:text>', { hidden: true })
      .userFields(['id', 'name'])
      .action(({ session }, content) => {
        const player = this.assert.busy(session.user.id)
        if (player.room.speech === Room.SpeechMode.disabled) {
          return session.text('.disabled')
        }
        player.talk(content)
      })
  }

  private _resolvePrefix(session: Session) {
    const value = session.resolve(this.config.speech.prefix)
    const result = Array.isArray(value) ? value : [value || '']
    return result.map(source => h.escape(source))
  }

  private _stripPrefix(session: Session) {
    const content = session.parsed.content
    for (const prefix of this._resolvePrefix(session)) {
      if (!content.startsWith(prefix)) continue
      return content.slice(prefix.length).trim()
    }
  }
}

namespace Lobby {
  export const using = ['database']

  export interface Config {
    speech?: {
      prefix?: Computed<string[]>
    }
    delay?: {
      message?: number
    }
  }

  export const Config: Schema<Config> = Schema.object({
    speech: Schema.object({
      prefix: Schema.computed(Schema.array(String).role('table')).default([':', '：']).description('带有此前缀的消息将被广播到房间内。'),
    }).description('聊天设置'),
    delay: Schema.object({
      message: Schema.number().default(100).description('发送消息后等待的时间 (毫秒)，用于防止消息顺序错乱。'),
    }).description('延迟设置'),
  })
}

export default Lobby
