import { Context, Dict, Schema, Service, SessionError } from 'koishi'
import { Room } from './room'
import { Player } from './player'
import { GameService } from './service'

export * from './game'
export * from './player'
export * from './room'
export * from './service'

declare module 'koishi' {
  interface Context {
    lobby: Lobby
  }
}

class Lobby extends Service {
  games: GameService[]
  players: Dict<Player> = Object.create(null)
  rooms: Dict<Room> = Object.create(null)

  constructor(ctx: Context, public config: Lobby.Config) {
    super(ctx, 'lobby', true)
    ctx.i18n.define('zh', require('./locales/zh-CN'))

    ctx.private().command('game')

    const room = ctx.private().command('room')
      .userFields(['id', 'name', 'locale'])
      .action(({ session }) => {
        const player = this.assertBusy(session.user.id)
        return session.text('.overview', {
          ...player.room,
          players: Object.values(player.room.players).map(player => player.name).join(', '),
        })
      })

    room.subcommand('.create')
      .userFields(['id', 'name', 'locale'])
      .action(({ session }) => {
        this.assertIdle(session.user.id)
        const room = new Room(new Player(session))
        return session.text('.success', room)
      })

    room.subcommand('.join <id:number>')
      .userFields(['id', 'name', 'locale'])
      .action(({ session }, id) => {
        this.assertIdle(session.user.id)
        const room = this.rooms[id]
        if (!room) return session.text('lobby.assert.room-not-found', [id])
        room.join(new Player(session))
      })

    room.subcommand('.leave')
      .userFields(['id', 'name'])
      .action(async ({ session }) => {
        const player = this.assertBusy(session.user.id)
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
        const player = this.assertHost(session.user.id)
        player.room.leave(id, player)
      })

    room.subcommand('.transfer [id:number]')
      .userFields(['id', 'name'])
      .action(({ session }, id) => {
        const player = this.assertHost(session.user.id)
        player.room.transfer(id)
      })

    room.subcommand('.destroy')
      .userFields(['id', 'name'])
      .action(({ session }) => {
        const player = this.assertHost(session.user.id)
        player.room.destroy()
      })
  }

  assertIdle(id: number) {
    const player = this.players[id]
    if (player) throw new SessionError('lobby.assert.already-in-room', player.room)
  }

  assertBusy(id: number) {
    const player = this.players[id]
    if (!player) throw new SessionError('lobby.assert.not-in-room')
    return player
  }

  assertHost(id: number) {
    const player = this.assertBusy(id)
    if (player.room.host !== player) throw new SessionError('lobby.assert.expect-host')
    return player
  }

  register(game: GameService) {
    this.games.push(game)
  }
}

namespace Lobby {
  export const using = ['database']

  export interface Config {}

  export const Config: Schema<Config> = Schema.object({})
}

export default Lobby
