import { Context, h, Schema } from 'koishi'
import { Corridor, Game, Player } from 'koishi-plugin-lobby'

const t = (path: string, param?: any) => h.i18n('lobby.game.rps.' + path, param)

class RPSGame extends Game<RPSGame.Options> {
  private round: number

  async check() {
    if (this.room.size !== 2) {
      throw new Error('lobby.game.rps.invalid-player-count')
    }
  }

  private formatChoice(choice: string) {
    return t(`choice.${choice}`)
  }

  private formatOutput(choice: string, name: string) {
    return choice
      ? t('output', [name, this.formatChoice(choice)])
      : t('timeout', [name])
  }

  async start() {
    this.round = 0
    const players = Object.values(this.room.players)
    const scores = new Map(players.map(p => [p, 0]))
    while (true) {
      await this.room.broadcast(t('input', [++this.round]))
      const choices = await Promise.all(players.map((player) => {
        return player.select(['R', 'P', 'S'], this.options.timeout)
      }))
      const outputs = players.map((p, i) => this.formatOutput(choices[i], p.name))
      if (choices[0] === choices[1]) {
        const scoreText = t('score', [
          players[0].name, scores.get(players[0]) + '',
          players[1].name, scores.get(players[1]) + '',
        ])
        await this.room.broadcast(t('result-0', [...outputs, scoreText]))
      } else {
        let winner: Player
        if (!choices[0]) {
          winner = players[1]
        } else if (!choices[1]) {
          winner = players[0]
        } else {
          winner = choices[0] === 'r' && choices[1] === 's'
            || choices[0] === 'p' && choices[1] === 'r'
            || choices[0] === 's' && choices[1] === 'p'
            ? players[0] : players[1]
        }
        const score = scores.get(winner) + 1
        scores.set(winner, score)
        const scoreText = t('score', [
          players[0].name, scores.get(players[0]) + '',
          players[1].name, scores.get(players[1]) + '',
        ])
        await this.room.broadcast(t('result-1', [...outputs, winner.name, scoreText]))
        if (score >= this.options.rounds) {
          await this.room.broadcast(t('finish', [winner.name]))
          break
        }
      }
    }
  }
}

namespace RPSGame {
  export interface Options {
    rounds: number
    timeout: number
  }
}

class RPSCorridor extends Corridor {
  factory = RPSGame

  constructor(ctx: Context, public config: RPSCorridor.Config) {
    super(ctx, 'rps')
    ctx.i18n.define('zh', require('./locales/zh-CN'))

    this.cmd.option('rounds', '-r <rounds:number>', { fallback: config.rounds })
    this.cmd.option('timeout', '-t <timeout:number>', { fallback: config.timeout })
  }
}

namespace RPSCorridor {
  export interface Config {
    rounds: number
    timeout: number
  }

  export const Config: Schema<Config> = Schema.object({
    rounds: Schema.number().description('默认的获胜局数。').default(3),
    timeout: Schema.number().description('默认的出招限时。').default(30000),
  })
}

export default RPSCorridor
