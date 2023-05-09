import { h } from 'koishi'
import { Player } from './player'
import { Message, Room } from './room'
import { Future } from './future'

export class Group {
  constructor(public room: Room, public predicate: (player: Player) => boolean) {}

  private values() {
    return Object.values(this.room.players).filter(this.predicate)
  }

  async broadcast(type: string, param = []) {
    const message: Message = { type, param }
    this.room.messages.push(message)
    await Promise.all(this.values().map(({ player }) => {
      return player.send(h.i18n('lobby.' + type, param))
    }))
  }

  async confirm(timeout: number) {
    const task = new Future()
    task.timeout(timeout)
    for (const { player } of this.values()) {
      task.defer(player.middleware((session) => {
        if (session.content) task.done()
      }))
    }
    await task.execute()
  }
}
