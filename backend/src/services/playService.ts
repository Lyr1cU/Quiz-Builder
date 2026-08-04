import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  defaultAiBudget,
  gradeInputAnswer,
  type AiGradeBudget,
  type GradeInputMethod,
} from './gradeInput';

export type ChoiceOption = { id?: string; label: string; isCorrect?: boolean };

export type CheckAnswerInput =
  | { type: 'BOOLEAN'; answer: boolean }
  | { type: 'INPUT'; answer: string }
  | { type: 'SINGLE'; answer: string }
  | { type: 'MULTIPLE'; answer: string[] };

export type GradeQuestionResult = {
  questionId: string;
  type: string;
  isCorrect: boolean;
  /** What the client sent — option ids for SINGLE/MULTIPLE. */
  userAnswer: boolean | string | string[];
  /** Same answer in human-readable form (option labels), for attempt history. */
  storedAnswer: boolean | string | string[];
  gradingMethod?: GradeInputMethod;
};

type QuestionRow = {
  id: string;
  type: string;
  text: string;
  booleanAnswer: boolean | null;
  inputAnswer: string | null;
  options: Prisma.JsonValue | null;
};

export function newOptionId(): string {
  return randomBytes(8).toString('hex');
}

/** Persist-ready options with stable ids (assign if missing). */
export function withOptionIds(
  options: Array<{ id?: string; label: string; isCorrect: boolean }>,
): Array<{ id: string; label: string; isCorrect: boolean }> {
  return options.map((o) => ({
    id: o.id?.trim() || newOptionId(),
    label: o.label,
    isCorrect: o.isCorrect,
  }));
}

export function parseOptions(options: Prisma.JsonValue | null): ChoiceOption[] {
  if (!Array.isArray(options)) return [];
  return options as ChoiceOption[];
}

/** Stable ids for legacy rows that predate option ids. */
export function optionsForPlay(options: Prisma.JsonValue | null): Array<{ id: string; label: string }> {
  return parseOptions(options).map((o, i) => ({
    id: o.id?.trim() || `legacy-${i}`,
    label: o.label,
  }));
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function sameIdSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].map((v) => v.trim()).sort();
  const right = [...b].map((v) => v.trim()).sort();
  return left.every((v, i) => v === right[i]);
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].map(normalizeText).sort();
  const right = [...b].map(normalizeText).sort();
  return left.every((v, i) => v === right[i]);
}

export async function assertCanAccessQuiz(
  quizId: string,
  opts: { viewerId?: string; inviteToken?: string },
) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  const isOwner = Boolean(opts.viewerId && quiz.ownerId === opts.viewerId);
  if (quiz.visibility === 'PUBLIC' || isOwner) {
    return quiz;
  }

  if (opts.inviteToken && quiz.inviteToken && opts.inviteToken === quiz.inviteToken) {
    return quiz;
  }

  throw new AppError('Quiz not found', 404);
}

/**
 * Grade against an already-loaded question (no DB / access checks).
 * SINGLE/MULTIPLE answers are option ids; legacy label answers still accepted.
 */
export async function gradeLoadedQuestion(
  question: QuestionRow,
  input: CheckAnswerInput,
  budget?: AiGradeBudget,
): Promise<GradeQuestionResult> {
  if (question.type !== input.type) {
    throw new AppError(`Answer type must be ${question.type}`, 400);
  }

  if (question.type === 'BOOLEAN') {
    const answer = (input as { type: 'BOOLEAN'; answer: boolean }).answer;
    return {
      questionId: question.id,
      type: question.type,
      isCorrect: answer === Boolean(question.booleanAnswer),
      userAnswer: answer,
      storedAnswer: answer,
    };
  }

  if (question.type === 'INPUT') {
    const answer = (input as { type: 'INPUT'; answer: string }).answer;
    const graded = await gradeInputAnswer(
      {
        questionText: question.text,
        expected: question.inputAnswer ?? '',
        actual: answer,
      },
      budget,
    );
    return {
      questionId: question.id,
      type: question.type,
      isCorrect: graded.isCorrect,
      userAnswer: answer,
      storedAnswer: answer,
      gradingMethod: graded.method,
    };
  }

  const options = parseOptions(question.options).map((o, i) => ({
    id: o.id?.trim() || `legacy-${i}`,
    label: o.label,
    isCorrect: Boolean(o.isCorrect),
  }));
  const correctIds = options.filter((o) => o.isCorrect).map((o) => o.id);
  const correctLabels = options.filter((o) => o.isCorrect).map((o) => o.label);
  const byId = new Map(options.map((o) => [o.id, o]));

  if (question.type === 'SINGLE') {
    const answer = (input as { type: 'SINGLE'; answer: string }).answer.trim();
    const byOptionId = byId.get(answer);
    let isCorrect = false;
    if (byOptionId) {
      isCorrect = Boolean(byOptionId.isCorrect);
    } else {
      // Legacy clients that still send the option label
      isCorrect =
        correctLabels.length === 1 && normalizeText(answer) === normalizeText(correctLabels[0]);
    }
    return {
      questionId: question.id,
      type: question.type,
      isCorrect,
      userAnswer: answer,
      storedAnswer: byOptionId?.label ?? answer,
    };
  }

  // MULTIPLE — prefer ids; fall back to labels if none of the answers match ids
  const answer = (input as { type: 'MULTIPLE'; answer: string[] }).answer.map((a) => a.trim());
  const allIdsKnown = answer.every((a) => byId.has(a));
  const isCorrect = allIdsKnown
    ? sameIdSet(answer, correctIds)
    : sameStringSet(answer, correctLabels);

  return {
    questionId: question.id,
    type: question.type,
    isCorrect,
    userAnswer: answer,
    storedAnswer: answer.map((a) => byId.get(a)?.label ?? a),
  };
}

export async function getPlayQuiz(
  quizId: string,
  opts: { viewerId?: string; inviteToken?: string },
) {
  await assertCanAccessQuiz(quizId, opts);

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    visibility: quiz.visibility,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      quizId: q.quizId,
      type: q.type,
      text: q.text,
      order: q.order,
      options:
        q.type === 'SINGLE' || q.type === 'MULTIPLE' ? optionsForPlay(q.options) : null,
    })),
  };
}

export async function getPlayQuizByInvite(token: string) {
  const quiz = await prisma.quiz.findFirst({
    where: { inviteToken: token },
  });
  if (!quiz) {
    throw new AppError('Invite link is invalid or expired', 404);
  }

  return getPlayQuiz(quiz.id, { inviteToken: token });
}

export async function checkQuestionAnswer(
  quizId: string,
  questionId: string,
  input: CheckAnswerInput,
  opts: { viewerId?: string; inviteToken?: string },
) {
  await assertCanAccessQuiz(quizId, opts);

  const question = await prisma.question.findFirst({
    where: { id: questionId, quizId },
  });
  if (!question) {
    throw new AppError('Question not found', 404);
  }

  return gradeLoadedQuestion(question, input, defaultAiBudget());
}
