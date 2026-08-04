import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { SubmitAttemptInput } from '../lib/validation';
import {
  assertCanAccessQuiz,
  gradeLoadedQuestion,
  type CheckAnswerInput,
} from './playService';
import { aiBudgetForInputs, isUnverifiedMethod, type GradeInputMethod } from './gradeInput';

function mapAttemptAnswer(answer: {
  id: string;
  questionId: string | null;
  questionText: string;
  questionType: string;
  userAnswer: Prisma.JsonValue;
  isCorrect: boolean;
  order: number;
  gradingMethod: string | null;
}) {
  return {
    id: answer.id,
    questionId: answer.questionId,
    questionText: answer.questionText,
    questionType: answer.questionType,
    userAnswer: answer.userAnswer,
    isCorrect: answer.isCorrect,
    order: answer.order,
    gradingMethod: (answer.gradingMethod as GradeInputMethod | null) ?? null,
  };
}

function mapAttemptListItem(attempt: {
  id: string;
  quizId: string;
  scoreCorrect: number;
  scoreTotal: number;
  createdAt: Date;
  userId: string | null;
  user: { id: string; email: string; name: string | null } | null;
  quiz?: { id: string; title: string };
}) {
  return {
    id: attempt.id,
    quizId: attempt.quizId,
    quizTitle: attempt.quiz?.title,
    scoreCorrect: attempt.scoreCorrect,
    scoreTotal: attempt.scoreTotal,
    createdAt: attempt.createdAt,
    user: attempt.user
      ? { id: attempt.user.id, email: attempt.user.email, name: attempt.user.name }
      : null,
  };
}

export async function submitAttempt(
  quizId: string,
  data: SubmitAttemptInput,
  opts: { viewerId: string },
) {
  // Access first — avoid leaking empty vs missing quiz.
  await assertCanAccessQuiz(quizId, {
    viewerId: opts.viewerId,
    inviteToken: data.inviteToken,
  });

  const questions = await prisma.question.findMany({
    where: { quizId },
    orderBy: { order: 'asc' },
  });
  if (questions.length === 0) {
    throw new AppError('Quiz has no questions', 400);
  }

  const byId = new Map(questions.map((q) => [q.id, q]));
  if (data.answers.length !== questions.length) {
    throw new AppError('Submit an answer for every question', 400);
  }

  const seen = new Set<string>();
  for (const a of data.answers) {
    if (seen.has(a.questionId)) {
      throw new AppError('Duplicate answer for a question', 400);
    }
    seen.add(a.questionId);
    if (!byId.has(a.questionId)) {
      throw new AppError('One or more questions do not belong to this quiz', 400);
    }
  }

  // One shared AI budget for the whole attempt (cache also dedupes check→submit).
  const budget = aiBudgetForInputs(data.answers.filter((a) => a.type === 'INPUT').length);
  const graded = [];
  for (const a of data.answers) {
    const question = byId.get(a.questionId)!;
    const input = { type: a.type, answer: a.answer } as CheckAnswerInput;
    const result = await gradeLoadedQuestion(question, input, budget);
    graded.push({
      questionId: question.id,
      questionText: question.text,
      questionType: question.type,
      // Labels, not option ids — history must stay readable.
      userAnswer: result.storedAnswer as Prisma.InputJsonValue,
      isCorrect: result.isCorrect,
      order: question.order,
      gradingMethod: result.gradingMethod ?? null,
    });
  }

  const scoreCorrect = graded.filter((g) => g.isCorrect).length;
  const scoreTotal = graded.length;

  const attempt = await prisma.quizAttempt.create({
    data: {
      quizId,
      userId: opts.viewerId,
      scoreCorrect,
      scoreTotal,
      answers: {
        create: graded.map((g) => ({
          questionId: g.questionId,
          questionText: g.questionText,
          questionType: g.questionType,
          userAnswer: g.userAnswer,
          isCorrect: g.isCorrect,
          order: g.order,
          gradingMethod: g.gradingMethod,
        })),
      },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      quiz: { select: { id: true, title: true } },
      answers: { orderBy: { order: 'asc' } },
    },
  });

  const answers = attempt.answers.map(mapAttemptAnswer);
  return {
    ...mapAttemptListItem(attempt),
    scoreUnverified: answers.filter((a) => isUnverifiedMethod(a.gradingMethod)).length,
    answers,
  };
}

/** Attempts for the current user on one quiz. */
export async function listMyAttemptsForQuiz(
  quizId: string,
  userId: string,
  inviteToken?: string,
) {
  await assertCanAccessQuiz(quizId, { viewerId: userId, inviteToken });

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId, userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { id: true, email: true, name: true } },
      quiz: { select: { id: true, title: true } },
    },
  });

  return attempts.map(mapAttemptListItem);
}

/** All attempts for the current user across quizzes. */
export async function listMyAttempts(userId: string) {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      user: { select: { id: true, email: true, name: true } },
      quiz: { select: { id: true, title: true } },
    },
  });

  return attempts.map(mapAttemptListItem);
}

export async function getMyAttempt(quizId: string, attemptId: string, userId: string) {
  const attempt = await prisma.quizAttempt.findFirst({
    where: { id: attemptId, quizId, userId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      quiz: { select: { id: true, title: true } },
      answers: { orderBy: { order: 'asc' } },
    },
  });

  if (!attempt) {
    throw new AppError('Attempt not found', 404);
  }

  const answers = attempt.answers.map(mapAttemptAnswer);
  return {
    ...mapAttemptListItem(attempt),
    scoreUnverified: answers.filter((a) => isUnverifiedMethod(a.gradingMethod)).length,
    answers,
  };
}
