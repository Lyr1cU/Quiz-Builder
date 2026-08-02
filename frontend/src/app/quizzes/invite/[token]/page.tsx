'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QuestionReadonly } from '@/components/QuestionReadonly';
import { ApiError, api } from '@/services/api';
import type { Quiz } from '@/types/quiz';

export default function InviteQuizPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

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
          setError(err instanceof Error ? err.message : 'Failed to load quiz');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div>
      <Link
        href="/quizzes"
        className="text-sm font-medium text-[var(--gold-from)] transition hover:text-[var(--gold-to)]"
      >
        ← Back to quizzes
      </Link>

      {loading && <p className="mt-6 text-sm text-white/80">Loading invite…</p>}

      {!loading && notFound && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">
          Invite link is invalid or was revoked.
        </div>
      )}

      {!loading && error && (
        <div className="surface-card mt-6 px-5 py-4 text-sm text-[var(--danger)]">{error}</div>
      )}

      {!loading && quiz && (
        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-from)]">
            Shared quiz
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
            {quiz.questions.length} question{quiz.questions.length === 1 ? '' : 's'} · answers hidden
            (invite)
          </p>

          <div className="mt-5">
            <Link
              href={`/quizzes/invite/${token}/play`}
              className="gold-btn inline-flex rounded-full px-6 py-3 text-sm font-semibold"
            >
              Start practice
            </Link>
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
