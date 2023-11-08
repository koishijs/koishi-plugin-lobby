import { Command, Context } from 'koishi'
import { Game } from './game'

export abstract class Corridor {
  static inject = ['lobby']

  abstract factory: typeof Game<any>

  public cmd: Command

  constructor(private ctx: Context, public name: string) {
    this.cmd = ctx.command(`game/${name}`)
      .action(async ({ session, options }) => {
        if (!ctx.lobby.guests[session.cid]) {
          await session.execute('lobby.create')
        }
        const player = ctx.lobby.assert.host(session)
        Reflect.construct(this.factory, [player.room, this, options])
      })

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
