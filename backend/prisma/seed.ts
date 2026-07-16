import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.quiz.findFirst({
    where: { title: 'JavaScript Basics' },
  });

  if (existing) {
    console.log('Sample quiz already exists:', existing.id);
    return;
  }

  const quiz = await prisma.quiz.create({
    data: {
      title: 'JavaScript Basics',
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
            type: 'CHECKBOX',
            text: 'Which are JS primitives?',
            order: 2,
            options: [
              { label: 'string', isCorrect: true },
              { label: 'object', isCorrect: false },
              { label: 'number', isCorrect: true },
            ],
          },
        ],
      },
    },
    include: { questions: true },
  });

  console.log('Seeded sample quiz:', quiz.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
