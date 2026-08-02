'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ApiError, api } from '@/services/api';
import type { AttemptListItem, Quiz } from '@/types/quiz';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function QuizMyAttemptsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, loading: authLoading } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const quizData = await api.getQuiz(id);
      setQuiz(quizData);
      const list = await api.getAttempts(id);
      setAttempts(list);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('Quiz not found');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load attempts');
      }
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  if (authLoading) {
    return <p className="mt-6 text-sm text-white/80">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">
        Sign in to see your practice attempts for this quiz.{' '}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/quizzes/${id}`}
        className="text-sm font-medium text-[var(--gold-from)] transition hover:text-[var(--gold-to)]"
      >
        ← Back to quiz
      </Link>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-from)]">
        My attempts
      </p>
      <h1 className="mt-2 font-serif text-4xl font-semibold text-white">
        {quiz?.title ?? 'Quiz attempts'}
      </h1>
      <p className="mt-2 text-sm text-white/70">Only you can see your practice results.</p>

      {loading && <p className="mt-6 text-sm text-white/80">Loading…</p>}

      {!loading && error && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && !error && attempts.length === 0 && (
        <div className="surface-card mt-6 px-5 py-10 text-center text-sm text-[var(--muted)]">
          You have no saved attempts for this quiz yet. Finish practice while signed in to save one.
        </div>
      )}

      {!loading && !error && attempts.length > 0 && (
        <ul className="mt-6 space-y-3">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <Link
                href={`/quizzes/${id}/attempts/${attempt.id}`}
                className="surface-card surface-card-interactive flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <p className="text-sm text-[var(--muted)]">{formatWhen(attempt.createdAt)}</p>
                <p className="font-serif text-xl font-semibold text-[var(--ink)]">
                  {attempt.scoreCorrect}/{attempt.scoreTotal}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
