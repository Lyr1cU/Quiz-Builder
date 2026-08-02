import { NextFunction, Request, Response } from 'express';
import { checkAnswerSchema } from '../lib/validation';
import * as playService from '../services/playService';

export async function getPlayQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    const inviteToken =
      typeof req.query.invite === 'string' && req.query.invite.length > 0
        ? req.query.invite
        : undefined;
    const quiz = await playService.getPlayQuiz(req.params.id, {
      viewerId: req.user?.id,
      inviteToken,
    });
    res.json(quiz);
  } catch (err) {
    next(err);
  }
}

export async function getPlayQuizByInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const quiz = await playService.getPlayQuizByInvite(req.params.token);
    res.json(quiz);
  } catch (err) {
    next(err);
  }
}

export async function checkQuestion(req: Request, res: Response, next: NextFunction) {
  try {
    const body = checkAnswerSchema.parse(req.body);
    const { inviteToken, type, answer } = body;
    const result = await playService.checkQuestionAnswer(
      req.params.id,
      req.params.questionId,
      { type, answer } as playService.CheckAnswerInput,
      {
        viewerId: req.user?.id,
        inviteToken,
      },
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}
