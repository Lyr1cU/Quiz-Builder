'use server';

import { cookies } from 'next/headers';
import { isLocale, LOCALE_COOKIE, type Locale } from './config';

export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}
