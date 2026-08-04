import type { Request } from 'express';
import rateLimit from 'express-rate-limit';

/** Prefer authenticated user id so quotas are not shared by CGNAT / burned without a token. */
function userOrIpKey(req: Request): string {
  if (req.user?.id) return `user:${req.user.id}`;
  return `ip:${req.ip || 'unknown'}`;
}

/** Brute-force protection for register / login. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many auth attempts, try again later' },
});

/** Caps play/check + Groq grading abuse. */
export const checkAnswerRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many answer checks, slow down' },
});

/** Caps full-attempt submits (each can trigger multiple AI grades). */
export const submitAttemptRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempt submissions, slow down' },
});

/**
 * Caps AI quiz generation per authenticated user (mount after requireAuth).
 * In-memory store — fine for a single process; Redis later if multi-instance.
 */
export const generateQuizRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  // Custom key uses user id; IP fallback handled inside keyGenerator.
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Too many quiz generations, try again later' },
});

/** Soft cap on JSON import validation. Mount after requireAuth. */
export const validateImportRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  validate: { keyGeneratorIpFallback: false },
  message: { error: 'Too many import validations, slow down' },
});

/** General API ceiling. */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, try again later' },
});
