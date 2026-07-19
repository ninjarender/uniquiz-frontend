/**
 * Thin fetch client for the UniQuiz REST API (tasks 0001-0012).
 * In dev the Vite proxy forwards /api and /uploads to the NestJS backend,
 * so the frontend always talks to its own origin (no CORS needed).
 */
export const API_BASE = '/api/v1';

const TOKEN_KEY = 'uniquiz.accessToken';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** Error carrying the backend's { statusCode, message } (openapi Error). */
export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function parseError(response: Response): Promise<never> {
  let message = `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { message?: string };
    if (typeof body.message === 'string') message = body.message;
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(response.status, message);
}

export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    /** multipart body: pass FormData instead of json */
    formData?: FormData;
  } = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
  });

  if (!response.ok) await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/* ---------- API types (mirror the OpenAPI schemas) ---------- */

export interface AuthToken {
  accessToken: string;
}
export interface User {
  id: string;
  email: string;
}
export interface Bank {
  id: string;
  name: string;
  questionCount: number;
  readyCount: number;
  createdAt: string;
  updatedAt: string;
}
export type AnswerSetStatus =
  | 'generating'
  | 'self_check'
  | 'in_review'
  | 'accepted'
  | 'edited'
  | 'regenerating';
export interface AnswerSet {
  id: string;
  questionId: string;
  options: string[];
  correctIndex: number;
  spareDistractor?: string;
  explanation?: string;
  status: AnswerSetStatus;
  selfCheckPassed?: boolean;
  generatedAt?: string;
  reviewedAt?: string;
}
export interface Question {
  id: string;
  bankId: string;
  text: string;
  imageUrl?: string;
  referenceAnswer?: string;
  answerSet?: AnswerSet;
}
export interface BankDetailed extends Bank {
  questions: Question[];
}
export type GenerationStatus = 'idle' | 'queued' | 'running' | 'done' | 'failed';
export interface GenerationJob {
  jobId?: string;
  status: GenerationStatus;
  /** How many questions the job covers. */
  total: number;
  /** Bank's answer sets per lifecycle status. */
  countsByStatus?: Record<string, number>;
  /** Failure reason when status = failed. */
  error?: string;
}

/* ---------- endpoint helpers ---------- */

export const AuthApi = {
  register: (email: string, password: string) =>
    api<AuthToken>('/auth/register', { method: 'POST', body: { email, password } }),
  login: (email: string, password: string) =>
    api<AuthToken>('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => api<User>('/auth/me'),
};

export const BanksApi = {
  list: () => api<Bank[]>('/banks'),
  create: (name: string) => api<Bank>('/banks', { method: 'POST', body: { name } }),
  get: (bankId: string) => api<BankDetailed>(`/banks/${bankId}`),
  rename: (bankId: string, name: string) =>
    api<Bank>(`/banks/${bankId}`, { method: 'PATCH', body: { name } }),
  remove: (bankId: string) => api<void>(`/banks/${bankId}`, { method: 'DELETE' }),
};

export interface QuestionInput {
  text?: string;
  imageUrl?: string;
  referenceAnswer?: string;
}

export const QuestionsApi = {
  create: (bankId: string, input: QuestionInput & { text: string }) =>
    api<Question>(`/banks/${bankId}/questions`, { method: 'POST', body: input }),
  update: (questionId: string, input: QuestionInput) =>
    api<Question>(`/questions/${questionId}`, { method: 'PATCH', body: input }),
  remove: (questionId: string) =>
    api<void>(`/questions/${questionId}`, { method: 'DELETE' }),
};

/** Host edit of an answer set; any patch moves it to status edited. */
export interface AnswerSetPatch {
  /** Exactly 4 options when present. */
  options?: string[];
  /** 0-3 when present. */
  correctIndex?: number;
  spareDistractor?: string;
  explanation?: string;
}

export const AnswerSetsApi = {
  accept: (answerSetId: string) =>
    api<AnswerSet>(`/answer-sets/${answerSetId}/accept`, { method: 'POST' }),
  update: (answerSetId: string, patch: AnswerSetPatch) =>
    api<AnswerSet>(`/answer-sets/${answerSetId}`, { method: 'PATCH', body: patch }),
  regenerate: (answerSetId: string) =>
    api<AnswerSet>(`/answer-sets/${answerSetId}/regenerate`, { method: 'POST' }),
};

export const GenerationApi = {
  start: (bankId: string) =>
    api<GenerationJob>(`/banks/${bankId}/generation`, { method: 'POST' }),
  status: (bankId: string) => api<GenerationJob>(`/banks/${bankId}/generation`),
};

export type RoomMode = 'solo' | 'multiplayer';
export interface RoomSettings {
  mode: RoomMode;
  /** How many random questions are drawn from the bank (min 1). */
  questionCount: number;
  /** Hard per-question time limit shared by the room (min 5). */
  timePerQuestionSeconds: number;
}
export interface RoomCreate {
  bankId: string;
  hostNickname: string;
  settings: RoomSettings;
}
export interface RoomCreated {
  roomId: string;
  /** Unique link the host shares with players. */
  joinUrl: string;
  /** Host secret for join_room; never shown to anyone but the creator. */
  hostToken: string;
}

export type RoomStatus = 'waiting' | 'in_game' | 'finished';
/** Public room data for the join-by-link page (no token needed). */
export interface RoomPublicInfo {
  roomId: string;
  status: RoomStatus;
  settings: RoomSettings;
  bankName: string;
}

export const RoomsApi = {
  create: (body: RoomCreate) => api<RoomCreated>('/rooms', { method: 'POST', body }),
  publicInfo: (roomId: string) => api<RoomPublicInfo>(`/rooms/${roomId}`),
  /** Host only; 409 once the room is no longer waiting. */
  updateSettings: (roomId: string, settings: RoomSettings) =>
    api<RoomPublicInfo>(`/rooms/${roomId}`, { method: 'PATCH', body: settings }),
};

/* Host token survives a refresh in the same tab; join_room (Socket.IO) will need it. */
const hostTokenKey = (roomId: string) => `uniquiz.hostToken.${roomId}`;
export function saveHostToken(roomId: string, hostToken: string): void {
  sessionStorage.setItem(hostTokenKey(roomId), hostToken);
}
export function getHostToken(roomId: string): string | null {
  return sessionStorage.getItem(hostTokenKey(roomId));
}

/** Leaderboard row — both in-game events and game_results.leaderboard. */
export interface LeaderboardEntry {
  nickname: string;
  totalScore: number;
  correctAnswers: number;
  /** Average over regular questions (without trap). */
  avgResponseMs?: number;
}
/** One finished game from the host's history. */
export interface GameResult {
  id: string;
  bankId: string;
  bankName?: string;
  mode: RoomMode;
  questionCount: number;
  finishedAt: string;
  leaderboard: LeaderboardEntry[];
}

export const GameResultsApi = {
  /** Finished games of the current host, newest first. */
  list: () => api<GameResult[]>('/game-results'),
};

export const ImagesApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api<{ url: string }>('/images', { method: 'POST', formData });
  },
};
