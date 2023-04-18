import { Context, h, Schema } from 'koishi'
import { Corridor, Game, Player } from 'koishi-plugin-lobby'

class RPSGame extends Game<RPSGame.Options> {
  private round = 0

  async check() {
    if (Object.values(this.room.players).length !== 2) {
      throw new Error('lobby.game.rps.invalid-player-count')
    }
  }

  private formatChoice(choice: string) {
    return h('i18n', { path: `lobby.game.rps.choice.${choice}` })
  }

  private formatOutput(choice: string, name: string) {
    return choice
      ? h('i18n', { path: 'lobby.game.rps.output' }, [name, this.formatChoice(choice)])
      : h('i18n', { path: 'lobby.game.rps.timeout' }, [name])
  }

  async start() {
    const players = Object.values(this.room.players)
    const scores = new Map(players.map(p => [p, 0]))
    while (true) {
      await this.room.broadcast('game.rps.input', [++this.round])
      const results = await this.room.prompt(players, (session, player) => {
        const content = session.content.trim().toLowerCase()
        if (content.length !== 1 || !'rps'.includes(content)) return
        player.send(h('i18n', { path: 'lobby.game.rps.accepted' }, [this.formatChoice(content)]))
        return content
      }, 30000)
      const choices = players.map(p => results.get(p))
      const outputs = players.map(p => this.formatOutput(results.get(p), p.name))
      if (choices[0] === choices[1]) {
        const scoreText = h('i18n', { path: 'lobby.game.rps.score' }, [
          players[0].name, scores.get(players[0]) + '',
          players[1].name, scores.get(players[1]) + '',
        ])
        await this.room.broadcast('game.rps.result-0', [...outputs, scoreText])
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
        const scoreText = h('i18n', { path: 'lobby.game.rps.score' }, [
          players[0].name, scores.get(players[0]) + '',
          players[1].name, scores.get(players[1]) + '',
        ])
        await this.room.broadcast('game.rps.result-1', [...outputs, winner.name, scoreText])
        if (score >= this.options.rounds) {
          await this.room.broadcast('game.rps.finish', [winner.name])
          break
        }
      }
    }
  }
}

namespace RPSGame {
  export interface Options {
    rounds: number
  }
}

class RPSCorridor extends Corridor {
  factory = RPSGame

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
