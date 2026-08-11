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

export default function RegisterPage() {
  const t = useTranslations('auth');
  const tc = useTranslations('common');
  const router = useRouter();
  const { register, user, loading } = useAuth();
  const [name, setName] = useState('');
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
      await register(email.trim(), password, name.trim() || undefined);
      router.push('/quizzes');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('registerFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageHero title={t('registerTitle')} subtitle={t('registerSubtitle')} light />
      <Card className="animate-in animate-in-delay-1 gap-0 py-0">
        <CardContent className="px-6 py-7">
          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name" className="text-ink">
                {t('name')}{' '}
                <span className="font-normal text-muted-foreground">{tc('optional')}</span>
              </Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
            </div>
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" variant="gold" size="lg" className="w-full" disabled={submitting}>
              {submitting ? t('creatingAccount') : t('createAccount')}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {t('haveAccount')}{' '}
              <Link href="/login" className="font-semibold text-ink underline">
                {t('logIn')}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
