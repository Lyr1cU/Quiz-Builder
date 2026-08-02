'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHero } from '@/components/PageHero';

export default function LoginPage() {
  const router = useRouter();
  const { login, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace('/quizzes');
    }
  }, [loading, user, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push('/quizzes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHero title="Log in" subtitle="Sign in to create and manage your quizzes." light />
      <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-semibold text-white/90">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field-input"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-white/90">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field-input"
          />
        </div>
        {error && (
          <p className="rounded-xl bg-white/95 px-4 py-3 text-sm text-[var(--danger)]">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="gold-btn w-full rounded-full px-6 py-3.5 text-sm font-semibold"
        >
          {submitting ? 'Signing in…' : 'Log in'}
        </button>
        <p className="text-center text-sm text-white/80">
          No account?{' '}
          <Link href="/register" className="font-semibold text-white underline">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
