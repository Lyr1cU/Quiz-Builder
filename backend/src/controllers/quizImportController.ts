import { NextFunction, Request, Response } from 'express';
import {
  generateQuizRequestSchema,
  quizImportDraftSchema,
} from '../lib/validation';
import { AppError } from '../middleware/errorHandler';
import {
  normalizeImportDraft,
  validateQuizDraft,
} from '../services/quizDraftService';
import { generateQuizFromText } from '../services/quizGenerateService';

export async function validateImport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    quizImportDraftSchema.parse(req.body);
    const draft = normalizeImportDraft(req.body);
    const validation = validateQuizDraft(draft);
    res.json({ draft, validation });
  } catch (err) {
    next(err);
  }
}

export async function generateFromText(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    const input = generateQuizRequestSchema.parse(req.body);
    const result = await generateQuizFromText(input);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
