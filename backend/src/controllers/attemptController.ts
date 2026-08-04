import { NextFunction, Request, Response } from 'express';
import { submitAttemptSchema } from '../lib/validation';
import { AppError } from '../middleware/errorHandler';
import * as attemptService from '../services/attemptService';

export async function submitAttempt(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Sign in to save your practice attempt', 401);
    }
    const data = submitAttemptSchema.parse(req.body);
    const attempt = await attemptService.submitAttempt(req.params.id, data, {
      viewerId: req.user.id,
    });
    res.status(201).json(attempt);
  } catch (err) {
    next(err);
  }
}

export async function listMyAttempts(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    const attempts = await attemptService.listMyAttempts(req.user.id);
    res.json(attempts);
  } catch (err) {
    next(err);
  }
}

export async function listAttemptsForQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    const inviteToken =
      typeof req.query.invite === 'string' && req.query.invite.trim()
        ? req.query.invite.trim()
        : undefined;
    const attempts = await attemptService.listMyAttemptsForQuiz(
      req.params.id,
      req.user.id,
      inviteToken,
    );
    res.json(attempts);
  } catch (err) {
    next(err);
  }
}

export async function getAttempt(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }
    const attempt = await attemptService.getMyAttempt(
      req.params.id,
      req.params.attemptId,
      req.user.id,
    );
    res.json(attempt);
  } catch (err) {
    next(err);
  }
}
