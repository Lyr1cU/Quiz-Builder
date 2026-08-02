'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PageHero } from '@/components/PageHero';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { AttemptListItem } from '@/types/quiz';

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function MyAttemptsPage() {
  const { user, loading: authLoading } = useAuth();
  const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const list = await api.getMyAttempts();
      setAttempts(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attempts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  if (authLoading) {
    return <p className="text-center text-sm text-white/80">Loading…</p>;
  }

  if (!user) {
    return (
      <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">
        Sign in to see your practice history.{' '}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHero
        title="My attempts"
        subtitle="Your saved practice results. Guests do not keep history."
        light
      />

      {loading && <p className="text-center text-sm text-white/80">Loading…</p>}

      {!loading && error && (
        <div className="surface-card px-5 py-4 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && !error && attempts.length === 0 && (
        <div className="surface-card px-5 py-12 text-center text-sm text-[var(--muted)]">
          No attempts yet. Finish a quiz in practice mode while signed in.
        </div>
      )}

      {!loading && !error && attempts.length > 0 && (
        <ul className="space-y-3">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <Link
                href={`/quizzes/${attempt.quizId}/attempts/${attempt.id}`}
                className="surface-card surface-card-interactive flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-semibold text-[var(--ink)]">
                    {attempt.quizTitle ?? 'Quiz'}
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{formatWhen(attempt.createdAt)}</p>
                </div>
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
