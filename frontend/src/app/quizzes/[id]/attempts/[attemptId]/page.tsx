'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ApiError, api } from '@/services/api';
import { isUnverifiedGrading, type AttemptDetail } from '@/types/quiz';

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

function formatAnswer(
  value: boolean | string | string[] | null | undefined,
  trueLabel: string,
  falseLabel: string,
): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? trueLabel : falseLabel;
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return value || '—';
}

export default function AttemptDetailPage() {
  const t = useTranslations('attempts');
  const tc = useTranslations('common');
  const tq = useTranslations('questionUi');
  const formatWhen = useFormatWhen();
  const params = useParams<{ id: string; attemptId: string }>();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite')?.trim() || undefined;
  const { id, attemptId } = params;
  const { user, loading: authLoading } = useAuth();
  const attemptsHref = inviteToken
    ? `/quizzes/${id}/attempts?invite=${encodeURIComponent(inviteToken)}`
    : `/quizzes/${id}/attempts`;

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
        setError(err instanceof Error ? err.message : t('loadAttemptFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [id, attemptId, user, t]);

  useEffect(() => {
    if (!authLoading && user) void load();
  }, [authLoading, user, load]);

  if (authLoading) {
    return <p className="mt-6 text-sm text-white/80">{tc('loading')}</p>;
  }

  if (!user) {
    return (
      <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">
        {t('signInAttemptPrompt')}{' '}
        <Link href="/login" className="underline">
          {t('logIn')}
        </Link>
      </div>
    );
  }

  const unverifiedCount =
    attempt?.scoreUnverified ??
    attempt?.answers.filter((a) => !a.isCorrect && isUnverifiedGrading(a.gradingMethod)).length ??
    0;

  return (
    <div>
      <Link
        href={attemptsHref}
        className="text-sm font-medium text-[var(--gold-from)] transition hover:text-[var(--gold-to)]"
      >
        {t('backToAttempts')}
      </Link>

      {loading && <p className="mt-6 text-sm text-white/80">{tc('loading')}</p>}

      {!loading && notFound && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">{t('notFound')}</div>
      )}

      {!loading && error && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && attempt && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-from)]">
            {t('attemptEyebrow')}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold text-white">
            {attempt.quizTitle ?? t('practiceResult')}
          </h1>
          <p className="mt-2 text-sm text-white/70">
            {t('scoreLine', {
              when: formatWhen(attempt.createdAt),
              correct: attempt.scoreCorrect,
              total: attempt.scoreTotal,
            })}
          </p>
          {unverifiedCount > 0 && (
            <p className="mt-2 text-sm text-amber-200">
              {unverifiedCount === 1
                ? t('unverifiedOne', { count: unverifiedCount })
                : t('unverifiedMany', { count: unverifiedCount })}
            </p>
          )}

          <ul className="mt-8 space-y-4">
            {attempt.answers.map((a, index) => {
              const unverified = !a.isCorrect && isUnverifiedGrading(a.gradingMethod);
              return (
                <li key={a.id} className="surface-card overflow-hidden">
                  <div className="flex items-center justify-between bg-[#e8dfd0] px-5 py-3">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {tq('questionN', { n: index + 1 })}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        a.isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : unverified
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {a.isCorrect
                        ? t('correct')
                        : unverified
                          ? t('unverified')
                          : t('incorrect')}
                    </span>
                  </div>
                  <div className="space-y-2 px-5 py-4 text-sm text-[var(--ink)]">
                    <p className="font-medium">{a.questionText}</p>
                    <p className="text-muted-foreground">
                      {t('yourAnswer')}{' '}
                      <span className="text-[var(--ink)]">
                        {formatAnswer(a.userAnswer, tc('true'), tc('false'))}
                      </span>
                    </p>
                    {unverified && (
                      <p className="text-amber-700">
                        {a.gradingMethod === 'skipped' ? t('aiSkipped') : t('aiUnavailable')}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
