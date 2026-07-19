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

export const AnswerSetsApi = {
  accept: (answerSetId: string) =>
    api<AnswerSet>(`/answer-sets/${answerSetId}/accept`, { method: 'POST' }),
};

export const GenerationApi = {
  start: (bankId: string) =>
    api<GenerationJob>(`/banks/${bankId}/generation`, { method: 'POST' }),
  status: (bankId: string) => api<GenerationJob>(`/banks/${bankId}/generation`),
};

export const ImagesApi = {
  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api<{ url: string }>('/images', { method: 'POST', formData });
  },
};
