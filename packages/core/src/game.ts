import { Room } from './room'
import { Corridor } from './corridor'

export abstract class Game<T = any> {
  constructor(public room: Room, public corridor: Corridor, public options: T) {
    room.game = this
  }

  abstract start(): Promise<void>

  broadcast(type: string, param = []) {
    this.room.broadcast(`${this.corridor.name}.${type}`, param)
  }
}
