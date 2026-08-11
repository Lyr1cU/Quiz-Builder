'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { PageHero } from '@/components/PageHero';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { AttemptListItem } from '@/types/quiz';

function useFormatWhen() {
  const locale = useLocale();
  return (iso: string) => {
    try {
      return new Date(iso).toLocaleString(locale);
    } catch {
      return iso;
    }
  };
}

export default function MyAttemptsPage() {
  const t = useTranslations('attempts');
  const tc = useTranslations('common');
  const formatWhen = useFormatWhen();
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
      setError(err instanceof Error ? err.message : t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  if (authLoading) {
    return <p className="text-center text-sm text-white/80">{tc('loading')}</p>;
  }

  if (!user) {
    return (
      <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">
        {t('signInPrompt')}{' '}
        <Link href="/login" className="underline">
          {t('logIn')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHero title={t('title')} subtitle={t('subtitle')} light />

      {loading && <p className="text-center text-sm text-white/80">{tc('loading')}</p>}

      {!loading && error && (
        <div className="surface-card px-5 py-4 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && !error && attempts.length === 0 && (
        <div className="surface-card px-5 py-12 text-center text-sm text-muted-foreground">
          {t('empty')}
        </div>
      )}

      {!loading && !error && attempts.length > 0 && (
        <ul className="flex flex-col gap-3">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <Link
                href={`/quizzes/${attempt.quizId}/attempts/${attempt.id}`}
                className="surface-card surface-card-interactive flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div>
                  <p className="font-serif text-lg font-semibold text-ink">
                    {attempt.quizTitle ?? tc('quiz')}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatWhen(attempt.createdAt)}</p>
                </div>
                <p className="font-serif text-xl font-semibold text-ink">
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
