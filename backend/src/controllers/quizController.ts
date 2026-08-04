import { NextFunction, Request, Response } from 'express';
import { createQuizSchema, listQuizzesQuerySchema, updateQuizSchema } from '../lib/validation';
import { AppError } from '../middleware/errorHandler';
import * as quizService from '../services/quizService';

export async function createQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    const data = createQuizSchema.parse(req.body);
    const quiz = await quizService.createQuiz(data, req.user.id);
    res.status(201).json(quiz);
  } catch (err) {
    next(err);
  }
}

export async function updateQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    const data = updateQuizSchema.parse(req.body);
    const quiz = await quizService.updateQuiz(req.params.id, data, req.user.id);
    res.json(quiz);
  } catch (err) {
    next(err);
  }
}

export async function listQuizzes(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, limit } = listQuizzesQuerySchema.parse(req.query);
    const quizzes = await quizService.listQuizzes(req.user?.id, q, limit);
    res.json(quizzes);
  } catch (err) {
    next(err);
  }
}

export async function getQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    const quiz = await quizService.getQuizById(req.params.id, req.user?.id);
    res.json(quiz);
  } catch (err) {
    next(err);
  }
}

export async function getQuizByInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const quiz = await quizService.getQuizByInviteToken(req.params.token);
    res.json(quiz);
  } catch (err) {
    next(err);
  }
}

export async function regenerateInvite(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    const result = await quizService.regenerateInviteToken(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function revokeInvite(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    await quizService.revokeInviteToken(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function deleteQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    await quizService.deleteQuiz(req.params.id, req.user.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
