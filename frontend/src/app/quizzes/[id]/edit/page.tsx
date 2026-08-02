'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { CreateQuizForm } from '@/components/CreateQuizForm';
import { PageHero } from '@/components/PageHero';
import { useAuth } from '@/context/AuthContext';
import { ApiError, api } from '@/services/api';
import type { Quiz } from '@/types/quiz';

export default function EditQuizPage() {
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
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      }
    } finally {
      setLoading(false);
    }
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
    return <p className="text-center text-sm text-white/80">Loading…</p>;
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
        ← Back
      </Link>

      <PageHero
        title="Edit quiz"
        subtitle="Update title, visibility, and questions. Only you can edit this quiz."
        light
      />

      {loading && <p className="mt-6 text-sm text-white/80">Loading…</p>}

      {!loading && forbidden && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">
          You can only edit quizzes you created.
        </div>
      )}

      {!loading && error && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && quiz && <CreateQuizForm mode="edit" quiz={quiz} />}
    </div>
  );
}
