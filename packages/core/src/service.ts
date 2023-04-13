import { Context } from 'koishi'

export abstract class GameService {
  static using = ['lobby']

  constructor(ctx: Context, name: string) {
    ctx.lobby.register(this)

    ctx.command(`game/${name}`)
  }
}
