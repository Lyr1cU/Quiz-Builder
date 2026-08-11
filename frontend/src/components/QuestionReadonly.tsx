'use client';

import { useTranslations } from 'next-intl';
import type { Question } from '@/types/quiz';

export function QuestionReadonly({
  question,
  index,
  showAnswers = true,
}: {
  question: Question;
  index: number;
  showAnswers?: boolean;
}) {
  const t = useTranslations('questionUi');
  const tt = useTranslations('questionTypes');
  const tc = useTranslations('common');

  const showOptions =
    (question.type === 'SINGLE' || question.type === 'MULTIPLE') &&
    Array.isArray(question.options);

  const hasBooleanAnswer = showAnswers && question.booleanAnswer !== null;
  const hasInputAnswer = showAnswers && question.inputAnswer !== null && question.inputAnswer !== '';
  const optionsRevealCorrect =
    showAnswers && showOptions && question.options!.some((o) => typeof o.isCorrect === 'boolean');

  return (
    <article className="border-b border-[var(--line)] py-6 last:border-b-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {t('questionN', { n: index + 1 })}
        </span>
        <span className="rounded-full bg-[#efeae2] px-2.5 py-0.5 text-xs font-medium text-[var(--ink)]">
          {tt(question.type)}
        </span>
      </div>
      <p className="text-lg font-semibold text-[var(--ink)]">{question.text}</p>

      <div className="mt-3 text-sm text-muted-foreground">
        {hasBooleanAnswer && (
          <p>
            {t('correctAnswer')}{' '}
            <span className="font-semibold text-[var(--ink)]">
              {question.booleanAnswer ? tc('true') : tc('false')}
            </span>
          </p>
        )}

        {hasInputAnswer && (
          <p>
            {t('expectedAnswer')}{' '}
            <span className="font-semibold text-[var(--ink)]">{question.inputAnswer}</span>
          </p>
        )}

        {showOptions && (
          <ul className="mt-2 space-y-1.5">
            {question.options!.map((opt, i) => (
              <li key={`${opt.label}-${i}`} className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 ${
                    question.type === 'SINGLE' ? 'rounded-full' : 'rounded-sm'
                  } ${
                    optionsRevealCorrect && opt.isCorrect ? 'bg-emerald-500' : 'bg-[#d6d0c6]'
                  }`}
                />
                <span
                  className={
                    optionsRevealCorrect && opt.isCorrect
                      ? 'text-emerald-700'
                      : 'text-muted-foreground'
                  }
                >
                  {opt.label}
                  {optionsRevealCorrect
                    ? opt.isCorrect
                      ? ` ${t('correctMark')}`
                      : ` ${t('incorrectMark')}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
