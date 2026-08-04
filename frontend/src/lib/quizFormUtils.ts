import { z } from 'zod';
import type { CreateQuizInput, Quiz, QuizImportDraft, QuestionType } from '@/types/quiz';

const optionSchema = z.object({
  id: z.string().optional(),
  label: z.string(),
  isCorrect: z.boolean(),
});

export const questionFormSchema = z
  .object({
    type: z.enum(['BOOLEAN', 'INPUT', 'SINGLE', 'MULTIPLE']),
    text: z.string().trim().min(1, 'Question text is required'),
    booleanAnswer: z.enum(['true', 'false']),
    inputAnswer: z.string(),
    options: z.array(optionSchema),
  })
  .superRefine((q, ctx) => {
    if (q.type === 'INPUT' && q.inputAnswer.trim().length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expected answer is required',
        path: ['inputAnswer'],
      });
    }

    if (q.type === 'SINGLE' || q.type === 'MULTIPLE') {
      if (q.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Add at least 2 options',
          path: ['options'],
        });
      }

      q.options.forEach((opt, index) => {
        if (opt.label.trim().length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Option label is required',
            path: ['options', index, 'label'],
          });
        }
      });

      const correctCount = q.options.filter((o) => o.isCorrect).length;

      if (q.type === 'SINGLE' && correctCount !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mark exactly one option as correct',
          path: ['options'],
        });
      }

      if (q.type === 'MULTIPLE' && correctCount < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mark at least one option as correct',
          path: ['options'],
        });
      }
    }
  });

export const quizFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().max(500, 'Description must be 500 characters or less'),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
  questions: z.array(questionFormSchema).min(1, 'Add at least one question'),
});

export type QuizFormValues = z.infer<typeof quizFormSchema>;

export function emptyQuestion(): QuizFormValues['questions'][number] {
  return {
    type: 'BOOLEAN',
    text: '',
    booleanAnswer: 'true',
    inputAnswer: '',
    options: [
      { label: '', isCorrect: true },
      { label: '', isCorrect: false },
    ],
  };
}

function questionInputToForm(q: QuizImportDraft['questions'][number]): QuizFormValues['questions'][number] {
  const record = q as Record<string, unknown>;
  const type = (record.type as QuestionType) ?? 'BOOLEAN';
  const text =
    (typeof record.text === 'string' ? record.text : '') ||
    (typeof record.question === 'string' ? record.question : '') ||
    (typeof record.questionText === 'string' ? record.questionText : '') ||
    (typeof record.prompt === 'string' ? record.prompt : '');

  if (type === 'BOOLEAN') {
    return {
      type: 'BOOLEAN',
      text,
      booleanAnswer: 'booleanAnswer' in q && q.booleanAnswer === false ? 'false' : 'true',
      inputAnswer: '',
      options: [
        { label: '', isCorrect: true },
        { label: '', isCorrect: false },
      ],
    };
  }
  if (type === 'INPUT') {
    const inputAnswer =
      (typeof record.inputAnswer === 'string' ? record.inputAnswer : '') ||
      (typeof record.answer === 'string' ? record.answer : '') ||
      (typeof record.expectedAnswer === 'string' ? record.expectedAnswer : '') ||
      (typeof record.correctAnswer === 'string' ? record.correctAnswer : '');
    return {
      type: 'INPUT',
      text,
      booleanAnswer: 'true',
      inputAnswer,
      options: [
        { label: '', isCorrect: true },
        { label: '', isCorrect: false },
      ],
    };
  }
  const rawOptions =
    (Array.isArray(record.options) ? record.options : null) ??
    (Array.isArray(record.choices) ? record.choices : null) ??
    [];
  const options =
    rawOptions.length >= 2
      ? rawOptions.map((o) => {
          const opt = o as Record<string, unknown>;
          return {
            id: typeof opt?.id === 'string' ? opt.id : undefined,
            label:
              (typeof opt?.label === 'string' ? opt.label : '') ||
              (typeof opt?.text === 'string' ? opt.text : '') ||
              (typeof opt?.option === 'string' ? opt.option : ''),
            isCorrect: Boolean(opt?.isCorrect ?? opt?.correct),
          };
        })
      : [
          { label: '', isCorrect: true },
          { label: '', isCorrect: false },
        ];
  return {
    type: type === 'MULTIPLE' ? 'MULTIPLE' : 'SINGLE',
    text,
    booleanAnswer: 'true',
    inputAnswer: '',
    options,
  };
}

export function quizToFormValues(quiz: Quiz): QuizFormValues {
  return {
    title: quiz.title,
    description: quiz.description ?? '',
    visibility: quiz.visibility,
    questions: quiz.questions.map((q) => {
      if (q.type === 'BOOLEAN') {
        return questionInputToForm({
          type: 'BOOLEAN',
          text: q.text,
          booleanAnswer: Boolean(q.booleanAnswer),
        });
      }
      if (q.type === 'INPUT') {
        return questionInputToForm({
          type: 'INPUT',
          text: q.text,
          inputAnswer: q.inputAnswer ?? '',
        });
      }
      return questionInputToForm({
        type: q.type,
        text: q.text,
        options: (q.options ?? []).map((o) => ({
          id: o.id,
          label: o.label,
          isCorrect: Boolean(o.isCorrect),
        })),
      });
    }),
  };
}

export function draftToFormValues(draft: QuizImportDraft): QuizFormValues {
  return {
    title: draft.title ?? '',
    description: draft.description ?? '',
    visibility: draft.visibility ?? 'PRIVATE',
    questions:
      draft.questions.length > 0
        ? draft.questions.map((q) => questionInputToForm(q))
        : [emptyQuestion()],
  };
}

export function formValuesToPayload(values: QuizFormValues): CreateQuizInput {
  const description = values.description.trim();
  return {
    title: values.title.trim(),
    description: description || null,
    visibility: values.visibility,
    questions: values.questions.map((q, order) => {
      if (q.type === 'BOOLEAN') {
        return {
          type: 'BOOLEAN' as const,
          text: q.text.trim(),
          booleanAnswer: q.booleanAnswer === 'true',
          order,
        };
      }
      if (q.type === 'INPUT') {
        return {
          type: 'INPUT' as const,
          text: q.text.trim(),
          inputAnswer: q.inputAnswer.trim(),
          order,
        };
      }
      return {
        type: q.type as 'SINGLE' | 'MULTIPLE',
        text: q.text.trim(),
        options: q.options.map((o) => ({
          ...(o.id ? { id: o.id } : {}),
          label: o.label.trim(),
          isCorrect: o.isCorrect,
        })),
        order,
      };
    }),
  };
}

/** Keep only questions that pass client validation (for partial import create). */
export function formValuesToValidOnlyPayload(values: QuizFormValues): CreateQuizInput | null {
  const title = values.title.trim();
  if (!title) return null;

  const description = values.description.trim();
  if (description.length > 500) return null;

  const validQuestions = values.questions.filter((q) => questionFormSchema.safeParse(q).success);
  if (validQuestions.length === 0) return null;

  return formValuesToPayload({
    ...values,
    questions: validQuestions,
  });
}

export function countValidQuestions(values: QuizFormValues): number {
  return values.questions.filter((q) => questionFormSchema.safeParse(q).success).length;
}

export const QUESTION_TYPES: QuestionType[] = ['BOOLEAN', 'INPUT', 'SINGLE', 'MULTIPLE'];
