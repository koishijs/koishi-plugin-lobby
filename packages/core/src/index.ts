import { Context, Schema, Service } from 'koishi'
import { Game } from './game'

export * from './game'

declare module 'koishi' {
  interface Context {
    lobby: Lobby
  }
}

class Lobby extends Service {
  games: Game[]

  constructor(ctx: Context, public config: Lobby.Config) {
    super(ctx, 'lobby', true)
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
