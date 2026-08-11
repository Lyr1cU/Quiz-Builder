'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ApiError, api } from '@/services/api';
import type { AttemptListItem, Quiz } from '@/types/quiz';

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

export default function QuizMyAttemptsPage() {
  const t = useTranslations('attempts');
  const tc = useTranslations('common');
  const formatWhen = useFormatWhen();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite')?.trim() || undefined;
  const id = params.id;
  const { user, loading: authLoading } = useAuth();
  const inviteQuery = inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : '';
  const quizHref = inviteToken
    ? `/quizzes/invite/${encodeURIComponent(inviteToken)}`
    : `/quizzes/${id}`;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const quizData = inviteToken
        ? await api.getQuizByInvite(inviteToken)
        : await api.getQuiz(id);
      setQuiz(quizData);
      const list = await api.getAttempts(id, inviteToken);
      setAttempts(list);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(t('quizNotFound'));
      } else {
        setError(err instanceof Error ? err.message : t('loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [id, user, inviteToken, t]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  if (authLoading) {
    return <p className="mt-6 text-sm text-white/80">{tc('loading')}</p>;
  }

  if (!user) {
    return (
      <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">
        {t('signInQuizPrompt')}{' '}
        <Link href="/login" className="underline">
          {t('logIn')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={quizHref}
        className="text-sm font-medium text-[var(--gold-from)] transition hover:text-[var(--gold-to)]"
      >
        {t('backToQuiz')}
      </Link>

      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-from)]">
        {t('eyebrow')}
      </p>
      <h1 className="mt-2 font-serif text-4xl font-semibold text-white">
        {quiz?.title ?? t('quizAttemptsFallback')}
      </h1>
      <p className="mt-2 text-sm text-white/70">{t('quizAttemptsHint')}</p>

      {loading && <p className="mt-6 text-sm text-white/80">{tc('loading')}</p>}

      {!loading && error && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && !error && attempts.length === 0 && (
        <div className="surface-card mt-6 px-5 py-10 text-center text-sm text-muted-foreground">
          {t('emptyQuiz')}
        </div>
      )}

      {!loading && !error && attempts.length > 0 && (
        <ul className="mt-6 space-y-3">
          {attempts.map((attempt) => (
            <li key={attempt.id}>
              <Link
                href={`/quizzes/${id}/attempts/${attempt.id}${inviteQuery}`}
                className="surface-card surface-card-interactive flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <p className="text-sm text-muted-foreground">{formatWhen(attempt.createdAt)}</p>
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
