import { z } from 'zod';
import {
  createQuizSchema,
  questionSchema,
  QUIZ_FORMAT_VERSION,
  quizImportDraftSchema,
  type CreateQuizInput,
  type QuestionInput,
  type QuizImportDraftInput,
} from '../lib/validation';

export type QuestionValidationResult = {
  index: number;
  valid: boolean;
  errors: string[];
  question?: QuestionInput;
};

export type QuizDraftValidation = {
  meta: {
    validCount: number;
    invalidCount: number;
    titleValid: boolean;
    titleErrors: string[];
    descriptionValid: boolean;
    descriptionErrors: string[];
  };
  questions: QuestionValidationResult[];
};

export type QuizImportDraft = QuizImportDraftInput & {
  formatVersion: typeof QUIZ_FORMAT_VERSION;
  title: string;
  description?: string | null;
  visibility: 'PUBLIC' | 'PRIVATE';
  questions: unknown[];
};

function zodErrorsToStrings(error: z.ZodError): string[] {
  return error.errors.map((e) => {
    const path = e.path.length ? `${e.path.join('.')}: ` : '';
    return `${path}${e.message}`;
  });
}

const titleSchema = createQuizSchema.pick({ title: true });
const descriptionSchema = createQuizSchema.pick({ description: true });

function asString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function preprocessImportRaw(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const obj = { ...(raw as Record<string, unknown>) };

  if (!asString(obj.description)) {
    const description =
      asString(obj.summary) ??
      asString(obj.desc) ??
      asString(obj.about) ??
      asString(obj.subtitle) ??
      asString(obj.overview);
    if (description) obj.description = description;
  }

  if (!asString(obj.title)) {
    const title = asString(obj.name) ?? asString(obj.quizTitle) ?? asString(obj.quizName);
    if (title) obj.title = title;
  }

  return obj;
}

/** Map common AI / export field aliases onto our import schema. */
export function normalizeImportedQuestion(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const q = raw as Record<string, unknown>;

  const type = q.type;
  const text =
    asString(q.text) ??
    asString(q.question) ??
    asString(q.questionText) ??
    asString(q.prompt) ??
    '';

  const normalized: Record<string, unknown> = {
    type,
    text,
    order: typeof q.order === 'number' ? q.order : undefined,
  };

  if (type === 'BOOLEAN') {
    if (typeof q.booleanAnswer === 'boolean') {
      normalized.booleanAnswer = q.booleanAnswer;
    } else if (typeof q.booleanAnswer === 'string') {
      normalized.booleanAnswer = q.booleanAnswer.trim().toLowerCase() === 'true';
    } else if (typeof q.answer === 'boolean') {
      normalized.booleanAnswer = q.answer;
    }
  }

  if (type === 'INPUT') {
    normalized.inputAnswer =
      asString(q.inputAnswer) ??
      asString(q.answer) ??
      asString(q.expectedAnswer) ??
      asString(q.correctAnswer) ??
      '';
  }

  if (type === 'SINGLE' || type === 'MULTIPLE') {
    const rawOptions = Array.isArray(q.options)
      ? q.options
      : Array.isArray(q.choices)
        ? q.choices
        : [];
    normalized.options = rawOptions.map((opt) => {
      if (!opt || typeof opt !== 'object') {
        return { label: '', isCorrect: false };
      }
      const o = opt as Record<string, unknown>;
      return {
        ...(typeof o.id === 'string' && o.id.trim() ? { id: o.id.trim() } : {}),
        label:
          asString(o.label) ??
          asString(o.text) ??
          asString(o.option) ??
          asString(o.value) ??
          '',
        isCorrect: Boolean(o.isCorrect ?? o.correct ?? o.is_correct),
      };
    });
  }

  return normalized;
}

export function normalizeImportDraft(raw: unknown): QuizImportDraft {
  const parsed = quizImportDraftSchema.parse(preprocessImportRaw(raw));
  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
  const title = typeof parsed.title === 'string' ? parsed.title : '';
  const description =
    typeof parsed.description === 'string' && parsed.description.trim()
      ? parsed.description.trim()
      : null;
  return {
    formatVersion: QUIZ_FORMAT_VERSION,
    title,
    description,
    visibility: parsed.visibility ?? 'PRIVATE',
    questions: rawQuestions.map(normalizeImportedQuestion),
  };
}

export function validateQuizDraft(draft: QuizImportDraft): QuizDraftValidation {
  const titleResult = titleSchema.safeParse({ title: draft.title });
  const descriptionResult = descriptionSchema.safeParse({ description: draft.description });

  const questions: QuestionValidationResult[] = draft.questions.map((q, index) => {
    const result = questionSchema.safeParse(q);
    if (result.success) {
      return { index, valid: true, errors: [], question: result.data };
    }
    return { index, valid: false, errors: zodErrorsToStrings(result.error) };
  });

  const validCount = questions.filter((q) => q.valid).length;
  const invalidCount = questions.length - validCount;

  return {
    meta: {
      validCount,
      invalidCount,
      titleValid: titleResult.success,
      titleErrors: titleResult.success ? [] : zodErrorsToStrings(titleResult.error),
      descriptionValid: descriptionResult.success,
      descriptionErrors: descriptionResult.success
        ? []
        : zodErrorsToStrings(descriptionResult.error),
    },
    questions,
  };
}

/** Build a create-quiz payload from valid questions only. */
export function buildCreateQuizPayload(
  draft: QuizImportDraft,
  validation: QuizDraftValidation,
  opts?: { validOnly?: boolean },
): CreateQuizInput | null {
  const validOnly = opts?.validOnly ?? false;

  if (!validation.meta.titleValid || !validation.meta.descriptionValid) {
    return null;
  }

  const questions = validOnly
    ? validation.questions.filter((q) => q.valid).map((q) => q.question!)
    : validation.questions.map((q) => q.question).filter(Boolean) as QuestionInput[];

  if (questions.length === 0) {
    return null;
  }

  if (!validOnly) {
    const full = createQuizSchema.safeParse({
      title: draft.title,
      description: draft.description,
      visibility: draft.visibility ?? 'PRIVATE',
      questions,
    });
    return full.success ? full.data : null;
  }

  return {
    title: draft.title.trim(),
    description: draft.description?.trim() || null,
    visibility: draft.visibility ?? 'PRIVATE',
    questions: questions.map((q, order) => ({ ...q, order: q.order ?? order })),
  };
}
