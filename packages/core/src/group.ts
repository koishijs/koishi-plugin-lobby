import { h } from 'koishi'
import { Player } from './player'
import { Message, Room } from './room'

export class Group {
  constructor(public room: Room, public predicate: (player: Player) => boolean) {}

  protected values() {
    return Object.values(this.room.players).filter(this.predicate)
  }

  filter(predicate: (player: Player) => boolean) {
    return new Group(this.room, (player) => this.predicate(player) && predicate(player))
  }

  async broadcast(type: string, param = []) {
    const message: Message = { type, param }
    this.room.messages.push(message)
    await Promise.all(this.values().map(({ player }) => {
      return player.send(h.i18n('lobby.' + type, param))
    }))
  }
}
