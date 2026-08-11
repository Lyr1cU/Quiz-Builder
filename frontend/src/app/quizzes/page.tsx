'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHero } from '@/components/PageHero';
import { QuizListItemCard } from '@/components/QuizListItemCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { QuizListItem } from '@/types/quiz';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'mine';

export default function QuizzesPage() {
  const t = useTranslations('quizzes');
  const tc = useTranslations('common');
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
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
      setError(err instanceof Error ? err.message : t('loadFailed'));
    } finally {
      setLoading(false);
    }
    // Intentionally omit `t`: locale changes must not refetch / flash loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      return filter === 'mine' ? t('emptySearchMine') : t('emptySearch');
    }
    return filter === 'mine' ? t('emptyMine') : t('emptyAll');
  })();

  return (
    <div>
      <PageHero
        title={t('title')}
        subtitle={t('subtitle')}
        light
        actions={
          <Button asChild variant="gold" size="lg" className="min-w-[12rem]">
            <Link href="/create">{t('createQuiz')}</Link>
          </Button>
        }
      />

      <div className="animate-in animate-in-delay-1 mb-6 mx-auto max-w-xl space-y-6">
        <div>
          <label htmlFor="quiz-search" className="sr-only">
            {t('searchLabel')}
          </label>
          <Input
            id="quiz-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('searchPlaceholder')}
          />
        </div>

        {user && (
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                filter === 'all' ? 'bg-white text-ink' : 'bg-white/10 text-white/80 hover:bg-white/15',
              )}
            >
              {t('catalog')}
            </button>
            <button
              type="button"
              onClick={() => setFilter('mine')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                filter === 'mine' ? 'bg-white text-ink' : 'bg-white/10 text-white/80 hover:bg-white/15',
              )}
            >
              {t('myQuizzes')}
            </button>
          </div>
        )}
      </div>

      {loading && <p className="text-center text-sm text-white/80">{tc('loadingWake')}</p>}

      {!loading && error && (
        <Card className="gap-0 py-0">
          <CardContent className="px-5 py-4 text-sm text-destructive">
            <p>{error}</p>
            <button type="button" onClick={() => void load()} className="mt-2 underline">
              {tc('retry')}
            </button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && visible.length === 0 && (
        <Card className="gap-0 py-0">
          <CardContent className="px-5 py-12 text-center">
            <p className="text-muted-foreground">{emptyMessage}</p>
            {!debouncedSearch && (
              <Link
                href="/create"
                className="mt-3 inline-block text-sm font-semibold text-ink underline"
              >
                {t('createFirst')}
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {!loading && !error && visible.length > 0 && (
        <ul className="flex flex-col gap-4">
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
