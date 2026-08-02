import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../lib/jwt';
import { AppError } from './errorHandler';

function extractBearer(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token || null;
}

/** Requires a valid JWT. Sets req.user. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearer(req);
    if (!token) {
      throw new AppError('Authentication required', 401);
    }
    req.user = verifyToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

/** If Bearer token present and valid, sets req.user; otherwise continues as guest. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearer(req);
    if (token) {
      req.user = verifyToken(token);
    }
    next();
  } catch {
    // Invalid token → treat as guest for optional routes
    next();
  }
}
