import type { Question } from '@/types/quiz';

function typeLabel(type: Question['type']) {
  switch (type) {
    case 'BOOLEAN':
      return 'Boolean';
    case 'INPUT':
      return 'Input';
    case 'CHECKBOX':
      return 'Checkbox';
  }
}

export function QuestionReadonly({ question, index }: { question: Question; index: number }) {
  return (
    <article className="border-b border-[var(--line)] py-6 last:border-b-0">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
          Question {index + 1}
        </span>
        <span className="rounded-full bg-[#efeae2] px-2.5 py-0.5 text-xs font-medium text-[var(--ink)]">
          {typeLabel(question.type)}
        </span>
      </div>
      <p className="text-lg font-semibold text-[var(--ink)]">{question.text}</p>

      <div className="mt-3 text-sm text-[var(--muted)]">
        {question.type === 'BOOLEAN' && (
          <p>
            Correct answer:{' '}
            <span className="font-semibold text-[var(--ink)]">
              {question.booleanAnswer ? 'True' : 'False'}
            </span>
          </p>
        )}

        {question.type === 'INPUT' && (
          <p>
            Expected answer:{' '}
            <span className="font-semibold text-[var(--ink)]">{question.inputAnswer}</span>
          </p>
        )}

        {question.type === 'CHECKBOX' && Array.isArray(question.options) && (
          <ul className="mt-2 space-y-1.5">
            {question.options.map((opt, i) => (
              <li key={`${opt.label}-${i}`} className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full ${
                    opt.isCorrect ? 'bg-emerald-500' : 'bg-[#d6d0c6]'
                  }`}
                />
                <span className={opt.isCorrect ? 'text-emerald-700' : 'text-[var(--muted)]'}>
                  {opt.label} {opt.isCorrect ? '(correct)' : '(incorrect)'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
