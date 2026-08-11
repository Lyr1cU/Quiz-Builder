'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';
import { PageHero } from '@/components/PageHero';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const t = useTranslations('auth');
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
      setError(err instanceof Error ? err.message : t('loginFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHero title={t('loginTitle')} subtitle={t('loginSubtitle')} light />
      <Card className="animate-in animate-in-delay-1 gap-0 py-0">
        <CardContent className="px-6 py-7">
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email" className="text-ink">
                {t('email')}
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password" className="text-ink">
                {t('password')}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" variant="gold" size="lg" className="w-full" disabled={submitting}>
              {submitting ? t('signingIn') : t('logIn')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('noAccount')}{' '}
              <Link href="/register" className="font-semibold text-ink underline">
                {t('register')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
