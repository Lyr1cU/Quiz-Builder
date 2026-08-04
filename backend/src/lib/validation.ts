import { z } from 'zod';

const MAX_TITLE = 200;
const MAX_QUESTION_TEXT = 2000;
const MAX_OPTION_LABEL = 500;
const MAX_INPUT_ANSWER = 500;
const MAX_OPTIONS = 20;
const MAX_QUESTIONS = 100;
const MAX_PASSWORD = 128;
const MAX_SEARCH = 100;

const choiceOptionSchema = z.object({
  id: z.string().trim().min(1).max(64).optional(),
  label: z.string().trim().min(1, 'Option label is required').max(MAX_OPTION_LABEL),
  isCorrect: z.boolean(),
});

type ChoiceOptionInput = z.infer<typeof choiceOptionSchema>;

/**
 * Option ids address answers, so duplicates would make grading ambiguous.
 * The `legacy-` prefix is reserved: the server mints it for rows saved before ids existed.
 */
function checkOptionIds(options: ChoiceOptionInput[], ctx: z.RefinementCtx) {
  const seen = new Set<string>();
  options.forEach((option, index) => {
    const id = option.id?.trim();
    if (!id) return;

    if (id.toLowerCase().startsWith('legacy-')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Option id must not start with "legacy-"',
        path: [index, 'id'],
      });
      return;
    }

    if (seen.has(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Option ids must be unique within a question',
        path: [index, 'id'],
      });
      return;
    }
    seen.add(id);
  });
}

const baseQuestionSchema = z.object({
  type: z.enum(['BOOLEAN', 'INPUT', 'SINGLE', 'MULTIPLE']),
  text: z.string().trim().min(1, 'Question text is required').max(MAX_QUESTION_TEXT),
  order: z.number().int().optional(),
});

const booleanQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('BOOLEAN'),
  booleanAnswer: z.boolean({ required_error: 'booleanAnswer is required for BOOLEAN questions' }),
});

const inputQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('INPUT'),
  inputAnswer: z
    .string()
    .trim()
    .min(1, 'inputAnswer is required for INPUT questions')
    .max(MAX_INPUT_ANSWER),
});

const singleQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('SINGLE'),
  options: z
    .array(choiceOptionSchema)
    .min(2, 'SINGLE questions need at least 2 options')
    .max(MAX_OPTIONS)
    .refine((opts) => opts.filter((o) => o.isCorrect).length === 1, {
      message: 'SINGLE questions must have exactly one correct option',
    })
    .superRefine(checkOptionIds),
});

const multipleQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('MULTIPLE'),
  options: z
    .array(choiceOptionSchema)
    .min(2, 'MULTIPLE questions need at least 2 options')
    .max(MAX_OPTIONS)
    .refine((opts) => opts.some((o) => o.isCorrect), {
      message: 'At least one multiple option must be correct',
    })
    .superRefine(checkOptionIds),
});

export const questionSchema = z.discriminatedUnion('type', [
  booleanQuestionSchema,
  inputQuestionSchema,
  singleQuestionSchema,
  multipleQuestionSchema,
]);

export type QuestionInput = z.infer<typeof questionSchema>;

const quizMetadataSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(MAX_TITLE),
  description: z.string().trim().max(500).nullish(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
});

export const createQuizSchema = quizMetadataSchema.extend({
  questions: z
    .array(questionSchema)
    .min(1, 'At least one question is required')
    .max(MAX_QUESTIONS),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

/** Same payload as create — full replace of quiz metadata + questions. */
export const updateQuizSchema = createQuizSchema;
export type UpdateQuizInput = CreateQuizInput;

export const registerSchema = z.object({
  email: z.string().trim().email('Valid email is required').max(254),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(MAX_PASSWORD, 'Password is too long'),
  name: z.string().trim().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required').max(254),
  password: z.string().min(1, 'Password is required').max(MAX_PASSWORD),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const checkAnswerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('BOOLEAN'),
    answer: z.boolean(),
    inviteToken: z.string().min(1).max(128).optional(),
  }),
  z.object({
    type: z.literal('INPUT'),
    answer: z.string().max(MAX_INPUT_ANSWER),
    inviteToken: z.string().min(1).max(128).optional(),
  }),
  z.object({
    type: z.literal('SINGLE'),
    answer: z.string().trim().min(1, 'Select an option').max(MAX_OPTION_LABEL),
    inviteToken: z.string().min(1).max(128).optional(),
  }),
  z.object({
    type: z.literal('MULTIPLE'),
    answer: z
      .array(z.string().trim().min(1).max(MAX_OPTION_LABEL))
      .min(1, 'Select at least one option')
      .max(MAX_OPTIONS),
    inviteToken: z.string().min(1).max(128).optional(),
  }),
]);

export type CheckAnswerBody = z.infer<typeof checkAnswerSchema>;

const attemptAnswerSchema = z.discriminatedUnion('type', [
  z.object({
    questionId: z.string().min(1).max(64),
    type: z.literal('BOOLEAN'),
    answer: z.boolean(),
  }),
  z.object({
    questionId: z.string().min(1).max(64),
    type: z.literal('INPUT'),
    answer: z.string().max(MAX_INPUT_ANSWER),
  }),
  z.object({
    questionId: z.string().min(1).max(64),
    type: z.literal('SINGLE'),
    answer: z.string().trim().min(1, 'Select an option').max(MAX_OPTION_LABEL),
  }),
  z.object({
    questionId: z.string().min(1).max(64),
    type: z.literal('MULTIPLE'),
    answer: z
      .array(z.string().trim().min(1).max(MAX_OPTION_LABEL))
      .min(1, 'Select at least one option')
      .max(MAX_OPTIONS),
  }),
]);

export const submitAttemptSchema = z.object({
  inviteToken: z.string().min(1).max(128).optional(),
  answers: z
    .array(attemptAnswerSchema)
    .min(1, 'At least one answer is required')
    .max(MAX_QUESTIONS),
});

export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;

export const listQuizzesQuerySchema = z.object({
  q: z.string().trim().max(MAX_SEARCH).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const QUIZ_FORMAT_VERSION = 1;

export const quizImportDraftSchema = quizMetadataSchema.extend({
  formatVersion: z.literal(QUIZ_FORMAT_VERSION),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PRIVATE'),
  questions: z.array(z.unknown()).max(MAX_QUESTIONS),
});

export type QuizImportDraftInput = z.infer<typeof quizImportDraftSchema>;

const MAX_SOURCE_TEXT = 30_000;
const MAX_GENERATE_QUESTIONS = 30;
const MAX_GENERATE_INSTRUCTIONS = 1000;

export const generateQuizRequestSchema = z.object({
  sourceText: z
    .string()
    .trim()
    .min(50, 'Study text must be at least 50 characters')
    .max(MAX_SOURCE_TEXT, 'Study text is too long'),
  preferences: z
    .object({
      questionCount: z
        .number()
        .int()
        .min(1)
        .max(MAX_GENERATE_QUESTIONS)
        .optional(),
      types: z
        .array(z.enum(['BOOLEAN', 'INPUT', 'SINGLE', 'MULTIPLE']))
        .min(1)
        .optional(),
      instructions: z.string().trim().max(MAX_GENERATE_INSTRUCTIONS).optional(),
    })
    .optional(),
});

export type GenerateQuizRequest = z.infer<typeof generateQuizRequestSchema>;
