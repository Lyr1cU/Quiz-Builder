'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { setLocale } from '@/i18n/setLocale';
import { locales, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

const LOCALE_LABELS: Record<Locale, string> = {
  en: 'EN',
  uk: 'UK',
};

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('nav');
  const router = useRouter();
  const switchingRef = useRef(false);
  const [displayLocale, setDisplayLocale] = useState(locale);

  useEffect(() => {
    setDisplayLocale(locale);
  }, [locale]);

  const activeIndex = Math.max(
    0,
    locales.findIndex((item) => item === displayLocale),
  );

  async function switchTo(next: Locale) {
    if (next === displayLocale || switchingRef.current) return;

    switchingRef.current = true;
    setDisplayLocale(next);
    document.documentElement.lang = next;

    try {
      await setLocale(next);
      // Needed so next-intl picks up new messages from the server.
      // Client data loaders omit `t` from deps so this does not refetch lists.
      router.refresh();
    } catch {
      setDisplayLocale(locale);
      document.documentElement.lang = locale;
    } finally {
      switchingRef.current = false;
    }
  }

  return (
    <div
      className={cn('inline-flex items-center', className)}
      role="group"
      aria-label={t('language')}
    >
      <div className="relative inline-flex rounded-full border border-white/15 bg-white/10 p-0.5 backdrop-blur-md">
        <div className="relative flex">
          {locales.map((item) => (
            <span
              key={`${item}-base`}
              className="min-w-[2.75rem] px-3 py-1.5 text-center text-xs font-semibold text-white/75"
              aria-hidden
            >
              {LOCALE_LABELS[item]}
            </span>
          ))}
        </div>

        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0.5 left-0.5 overflow-hidden rounded-full bg-white shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            width: `calc((100% - 0.25rem) / ${locales.length})`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        >
          <span
            className="flex h-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              width: `${locales.length * 100}%`,
              transform: `translateX(-${(activeIndex * 100) / locales.length}%)`,
            }}
          >
            {locales.map((item) => (
              <span
                key={`${item}-active`}
                className="flex min-w-[2.75rem] flex-1 items-center justify-center px-3 text-xs font-semibold text-[var(--ink)]"
              >
                {LOCALE_LABELS[item]}
              </span>
            ))}
          </span>
          <span className="absolute inset-x-2 bottom-0.5 h-0.5 rounded-full bg-[var(--gold-from)]" />
        </span>

        <div className="absolute inset-0 flex">
          {locales.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => void switchTo(item)}
              aria-pressed={displayLocale === item}
              className="min-w-[2.75rem] flex-1 cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-transparent"
            >
              {LOCALE_LABELS[item]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
