/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/password';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'password123';

async function main() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: { passwordHash, name: 'Alice' },
    create: {
      email: 'alice@example.com',
      name: 'Alice',
      passwordHash,
    },
  });

  const existingQuiz = await prisma.quiz.findFirst({
    where: { title: 'JavaScript Basics', ownerId: alice.id },
  });

  if (existingQuiz) {
    console.log('Sample quiz already exists:', existingQuiz.id);
    console.log('Demo login: alice@example.com /', DEMO_PASSWORD);
    return;
  }

  const quiz = await prisma.quiz.create({
    data: {
      title: 'JavaScript Basics',
      ownerId: alice.id,
      visibility: 'PUBLIC',
      questions: {
        create: [
          {
            type: 'BOOLEAN',
            text: 'Is JavaScript single-threaded?',
            order: 0,
            booleanAnswer: true,
          },
          {
            type: 'INPUT',
            text: 'What keyword declares a constant?',
            order: 1,
            inputAnswer: 'const',
          },
          {
            type: 'MULTIPLE',
            text: 'Which are JS primitives?',
            order: 2,
            options: [
              { label: 'string', isCorrect: true },
              { label: 'object', isCorrect: false },
              { label: 'number', isCorrect: true },
            ],
          },
          {
            type: 'SINGLE',
            text: 'Which keyword declares a constant?',
            order: 3,
            options: [
              { label: 'const', isCorrect: true },
              { label: 'let', isCorrect: false },
              { label: 'var', isCorrect: false },
            ],
          },
        ],
      },
    },
    include: { questions: true },
  });

  console.log('Seeded users:', alice.id);
  console.log('Seeded quiz:', quiz.id);
  console.log('Demo login: alice@example.com /', DEMO_PASSWORD);
}

main()
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
