import { z } from 'zod';

const choiceOptionSchema = z.object({
  label: z.string().trim().min(1, 'Option label is required'),
  isCorrect: z.boolean(),
});

const baseQuestionSchema = z.object({
  type: z.enum(['BOOLEAN', 'INPUT', 'SINGLE', 'MULTIPLE']),
  text: z.string().trim().min(1, 'Question text is required'),
  order: z.number().int().optional(),
});

const booleanQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('BOOLEAN'),
  booleanAnswer: z.boolean({ required_error: 'booleanAnswer is required for BOOLEAN questions' }),
});

const inputQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('INPUT'),
  inputAnswer: z.string().trim().min(1, 'inputAnswer is required for INPUT questions'),
});

const singleQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('SINGLE'),
  options: z
    .array(choiceOptionSchema)
    .min(2, 'SINGLE questions need at least 2 options')
    .refine((opts) => opts.filter((o) => o.isCorrect).length === 1, {
      message: 'SINGLE questions must have exactly one correct option',
    }),
});

const multipleQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('MULTIPLE'),
  options: z
    .array(choiceOptionSchema)
    .min(2, 'MULTIPLE questions need at least 2 options')
    .refine((opts) => opts.some((o) => o.isCorrect), {
      message: 'At least one multiple option must be correct',
    }),
});

export const createQuizSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().max(500).nullish(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  questions: z
    .array(
      z.discriminatedUnion('type', [
        booleanQuestionSchema,
        inputQuestionSchema,
        singleQuestionSchema,
        multipleQuestionSchema,
      ]),
    )
    .min(1, 'At least one question is required'),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;

/** Same payload as create — full replace of quiz metadata + questions. */
export const updateQuizSchema = createQuizSchema;
export type UpdateQuizInput = CreateQuizInput;

export const registerSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export const checkAnswerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('BOOLEAN'),
    answer: z.boolean(),
    inviteToken: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('INPUT'),
    answer: z.string(),
    inviteToken: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('SINGLE'),
    answer: z.string().trim().min(1, 'Select an option'),
    inviteToken: z.string().min(1).optional(),
  }),
  z.object({
    type: z.literal('MULTIPLE'),
    answer: z.array(z.string().trim().min(1)).min(1, 'Select at least one option'),
    inviteToken: z.string().min(1).optional(),
  }),
]);

export type CheckAnswerBody = z.infer<typeof checkAnswerSchema>;

const attemptAnswerSchema = z.discriminatedUnion('type', [
  z.object({
    questionId: z.string().min(1),
    type: z.literal('BOOLEAN'),
    answer: z.boolean(),
  }),
  z.object({
    questionId: z.string().min(1),
    type: z.literal('INPUT'),
    answer: z.string(),
  }),
  z.object({
    questionId: z.string().min(1),
    type: z.literal('SINGLE'),
    answer: z.string().trim().min(1, 'Select an option'),
  }),
  z.object({
    questionId: z.string().min(1),
    type: z.literal('MULTIPLE'),
    answer: z.array(z.string().trim().min(1)).min(1, 'Select at least one option'),
  }),
]);

export const submitAttemptSchema = z.object({
  inviteToken: z.string().min(1).optional(),
  answers: z.array(attemptAnswerSchema).min(1, 'At least one answer is required'),
});

export type SubmitAttemptInput = z.infer<typeof submitAttemptSchema>;
