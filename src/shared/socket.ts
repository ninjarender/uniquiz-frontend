import { io, Socket } from 'socket.io-client';
import { API_ORIGIN } from './api';
import type { ClientToServerEvents, ServerToClientEvents } from './ws-protocol';

/**
 * Socket.IO connection lifecycle (task 0051). Same origin story as REST: in
 * dev the Vite proxy forwards /socket.io (websocket included) to the NestJS
 * backend; for a split deploy VITE_API_URL points both REST and WS at the
 * backend origin. One lazy singleton per tab - the game uses a single
 * namespace, room isolation lives on the server.
 */

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: GameSocket | null = null;

/**
 * Returns the shared socket, creating it (without connecting) on first use -
 * listeners can be registered before the connection opens, and the teacher
 * zone never opens one at all.
 */
export function getSocket(): GameSocket {
  if (!socket) {
    // Built-in reconnection with backoff stays on; rejoin_room after a
    // reconnect is the provider's job (task 0053), not the transport's.
    const options = { autoConnect: false, transports: ['websocket', 'polling'] };
    socket = API_ORIGIN ? io(API_ORIGIN, options) : io(options);
  }
  return socket;
}

/** Opens the connection when entering the game flow (join/rejoin). */
export function connectSocket(): GameSocket {
  const shared = getSocket();
  if (shared.disconnected) shared.connect();
  return shared;
}

/** Tears the connection down (leaving the game entirely, task 0054). */
export function closeSocket(): void {
  if (!socket) return;
  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
}
