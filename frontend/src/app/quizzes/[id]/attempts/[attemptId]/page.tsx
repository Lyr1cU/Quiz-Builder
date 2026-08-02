'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ApiError, api } from '@/services/api';
import type { AttemptDetail } from '@/types/quiz';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function formatAnswer(value: boolean | string | string[] | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return value || '—';
}

export default function AttemptDetailPage() {
  const params = useParams<{ id: string; attemptId: string }>();
  const { id, attemptId } = params;
  const { user, loading: authLoading } = useAuth();

  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await api.getAttempt(id, attemptId);
      setAttempt(data);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || err.status === 404)) {
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load attempt');
      }
    } finally {
      setLoading(false);
    }
  }, [id, attemptId, user]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  if (authLoading) {
    return <p className="mt-6 text-sm text-white/80">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">
        Sign in to view your attempt.{' '}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/quizzes/${id}/attempts`}
        className="text-sm font-medium text-[var(--gold-from)] transition hover:text-[var(--gold-to)]"
      >
        ← Back to my attempts
      </Link>

      {loading && <p className="mt-6 text-sm text-white/80">Loading…</p>}

      {!loading && notFound && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">
          Attempt not found. You can only open your own practice results.
        </div>
      )}

      {!loading && error && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && attempt && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-from)]">
            Your attempt
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-white">
            {attempt.quizTitle ?? 'Practice result'}
          </h1>
          <p className="mt-2 text-sm text-white/70">
            {formatWhen(attempt.createdAt)} · {attempt.scoreCorrect}/{attempt.scoreTotal} correct
          </p>

          <ul className="mt-8 space-y-4">
            {attempt.answers.map((a, index) => (
              <li key={a.id} className="surface-card overflow-hidden">
                <div className="flex items-center justify-between bg-[#e8dfd0] px-5 py-3">
                  <p className="text-sm font-semibold text-[var(--ink)]">Question {index + 1}</p>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      a.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {a.isCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                </div>
                <div className="space-y-2 px-5 py-4 text-sm text-[var(--ink)]">
                  <p className="font-medium">{a.questionText}</p>
                  <p className="text-[var(--muted)]">
                    Your answer:{' '}
                    <span className="text-[var(--ink)]">{formatAnswer(a.userAnswer)}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
