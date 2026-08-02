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
  type UseFormSetValue,
  type UseFormWatch,
} from 'react-hook-form';
import { z } from 'zod';
import { api } from '@/services/api';
import type { CreateQuizInput, QuestionType, Quiz } from '@/types/quiz';

const optionSchema = z.object({
  label: z.string(),
  isCorrect: z.boolean(),
});

const questionSchema = z
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

const formSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().max(500, 'Description must be 500 characters or less'),
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
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

function quizToFormValues(quiz: Quiz): FormValues {
  return {
    title: quiz.title,
    description: quiz.description ?? '',
    visibility: quiz.visibility,
    questions: quiz.questions.map((q) => {
      const options =
        q.options && q.options.length >= 2
          ? q.options.map((o) => ({
              label: o.label,
              isCorrect: Boolean(o.isCorrect),
            }))
          : [
              { label: '', isCorrect: true },
              { label: '', isCorrect: false },
            ];

      return {
        type: q.type,
        text: q.text,
        booleanAnswer: q.booleanAnswer === false ? 'false' : 'true',
        inputAnswer: q.inputAnswer ?? '',
        options,
      };
    }),
  };
}

function toPayload(values: FormValues): CreateQuizInput {
  const description = values.description.trim();
  return {
    title: values.title.trim(),
    description: description || null,
    visibility: values.visibility,
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
        type: q.type,
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

type Props =
  | { mode?: 'create' }
  | { mode: 'edit'; quiz: Quiz };

export function CreateQuizForm(props: Props) {
  const mode = props.mode === 'edit' ? 'edit' : 'create';
  const quiz = props.mode === 'edit' ? props.quiz : null;
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: quiz
      ? quizToFormValues(quiz)
      : {
          title: '',
          description: '',
          visibility: 'PUBLIC',
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
      const payload = toPayload(values);
      const saved =
        mode === 'edit' && quiz
          ? await api.updateQuiz(quiz.id, payload)
          : await api.createQuiz(payload);
      router.push(`/quizzes/${saved.id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : mode === 'edit'
            ? 'Failed to update quiz'
            : 'Failed to create quiz',
      );
    }
  }

  function onInvalid() {
    setValidationError(
      mode === 'edit'
        ? 'Please fix the highlighted fields before saving the quiz.'
        : 'Please fix the highlighted fields before creating the quiz.',
    );
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

      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-semibold text-white/90">
          Description <span className="font-normal text-white/50">(optional)</span>
        </label>
        <textarea
          id="description"
          rows={3}
          {...register('description')}
          className="field-input !rounded-2xl"
          placeholder="Brief overview of what this quiz covers"
        />
        {errors.description && (
          <p className="mt-1.5 text-sm text-[var(--danger)]">{errors.description.message}</p>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-white/90">Visibility</p>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-white/90">
            <input
              type="radio"
              value="PUBLIC"
              {...register('visibility')}
              className="accent-[var(--gold-from)]"
            />
            Public — visible in the catalog
          </label>
          <label className="flex items-center gap-2 text-sm text-white/90">
            <input
              type="radio"
              value="PRIVATE"
              {...register('visibility')}
              className="accent-[var(--gold-from)]"
            />
            Private — only you + invite link
          </label>
        </div>
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
                    <option value="SINGLE">Single choice</option>
                    <option value="MULTIPLE">Multiple choice</option>
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

                {(type === 'SINGLE' || type === 'MULTIPLE') && (
                  <ChoiceOptions
                    questionIndex={index}
                    mode={type === 'SINGLE' ? 'single' : 'multiple'}
                    control={control}
                    register={register}
                    setValue={setValue}
                    watch={watch}
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
        {isSubmitting
          ? mode === 'edit'
            ? 'Saving…'
            : 'Creating…'
          : mode === 'edit'
            ? 'Save changes'
            : 'Create quiz'}
      </button>
    </form>
  );
}

function ChoiceOptions({
  questionIndex,
  mode,
  control,
  register,
  setValue,
  watch,
  questionErrors,
}: {
  questionIndex: number;
  mode: 'single' | 'multiple';
  control: Control<FormValues>;
  register: UseFormRegister<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  watch: UseFormWatch<FormValues>;
  questionErrors?: FieldErrors<FormValues['questions'][number]>;
}) {
  const errorMessage =
    questionErrors?.options?.message || questionErrors?.options?.root?.message || undefined;
  const optionErrors = questionErrors?.options;
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options`,
  });

  const optionValues = watch(`questions.${questionIndex}.options`);

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
              {mode === 'multiple' ? (
                <input
                  type="checkbox"
                  className="accent-[var(--gold-from)]"
                  checked={optionValues?.[optIndex]?.isCorrect ?? false}
                  onChange={(e) => {
                    setValue(
                      `questions.${questionIndex}.options.${optIndex}.isCorrect`,
                      e.target.checked,
                      { shouldDirty: true, shouldValidate: true },
                    );
                  }}
                />
              ) : (
                <input
                  type="radio"
                  name={`questions.${questionIndex}.correct`}
                  className="accent-[var(--gold-from)]"
                  checked={optionValues?.[optIndex]?.isCorrect ?? false}
                  onChange={() => {
                    fields.forEach((_, i) => {
                      setValue(
                        `questions.${questionIndex}.options.${i}.isCorrect`,
                        i === optIndex,
                        { shouldDirty: true, shouldValidate: true },
                      );
                    });
                  }}
                />
              )}
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
