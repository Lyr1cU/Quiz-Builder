'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import type { CheckAnswerResult, PlayQuestion, PlayQuiz, SubmitAttemptInput } from '@/types/quiz';

type Props = {
  quiz: PlayQuiz;
  inviteToken?: string;
  backHref: string;
};

type AnswerState =
  | { type: 'BOOLEAN'; value: boolean | null }
  | { type: 'INPUT'; value: string }
  | { type: 'SINGLE'; value: string | null }
  | { type: 'MULTIPLE'; value: string[] };

type RecordedAnswer = SubmitAttemptInput['answers'][number];

function emptyAnswer(question: PlayQuestion): AnswerState {
  switch (question.type) {
    case 'BOOLEAN':
      return { type: 'BOOLEAN', value: null };
    case 'INPUT':
      return { type: 'INPUT', value: '' };
    case 'SINGLE':
      return { type: 'SINGLE', value: null };
    case 'MULTIPLE':
      return { type: 'MULTIPLE', value: [] };
  }
}

function formatAnswer(value: boolean | string | string[] | null | undefined): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'True' : 'False';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return value || '—';
}

export function QuizPlay({ quiz, inviteToken, backHref }: Props) {
  const { user } = useAuth();
  const questions = quiz.questions;
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<AnswerState>(() =>
    questions[0] ? emptyAnswer(questions[0]) : { type: 'INPUT', value: '' },
  );
  const [result, setResult] = useState<CheckAnswerResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedScore, setSavedScore] = useState<{ correct: number; total: number } | null>(null);
  const recordedRef = useRef<RecordedAnswer[]>([]);

  const question = questions[index];
  const progress = useMemo(
    () => ({ current: index + 1, total: questions.length }),
    [index, questions.length],
  );

  function goToQuestion(nextIndex: number) {
    const next = questions[nextIndex];
    if (!next) return;
    setIndex(nextIndex);
    setAnswer(emptyAnswer(next));
    setResult(null);
    setError(null);
  }

  async function onCheck() {
    if (!question) return;
    setError(null);

    if (answer.type === 'BOOLEAN' && answer.value === null) {
      setError('Select True or False');
      return;
    }
    if (answer.type === 'INPUT' && answer.value.trim().length === 0) {
      setError('Enter an answer');
      return;
    }
    if (answer.type === 'SINGLE' && !answer.value) {
      setError('Select an option');
      return;
    }
    if (answer.type === 'MULTIPLE' && answer.value.length === 0) {
      setError('Select at least one option');
      return;
    }

    setChecking(true);
    try {
      const body =
        answer.type === 'BOOLEAN'
          ? { type: 'BOOLEAN' as const, answer: answer.value as boolean, inviteToken }
          : answer.type === 'INPUT'
            ? { type: 'INPUT' as const, answer: answer.value, inviteToken }
            : answer.type === 'SINGLE'
              ? { type: 'SINGLE' as const, answer: answer.value as string, inviteToken }
              : { type: 'MULTIPLE' as const, answer: answer.value, inviteToken };

      const check = await api.checkAnswer(quiz.id, question.id, body);
      setResult(check);

      const recorded: RecordedAnswer =
        body.type === 'BOOLEAN'
          ? { questionId: question.id, type: 'BOOLEAN', answer: body.answer }
          : body.type === 'INPUT'
            ? { questionId: question.id, type: 'INPUT', answer: body.answer }
            : body.type === 'SINGLE'
              ? { questionId: question.id, type: 'SINGLE', answer: body.answer }
              : { questionId: question.id, type: 'MULTIPLE', answer: body.answer };
      recordedRef.current = [
        ...recordedRef.current.filter((a) => a.questionId !== question.id),
        recorded,
      ];

      setScore((prev) => ({
        correct: prev.correct + (check.isCorrect ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check answer');
    } finally {
      setChecking(false);
    }
  }

  async function finishPractice() {
    setFinished(true);
    setSaveError(null);
    setSaved(false);
    setSavedScore(null);

    // Guests can practice, but history is only for signed-in users.
    if (!user) {
      return;
    }

    setSaving(true);
    try {
      const attempt = await api.submitAttempt(quiz.id, {
        inviteToken,
        answers: recordedRef.current,
      });
      setSavedScore({ correct: attempt.scoreCorrect, total: attempt.scoreTotal });
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save attempt');
    } finally {
      setSaving(false);
    }
  }

  function onNext() {
    if (index >= questions.length - 1) {
      void finishPractice();
      return;
    }
    goToQuestion(index + 1);
  }

  if (!question) {
    return (
      <div className="surface-card mt-6 px-5 py-4 text-sm text-amber-800">
        This quiz has no questions.
      </div>
    );
  }

  if (finished) {
    return (
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-from)]">
          Practice complete
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-white">{quiz.title}</h1>
        <div className="surface-card mt-8 px-5 py-8 text-center">
          <p className="font-serif text-3xl font-semibold text-[var(--ink)]">
            {(savedScore ?? score).correct} / {(savedScore ?? score).total}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">correct answers</p>
          {saving && <p className="mt-3 text-sm text-[var(--muted)]">Saving your attempt…</p>}
          {!saving && saved && (
            <p className="mt-3 text-sm text-emerald-700">
              Saved to{' '}
              <Link href="/my-attempts" className="underline">
                your attempt history
              </Link>
              .
            </p>
          )}
          {!saving && !user && (
            <p className="mt-3 text-sm text-[var(--muted)]">
              <Link href="/login" className="underline">
                Sign in
              </Link>{' '}
              next time to keep your practice history.
            </p>
          )}
          {!saving && saveError && (
            <p className="mt-3 text-sm text-[var(--danger)]">{saveError}</p>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setFinished(false);
                setScore({ correct: 0, total: 0 });
                recordedRef.current = [];
                setSaved(false);
                setSavedScore(null);
                setSaveError(null);
                goToQuestion(0);
              }}
              className="gold-btn rounded-full px-5 py-2.5 text-sm font-semibold"
            >
              Practice again
            </button>
            <Link
              href={backHref}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--ink)]"
            >
              Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-from)]">
        Practice mode
      </p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        {quiz.title}
      </h1>
      <p className="mt-2 text-sm text-white/70">
        Question {progress.current} of {progress.total}
      </p>

      <div className="surface-card mt-8 overflow-hidden">
        <div className="h-8 bg-[#e8dfd0]" />
        <div className="space-y-5 px-5 py-6 sm:px-7">
          <p className="text-lg font-semibold text-[var(--ink)]">{question.text}</p>

          {question.type === 'BOOLEAN' && (
            <div className="flex gap-6">
              {([true, false] as const).map((value) => (
                <label key={String(value)} className="flex items-center gap-2 text-sm text-[var(--ink)]">
                  <input
                    type="radio"
                    name="boolean-answer"
                    checked={answer.type === 'BOOLEAN' && answer.value === value}
                    disabled={Boolean(result)}
                    onChange={() => setAnswer({ type: 'BOOLEAN', value })}
                    className="accent-[var(--gold-from)]"
                  />
                  {value ? 'True' : 'False'}
                </label>
              ))}
            </div>
          )}

          {question.type === 'INPUT' && (
            <input
              type="text"
              className="field-input"
              placeholder="Your answer"
              disabled={Boolean(result)}
              value={answer.type === 'INPUT' ? answer.value : ''}
              onChange={(e) => setAnswer({ type: 'INPUT', value: e.target.value })}
            />
          )}

          {question.type === 'SINGLE' && Array.isArray(question.options) && (
            <ul className="space-y-2">
              {question.options.map((opt) => (
                <li key={opt.label}>
                  <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                    <input
                      type="radio"
                      name="single-answer"
                      disabled={Boolean(result)}
                      checked={answer.type === 'SINGLE' && answer.value === opt.label}
                      onChange={() => setAnswer({ type: 'SINGLE', value: opt.label })}
                      className="accent-[var(--gold-from)]"
                    />
                    {opt.label}
                  </label>
                </li>
              ))}
            </ul>
          )}

          {question.type === 'MULTIPLE' && Array.isArray(question.options) && (
            <ul className="space-y-2">
              {question.options.map((opt) => {
                const selected = answer.type === 'MULTIPLE' && answer.value.includes(opt.label);
                return (
                  <li key={opt.label}>
                    <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                      <input
                        type="checkbox"
                        disabled={Boolean(result)}
                        checked={selected}
                        onChange={() => {
                          if (answer.type !== 'MULTIPLE') return;
                          const next = selected
                            ? answer.value.filter((v) => v !== opt.label)
                            : [...answer.value, opt.label];
                          setAnswer({ type: 'MULTIPLE', value: next });
                        }}
                        className="accent-[var(--gold-from)]"
                      />
                      {opt.label}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}

          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          {result && (
            <div
              className={`rounded-xl px-4 py-3 text-sm ${
                result.isCorrect
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-red-50 text-[var(--danger)]'
              }`}
            >
              <p className="font-semibold">{result.isCorrect ? 'Correct!' : 'Incorrect'}</p>
              {!result.isCorrect && (
                <div className="mt-2 space-y-1 text-[var(--ink)]">
                  <p>
                    Your answer:{' '}
                    <span className="font-medium">{formatAnswer(result.userAnswer)}</span>
                  </p>
                  <p>
                    Correct answer:{' '}
                    <span className="font-medium">{formatAnswer(result.correctAnswer)}</span>
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            {!result ? (
              <button
                type="button"
                onClick={() => void onCheck()}
                disabled={checking}
                className="gold-btn rounded-full px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                {checking ? 'Checking…' : 'Check answer'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onNext}
                className="gold-btn rounded-full px-5 py-2.5 text-sm font-semibold"
              >
                {index >= questions.length - 1 ? 'See results' : 'Next question'}
              </button>
            )}
            <Link
              href={backHref}
              className="rounded-full border border-[var(--line)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--ink)]"
            >
              Exit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
