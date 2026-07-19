import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { clearPlayerSession, findStoredSession, useGame } from '../../shared/game';
import type { RoomStatus } from '../../shared/api';

const SCREEN_BY_STATUS: Record<RoomStatus, string> = {
  waiting: '/play/lobby',
  in_game: '/play/round',
  finished: '/play/final',
};

/**
 * Session restore glue (task 0053), mounted once inside the router.
 * A tab reload in the play zone with a stored playerId + resumeToken fires
 * rejoin_room silently; the first server snapshot after a (re)join routes to
 * the screen the room dictates - not to whatever the local history says.
 * Transport-level reconnects rejoin inside GameProvider without navigation.
 */
export function GameResume() {
  const game = useGame();
  const navigate = useNavigate();
  const location = useLocation();
  const hadRoom = useRef(false);
  const resumeRoomId = useRef<string | null>(null);

  useEffect(() => {
    if (game.room || !location.pathname.startsWith('/play')) return;
    const stored = findStoredSession();
    if (stored) {
      resumeRoomId.current = stored.roomId;
      game.rejoin(stored.roomId);
    }
    // Mount-only: later room changes are handled by the routing effect below.
  }, []);

  // The room appeared (join_ack or restored room_state) -> route by status.
  useEffect(() => {
    if (!game.room) {
      hadRoom.current = false;
      return;
    }
    if (hadRoom.current) return;
    hadRoom.current = true;
    const target = SCREEN_BY_STATUS[game.room.status];
    if (location.pathname !== target) navigate(target, { replace: true });
  }, [game.room]);

  // A dead resumeToken means the seat is gone: clean up, back to joining.
  useEffect(() => {
    return game.interceptErrors((wsError) => {
      if (wsError.code !== 'invalid_resume_token') return false;
      const roomId = game.room?.roomId ?? resumeRoomId.current;
      if (roomId) {
        clearPlayerSession(roomId);
        navigate(`/join/${roomId}`, { replace: true });
      } else {
        navigate('/play', { replace: true });
      }
      return true;
    });
  }, [game.interceptErrors, game.room?.roomId, navigate]);

  return null;
}
