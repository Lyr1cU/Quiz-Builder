import { Router } from 'express';
import * as attemptController from '../controllers/attemptController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, attemptController.listMyAttempts);

export default router;
