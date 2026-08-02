import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { SubmitAttemptInput } from '../lib/validation';
import { checkQuestionAnswer, type CheckAnswerInput } from './playService';

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

  const graded = [];
  for (const a of data.answers) {
    const question = byId.get(a.questionId)!;
    const input = { type: a.type, answer: a.answer } as CheckAnswerInput;
    const result = await checkQuestionAnswer(quizId, a.questionId, input, {
      viewerId: opts.viewerId,
      inviteToken: data.inviteToken,
    });
    graded.push({
      questionId: question.id,
      questionText: question.text,
      questionType: question.type,
      userAnswer: result.userAnswer as Prisma.InputJsonValue,
      isCorrect: result.isCorrect,
      order: question.order,
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
        })),
      },
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
      quiz: { select: { id: true, title: true } },
      answers: { orderBy: { order: 'asc' } },
    },
  });

  return {
    ...mapAttemptListItem(attempt),
    answers: attempt.answers.map((a) => ({
      id: a.id,
      questionId: a.questionId,
      questionText: a.questionText,
      questionType: a.questionType,
      userAnswer: a.userAnswer,
      isCorrect: a.isCorrect,
      order: a.order,
    })),
  };
}

/** Attempts for the current user on one quiz. */
export async function listMyAttemptsForQuiz(quizId: string, userId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  const attempts = await prisma.quizAttempt.findMany({
    where: { quizId, userId },
    orderBy: { createdAt: 'desc' },
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

  return {
    ...mapAttemptListItem(attempt),
    answers: attempt.answers.map((a) => ({
      id: a.id,
      questionId: a.questionId,
      questionText: a.questionText,
      questionType: a.questionType,
      userAnswer: a.userAnswer,
      isCorrect: a.isCorrect,
      order: a.order,
    })),
  };
}
