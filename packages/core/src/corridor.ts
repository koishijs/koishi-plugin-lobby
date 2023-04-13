import { Command, Context } from 'koishi'
import { Game } from './game'

export abstract class Corridor {
  static using = ['lobby']

  abstract Game: typeof Game

  public cmd: Command

  constructor(private ctx: Context, public name: string) {
    this.cmd = ctx.command(`game/${name}`)
      .userFields(['id'])
      .action(async ({ session, options }) => {
        if (!ctx.lobby.players[session.user.id]) {
          await session.execute('room.create')
        }
        const player = ctx.lobby.assert.host(session.user.id)
        new this.Game(player.room, this, options)
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