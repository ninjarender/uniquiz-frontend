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
  const lastStatus = useRef<RoomStatus | null>(null);
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

  // Route on every room-status change (task 0058): first snapshot after a
  // (re)join, "play again" back to waiting, an out-of-band room_state - all
  // land on the screen the server state dictates. Same-status snapshots never
  // re-navigate, so in-game sub-screens (round/result) stay event-driven.
  useEffect(() => {
    if (!game.room) {
      lastStatus.current = null;
      return;
    }
    const status = game.room.status;
    if (lastStatus.current === status) return;
    lastStatus.current = status;
    // Only the player zone follows the snapshot; the host's projector (/live)
    // joins the room too but keeps its own screen (task 0055).
    const inPlayZone =
      location.pathname.startsWith('/play') || location.pathname.startsWith('/join');
    const target = SCREEN_BY_STATUS[status];
    if (inPlayZone && location.pathname !== target) navigate(target, { replace: true });
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
