import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import quizzesRouter from './routes/quizzes';

const app = express();

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

app.use(
  cors({
    origin: frontendOrigin,
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/quizzes', quizzesRouter);

app.use(errorHandler);

export default app;
