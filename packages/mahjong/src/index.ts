import { Context, Random, Schema } from 'koishi'
import { Corridor, Game, Player } from 'koishi-plugin-lobby'

interface Card {
  suit: string
  point: number
}

class Character {
  hands: Card[] = []
  discards: Card[] = []
}

class MahjongGame extends Game<MahjongGame.Options> {
  seats: number[]
  wall: Card[]
  characters: Map<Player, Character>
  seat: number

  async check() {
    if (Object.values(this.room.players).length !== 4) {
      throw new Error('lobby.game.mahjong.invalid-player-count')
    }
  }

  draw(offset: number) {
    const player = this.room.players[this.seats[(this.seat + offset) % 4]]
    this.characters.get(player).hands.push(this.wall.pop())
  }

  async start() {
    this.characters = new Map(Object.values(this.room.players).map(player => [player, new Character()] as const))
    this.seats = Random.shuffle([0, 1, 2, 3])
    for (this.seat = 0; this.seat < 4; this.seat++) {
      this.wall = Random.shuffle('mmmmppppssss'.split('')
        .map(suit => Array(9).fill(0).map<Card>((_, point) => ({ suit, point: point + 1 })))
        .flat())
      for (let i = 0; i < 13; i++) {
        for (let j = 0; j < 4; j++) {
          this.draw(j)
        }
      }
      this.draw(0)
    }
  }
}

namespace MahjongGame {
  export interface Options {
    'timeout.mingpai': number
    'timeout.dingque': number
    'timeout.huanpai': number
    'timeout.chupai': number
  }
}

class MahjongCorridor extends Corridor {
  factory = MahjongGame

  constructor(ctx: Context, public config: MahjongCorridor.Config) {
    super(ctx, 'mahjong')
    ctx.i18n.define('zh', require('./locales/zh-CN'))

    this.cmd.option('timeout.mingpai', '', { fallback: config.timeout.mingpai })
    this.cmd.option('timeout.dingque', '', { fallback: config.timeout.dingque })
    this.cmd.option('timeout.huanpai', '', { fallback: config.timeout.huanpai })
    this.cmd.option('timeout.chupai', '', { fallback: config.timeout.chupai })
  }
}

namespace MahjongCorridor {
  export interface Timeout {
    mingpai: number
    dingque: number
    huanpai: number
    chupai: number
  }

  export const Timeout: Schema<Timeout> = Schema.object({
    mingpai: Schema.number().description('鸣牌 (吃碰杠和) 限时。').default(30000),
    dingque: Schema.number().description('定缺限时。').default(30000),
    huanpai: Schema.number().description('换牌限时。').default(30000),
    chupai: Schema.number().description('出牌限时。').default(30000),
  }).description('限时设置')

  export interface Config {
    timeout: Timeout
  }

  export const Config: Schema<Config> = Schema.object({
    timeout: Timeout,
  })
}

export default MahjongCorridor
