import { Session, SessionError } from 'koishi'
import Lobby from '.'

export class Assert {
  constructor(private lobby: Lobby) {}

  room(id: string) {
    const room = this.lobby.rooms[id]
    if (!room) throw new SessionError('lobby.exception.room-not-found', [id])
    return room
  }

  idle(session: Session) {
    const player = this.lobby.guests[session.cid]
    if (!player) return
    if (player.subtype === 'private') {
      throw new SessionError('lobby.exception.busy-1', player.room)
    } else {
      throw new SessionError('lobby.exception.busy-2', player.room)
    }
  }

  busy(session: Session) {
    const player = this.lobby.guests[session.cid]
    if (!player) throw new SessionError('lobby.exception.not-in-room')
    return player
  }

  host(session: Session) {
    const player = this.busy(session)
    if (player.room.host !== player) throw new SessionError('lobby.exception.expect-host')
    return player
  }
}
