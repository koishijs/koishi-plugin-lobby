import { Context, h, Logger, Schema } from 'koishi'
import { Corridor, Game, Player } from 'koishi-plugin-lobby'

const t = (path: string, param?: any) => h.i18n('lobby.game.rps.' + path, param)

const logger = new Logger('rps')

class RPSGame extends Game<RPSGame.Options> {
  private round: number
  private players: Player[]
  private scores: Map<Player, number>
  private winner: Player

  async validate() {
    if (this.room.size !== 2) {
      throw new Error('lobby.game.rps.invalid-player-count')
    }
  }

  leave(player: Player) {
    const index = this.players.indexOf(player)
    this.winner = this.players[1 - index]
    throw new Error('game over')
  }

  private formatChoice(choice: string) {
    return t(`choice.${choice}`)
  }

  private formatOutput(choice: string, name: string) {
    return choice
      ? t('output', [name, this.formatChoice(choice)])
      : t('timeout', [name])
  }

  async action() {
    ++this.round
    logger.debug('round %d', this.round)
    const choices = await Promise.all(this.players.map(async (player) => {
      await player.send(t('input', [this.round]))
      return player.select(['r', 'p', 's'], this.options.timeout)
    }))
    logger.debug('choices %o', choices)
    const outputs = this.players.map((p, i) => this.formatOutput(choices[i], p.name))
    if (choices[0] === choices[1]) {
      const scoreText = t('score', [
        this.players[0].name, this.scores.get(this.players[0]) + '',
        this.players[1].name, this.scores.get(this.players[1]) + '',
      ])
      await this.room.broadcast(t('result-0', [...outputs, scoreText]))
    } else {
      let winner: Player
      if (!choices[0]) {
        winner = this.players[1]
      } else if (!choices[1]) {
        winner = this.players[0]
      } else {
        winner = choices[0] === 'r' && choices[1] === 's'
          || choices[0] === 'p' && choices[1] === 'r'
          || choices[0] === 's' && choices[1] === 'p'
          ? this.players[0] : this.players[1]
      }
      const score = this.scores.get(winner) + 1
      this.scores.set(winner, score)
      const scoreText = t('score', [
        this.players[0].name, this.scores.get(this.players[0]) + '',
        this.players[1].name, this.scores.get(this.players[1]) + '',
      ])
      await this.room.broadcast(t('result-1', [...outputs, winner.name, scoreText]))
      if (score >= this.options.rounds) {
        throw new Error('game over')
      }
    }
  }

  async start() {
    this.round = 0
    this.winner = null
    this.players = Object.values(this.room.players)
    this.scores = new Map(this.players.map(p => [p, 0]))
    try {
      while (true) {
        await this.action()
      }
    } catch (e) {
      if (!this.winner) throw e
    }
    await this.room.broadcast(t('finish', [this.winner.name]))
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
    ctx.i18n.define('zh-CN', require('./locales/zh-CN'))

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
