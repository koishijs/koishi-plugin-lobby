import { Fragment, h } from 'koishi'
import { Player } from './player'
import { Room } from './room'

export class Group {
  constructor(public room: Room, public predicate: (player: Player) => boolean, public silent = false) {}

  protected values() {
    return Object.values(this.room.players).filter(this.predicate)
  }

  filter(predicate: (player: Player) => boolean) {
    return new Group(this.room, (player) => this.predicate(player) && predicate(player))
  }

  async broadcast(content: Fragment) {
    const message = h('', h.normalize(content))
    if (!this.silent) this.room.messages.push(message)
    await Promise.all(this.values().map(({ player }) => {
      return player.send(message)
    }))
  }
}
