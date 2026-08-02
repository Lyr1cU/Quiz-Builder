import cors from 'cors';
import express from 'express';
import { errorHandler } from './middleware/errorHandler';
import authRouter from './routes/auth';
import attemptsRouter from './routes/attempts';
import quizzesRouter from './routes/quizzes';

const app = express();

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const allowedOrigins = frontendOrigin
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, server-to-server) may omit Origin
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  }),
);
app.use(express.json());

app.get('/', (_req, res) => {
  res.json({
    name: 'Quiz Builder API',
    health: '/health',
    auth: '/auth',
    quizzes: '/quizzes',
    attempts: '/attempts',
  });
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRouter);
app.use('/attempts', attemptsRouter);
app.use('/quizzes', quizzesRouter);

app.use(errorHandler);

export default app;
