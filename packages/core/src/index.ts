import { Context, Dict, Schema, Service, SessionError } from 'koishi'
import { Game } from './game'
import { Room } from './room'
import { Player } from './player'

export * from './game'
export * from './player'
export * from './room'

declare module 'koishi' {
  interface Context {
    lobby: Lobby
  }
}

class Lobby extends Service {
  games: Game[]
  players: Dict<Player> = Object.create(null)
  rooms: Dict<Room> = Object.create(null)

  constructor(ctx: Context, public config: Lobby.Config) {
    super(ctx, 'lobby', true)
    ctx.i18n.define('zh', require('./locales/zh-CN'))

    ctx.private().command('lobby')
    const room = ctx.private().command('room')

    room.subcommand('.create')
      .userFields(['id', 'name'])
      .action(({ session }) => {
        this.assertIdle(session.user.id)
        const room = new Room(new Player(session))
        return session.text('.success', room)
      })

    room.subcommand('.join <id:number>')
      .userFields(['id', 'name'])
      .action(({ session }, id) => {
        this.assertIdle(session.user.id)
        const room = this.rooms[id]
        if (!room) return session.text('lobby.assert.room-not-found', [id])
        room.join(new Player(session))
        return session.text('.success', room)
      })

    room.subcommand('.leave')
      .userFields(['id', 'name'])
      .action(({ session }) => {
        const player = this.assertBusy(session.user.id)
        player.room.leave(player.id)
        return session.text('.success')
      })

    room.subcommand('.kick [id:number]')
      .userFields(['id', 'name'])
      .action(({ session }, id) => {
        const player = this.assertBusy(session.user.id)
        player.room.leave(id, player)
        return session.text('.success')
      })

    room.subcommand('.transfer [id:number]')
      .userFields(['id', 'name'])
      .action(({ session }, id) => {
        const player = this.assertBusy(session.user.id)
        player.room.transfer(id)
        return session.text('.success')
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

  register(game: Game) {
    this.games.push(game)
  }
}

namespace Lobby {
  export const using = ['database']

  export interface Config {}

  export const Config: Schema<Config> = Schema.object({})
}

export default Lobby
