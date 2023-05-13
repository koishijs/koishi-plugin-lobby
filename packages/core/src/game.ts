import { h } from 'koishi'
import { Room } from './room'
import { Corridor } from './corridor'
import { Player } from './player'

export abstract class Game<T = any> {
  constructor(public room: Room, public corridor: Corridor, public options: T) {
    room.game = this
    room.broadcast(h.i18n('lobby.system.game', [h.i18n(`commands.${corridor.name}.description`)]))
  }

  abstract leave(player: Player): void
  // abstract check(): Promise<void>
  abstract validate(): Promise<void>
  abstract start(): Promise<void>
}
