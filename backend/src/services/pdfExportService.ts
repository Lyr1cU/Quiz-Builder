import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

export type PdfVariant = 'worksheet' | 'answers';

type ChoiceOption = { label: string; isCorrect?: boolean };

function parseOptions(options: Prisma.JsonValue | null): ChoiceOption[] {
  if (!Array.isArray(options)) return [];
  return options as ChoiceOption[];
}

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'quiz'
  );
}

async function loadQuizForExport(quizId: string, variant: PdfVariant, viewerId?: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  if (!quiz) {
    throw new AppError('Quiz not found', 404);
  }

  const isOwner = Boolean(viewerId && quiz.ownerId === viewerId);

  // Answer keys are owner-only for every visibility (never public).
  if (variant === 'answers' && !isOwner) {
    throw new AppError('Only the owner can export the answer key', 403);
  }

  if (quiz.visibility === 'PRIVATE' && !isOwner) {
    throw new AppError('Only the owner can export a private quiz', 403);
  }

  return quiz;
}

function drawHeaderFields(doc: PDFKit.PDFDocument) {
  doc.fontSize(11).fillColor('#222');
  doc.text('Name: ________________________________', { continued: false });
  doc.moveDown(0.4);
  doc.text('Date: ________________________________');
  doc.moveDown(1);
}

function drawGradeFooter(doc: PDFKit.PDFDocument) {
  const bottom = doc.page.height - doc.page.margins.bottom - 40;
  doc.fontSize(11).fillColor('#222');
  doc.text('Grade: ______________', doc.page.margins.left, bottom, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
  });
}

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottomLimit = doc.page.height - doc.page.margins.bottom - 50;
  if (doc.y + needed > bottomLimit) {
    doc.addPage();
  }
}

function renderQuestionBlock(
  doc: PDFKit.PDFDocument,
  index: number,
  question: {
    type: string;
    text: string;
    booleanAnswer: boolean | null;
    inputAnswer: string | null;
    options: Prisma.JsonValue | null;
  },
  variant: PdfVariant,
) {
  ensureSpace(doc, 80);
  doc.fontSize(12).fillColor('#111').text(`${index + 1}. ${question.text}`, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
  });
  doc.moveDown(0.35);
  doc.fontSize(11).fillColor('#333');

  if (question.type === 'BOOLEAN') {
    if (variant === 'worksheet') {
      doc.text('   ( ) True     ( ) False');
    } else {
      doc.text(`   Answer: ${question.booleanAnswer ? 'True' : 'False'}`);
    }
  } else if (question.type === 'INPUT') {
    if (variant === 'worksheet') {
      doc.text('   Answer: _______________________________________________');
    } else {
      doc.text(`   Answer: ${question.inputAnswer ?? '—'}`);
    }
  } else {
    const options = parseOptions(question.options);
    options.forEach((opt, i) => {
      const mark = String.fromCharCode(65 + i);
      if (variant === 'worksheet') {
        const bullet = question.type === 'SINGLE' ? '( )' : '[ ]';
        doc.text(`   ${bullet} ${mark}. ${opt.label}`);
      } else {
        const tag = opt.isCorrect ? ' [correct]' : '';
        doc.text(`   ${mark}. ${opt.label}${tag}`);
      }
    });
  }

  doc.moveDown(0.85);
}

export async function buildQuizPdf(
  quizId: string,
  variant: PdfVariant,
  viewerId?: string,
): Promise<{ buffer: Buffer; filename: string }> {
  const quiz = await loadQuizForExport(quizId, variant, viewerId);

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 60, left: 50, right: 50 },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(20).fillColor('#111').text(quiz.title, { align: 'left' });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor('#555')
      .text(variant === 'worksheet' ? 'Student worksheet' : 'Answer key (teacher)', {
        align: 'left',
      });

    if (quiz.description) {
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor('#333').text(quiz.description);
    }

    doc.moveDown(0.8);

    if (variant === 'worksheet') {
      drawHeaderFields(doc);
    }

    quiz.questions.forEach((q, index) => {
      renderQuestionBlock(doc, index, q, variant);
    });

    if (variant === 'worksheet') {
      drawGradeFooter(doc);
    }

    doc.end();
  });

  const filename = `${slugify(quiz.title)}-${variant === 'worksheet' ? 'worksheet' : 'answers'}.pdf`;
  return { buffer, filename };
}
