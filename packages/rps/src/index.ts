import { Context, Schema } from 'koishi'
import { Corridor, Game } from 'koishi-plugin-lobby'

class RPSGame extends Game<RPSGame.Options> {
  round = 0
  finished = false

  async start() {
    while (!this.finished) {
      this.round++
      this.room.broadcast('lobby.game.rps.round', [this.round])
    }
  }
}

namespace RPSGame {
  export interface Options {
    rounds: number
  }
}

class RPSCorridor extends Corridor {
  constructor(ctx: Context, public config: RPSCorridor.Config) {
    super(ctx, 'rps')
    ctx.i18n.define('zh', require('./locales/zh-CN'))

    this.cmd.option('rounds', '-r <rounds:number>', { fallback: config.rounds })
  }
}

namespace RPSCorridor {
  export interface Config {
    rounds: number
  }

  export const Config: Schema<Config> = Schema.object({
    rounds: Schema.number().description('默认的获胜局数。').default(3),
  })
}

export default RPSCorridor
