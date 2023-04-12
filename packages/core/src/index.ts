import { Command, Context, Dict, Schema, Service } from 'koishi'
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
  cmd: Command

  constructor(ctx: Context, public config: Lobby.Config) {
    super(ctx, 'lobby', true)
    this.cmd = ctx.private().command('lobby')

    this.cmd.subcommand('.create')
      .userFields(['id', 'name'])
      .action(({ session }) => {
        let player = this.players[session.user.id]
        if (player) return session.text('lobby.already-in-room', player.room)
        player = new Player(session)
        const room = new Room(player)
        return session.text('.success', room)
      })

    this.cmd.subcommand('.join <id:number>')
      .userFields(['id', 'name'])
      .action(({ session }, id) => {
        const player = this.players[session.user.id]
        if (player) return session.text('lobby.already-in-room', player.room)
        const room = this.rooms[id]
        if (!room) return session.text('lobby.room-not-found', [id])
        room.join(player)
        return session.text('.success', room)
      })

    this.cmd.subcommand('.leave')
      .userFields(['id', 'name'])
      .action(({ session }) => {
        const player = this.players[session.user.id]
        if (player) return session.text('lobby.not-in-room')
        player.room.leave(player.id)
        return session.text('.success')
      })

    this.cmd.subcommand('.kick [id:number]')
      .userFields(['id', 'name'])
      .action(({ session }, id) => {
        const player = this.players[session.user.id]
        if (player) return session.text('lobby.not-in-room')
        player.room.leave(id, player)
        return session.text('.success')
      })

    this.cmd.subcommand('.transfer [id:number]')
      .userFields(['id', 'name'])
      .action(({ session }, id) => {
        const player = this.players[session.user.id]
        if (player) return session.text('lobby.not-in-room')
        player.room.transfer(id)
        return session.text('.success')
      })
  }

  register(game: Game) {
    this.games.push(game)
  }
}

namespace Lobby {
  export interface Config {}

  export const Config: Schema<Config> = Schema.object({})
}

export default Lobby
