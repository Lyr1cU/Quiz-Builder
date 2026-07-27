import type { CreateQuizInput, Quiz, QuizListItem } from '@/types/quiz';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

const REQUEST_TIMEOUT_MS = 90_000;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
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

export const api = {
  getQuizzes: () => request<QuizListItem[]>('/quizzes'),
  getQuiz: (id: string) => request<Quiz>(`/quizzes/${id}`),
  createQuiz: (body: CreateQuizInput) =>
    request<Quiz>('/quizzes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteQuiz: (id: string) =>
    request<void>(`/quizzes/${id}`, {
      method: 'DELETE',
    }),
};
