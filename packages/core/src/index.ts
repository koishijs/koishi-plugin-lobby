import { Computed, Context, Dict, h, Schema, Service, Session } from 'koishi'
import {} from '@koishijs/plugin-help'
import { Assert } from './assert'
import { Room } from './room'
import { Player } from './player'
import { Corridor } from './corridor'
import { Guest, GuestChannel } from './guest'

export * from './corridor'
export * from './game'
export * from './group'
export * from './guest'
export * from './player'
export * from './room'

declare module 'koishi' {
  interface Context {
    lobby: Lobby
  }

  interface Events {
    'lobby/leave'(player: Player): void
  }
}

class Lobby extends Service {
  public assert = new Assert(this)
  public rooms: Dict<Room> = Object.create(null)
  public guests: Dict<Guest> = Object.create(null)
  public corridors: Dict<Corridor> = Object.create(null)

  constructor(public ctx: Context, public config: Lobby.Config) {
    super(ctx, 'lobby', true)
    ctx.i18n.define('zh', require('./locales/zh-CN'))

    ctx.private().before('attach-user', (session, fields) => {
      fields.add('id')
    })

    ctx.private().middleware((session, next) => {
      const player = this.guests[session.cid]
      if (!player) return next()
      let content = this._stripPrefix(session)
      if (session.quote) content += ' ' + session.quote.content
      if (!content) return next()
      return session.execute({
        name: 'talk',
        args: [content.trim()],
        session,
      })
    })

    ctx.private().command('game')

    ctx.command('lobby')

    ctx.command('lobby.list')
      .action(({ session }) => {
        const output = Object
          .values(this.rooms)
          .filter(room => !room.options.private)
          .sort((a, b) => b.id.localeCompare(a.id))
          .map(room => session.text('.room', room))
        if (output.length) {
          output.unshift(session.text('.header'))
        } else {
          output.push(session.text('.empty'))
        }
        output.push(session.text('.footer'))
        return output.join('\n')
      })

    ctx.private().command('lobby.room')
      .userFields(['id', 'name', 'locale'])
      .action(({ session }) => {
        const player = this.assert.busy(session)
        const output = [session.text('.overview', {
          id: player.room.id,
          host: player.room.host.name,
          players: player.room.listPlayers(),
        })]
        if (player.room.allowSpeech) {
          const prefix = this._resolvePrefix(session)?.[0]
          if (prefix) {
            output.push(session.text('.talk-prefix', [prefix]))
          } else {
            output.push(session.text('.talk-free'))
          }
        }
        return output.join('\n')
      })

    ctx.private().command('lobby.create')
      .userFields(['id', 'name', 'locale'])
      .option('capacity', '-c [count:number]', { fallback: 10 })
      .option('name', '-n [name:string]')
      .option('private', '-p')
      .option('private', '-P, --public', { value: false })
      .action(({ session, options }) => {
        this.assert.idle(session)
        const room = new Room(new Player(session), options)
        return session.text('.success', room)
      })

    ctx.private().command('lobby.config')
      .userFields(['id', 'name', 'locale'])
      .option('capacity', '-c [count:number]')
      .option('name', '-n [name:string]')
      .option('private', '-p')
      .option('private', '-P, --public', { value: false })
      .action(({ session, options }) => {
        const player = this.assert.host(session)
        Object.assign(player.room.options, options)
        return session.text('.success')
      })

    ctx.command('lobby.join <id:string>')
      .userFields(['name', 'locale'])
      .channelFields(['locale'])
      .action(({ session }, id) => {
        this.assert.idle(session)
        const room = this.assert.room(id)
        if (session.subtype === 'private') {
          if (room.locked) return session.text('.locked')
          if (room.size >= (room.options.capacity || Infinity)) {
            return session.text('.full')
          }
          room.join(new Player(session))
        } else {
          const guest = new GuestChannel(session)
          guest.room = room
          room.guests.add(guest)
          return session.text('.sync', [room.id])
        }
      })

    ctx.command('lobby.leave')
      .userFields(['id', 'name'])
      .action(async ({ session }) => {
        const player = this.assert.busy(session) as Player
        if (session.subtype !== 'private') {
          player.room.guests.delete(player)
          return
        }
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

    ctx.private().command('lobby.kick <...id:number>')
      .userFields(['id', 'name'])
      .action(({ session }, ...incs) => {
        const player = this.assert.host(session)
        if (!incs.length) return session.text('.expect-id')
        player.room.kick(incs)
      })

    ctx.private().command('lobby.transfer <id:number>')
      .userFields(['id', 'name'])
      .action(({ session }, inc) => {
        const player = this.assert.host(session)
        if (!inc) return session.text('.expect-id')
        player.room.transfer(inc)
      })

    ctx.private().command('lobby.destroy')
      .userFields(['id', 'name'])
      .action(({ session }) => {
        const player = this.assert.host(session)
        player.room.destroy()
      })

    ctx.private().command('lobby.start')
      .userFields(['id', 'name'])
      .action(({ session }) => {
        const player = this.assert.host(session)
        player.room.start()
      })

    ctx.private().command('lobby/talk <content:text>', { hidden: true })
      .userFields(['id', 'name'])
      .action(({ session }, content) => {
        if (!content) return session.text('.expect-content')
        const player = this.assert.busy(session) as Player
        if (!player.room.allowSpeech && !player.allowSpeech) {
          return session.text('.disabled')
        }
        const group = player.privateSpeech
          ? player.room.filter((player) => player.allowSpeech, true)
          : player.room
        return group.broadcast([
          h.i18n('lobby.speech.player', [player.name]),
          ...h.parse(content),
        ], false)
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
      return content.slice(prefix.length)
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
      message: Schema.number().default(200).description('发送消息后等待的时间 (毫秒)，用于防止消息顺序错乱。'),
    }).description('延迟设置'),
  })
}

export default Lobby
