import bcrypt from 'bcryptjs';

const ROUNDS = 10;

/** Dummy hash so login always runs bcrypt.compare (timing side-channel mitigation). */
const DUMMY_PASSWORD_HASH =
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Always performs a bcrypt compare even when the user is missing. */
export async function verifyPasswordOrDummy(plain: string, hash: string | null | undefined) {
  const target = hash || DUMMY_PASSWORD_HASH;
  const ok = await bcrypt.compare(plain, target);
  return Boolean(hash) && ok;
}
