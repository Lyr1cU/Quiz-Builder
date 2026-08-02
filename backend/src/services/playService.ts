import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { gradeInputAnswer } from './gradeInput';

type ChoiceOption = { label: string; isCorrect?: boolean };

export type CheckAnswerInput =
  | { type: 'BOOLEAN'; answer: boolean }
  | { type: 'INPUT'; answer: string }
  | { type: 'SINGLE'; answer: string }
  | { type: 'MULTIPLE'; answer: string[] };

function parseOptions(options: Prisma.JsonValue | null): ChoiceOption[] {
  if (!Array.isArray(options)) return [];
  return options as ChoiceOption[];
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function sameStringSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].map(normalizeText).sort();
  const right = [...b].map(normalizeText).sort();
  return left.every((v, i) => v === right[i]);
}

async function assertCanAccessQuiz(
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
    questions: quiz.questions.map((q) => {
      const options = parseOptions(q.options);
      return {
        id: q.id,
        quizId: q.quizId,
        type: q.type,
        text: q.text,
        order: q.order,
        options:
          q.type === 'SINGLE' || q.type === 'MULTIPLE'
            ? options.map((o) => ({ label: o.label }))
            : null,
      };
    }),
  };
}

export async function getPlayQuizByInvite(token: string) {
  const quiz = await prisma.quiz.findFirst({
    where: { inviteToken: token },
    include: { questions: { orderBy: { order: 'asc' } } },
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

  if (question.type !== input.type) {
    throw new AppError(`Answer type must be ${question.type}`, 400);
  }

  if (question.type === 'BOOLEAN') {
    const answer = (input as { type: 'BOOLEAN'; answer: boolean }).answer;
    const correctAnswer = Boolean(question.booleanAnswer);
    return {
      questionId,
      type: question.type,
      isCorrect: answer === correctAnswer,
      userAnswer: answer,
      correctAnswer,
    };
  }

  if (question.type === 'INPUT') {
    const answer = (input as { type: 'INPUT'; answer: string }).answer;
    const correctAnswer = question.inputAnswer ?? '';
    const graded = await gradeInputAnswer({
      questionText: question.text,
      expected: correctAnswer,
      actual: answer,
    });
    return {
      questionId,
      type: question.type,
      isCorrect: graded.isCorrect,
      userAnswer: answer,
      correctAnswer,
      gradingMethod: graded.method,
    };
  }

  const options = parseOptions(question.options);
  const correctLabels = options.filter((o) => o.isCorrect).map((o) => o.label);

  if (question.type === 'SINGLE') {
    const answer = (input as { type: 'SINGLE'; answer: string }).answer;
    const isCorrect =
      correctLabels.length === 1 && normalizeText(answer) === normalizeText(correctLabels[0]);
    return {
      questionId,
      type: question.type,
      isCorrect,
      userAnswer: answer,
      correctAnswer: correctLabels[0] ?? null,
    };
  }

  // MULTIPLE
  const answer = (input as { type: 'MULTIPLE'; answer: string[] }).answer;
  const isCorrect = sameStringSet(answer, correctLabels);
  return {
    questionId,
    type: question.type,
    isCorrect,
    userAnswer: answer,
    correctAnswer: correctLabels,
  };
}
