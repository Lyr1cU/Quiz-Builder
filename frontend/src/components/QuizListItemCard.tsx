'use client';

import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/services/api';
import type { QuizListItem } from '@/types/quiz';

type Props = {
  quiz: QuizListItem;
  onDeleted: (id: string) => void;
  animationDelay?: string;
};

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M4 7h16M9 7V5h6v2m-8 0v12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function QuizListItemCard({ quiz, onDeleted, animationDelay }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm(`Delete quiz "${quiz.title}"?`)) return;

    setDeleting(true);
    setError(null);
    try {
      await api.deleteQuiz(quiz.id);
      onDeleted(quiz.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
    }
  }

  return (
    <li
      className="surface-card surface-card-interactive stagger-item overflow-hidden"
      style={animationDelay ? { animationDelay } : undefined}
    >
      <div className="h-10 bg-[#e8dfd0]" />
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/quizzes/${quiz.id}`}
            className="font-serif text-xl font-semibold text-[var(--ink)] hover:underline"
          >
            {quiz.title}
          </Link>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {quiz.questionsCount} question{quiz.questionsCount === 1 ? '' : 's'}
          </p>
          {error && <p className="mt-1 text-sm text-[var(--danger)]">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/quizzes/${quiz.id}`}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--teal)] px-4 py-2 text-sm font-medium text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--teal-hover)]"
          >
            <EyeIcon />
            View
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--danger)] bg-white px-4 py-2 text-sm font-medium text-[var(--danger)] transition duration-200 hover:-translate-y-0.5 hover:bg-red-50 disabled:opacity-50"
          >
            <TrashIcon />
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </li>
  );
}
