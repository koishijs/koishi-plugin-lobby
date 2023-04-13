import { Room } from './room'

export abstract class Game<T> {
  constructor(public room: Room, public options: T) {
  }
}
