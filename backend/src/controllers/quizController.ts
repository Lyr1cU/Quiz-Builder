import { NextFunction, Request, Response } from 'express';
import { createQuizSchema } from '../lib/validation';
import * as quizService from '../services/quizService';

export async function createQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createQuizSchema.parse(req.body);
    const quiz = await quizService.createQuiz(data);
    res.status(201).json(quiz);
  } catch (err) {
    next(err);
  }
}

export async function listQuizzes(_req: Request, res: Response, next: NextFunction) {
  try {
    const quizzes = await quizService.listQuizzes();
    res.json(quizzes);
  } catch (err) {
    next(err);
  }
}

export async function getQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    const quiz = await quizService.getQuizById(req.params.id);
    res.json(quiz);
  } catch (err) {
    next(err);
  }
}

export async function deleteQuiz(req: Request, res: Response, next: NextFunction) {
  try {
    await quizService.deleteQuiz(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
