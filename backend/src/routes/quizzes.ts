import { Router } from 'express';
import * as quizController from '../controllers/quizController';

const router = Router();

router.post('/', quizController.createQuiz);
router.get('/', quizController.listQuizzes);
router.get('/:id', quizController.getQuiz);
router.delete('/:id', quizController.deleteQuiz);

export default router;
