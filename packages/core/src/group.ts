import { h } from 'koishi'
import { Player } from './player'
import { Message, Room } from './room'
import { Task } from './task'

export class Group {
  constructor(public room: Room, public getPlayers: () => Player[]) {}

  async broadcast(type: string, param = []) {
    const message: Message = { type, param }
    this.room.messages.push(message)
    await Promise.all(this.getPlayers().map(player => {
      return player.send(h.i18n('lobby.' + type, param))
    }))
  }

  async confirm(timeout: number) {
    const task = new Task()
    task.timeout(timeout)
    for (const player of this.getPlayers()) {
      task.defer(player.prompt((session) => {
        if (session.content) task.done()
      }))
    }
    await task.execute()
  }
}
