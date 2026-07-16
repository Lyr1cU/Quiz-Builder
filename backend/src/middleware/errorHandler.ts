import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    const message =
      err.errors
        .map((e) => {
          const path = e.path.length ? `${e.path.join('.')}: ` : '';
          return `${path}${e.message}`;
        })
        .join('; ') || 'Validation failed';
    return res.status(400).json({ error: message });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (
    err instanceof Error &&
    (err.name === 'PrismaClientInitializationError' ||
      err.message.includes("Can't reach database server"))
  ) {
    return res.status(503).json({
      error: 'Database is not running. Start Postgres (npm run db:embedded) and retry.',
    });
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as { status: unknown }).status === 'number' &&
    (err as { status: number }).status === 400
  ) {
    const message =
      'type' in err && (err as { type?: string }).type === 'entity.parse.failed'
        ? 'Invalid JSON body'
        : err instanceof Error
          ? err.message
          : 'Bad request';
    return res.status(400).json({ error: message });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
}
