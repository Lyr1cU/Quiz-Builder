import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { errorHandler } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimit';
import authRouter from './routes/auth';
import attemptsRouter from './routes/attempts';
import quizzesRouter from './routes/quizzes';

const app = express();

// Needed for correct client IPs behind Render/Vercel proxies (rate limit).
app.set('trust proxy', 1);

const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
const allowedOrigins = frontendOrigin
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(helmet());
app.use(apiRateLimiter);
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
app.use(express.json({ limit: '1mb' }));

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
