import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { closeSocket, connectSocket, getSocket } from './socket';
import type {
  ActiveQuestion,
  GameOverPayload,
  GameStartedPayload,
  JoinRoomPayload,
  RoomState,
  RoundResultPayload,
  ServerToClientEvents,
  SubmitAnswerPayload,
  WsErrorPayload,
} from './ws-protocol';

/**
 * Real game state over the typed WS layer (task 0051) - the replacement for
 * DemoGameProvider. Holds the room snapshot as the server reports it and
 * exposes protocol actions; screens (tasks 0052-0070) read state from here
 * and never touch the socket directly.
 */

/* Player session survives a tab reload for rejoin_room (task 0053). */
const sessionKey = (roomId: string) => `uniquiz.playerSession.${roomId}`;

export interface PlayerSession {
  playerId: string;
  resumeToken: string;
}

export function savePlayerSession(roomId: string, session: PlayerSession): void {
  sessionStorage.setItem(sessionKey(roomId), JSON.stringify(session));
}
export function getPlayerSession(roomId: string): PlayerSession | null {
  const raw = sessionStorage.getItem(sessionKey(roomId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return null;
  }
}
export function clearPlayerSession(roomId: string): void {
  sessionStorage.removeItem(sessionKey(roomId));
}

/**
 * error handling contract (mechanism here, full code->UI map in task 0070):
 * the screen that initiated an event may register an interceptor and return
 * true to consume the error; anything unconsumed falls through to onError.
 */
export type WsErrorInterceptor = (error: WsErrorPayload) => boolean;

interface GameContextValue {
  /** Server snapshot; null until join_ack / room_state arrives. */
  room: RoomState | null;
  /** Own playerId from join_ack (or the restored session). */
  playerId: string | null;
  /** Socket transport state - for "reconnecting..." UI. */
  connected: boolean;
  gameStarted: GameStartedPayload | null;
  currentQuestion: ActiveQuestion | null;
  lastRoundResult: RoundResultPayload | null;
  gameOver: GameOverPayload | null;
  /** Last unconsumed protocol error (task 0070 maps codes to UI actions). */
  lastError: WsErrorPayload | null;

  join: (payload: JoinRoomPayload) => void;
  rejoin: (roomId: string) => boolean;
  leave: () => void;
  startGame: () => void;
  submitAnswer: (payload: SubmitAnswerPayload) => void;
  syncTime: () => void;
  /** Registers a screen-local error interceptor; returns unsubscribe. */
  interceptErrors: (interceptor: WsErrorInterceptor) => () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [gameStarted, setGameStarted] = useState<GameStartedPayload | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ActiveQuestion | null>(null);
  const [lastRoundResult, setLastRoundResult] = useState<RoundResultPayload | null>(null);
  const [gameOver, setGameOver] = useState<GameOverPayload | null>(null);
  const [lastError, setLastError] = useState<WsErrorPayload | null>(null);
  const interceptors = useRef<WsErrorInterceptor[]>([]);

  useEffect(() => {
    const socket = getSocket();
    setConnected(socket.connected);

    const handlers: { [E in keyof ServerToClientEvents]?: ServerToClientEvents[E] } = {
      join_ack: ({ playerId: id, resumeToken, room: snapshot }) => {
        savePlayerSession(snapshot.roomId, { playerId: id, resumeToken });
        setPlayerId(id);
        setRoom(snapshot);
        setCurrentQuestion(snapshot.currentQuestion ?? null);
      },
      room_state: (snapshot) => {
        setRoom(snapshot);
        setCurrentQuestion(snapshot.currentQuestion ?? null);
        if (snapshot.status === 'waiting') {
          // "Play again" and lobby-restore both mean a fresh game.
          setGameStarted(null);
          setLastRoundResult(null);
          setGameOver(null);
        }
      },
      player_joined: ({ player }) => {
        setRoom((previous) =>
          previous && !previous.players.some((p) => p.id === player.id)
            ? { ...previous, players: [...previous.players, player] }
            : previous,
        );
      },
      player_left: ({ playerId: id }) => {
        setRoom((previous) =>
          previous
            ? { ...previous, players: previous.players.filter((p) => p.id !== id) }
            : previous,
        );
      },
      player_connection: ({ playerId: id, connected: isOnline }) => {
        setRoom((previous) =>
          previous
            ? {
                ...previous,
                players: previous.players.map((p) =>
                  p.id === id ? { ...p, connected: isOnline } : p,
                ),
              }
            : previous,
        );
      },
      settings_updated: ({ settings }) => {
        setRoom((previous) => (previous ? { ...previous, settings } : previous));
      },
      host_changed: ({ playerId: id }) => {
        setRoom((previous) =>
          previous
            ? {
                ...previous,
                players: previous.players.map((p) => ({ ...p, isHost: p.id === id })),
              }
            : previous,
        );
      },
      game_started: (payload) => {
        setGameStarted(payload);
        setLastRoundResult(null);
        setGameOver(null);
        setRoom((previous) =>
          previous ? { ...previous, status: 'in_game', players: payload.players } : previous,
        );
      },
      question_started: (question) => {
        setCurrentQuestion(question);
      },
      round_result: (payload) => {
        setLastRoundResult(payload);
        setRoom((previous) =>
          previous ? { ...previous, leaderboard: payload.leaderboard } : previous,
        );
      },
      game_over: (payload) => {
        setGameOver(payload);
        setCurrentQuestion(null);
        setRoom((previous) =>
          previous
            ? { ...previous, status: 'finished', leaderboard: payload.leaderboard }
            : previous,
        );
      },
      error: (payload) => {
        // Last registered interceptor wins - the active screen sits on top.
        for (let i = interceptors.current.length - 1; i >= 0; i -= 1) {
          if (interceptors.current[i](payload)) return;
        }
        setLastError(payload);
      },
    };

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    for (const [event, handler] of Object.entries(handlers)) {
      socket.on(event as keyof ServerToClientEvents, handler as never);
    }
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      for (const [event, handler] of Object.entries(handlers)) {
        socket.off(event as keyof ServerToClientEvents, handler as never);
      }
    };
  }, []);

  const join = useCallback((payload: JoinRoomPayload) => {
    connectSocket().emit('join_room', payload);
  }, []);

  /** Fires rejoin_room from the stored session; false when there is none. */
  const rejoin = useCallback((roomId: string): boolean => {
    const session = getPlayerSession(roomId);
    if (!session) return false;
    setPlayerId(session.playerId);
    connectSocket().emit('rejoin_room', { roomId, ...session });
    return true;
  }, []);

  const leave = useCallback(() => {
    const roomId = room?.roomId;
    getSocket().emit('leave_room');
    if (roomId) clearPlayerSession(roomId);
    setRoom(null);
    setPlayerId(null);
    setGameStarted(null);
    setCurrentQuestion(null);
    setLastRoundResult(null);
    setGameOver(null);
    setLastError(null);
    closeSocket();
  }, [room?.roomId]);

  const startGame = useCallback(() => {
    getSocket().emit('start_game');
  }, []);

  const submitAnswer = useCallback((payload: SubmitAnswerPayload) => {
    getSocket().emit('submit_answer', payload);
  }, []);

  const syncTime = useCallback(() => {
    getSocket().emit('sync_time');
  }, []);

  const interceptErrors = useCallback((interceptor: WsErrorInterceptor) => {
    interceptors.current.push(interceptor);
    return () => {
      interceptors.current = interceptors.current.filter((i) => i !== interceptor);
    };
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      room,
      playerId,
      connected,
      gameStarted,
      currentQuestion,
      lastRoundResult,
      gameOver,
      lastError,
      join,
      rejoin,
      leave,
      startGame,
      submitAnswer,
      syncTime,
      interceptErrors,
    }),
    [room, playerId, connected, gameStarted, currentQuestion, lastRoundResult, gameOver, lastError, join, rejoin, leave, startGame, submitAnswer, syncTime, interceptErrors],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame outside GameProvider');
  return context;
}
