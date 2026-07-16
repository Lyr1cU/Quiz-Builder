'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { PageHero } from '@/components/PageHero';
import { QuizListItemCard } from '@/components/QuizListItemCard';
import { api } from '@/services/api';
import type { QuizListItem } from '@/types/quiz';

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getQuizzes();
      setQuizzes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleDeleted(id: string) {
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  }

  return (
    <div>
      <PageHero title="Quizzes" subtitle="All quizzes you have created." light />

      <div className="animate-in animate-in-delay-1 mb-8 flex justify-center">
        <Link
          href="/create"
          className="gold-btn inline-flex min-w-[14rem] items-center justify-center rounded-full px-8 py-3 text-sm font-semibold"
        >
          Create quiz +
        </Link>
      </div>

      {loading && <p className="text-center text-sm text-white/80">Loading…</p>}

      {!loading && error && (
        <div className="surface-card px-5 py-4 text-sm text-[var(--danger)]">
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="mt-2 underline">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && quizzes.length === 0 && (
        <div className="surface-card px-5 py-12 text-center">
          <p className="text-[var(--muted)]">No quizzes yet.</p>
          <Link
            href="/create"
            className="mt-3 inline-block text-sm font-semibold text-[var(--ink)] underline"
          >
            Create your first quiz
          </Link>
        </div>
      )}

      {!loading && !error && quizzes.length > 0 && (
        <ul className="space-y-4">
          {quizzes.map((quiz, index) => (
            <QuizListItemCard
              key={quiz.id}
              quiz={quiz}
              onDeleted={handleDeleted}
              animationDelay={`${0.08 + index * 0.06}s`}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
