'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Menu, UserRound, X } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

function NavLink({
  href,
  active,
  children,
  onClick,
  className,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'border-b-2 pb-1 text-sm font-medium transition-colors whitespace-nowrap',
        active
          ? 'border-[var(--gold-from)] font-semibold text-[var(--gold-from)]'
          : 'border-transparent text-white/75 hover:text-white',
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Nav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const createActive = pathname.startsWith('/create') || pathname.includes('/edit');
  const quizzesActive =
    (pathname === '/quizzes' || pathname.startsWith('/quizzes/')) && !pathname.includes('/edit');
  const attemptsActive = pathname.startsWith('/my-attempts');
  const isLanding = pathname === '/';

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[var(--navy)]/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href={user || isLanding ? '/quizzes' : '/'}
          className="group flex min-w-0 shrink items-center gap-2 text-white"
          onClick={closeMenu}
        >
          <BrandMark className="shrink-0 group-hover:rotate-6" />
          <span className="truncate font-serif text-xl font-bold tracking-tight sm:text-2xl">
            {t('brand')}
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {user && (
            <NavLink href="/create" active={createActive}>
              {t('createQuiz')}
            </NavLink>
          )}
          <NavLink href="/quizzes" active={quizzesActive}>
            {t('quizzes')}
          </NavLink>
          {user && (
            <NavLink href="/my-attempts" active={attemptsActive}>
              {t('myAttempts')}
            </NavLink>
          )}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <LocaleSwitcher />
          {!loading && user && (
            <>
              <span className="inline-flex max-w-[10rem] items-center gap-2 truncate text-sm text-white/75">
                <UserRound className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="truncate">{user.name || user.email}</span>
              </span>
              <span className="h-4 w-px bg-white/25" aria-hidden />
              <button
                type="button"
                onClick={() => void logout()}
                className="whitespace-nowrap text-sm font-medium text-white/75 transition-colors hover:text-white"
              >
                {t('logOut')}
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <NavLink href="/login" active={pathname.startsWith('/login')}>
                {t('logIn')}
              </NavLink>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="rounded-full bg-white/10 px-3 text-white hover:bg-white/15 hover:text-white"
              >
                <Link href="/register">{t('register')}</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/10 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {menuOpen && (
        <div
          id="mobile-nav"
          className="animate-in border-t border-white/10 bg-[var(--navy)]/95 px-4 py-4 backdrop-blur-md md:hidden"
        >
          <nav className="flex flex-col gap-4">
            {user && (
              <NavLink href="/create" active={createActive} onClick={closeMenu} className="w-fit">
                {t('createQuiz')}
              </NavLink>
            )}
            <NavLink href="/quizzes" active={quizzesActive} onClick={closeMenu} className="w-fit">
              {t('quizzes')}
            </NavLink>
            {user && (
              <NavLink
                href="/my-attempts"
                active={attemptsActive}
                onClick={closeMenu}
                className="w-fit"
              >
                {t('myAttempts')}
              </NavLink>
            )}
          </nav>

          <div className="mt-5 flex flex-col gap-3 border-t border-white/10 pt-4">
            <LocaleSwitcher className="mb-1" />
            {!loading && user && (
              <>
                <span className="inline-flex items-center gap-2 text-sm text-white/75">
                  <UserRound className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span className="truncate">{user.name || user.email}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    void logout();
                  }}
                  className="w-fit text-sm font-medium text-white/75 transition-colors hover:text-white"
                >
                  {t('logOut')}
                </button>
              </>
            )}
            {!loading && !user && (
              <div className="flex flex-wrap items-center gap-3">
                <NavLink
                  href="/login"
                  active={pathname.startsWith('/login')}
                  onClick={closeMenu}
                  className="w-fit"
                >
                  {t('logIn')}
                </NavLink>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  className="rounded-full bg-white/10 px-3 text-white hover:bg-white/15 hover:text-white"
                >
                  <Link href="/register" onClick={closeMenu}>
                    {t('register')}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
