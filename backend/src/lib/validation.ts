import { z } from 'zod';

const checkboxOptionSchema = z.object({
  label: z.string().trim().min(1, 'Option label is required'),
  isCorrect: z.boolean(),
});

const baseQuestionSchema = z.object({
  type: z.enum(['BOOLEAN', 'INPUT', 'CHECKBOX']),
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

const checkboxQuestionSchema = baseQuestionSchema.extend({
  type: z.literal('CHECKBOX'),
  options: z
    .array(checkboxOptionSchema)
    .min(2, 'CHECKBOX questions need at least 2 options')
    .refine((opts) => opts.some((o) => o.isCorrect), {
      message: 'At least one checkbox option must be correct',
    }),
});

export const createQuizSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  questions: z
    .array(z.discriminatedUnion('type', [booleanQuestionSchema, inputQuestionSchema, checkboxQuestionSchema]))
    .min(1, 'At least one question is required'),
});

export type CreateQuizInput = z.infer<typeof createQuizSchema>;
