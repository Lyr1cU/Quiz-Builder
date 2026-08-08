import type {
  AttemptDetail,
  AttemptListItem,
  CheckAnswerResult,
  CreateQuizInput,
  GenerateQuizRequest,
  PlayQuiz,
  Quiz,
  QuizDraftResponse,
  QuizImportDraft,
  QuizListItem,
  SubmitAttemptInput,
} from '@/types/quiz';
import { getStoredToken } from '@/lib/authStorage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

const REQUEST_TIMEOUT_MS = 90_000;
const GENERATE_TIMEOUT_MS = 120_000;
const SUBMIT_ATTEMPT_TIMEOUT_MS = 180_000;

async function request<T>(
  path: string,
  options?: RequestInit & { token?: string | null; timeoutMs?: number },
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const explicitToken = options?.token;
  const init: RequestInit = { ...(options ?? {}) };
  delete (init as { timeoutMs?: number }).timeoutMs;
  delete (init as { token?: string | null }).token;
  const token = explicitToken === undefined ? getStoredToken() : explicitToken;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string> | undefined),
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers,
    });

    if (res.status === 204) {
      return undefined as T;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        typeof data === 'object' && data && 'error' in data
          ? String((data as { error: string }).error)
          : `Request failed (${res.status})`;
      throw new ApiError(message, res.status);
    }

    return data as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(
        'API is waking up or unreachable. Wait a bit and retry (Render free tier cold start).',
        408,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function downloadPdf(path: string, fallbackName: string) {
  const token = getStoredToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const message =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error: string }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || fallbackName;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export const api = {
  register: (body: { email: string; password: string; name?: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      token: null,
    }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
      token: null,
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: (token: string) => request<{ user: AuthUser }>('/auth/me', { token }),

  getQuizzes: (params?: { q?: string }) => {
    const q = params?.q?.trim();
    const query = q ? `?q=${encodeURIComponent(q)}` : '';
    return request<QuizListItem[]>(`/quizzes${query}`);
  },
  getQuiz: (id: string) => request<Quiz>(`/quizzes/${id}`),
  getQuizByInvite: (token: string) => request<Quiz>(`/quizzes/invite/${token}`),
  getPlayQuiz: (id: string, inviteToken?: string) => {
    const q = inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : '';
    return request<PlayQuiz>(`/quizzes/${id}/play${q}`);
  },
  getPlayQuizByInvite: (token: string) => request<PlayQuiz>(`/quizzes/invite/${token}/play`),
  checkAnswer: (
    quizId: string,
    questionId: string,
    body:
      | { type: 'BOOLEAN'; answer: boolean; inviteToken?: string }
      | { type: 'INPUT'; answer: string; inviteToken?: string }
      | { type: 'SINGLE'; answer: string; inviteToken?: string }
      | { type: 'MULTIPLE'; answer: string[]; inviteToken?: string },
  ) =>
    request<CheckAnswerResult>(`/quizzes/${quizId}/questions/${questionId}/check`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  submitAttempt: (quizId: string, body: SubmitAttemptInput) =>
    request<AttemptDetail>(`/quizzes/${quizId}/attempts`, {
      method: 'POST',
      body: JSON.stringify(body),
      timeoutMs: SUBMIT_ATTEMPT_TIMEOUT_MS,
    }),
  getMyAttempts: () => request<AttemptListItem[]>('/attempts'),
  getAttempts: (quizId: string, inviteToken?: string) => {
    const q = inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : '';
    return request<AttemptListItem[]>(`/quizzes/${quizId}/attempts${q}`);
  },
  getAttempt: (quizId: string, attemptId: string) =>
    request<AttemptDetail>(`/quizzes/${quizId}/attempts/${attemptId}`),
  createQuiz: (body: CreateQuizInput) =>
    request<Quiz>('/quizzes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  validateQuizImport: (draft: QuizImportDraft) =>
    request<QuizDraftResponse>('/quizzes/validate-import', {
      method: 'POST',
      body: JSON.stringify(draft),
    }),
  generateQuizFromText: (body: GenerateQuizRequest) =>
    request<QuizDraftResponse>('/quizzes/generate', {
      method: 'POST',
      body: JSON.stringify(body),
      timeoutMs: GENERATE_TIMEOUT_MS,
    }),
  updateQuiz: (id: string, body: CreateQuizInput) =>
    request<Quiz>(`/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  regenerateInvite: (id: string) =>
    request<{ inviteToken: string }>(`/quizzes/${id}/invite/regenerate`, {
      method: 'POST',
    }),
  revokeInvite: (id: string) =>
    request<void>(`/quizzes/${id}/invite`, {
      method: 'DELETE',
    }),
  downloadWorksheetPdf: (id: string) =>
    downloadPdf(`/quizzes/${id}/export/pdf?variant=worksheet`, 'worksheet.pdf'),
  downloadAnswersPdf: (id: string) =>
    downloadPdf(`/quizzes/${id}/export/pdf?variant=answers`, 'answers.pdf'),
  deleteQuiz: (id: string) =>
    request<void>(`/quizzes/${id}`, {
      method: 'DELETE',
    }),
};
