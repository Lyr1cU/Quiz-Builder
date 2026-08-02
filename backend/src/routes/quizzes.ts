import { Router } from 'express';
import * as attemptController from '../controllers/attemptController';
import * as pdfController from '../controllers/pdfController';
import * as playController from '../controllers/playController';
import * as quizController from '../controllers/quizController';
import { optionalAuth, requireAuth } from '../middleware/auth';

const router = Router();

router.post('/', requireAuth, quizController.createQuiz);
router.get('/', optionalAuth, quizController.listQuizzes);

router.get('/invite/:token', quizController.getQuizByInvite);
router.get('/invite/:token/play', playController.getPlayQuizByInvite);

router.post('/:id/invite/regenerate', requireAuth, quizController.regenerateInvite);
router.delete('/:id/invite', requireAuth, quizController.revokeInvite);

router.get('/:id/play', optionalAuth, playController.getPlayQuiz);
router.post('/:id/questions/:questionId/check', optionalAuth, playController.checkQuestion);
router.post('/:id/attempts', requireAuth, attemptController.submitAttempt);
router.get('/:id/attempts', requireAuth, attemptController.listAttemptsForQuiz);
router.get('/:id/attempts/:attemptId', requireAuth, attemptController.getAttempt);
router.get('/:id/export/pdf', optionalAuth, pdfController.exportPdf);

router.get('/:id', optionalAuth, quizController.getQuiz);
router.put('/:id', requireAuth, quizController.updateQuiz);
router.delete('/:id', requireAuth, quizController.deleteQuiz);

export default router;
