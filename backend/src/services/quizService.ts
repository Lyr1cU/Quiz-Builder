import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { CreateQuizInput } from '../lib/validation';
import { AppError } from '../middleware/errorHandler';

export async function createQuiz(data: CreateQuizInput) {
  return prisma.$transaction(async (tx) => {
    return tx.quiz.create({
      data: {
        title: data.title,
        questions: {
          create: data.questions.map((q, index) => ({
            type: q.type,
            text: q.text,
            order: q.order ?? index,
            booleanAnswer: q.type === 'BOOLEAN' ? q.booleanAnswer : null,
            inputAnswer: q.type === 'INPUT' ? q.inputAnswer : null,
            options:
              q.type === 'CHECKBOX'
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
}

export async function listQuizzes() {
  const quizzes = await prisma.quiz.findMany({
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
  }));
}

export async function getQuizById(id: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: 'asc' } },
    },
  });

  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  return quiz;
}

export async function deleteQuiz(id: string) {
  try {
    await prisma.quiz.delete({ where: { id } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AppError('Quiz not found', 404);
    }
    throw err;
  }
}
