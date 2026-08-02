import { randomBytes } from 'crypto';
import { Prisma, QuizVisibility } from '@prisma/client';
import prisma from '../lib/prisma';
import { CreateQuizInput, UpdateQuizInput } from '../lib/validation';
import { AppError } from '../middleware/errorHandler';

type ChoiceOption = { label: string; isCorrect?: boolean };

function newInviteToken(): string {
  return randomBytes(24).toString('hex');
}

function parseOptions(options: Prisma.JsonValue | null): ChoiceOption[] | null {
  if (!Array.isArray(options)) return null;
  return options as ChoiceOption[];
}

function stripQuestionAnswers<
  T extends {
    id: string;
    quizId: string;
    type: string;
    text: string;
    order: number;
    booleanAnswer: boolean | null;
    inputAnswer: string | null;
    options: Prisma.JsonValue | null;
  },
>(question: T) {
  const options = parseOptions(question.options);
  return {
    id: question.id,
    quizId: question.quizId,
    type: question.type,
    text: question.text,
    order: question.order,
    booleanAnswer: null,
    inputAnswer: null,
    options: options ? options.map((o) => ({ label: o.label })) : null,
  };
}

function mapQuiz(
  quiz: {
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    ownerId: string;
    visibility: QuizVisibility;
    inviteToken: string | null;
    questions: Array<{
      id: string;
      quizId: string;
      type: string;
      text: string;
      order: number;
      booleanAnswer: boolean | null;
      inputAnswer: string | null;
      options: Prisma.JsonValue | null;
    }>;
  },
  opts: { includeAnswers: boolean; includeInviteToken: boolean },
) {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    createdAt: quiz.createdAt,
    ownerId: quiz.ownerId,
    visibility: quiz.visibility,
    inviteToken: opts.includeInviteToken ? quiz.inviteToken : undefined,
    questions: opts.includeAnswers
      ? quiz.questions.map((q) => ({
          id: q.id,
          quizId: q.quizId,
          type: q.type,
          text: q.text,
          order: q.order,
          booleanAnswer: q.booleanAnswer,
          inputAnswer: q.inputAnswer,
          options: parseOptions(q.options),
        }))
      : quiz.questions.map(stripQuestionAnswers),
  };
}

export async function createQuiz(data: CreateQuizInput, ownerId: string) {
  const visibility = data.visibility ?? 'PUBLIC';
  const inviteToken = visibility === 'PRIVATE' ? newInviteToken() : null;

  return prisma.quiz.create({
    data: {
      ownerId,
      title: data.title,
      description: data.description?.trim() || null,
      visibility,
      inviteToken,
      questions: {
        create: data.questions.map((q, index) => ({
          type: q.type,
          text: q.text,
          order: q.order ?? index,
          booleanAnswer: q.type === 'BOOLEAN' ? q.booleanAnswer : null,
          inputAnswer: q.type === 'INPUT' ? q.inputAnswer : null,
          options:
            q.type === 'SINGLE' || q.type === 'MULTIPLE'
              ? (q.options as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        })),
      },
    },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  }).then((quiz) =>
    mapQuiz(quiz, {
      includeAnswers: true,
      includeInviteToken: true,
    }),
  );
}

export async function listQuizzes(viewerId?: string, search?: string) {
  const q = search?.trim();
  const visibilityWhere = viewerId
    ? {
        OR: [{ visibility: 'PUBLIC' as const }, { ownerId: viewerId }],
      }
    : { visibility: 'PUBLIC' as const };

  const quizzes = await prisma.quiz.findMany({
    where: q
      ? {
          AND: [
            visibilityWhere,
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
          ],
        }
      : visibilityWhere,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { questions: true } },
    },
  });

  return quizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    createdAt: quiz.createdAt,
    questionsCount: quiz._count.questions,
    ownerId: quiz.ownerId,
    visibility: quiz.visibility,
  }));
}

export async function getQuizById(id: string, viewerId?: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  });

  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  const isOwner = Boolean(viewerId && quiz.ownerId === viewerId);

  if (quiz.visibility === 'PRIVATE' && !isOwner) {
    throw new AppError('Quiz not found', 404);
  }

  return mapQuiz(quiz, {
    includeAnswers: isOwner,
    includeInviteToken: isOwner,
  });
}

export async function getQuizByInviteToken(token: string) {
  const quiz = await prisma.quiz.findFirst({
    where: { inviteToken: token },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  });

  if (!quiz) {
    throw new AppError('Invite link is invalid or expired', 404);
  }

  return mapQuiz(quiz, {
    includeAnswers: false,
    includeInviteToken: false,
  });
}

export async function updateQuiz(id: string, data: UpdateQuizInput, requesterId: string) {
  const existing = await prisma.quiz.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Quiz not found', 404);
  }
  if (existing.ownerId !== requesterId) {
    throw new AppError('You can only edit your own quizzes', 403);
  }

  const visibility = data.visibility ?? existing.visibility;
  let inviteToken = existing.inviteToken;
  if (visibility === 'PUBLIC') {
    inviteToken = null;
  } else if (!inviteToken) {
    inviteToken = newInviteToken();
  }

  const quiz = await prisma.$transaction(async (tx) => {
    await tx.question.deleteMany({ where: { quizId: id } });

    return tx.quiz.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description?.trim() || null,
        visibility,
        inviteToken,
        questions: {
          create: data.questions.map((q, index) => ({
            type: q.type,
            text: q.text,
            order: q.order ?? index,
            booleanAnswer: q.type === 'BOOLEAN' ? q.booleanAnswer : null,
            inputAnswer: q.type === 'INPUT' ? q.inputAnswer : null,
            options:
              q.type === 'SINGLE' || q.type === 'MULTIPLE'
                ? (q.options as Prisma.InputJsonValue)
                : Prisma.JsonNull,
          })),
        },
      },
      include: {
        questions: { orderBy: { order: 'asc' } },
      },
    });
  });

  return mapQuiz(quiz, {
    includeAnswers: true,
    includeInviteToken: true,
  });
}

export async function regenerateInviteToken(quizId: string, requesterId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }
  if (quiz.ownerId !== requesterId) {
    throw new AppError('Only the owner can manage invite links', 403);
  }
  if (quiz.visibility !== 'PRIVATE') {
    throw new AppError('Invite links are only available for private quizzes', 400);
  }

  const inviteToken = newInviteToken();
  const updated = await prisma.quiz.update({
    where: { id: quizId },
    data: { inviteToken },
  });

  return { inviteToken: updated.inviteToken };
}

export async function revokeInviteToken(quizId: string, requesterId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }
  if (quiz.ownerId !== requesterId) {
    throw new AppError('Only the owner can manage invite links', 403);
  }

  await prisma.quiz.update({
    where: { id: quizId },
    data: { inviteToken: null },
  });
}

export async function deleteQuiz(id: string, requesterId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id } });
  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }
  if (quiz.ownerId !== requesterId) {
    throw new AppError('You can only delete your own quizzes', 403);
  }

  try {
    await prisma.quiz.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError('Quiz not found', 404);
    }
    throw err;
  }
}
