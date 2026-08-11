'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { setLocale } from '@/i18n/setLocale';
import type { Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('nav');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      className={cn('inline-flex items-center gap-1 text-sm font-medium', className)}
      role="group"
      aria-label={t('language')}
    >
      <button
        type="button"
        disabled={pending}
        onClick={() => switchTo('en')}
        className={cn(
          'rounded px-1.5 py-0.5 transition-colors',
          locale === 'en' ? 'text-[var(--gold-from)]' : 'text-white/60 hover:text-white',
        )}
      >
        EN
      </button>
      <span className="text-white/35" aria-hidden>
        |
      </span>
      <button
        type="button"
        disabled={pending}
        onClick={() => switchTo('uk')}
        className={cn(
          'rounded px-1.5 py-0.5 transition-colors',
          locale === 'uk' ? 'text-[var(--gold-from)]' : 'text-white/60 hover:text-white',
        )}
      >
        UK
      </button>
    </div>
  );
}
