import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler';
import type { AuthUser } from '../types/express';

type JwtPayload = {
  sub: string;
  email: string;
};

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET is not configured', 500);
  }
  return secret;
}

export function signToken(user: AuthUser): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ email: user.email }, getSecret(), {
    subject: user.id,
    expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, getSecret()) as JwtPayload & { sub: string };
    if (!payload.sub || !payload.email) {
      throw new AppError('Invalid token', 401);
    }
    return { id: payload.sub, email: payload.email };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired token', 401);
  }
}
