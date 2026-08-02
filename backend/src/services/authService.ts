import prisma from '../lib/prisma';
import { hashPassword, verifyPassword } from '../lib/password';
import { signToken } from '../lib/jwt';
import type { LoginInput, RegisterInput } from '../lib/validation';
import { AppError } from '../middleware/errorHandler';

function publicUser(user: { id: string; email: string; name: string | null }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

export async function register(data: RegisterInput) {
  const email = data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: data.name?.trim() || null,
    },
  });

  const token = signToken({ id: user.id, email: user.email });
  return { user: publicUser(user), token };
}

export async function login(data: LoginInput) {
  const email = data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    throw new AppError('Invalid email or password', 401);
  }

  const ok = await verifyPassword(data.password, user.passwordHash);
  if (!ok) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken({ id: user.id, email: user.email });
  return { user: publicUser(user), token };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return publicUser(user);
}
