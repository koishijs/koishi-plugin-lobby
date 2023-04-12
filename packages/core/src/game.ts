import { Context } from 'koishi'

export class Game {
  static using = ['lobby']

  constructor(ctx: Context) {
    ctx.lobby.register(this)
  }
}
