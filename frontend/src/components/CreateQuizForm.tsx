'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  useFieldArray,
  useForm,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/services/api';
import type { CreateQuizInput, QuestionType } from '@/types/quiz';

const optionSchema = z.object({
  label: z.string(),
  isCorrect: z.boolean(),
});

const questionSchema = z
  .object({
    type: z.enum(['BOOLEAN', 'INPUT', 'CHECKBOX']),
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
    if (q.type === 'CHECKBOX') {
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
      if (!q.options.some((o) => o.isCorrect)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Mark at least one option as correct',
          path: ['options'],
        });
      }
    }
  });

const formSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  questions: z.array(questionSchema).min(1, 'Add at least one question'),
});

type FormValues = z.infer<typeof formSchema>;

function emptyQuestion(): FormValues['questions'][number] {
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

function toPayload(values: FormValues): CreateQuizInput {
  return {
    title: values.title.trim(),
    questions: values.questions.map((q, order) => {
      if (q.type === 'BOOLEAN') {
        return {
          type: 'BOOLEAN',
          text: q.text.trim(),
          booleanAnswer: q.booleanAnswer === 'true',
          order,
        };
      }
      if (q.type === 'INPUT') {
        return {
          type: 'INPUT',
          text: q.text.trim(),
          inputAnswer: q.inputAnswer.trim(),
          order,
        };
      }
      return {
        type: 'CHECKBOX',
        text: q.text.trim(),
        options: q.options.map((o) => ({
          label: o.label.trim(),
          isCorrect: o.isCorrect,
        })),
        order,
      };
    }),
  };
}

export function CreateQuizForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      questions: [emptyQuestion()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });

  const questions = watch('questions');

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    setValidationError(null);
    try {
      const quiz = await api.createQuiz(toPayload(values));
      router.push(`/quizzes/${quiz.id}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create quiz');
    }
  }

  function onInvalid() {
    setValidationError('Please fix the highlighted fields before creating the quiz.');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-8">
      <div>
        <label htmlFor="title" className="mb-2 block text-sm font-semibold text-white/90">
          Quiz title
        </label>
        <input
          id="title"
          type="text"
          {...register('title')}
          className="field-input"
          placeholder="e.g. JavaScript Basics"
        />
        {errors.title && (
          <p className="mt-1.5 text-sm text-[var(--danger)]">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white/90">Questions</h2>
          <button
            type="button"
            onClick={() => append(emptyQuestion())}
            className="gold-btn rounded-full px-4 py-2 text-sm font-semibold"
          >
            Add question +
          </button>
        </div>

        {errors.questions?.root && (
          <p className="text-sm text-[var(--danger)]">{errors.questions.root.message}</p>
        )}
        {typeof errors.questions?.message === 'string' && (
          <p className="text-sm text-[var(--danger)]">{errors.questions.message}</p>
        )}

        {fields.map((field, index) => {
          const type = (questions?.[index]?.type || 'BOOLEAN') as QuestionType;
          const qErrors = errors.questions?.[index];

          return (
            <fieldset key={field.id} className="surface-card stagger-item overflow-hidden">
              <div className="flex items-center justify-between bg-[#e8dfd0] px-5 py-3">
                <legend className="text-sm font-semibold text-[var(--ink)]">
                  Question {index + 1}
                </legend>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-sm font-medium text-[var(--danger)] hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              <div className="space-y-4 px-5 py-5">
                <div className="max-w-xs">
                  <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">Type</label>
                  <select {...register(`questions.${index}.type`)} className="field-select">
                    <option value="BOOLEAN">Boolean</option>
                    <option value="INPUT">Input</option>
                    <option value="CHECKBOX">Checkbox</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">
                    Question text
                  </label>
                  <input
                    type="text"
                    {...register(`questions.${index}.text`)}
                    className="field-input"
                    placeholder="Enter the question"
                  />
                  {qErrors?.text && (
                    <p className="mt-1.5 text-sm text-[var(--danger)]">{qErrors.text.message}</p>
                  )}
                </div>

                {type === 'BOOLEAN' && (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-[var(--ink)]">Correct answer</p>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                        <input
                          type="radio"
                          value="true"
                          {...register(`questions.${index}.booleanAnswer`)}
                          className="accent-[var(--gold-from)]"
                        />
                        True
                      </label>
                      <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                        <input
                          type="radio"
                          value="false"
                          {...register(`questions.${index}.booleanAnswer`)}
                          className="accent-[var(--gold-from)]"
                        />
                        False
                      </label>
                    </div>
                  </div>
                )}

                {type === 'INPUT' && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[var(--ink)]">
                      Expected answer
                    </label>
                    <input
                      type="text"
                      {...register(`questions.${index}.inputAnswer`)}
                      className="field-input"
                      placeholder="Short text answer"
                    />
                    {qErrors?.inputAnswer && (
                      <p className="mt-1.5 text-sm text-[var(--danger)]">
                        {qErrors.inputAnswer.message}
                      </p>
                    )}
                  </div>
                )}

                {type === 'CHECKBOX' && (
                  <CheckboxOptions
                    questionIndex={index}
                    control={control}
                    register={register}
                    questionErrors={qErrors}
                  />
                )}
              </div>
            </fieldset>
          );
        })}
      </div>

      {validationError && (
        <p className="rounded-xl bg-white/95 px-4 py-3 text-sm text-[var(--danger)] shadow-sm">
          {validationError}
        </p>
      )}

      {submitError && (
        <p className="rounded-xl bg-white/95 px-4 py-3 text-sm text-[var(--danger)] shadow-sm">
          {submitError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="gold-btn w-full rounded-full px-6 py-3.5 text-sm font-semibold sm:w-auto sm:min-w-[12rem]"
      >
        {isSubmitting ? 'Creating…' : 'Create quiz'}
      </button>
    </form>
  );
}

function CheckboxOptions({
  questionIndex,
  control,
  register,
  questionErrors,
}: {
  questionIndex: number;
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  questionErrors?: FieldErrors<FormValues['questions'][number]>;
}) {
  const errorMessage =
    questionErrors?.options?.message || questionErrors?.options?.root?.message || undefined;
  const optionErrors = questionErrors?.options;
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--ink)]">Options</p>
        <button
          type="button"
          onClick={() => append({ label: '', isCorrect: false })}
          className="text-sm font-medium text-[var(--gold-to)] hover:underline"
        >
          Add option
        </button>
      </div>
      {errorMessage && <p className="text-sm text-[var(--danger)]">{errorMessage}</p>}
      <ul className="space-y-2">
        {fields.map((opt, optIndex) => (
          <li key={opt.id} className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              {...register(`questions.${questionIndex}.options.${optIndex}.label`)}
              className="field-input min-w-[12rem] flex-1 !rounded-2xl"
              placeholder={`Option ${optIndex + 1}`}
            />
            {Array.isArray(optionErrors) && optionErrors[optIndex]?.label && (
              <p className="w-full text-sm text-[var(--danger)]">
                {optionErrors[optIndex]?.label?.message}
              </p>
            )}
            <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
              <input
                type="checkbox"
                {...register(`questions.${questionIndex}.options.${optIndex}.isCorrect`)}
                className="accent-[var(--gold-from)]"
              />
              Correct
            </label>
            {fields.length > 2 && (
              <button
                type="button"
                onClick={() => remove(optIndex)}
                className="text-sm text-[var(--danger)] hover:underline"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
