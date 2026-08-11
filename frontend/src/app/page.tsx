'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { BrandMark } from '@/components/BrandMark';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const t = useTranslations('home');
  const tc = useTranslations('common');
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/quizzes');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <p className="text-sm text-white/80">{tc('loading')}</p>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-4 pb-16 pt-10 text-center sm:px-6">
      <div className="animate-in mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <BrandMark className="size-10" />
          <p className="font-serif text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {t('brand')}
          </p>
        </div>
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-white sm:text-6xl">
          {t('headline')}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-base text-white/75 sm:text-lg">{t('subtitle')}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild variant="gold" size="lg" className="min-w-[10rem]">
            <Link href="/register">{t('getStarted')}</Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="lg"
            className="min-w-[10rem] rounded-full border border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white"
          >
            <Link href="/quizzes">{t('browseQuizzes')}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
