import { SessionError } from 'koishi'
import Lobby from '.'

export class Assert {
  constructor(private lobby: Lobby) {}

  room(id: string) {
    const room = this.lobby.rooms[id]
    if (!room) throw new SessionError('lobby.exception.room-not-found', [id])
    return room
  }

  idle(id: number) {
    const player = this.lobby.players[id]
    if (player) throw new SessionError('lobby.exception.already-in-room', player.room)
  }

  busy(id: number) {
    const player = this.lobby.players[id]
    if (!player) throw new SessionError('lobby.exception.not-in-room')
    return player
  }

  host(id: number) {
    const player = this.busy(id)
    if (player.room.host !== player) throw new SessionError('lobby.exception.expect-host')
    return player
  }
}
