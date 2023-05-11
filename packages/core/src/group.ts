import { Fragment, h } from 'koishi'
import { Player } from './player'
import { Room } from './room'

export class Group {
  constructor(public room: Room, public predicate: (player: Player) => boolean, public silent = false) {}

  protected values() {
    return Object.values(this.room.players).filter(this.predicate)
  }

  filter(predicate: (player: Player) => boolean, silent = false) {
    return new Group(this.room, (player) => this.predicate(player) && predicate(player), silent)
  }

  async broadcast(content: Fragment, queued = true) {
    const message = h('', h.normalize(content))
    if (!this.silent) {
      this.room.messages.push(message)
      this.room.guests.forEach((guest) => guest.send(message, queued))
    }
    await Promise.all(this.values().map(({ player }) => {
      return player.send(message, queued)
    }))
  }
}
