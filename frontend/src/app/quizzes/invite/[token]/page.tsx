'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { QuestionReadonly } from '@/components/QuestionReadonly';
import { useAuth } from '@/context/AuthContext';
import { ApiError, api } from '@/services/api';
import type { Quiz } from '@/types/quiz';

export default function InviteQuizPage() {
  const t = useTranslations('invite');
  const tc = useTranslations('common');
  const params = useParams<{ token: string }>();
  const token = params.token;
  const { user } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const data = await api.getQuizByInvite(token);
        if (!cancelled) setQuiz(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : t('loadFailed'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // Intentionally omit `t`: locale changes must not refetch / flash loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div>
      <Link
        href="/quizzes"
        className="text-sm font-medium text-[var(--gold-from)] transition hover:text-[var(--gold-to)]"
      >
        {t('back')}
      </Link>

      {loading && <p className="mt-6 text-sm text-white/80">{t('loading')}</p>}

      {!loading && notFound && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">{t('notFound')}</div>
      )}

      {!loading && error && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && quiz && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-from)]">
            {t('eyebrow')}
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            {quiz.title}
          </h1>
          {quiz.description && (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/75">
              {quiz.description}
            </p>
          )}
          <p className="mt-2 text-sm text-white/70">
            {tc('questionCount', { count: quiz.questions.length })}
            {t('answersHidden')}
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/quizzes/invite/${token}/play`}
              className="gold-btn inline-flex rounded-full px-6 py-3 text-sm font-semibold"
            >
              {t('startPractice')}
            </Link>
            {user && (
              <Link
                href={`/quizzes/${quiz.id}/attempts?invite=${encodeURIComponent(token)}`}
                className="btn-motion inline-flex rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-medium text-white"
              >
                {t('myAttempts')}
              </Link>
            )}
          </div>

          <div className="surface-card mt-8 overflow-hidden">
            <div className="h-8 bg-[#e8dfd0]" />
            <div className="px-5 sm:px-7">
              {quiz.questions.map((q, i) => (
                <QuestionReadonly key={q.id} question={q} index={i} showAnswers={false} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
