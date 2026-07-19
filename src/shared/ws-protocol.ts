import type { LeaderboardEntry, RoomSettings, RoomStatus } from './api';

/**
 * Typed Socket.IO protocol (asyncapi.yaml, tasks 0051-0070). Event names are
 * snake_case per contract. The backend replies with dedicated events
 * (join_ack, submit_answer_ack, sync_time_ack, room_state) rather than
 * Socket.IO ack callbacks, so client->server emits carry payloads only.
 * Shared REST/WS schemas (RoomSettings, RoomStatus, LeaderboardEntry) come
 * from api.ts to keep a single source per schema.
 */

/* ---------- shared entities ---------- */

export interface Player {
  id: string;
  nickname: string;
  isHost?: boolean;
  connected?: boolean;
}

/** Question snapshot a player sees: no correctIndex/isTrap by design. */
export interface GameQuestionPublic {
  index: number;
  text: string;
  /** Exactly 4 options. */
  options: string[];
  imageUrl?: string;
  timeLimitSeconds: number;
}

export interface ActiveQuestion extends GameQuestionPublic {
  gameId: string;
  /** Unix ms of question start; the client counts down locally from it. */
  questionStartTime: number;
  /** Present only in a mid-round reconnect snapshot. */
  remainingSeconds?: number;
}

/** Full snapshot to restore the UI at any stage (lobby / round / final). */
export interface RoomState {
  roomId: string;
  status: RoomStatus;
  settings: RoomSettings;
  bankName: string;
  players: Player[];
  currentQuestion?: ActiveQuestion;
  leaderboard?: LeaderboardEntry[];
}

/* ---------- client -> server payloads ---------- */

export interface JoinRoomPayload {
  roomId: string;
  nickname: string;
  /** Room creator's secret from POST /rooms; its match gives isHost=true. */
  hostToken?: string;
}

export interface RejoinRoomPayload {
  roomId: string;
  playerId: string;
  resumeToken: string;
}

export interface SubmitAnswerPayload {
  gameId: string;
  questionIndex: number;
  selectedOptionIndex: number;
  /** true - the client auto-sent the last picked option on timeout. */
  auto?: boolean;
}

/* ---------- server -> client payloads ---------- */

export interface JoinAck {
  playerId: string;
  /** Secret for rejoin_room; keep it, it never repeats. */
  resumeToken: string;
  room: RoomState;
}

export interface SubmitAnswerAck {
  accepted: boolean;
  questionIndex: number;
}

export interface SyncTimeAck {
  /** Server clock, Unix ms. */
  serverTime: number;
}

export interface PlayerJoinedPayload {
  player: Player;
}

export interface PlayerRefPayload {
  playerId: string;
}

export interface PlayerConnectionPayload {
  playerId: string;
  connected: boolean;
}

export interface SettingsUpdatedPayload {
  settings: RoomSettings;
}

export interface RoomClosingSoonPayload {
  closesInSeconds: number;
}

export interface RoomClosedPayload {
  reason: 'lobby_timeout';
}

export interface GameStartedPayload {
  gameId: string;
  questionCount: number;
  timePerQuestionSeconds: number;
  players: Player[];
}

export interface PersonalRoundResult {
  /** null - "no answer". */
  selectedOptionIndex?: number | null;
  isCorrect: boolean;
  score: number;
  elapsedMs?: number | null;
  totalScore: number;
}

export interface RoundResultPayload {
  questionIndex: number;
  yourResult: PersonalRoundResult;
  leaderboard: LeaderboardEntry[];
  /** true - game_over follows instead of the next question. */
  isLast: boolean;
}

/** Per-question reveal in the final review. */
export interface QuestionReview {
  index: number;
  text: string;
  options: string[];
  /** null - trap question (no correct option exists). */
  correctIndex: number | null;
  isTrap: boolean;
  explanation?: string;
}

export interface GameOverPayload {
  gameId: string;
  leaderboard: LeaderboardEntry[];
  trapQuestionIndex: number;
  review: QuestionReview[];
}

export type WsErrorCode =
  | 'room_not_found'
  | 'room_not_waiting'
  | 'nickname_taken'
  | 'not_a_member'
  | 'not_host'
  | 'start_conditions_not_met'
  | 'invalid_payload'
  | 'question_finished'
  | 'invalid_resume_token';

export interface WsErrorPayload {
  code: WsErrorCode;
  message: string;
}

/* ---------- Socket.IO event maps ---------- */

export interface ClientToServerEvents {
  join_room: (payload: JoinRoomPayload) => void;
  rejoin_room: (payload: RejoinRoomPayload) => void;
  leave_room: () => void;
  start_game: () => void;
  submit_answer: (payload: SubmitAnswerPayload) => void;
  sync_time: () => void;
}

export interface ServerToClientEvents {
  join_ack: (payload: JoinAck) => void;
  room_state: (payload: RoomState) => void;
  submit_answer_ack: (payload: SubmitAnswerAck) => void;
  sync_time_ack: (payload: SyncTimeAck) => void;
  player_joined: (payload: PlayerJoinedPayload) => void;
  player_left: (payload: PlayerRefPayload) => void;
  player_connection: (payload: PlayerConnectionPayload) => void;
  settings_updated: (payload: SettingsUpdatedPayload) => void;
  host_changed: (payload: PlayerRefPayload) => void;
  room_closing_soon: (payload: RoomClosingSoonPayload) => void;
  room_closed: (payload: RoomClosedPayload) => void;
  game_started: (payload: GameStartedPayload) => void;
  question_started: (payload: ActiveQuestion) => void;
  round_result: (payload: RoundResultPayload) => void;
  game_over: (payload: GameOverPayload) => void;
  error: (payload: WsErrorPayload) => void;
}
