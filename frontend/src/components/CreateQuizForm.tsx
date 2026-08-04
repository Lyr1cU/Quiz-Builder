'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus } from 'lucide-react';
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
import {
  countValidQuestions,
  emptyQuestion,
  formValuesToPayload,
  formValuesToValidOnlyPayload,
  quizFormSchema,
  quizToFormValues,
  type QuizFormValues,
} from '@/lib/quizFormUtils';
import { api } from '@/services/api';
import type { QuestionType, Quiz, QuizDraftValidation } from '@/types/quiz';

type Props =
  | { mode?: 'create' }
  | { mode: 'edit'; quiz: Quiz }
  | {
      mode: 'import';
      initialValues: QuizFormValues;
      importValidation: QuizDraftValidation;
      onCancel: () => void;
    };

export function CreateQuizForm(props: Props) {
  const mode = props.mode === 'edit' ? 'edit' : props.mode === 'import' ? 'import' : 'create';
  const quiz = props.mode === 'edit' ? props.quiz : null;
  const importValidation = props.mode === 'import' ? props.importValidation : null;
  const onCancel = props.mode === 'import' ? props.onCancel : undefined;

  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const defaultValues: QuizFormValues =
    props.mode === 'import'
      ? props.initialValues
      : quiz
        ? quizToFormValues(quiz)
        : {
            title: '',
            description: '',
            visibility: 'PUBLIC',
            questions: [emptyQuestion()],
          };

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<QuizFormValues>({
    resolver: zodResolver(quizFormSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'questions',
  });

  const questions = watch('questions');
  const title = watch('title');
  const description = watch('description');
  const visibility = watch('visibility');
  const liveValidCount = countValidQuestions({ title, description, visibility, questions });

  async function saveQuiz(payload: ReturnType<typeof formValuesToPayload>) {
    const saved =
      mode === 'edit' && quiz
        ? await api.updateQuiz(quiz.id, payload)
        : await api.createQuiz(payload);
    router.push(`/quizzes/${saved.id}`);
  }

  async function onSubmit(values: QuizFormValues) {
    setSubmitError(null);
    setValidationError(null);
    try {
      await saveQuiz(formValuesToPayload(values));
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

  async function onPartialCreate() {
    setSubmitError(null);
    setValidationError(null);
    const values = getValues();
    const payload = formValuesToValidOnlyPayload(values);
    if (!payload) {
      setValidationError('Fix the quiz title and add at least one valid question.');
      return;
    }
    try {
      await saveQuiz(payload);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create quiz');
    }
  }

  function onInvalid() {
    setValidationError(
      mode === 'edit'
        ? 'Please fix the highlighted fields before saving the quiz.'
        : 'Please fix the highlighted fields before creating the quiz.',
    );
  }

  const importInvalidCount = importValidation?.meta.invalidCount ?? 0;
  const showPartialCreate =
    mode === 'import' && importInvalidCount > 0 && liveValidCount > 0;

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="animate-in animate-in-delay-1 flex flex-col gap-8"
    >
      {mode === 'import' && importValidation && (
        <div className="surface-card space-y-2 px-5 py-4 text-sm text-[var(--ink)]">
          <p className="font-semibold">Import preview</p>
          <p className="text-muted-foreground">
            {importValidation.meta.validCount} of {importValidation.questions.length} questions
            passed validation.
            {importValidation.meta.invalidCount > 0 &&
              ' Fix errors below, or create a quiz from valid questions only.'}
          </p>
          {!importValidation.meta.titleValid && importValidation.meta.titleErrors.length > 0 && (
            <p className="text-[var(--danger)]">
              Title: {importValidation.meta.titleErrors.join('; ')}
            </p>
          )}
        </div>
      )}

      <div className="surface-card flex flex-col gap-6 px-5 py-7 sm:px-7">
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-semibold text-ink">
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
          <label htmlFor="description" className="mb-2 block text-sm font-semibold text-ink">
            Description <span className="font-normal text-muted-foreground">(optional)</span>
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
          <p className="mb-2 text-sm font-semibold text-ink">Visibility</p>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                value="PUBLIC"
                {...register('visibility')}
                className="accent-[var(--gold-from)]"
              />
              Public — visible in the catalog
            </label>
            <label className="flex items-center gap-2 text-sm text-ink">
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
      </div>

      <div className="flex flex-col gap-5">
        <h2 className="font-serif text-2xl font-semibold text-white">Questions</h2>

        {errors.questions?.root && (
          <p className="rounded-xl bg-white/95 px-4 py-3 text-sm text-[var(--danger)]">
            {errors.questions.root.message}
          </p>
        )}
        {typeof errors.questions?.message === 'string' && (
          <p className="rounded-xl bg-white/95 px-4 py-3 text-sm text-[var(--danger)]">
            {errors.questions.message}
          </p>
        )}

        {fields.map((field, index) => {
          const type = (questions?.[index]?.type || 'BOOLEAN') as QuestionType;
          const qErrors = errors.questions?.[index];
          const importQErrors =
            importValidation && !importValidation.questions[index]?.valid
              ? importValidation.questions[index]?.errors
              : undefined;

          return (
            <fieldset key={field.id} className="surface-card stagger-item overflow-hidden">
              <div className="flex items-center justify-between bg-[#e8dfd0] px-5 py-3">
                <legend className="text-sm font-semibold text-[var(--ink)]">
                  Question {index + 1}
                  {importQErrors?.length ? (
                    <span className="ml-2 font-normal text-[var(--danger)]">(needs fix)</span>
                  ) : null}
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

              {importQErrors && importQErrors.length > 0 && (
                <div className="border-b border-[var(--line)] bg-red-50 px-5 py-3 text-sm text-[var(--danger)]">
                  <ul className="list-inside list-disc space-y-0.5">
                    {importQErrors.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                </div>
              )}

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

      <div className="flex flex-col items-stretch justify-between gap-4 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => append(emptyQuestion())}
            className="btn-motion inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-secondary bg-white px-8 text-sm font-bold text-secondary shadow-md hover:bg-secondary hover:text-white"
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
            Add question
          </button>
          {mode === 'import' && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/40 bg-white/10 px-8 text-sm font-semibold text-white hover:bg-white/20"
            >
              Cancel
            </button>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {showPartialCreate && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void onPartialCreate()}
              className="h-12 rounded-full border-2 border-white bg-white/95 px-8 text-sm font-bold text-secondary hover:bg-white disabled:opacity-50"
            >
              {isSubmitting
                ? 'Creating…'
                : `Create with ${liveValidCount} valid question${liveValidCount === 1 ? '' : 's'}`}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || (mode === 'import' && liveValidCount === 0)}
            className="gold-btn h-12 w-full rounded-full px-10 text-sm font-bold sm:w-auto sm:min-w-[12rem] disabled:opacity-50"
          >
            {isSubmitting
              ? mode === 'edit'
                ? 'Saving…'
                : 'Creating…'
              : mode === 'edit'
                ? 'Save changes'
                : 'Create quiz'}
          </button>
        </div>
      </div>
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
  control: Control<QuizFormValues>;
  register: UseFormRegister<QuizFormValues>;
  setValue: UseFormSetValue<QuizFormValues>;
  watch: UseFormWatch<QuizFormValues>;
  questionErrors?: FieldErrors<QuizFormValues['questions'][number]>;
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
