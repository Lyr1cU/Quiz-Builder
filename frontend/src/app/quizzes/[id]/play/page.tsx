'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { QuizPlay } from '@/components/QuizPlay';
import { ApiError, api } from '@/services/api';
import type { PlayQuiz } from '@/types/quiz';

export default function QuizPlayPage() {
  const t = useTranslations('playPage');
  const tp = useTranslations('play');
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [quiz, setQuiz] = useState<PlayQuiz | null>(null);
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
        const data = await api.getPlayQuiz(id);
        if (!cancelled) setQuiz(data);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof Error ? err.message : tp('loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // Intentionally omit `tp`: locale changes must not refetch / flash loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div>
      <Link
        href={`/quizzes/${id}`}
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
      {!loading && quiz && <QuizPlay quiz={quiz} backHref={`/quizzes/${id}`} />}
    </div>
  );
}
