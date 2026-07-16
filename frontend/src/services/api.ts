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

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
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
