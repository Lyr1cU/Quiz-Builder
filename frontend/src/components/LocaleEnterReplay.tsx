'use client';

import { useLocale } from 'next-intl';
import { useEffect, useRef } from 'react';

const ENTER_SELECTOR = '.animate-in, .stagger-item';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function replayEnterAnimations() {
  if (prefersReducedMotion()) return;

  const nodes = Array.from(document.querySelectorAll<HTMLElement>(ENTER_SELECTOR));
  if (nodes.length === 0) return;

  for (const el of nodes) {
    el.style.animation = 'none';
  }

  // Force reflow so the browser clears the previous animation.
  void document.body.offsetHeight;

  for (const el of nodes) {
    el.style.removeProperty('animation');
  }
}

/** Replays page enter animations when the UI locale changes, without remounting data. */
export function LocaleEnterReplay() {
  const locale = useLocale();
  const previousLocale = useRef(locale);
  const ready = useRef(false);

  useEffect(() => {
    // Skip the initial mount — pages already play their enter animation once.
    if (!ready.current) {
      ready.current = true;
      previousLocale.current = locale;
      return;
    }

    if (previousLocale.current === locale) return;
    previousLocale.current = locale;

    const frame = window.requestAnimationFrame(() => {
      replayEnterAnimations();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [locale]);

  return null;
}
