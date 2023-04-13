import { Room } from './room'
import { Corridor } from './corridor'

export abstract class Game<T> {
  constructor(public room: Room, public corridor: Corridor, public options: T) {
  }

  broadcast(type: string, param = []) {
    this.room.broadcast(`${this.corridor.name}.${type}`, param)
  }
}
