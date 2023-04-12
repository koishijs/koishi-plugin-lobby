import { Context } from 'koishi'

export class Game {
  static using = ['lobby']

  constructor(ctx: Context, name: string) {
    ctx.lobby.register(this)

    ctx.command(`lobby/${name}`)
  }
}
