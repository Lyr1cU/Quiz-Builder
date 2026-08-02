'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHero } from '@/components/PageHero';
import { QuizListItemCard } from '@/components/QuizListItemCard';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { QuizListItem } from '@/types/quiz';

type Filter = 'all' | 'mine';

export default function QuizzesPage() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getQuizzes(
        debouncedSearch ? { q: debouncedSearch } : undefined,
      );
      setQuizzes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load, user?.id]);

  function handleDeleted(id: string) {
    setQuizzes((prev) => prev.filter((q) => q.id !== id));
  }

  const visible = useMemo(() => {
    if (filter === 'mine' && user) {
      return quizzes.filter((q) => q.ownerId === user.id);
    }
    return quizzes;
  }, [filter, quizzes, user]);

  const emptyMessage = (() => {
    if (debouncedSearch) {
      return filter === 'mine'
        ? 'No matching quizzes in your list.'
        : 'No quizzes match your search.';
    }
    return filter === 'mine' ? 'You have no quizzes yet.' : 'No quizzes yet.';
  })();

  return (
    <div>
      <PageHero
        title="Quizzes"
        subtitle="Public quizzes for everyone. Sign in to see your private ones too."
        light
      />

      <div className="animate-in animate-in-delay-1 mb-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/create"
          className="gold-btn inline-flex min-w-[14rem] items-center justify-center rounded-full px-8 py-3 text-sm font-semibold"
        >
          Create quiz +
        </Link>
      </div>

      <div className="mb-6 mx-auto max-w-xl">
        <label htmlFor="quiz-search" className="sr-only">
          Search quizzes
        </label>
        <input
          id="quiz-search"
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by title or description…"
          className="field-input"
        />
      </div>

      {user && (
        <div className="mb-6 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              filter === 'all' ? 'bg-white text-[var(--ink)]' : 'bg-white/10 text-white/80'
            }`}
          >
            Catalog
          </button>
          <button
            type="button"
            onClick={() => setFilter('mine')}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              filter === 'mine' ? 'bg-white text-[var(--ink)]' : 'bg-white/10 text-white/80'
            }`}
          >
            My quizzes
          </button>
        </div>
      )}

      {loading && (
        <p className="text-center text-sm text-white/80">
          Loading… If this is the first visit in a while, the free API may take up to a minute to wake
          up.
        </p>
      )}

      {!loading && error && (
        <div className="surface-card px-5 py-4 text-sm text-[var(--danger)]">
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="mt-2 underline">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="surface-card px-5 py-12 text-center">
          <p className="text-[var(--muted)]">{emptyMessage}</p>
          {!debouncedSearch && (
            <Link
              href="/create"
              className="mt-3 inline-block text-sm font-semibold text-[var(--ink)] underline"
            >
              Create your first quiz
            </Link>
          )}
        </div>
      )}

      {!loading && !error && visible.length > 0 && (
        <ul className="space-y-4">
          {visible.map((quiz, index) => (
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
