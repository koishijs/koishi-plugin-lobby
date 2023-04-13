import { Command, Context } from 'koishi'

export abstract class Corridor {
  static using = ['lobby']

  public cmd: Command

  constructor(private ctx: Context, public name: string) {
    this.cmd = ctx.command(`game/${name}`)

    ctx.on('ready', () => this.start())
    ctx.on('dispose', () => this.stop())
  }

  start() {
    this.ctx.lobby.corridors[this.name] = this
  }

  stop() {
    delete this.ctx.lobby.corridors[this.name]
  }
}
