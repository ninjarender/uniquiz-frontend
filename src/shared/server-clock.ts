import type { GameSocket } from './socket';

/**
 * Server-clock offset estimation over sync_time / sync_time_ack (task 0057).
 * offset = serverTime - local midpoint of the request (RTT/2 correction);
 * serverNow() is what round deadlines are compared against, so every player
 * counts down to the same server-side round close regardless of local clocks.
 */

/** Local clock drift beyond this asks the server for a fresh sync (protocol ~500ms). */
export const DRIFT_THRESHOLD_MS = 500;

let offsetMs = 0;
let pendingSentAt: number | null = null;

/** Current time in the server's clock frame (Unix ms). */
export function serverNow(): number {
  return Date.now() + offsetMs;
}

/** Fires sync_time recording the send moment for the RTT/2 correction. */
export function requestTimeSync(socket: GameSocket): void {
  pendingSentAt = Date.now();
  socket.emit('sync_time');
}

/** Feeds sync_time_ack back into the offset estimate. */
export function applyTimeSyncAck(serverTime: number): void {
  if (pendingSentAt === null) return;
  const receivedAt = Date.now();
  offsetMs = serverTime - (pendingSentAt + receivedAt) / 2;
  pendingSentAt = null;
}

/**
 * Drift check against a server-computed remaining time (rejoin snapshots):
 * the snapshot says the round ends at questionStartTime + elapsed + remaining;
 * if our serverNow() disagrees by more than the threshold, re-sync.
 */
export function driftExceeded(expectedServerNow: number): boolean {
  return Math.abs(serverNow() - expectedServerNow) > DRIFT_THRESHOLD_MS;
}
