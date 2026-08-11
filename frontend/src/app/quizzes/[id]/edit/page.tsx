'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { CreateQuizForm } from '@/components/CreateQuizForm';
import { PageHero } from '@/components/PageHero';
import { useAuth } from '@/context/AuthContext';
import { ApiError, api } from '@/services/api';
import type { Quiz } from '@/types/quiz';

export default function EditQuizPage() {
  const t = useTranslations('edit');
  const tc = useTranslations('common');
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const data = await api.getQuiz(id);
      if (data.ownerId !== user.id) {
        setForbidden(true);
        setQuiz(null);
        return;
      }
      setQuiz(data);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
        setForbidden(true);
      } else {
        setError(err instanceof Error ? err.message : t('loadFailed'));
      }
    } finally {
      setLoading(false);
    }
    // Intentionally omit `t`: locale changes must not refetch / flash loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (authLoading || (!user && !forbidden)) {
    return <p className="text-center text-sm text-white/80">{tc('loading')}</p>;
  }

  if (!user) {
    return null;
  }

  return (
    <div>
      <Link
        href={quiz ? `/quizzes/${quiz.id}` : '/quizzes'}
        className="text-sm font-medium text-[var(--gold-from)] transition hover:text-[var(--gold-to)]"
      >
        {t('back')}
      </Link>

      <PageHero title={t('title')} subtitle={t('subtitle')} light />

      {loading && <p className="mt-6 text-sm text-white/80">{tc('loading')}</p>}

      {!loading && forbidden && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">{t('forbidden')}</div>
      )}

      {!loading && error && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && quiz && <CreateQuizForm mode="edit" quiz={quiz} />}
    </div>
  );
}
