'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
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

function optionLetter(index: number) {
  return String.fromCharCode(65 + index);
}

function LetterBadge({ letter, selected }: { letter: string; selected: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
        selected
          ? 'border-[var(--gold-from)] bg-[var(--gold-from)] text-white'
          : 'border-[var(--line)] bg-white text-muted-foreground',
      )}
    >
      {letter}
    </span>
  );
}

function SingleCheck({ selected }: { selected: boolean }) {
  if (!selected) return <span className="size-6 shrink-0" aria-hidden />;
  return (
    <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--gold-from)] text-white">
      <Check className="size-3.5" strokeWidth={3} aria-hidden />
    </span>
  );
}

function MultiCheck({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex size-6 shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors',
        selected
          ? 'border-[var(--gold-from)] bg-[var(--gold-from)] text-white'
          : 'border-[var(--line)] bg-white',
      )}
      aria-hidden
    >
      {selected && <Check className="size-3.5" strokeWidth={3} />}
    </span>
  );
}

function ChoiceOptionButton({
  letter,
  label,
  selected,
  disabled,
  mode,
  onClick,
}: {
  letter: string;
  label: string;
  selected: boolean;
  disabled?: boolean;
  mode: 'single' | 'multiple';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-full border px-4 py-3 text-left text-sm font-medium transition-colors',
        selected
          ? 'border-[var(--gold-from)] bg-[#f8f1e0] text-ink'
          : 'border-[var(--line)] bg-white text-ink hover:border-[var(--gold-from)]/50',
        disabled && 'cursor-default opacity-90',
      )}
    >
      <LetterBadge letter={letter} selected={selected} />
      <span className="min-w-0 flex-1">{label}</span>
      {mode === 'single' ? <SingleCheck selected={selected} /> : <MultiCheck selected={selected} />}
    </button>
  );
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
      <div className="animate-in mt-6">
        <p className="animate-in text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-from)]">
          Practice complete
        </p>
        <h1 className="animate-in animate-in-delay-1 mt-2 font-serif text-4xl font-semibold text-white">
          {quiz.title}
        </h1>
        <div className="animate-in animate-in-delay-2 surface-card mt-8 px-5 py-8 text-center">
          <p className="font-serif text-3xl font-semibold text-[var(--ink)]">
            {(savedScore ?? score).correct} / {(savedScore ?? score).total}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">correct answers</p>
          {saving && (
            <p className="animate-feedback mt-3 text-sm text-muted-foreground">
              Saving your attempt…
            </p>
          )}
          {!saving && saved && (
            <p className="animate-feedback mt-3 text-sm text-emerald-700">
              Saved to{' '}
              <Link href="/my-attempts" className="underline">
                your attempt history
              </Link>
              .
            </p>
          )}
          {!saving && !user && (
            <p className="animate-feedback mt-3 text-sm text-muted-foreground">
              <Link href="/login" className="underline">
                Sign in
              </Link>{' '}
              next time to keep your practice history.
            </p>
          )}
          {!saving && saveError && (
            <p className="animate-feedback mt-3 text-sm text-[var(--danger)]">{saveError}</p>
          )}
          <div className="animate-in animate-in-delay-3 mt-6 flex flex-wrap justify-center gap-3">
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

  const progressPct = Math.round((progress.current / Math.max(progress.total, 1)) * 100);

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--gold-from)]">
        Practice mode
      </p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
        {quiz.title}
      </h1>

      <div className="surface-card mt-8 overflow-hidden">
        <div className="space-y-5 px-5 py-6 sm:px-7">
          <div>
            <p className="text-sm text-muted-foreground">
              Question {progress.current} of {progress.total}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#efeae2]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--gold-from)] to-[var(--gold-to)] transition-[width] duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <p className="font-serif text-2xl font-semibold text-ink sm:text-3xl">{question.text}</p>

          {question.type === 'BOOLEAN' && (
            <ul className="flex flex-col gap-2">
              {([true, false] as const).map((value, i) => {
                const selected = answer.type === 'BOOLEAN' && answer.value === value;
                return (
                  <li key={String(value)}>
                    <ChoiceOptionButton
                      letter={optionLetter(i)}
                      label={value ? 'True' : 'False'}
                      selected={selected}
                      disabled={Boolean(result)}
                      mode="single"
                      onClick={() => setAnswer({ type: 'BOOLEAN', value })}
                    />
                  </li>
                );
              })}
            </ul>
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
            <ul className="flex flex-col gap-2">
              {question.options.map((opt, i) => {
                const selected = answer.type === 'SINGLE' && answer.value === opt.label;
                return (
                  <li key={opt.label}>
                    <ChoiceOptionButton
                      letter={optionLetter(i)}
                      label={opt.label}
                      selected={selected}
                      disabled={Boolean(result)}
                      mode="single"
                      onClick={() => setAnswer({ type: 'SINGLE', value: opt.label })}
                    />
                  </li>
                );
              })}
            </ul>
          )}

          {question.type === 'MULTIPLE' && Array.isArray(question.options) && (
            <ul className="flex flex-col gap-2">
              {question.options.map((opt, i) => {
                const selected = answer.type === 'MULTIPLE' && answer.value.includes(opt.label);
                return (
                  <li key={opt.label}>
                    <ChoiceOptionButton
                      letter={optionLetter(i)}
                      label={opt.label}
                      selected={selected}
                      disabled={Boolean(result)}
                      mode="multiple"
                      onClick={() => {
                        if (answer.type !== 'MULTIPLE') return;
                        const next = selected
                          ? answer.value.filter((v) => v !== opt.label)
                          : [...answer.value, opt.label];
                        setAnswer({ type: 'MULTIPLE', value: next });
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && (
            <div
              key={`${question.id}-${result.isCorrect}`}
              className={`animate-feedback rounded-xl px-4 py-3 text-sm ${
                result.isCorrect
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-red-50 text-destructive'
              }`}
            >
              <p className="font-semibold">{result.isCorrect ? 'Correct!' : 'Incorrect'}</p>
              {!result.isCorrect && (
                <div className="mt-2 space-y-1 text-ink">
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
                {index >= questions.length - 1 ? 'See results' : 'Continue'}
              </button>
            )}
            <Link
              href={backHref}
              className="rounded-full border border-secondary bg-white px-5 py-2.5 text-sm font-medium text-secondary transition hover:bg-[#eef5f4]"
            >
              Exit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
