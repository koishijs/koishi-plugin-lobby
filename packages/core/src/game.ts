import { Room } from './room'
import { Corridor } from './corridor'

export abstract class Game<T = any> {
  constructor(public room: Room, public corridor: Corridor, public options: T) {
    room.game = this
  }

  abstract check(): Promise<void>

  abstract start(): Promise<void>
}
