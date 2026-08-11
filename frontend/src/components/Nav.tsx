'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { ChevronRight, UserRound } from 'lucide-react';
import { BrandMark } from '@/components/BrandMark';
import { BurgerButton } from '@/components/BurgerButton';
import { LocaleSwitcher } from '@/components/LocaleSwitcher';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

function pathHasSegment(pathname: string, segment: string) {
  return pathname.split('/').includes(segment);
}

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
      aria-current={active ? 'page' : undefined}
      className={cn(
        'nav-link group relative inline-flex h-9 flex-col items-center justify-center',
        className,
      )}
    >
      <span
        className={cn(
          'nav-link-label whitespace-nowrap text-sm transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          active
            ? '-translate-y-1 font-semibold text-[var(--gold-from)]'
            : 'translate-y-0 font-medium text-white/75 group-hover:text-white',
        )}
      >
        {children}
      </span>
      <span
        aria-hidden
        className={cn(
          'nav-link-indicator absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[var(--gold-from)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
          active ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0',
        )}
      />
    </Link>
  );
}

function MobileNavPill({
  href,
  active,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'mobile-nav-pill',
        active ? 'mobile-nav-pill--active gold-btn' : 'mobile-nav-pill--ghost',
      )}
    >
      <span>{children}</span>
      {active ? (
        <ChevronRight
          className="mobile-nav-pill__arrow size-4 shrink-0"
          strokeWidth={2}
          aria-hidden
        />
      ) : null}
    </Link>
  );
}

const LOGOUT_MENU_CONTENT_CLASS =
  'min-w-[10.5rem] rounded-xl border border-[var(--line)] bg-white p-1.5 shadow-lg';

function UserMenu({
  variant,
  onLogout,
  logOutLabel,
}: {
  variant: 'desktop' | 'mobile';
  onLogout?: () => void;
  logOutLabel: string;
}) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const label = user.name || user.email;
  const initial = (label || '?').charAt(0).toUpperCase();

  return (
    /* Non-modal: avoids scrollbar gutter shift that nudges the fixed header. */
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        {variant === 'mobile' ? (
          <button type="button" className="mobile-nav-user-chip">
            <span className="mobile-nav-user-avatar" aria-hidden>
              {initial}
            </span>
            <span className="truncate">{label}</span>
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex max-w-[10rem] items-center gap-2 rounded-full px-2 py-1.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25"
          >
            <UserRound className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{label}</span>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className={LOGOUT_MENU_CONTENT_CLASS}>
        <DropdownMenuItem
          variant="destructive"
          className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium"
          onClick={() => {
            onLogout?.();
            void logout();
          }}
        >
          {logOutLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Nav() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const onEditRoute = pathHasSegment(pathname, 'edit');
  const createActive = pathname.startsWith('/create') || onEditRoute;
  const quizzesActive =
    (pathname === '/quizzes' || pathname.startsWith('/quizzes/')) && !onEditRoute;
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

  function toggleMenu() {
    setMenuOpen((open) => !open);
  }

  const mobileLinks = [
    ...(user
      ? [{ href: '/create', active: createActive, label: t('createQuiz') }]
      : []),
    { href: '/quizzes', active: quizzesActive, label: t('quizzes') },
    ...(user
      ? [{ href: '/my-attempts', active: attemptsActive, label: t('myAttempts') }]
      : []),
  ];

  return (
    <header
      className={cn(
        'relative z-50 shrink-0 border-b border-white/10 bg-[var(--navy)]/90 shadow-sm backdrop-blur-md transition-[border-radius,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        menuOpen && 'max-md:rounded-b-[1.75rem] max-md:border-b-0 max-md:shadow-lg',
      )}
    >
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

        <div className="hidden items-center gap-3 md:flex">
          <LocaleSwitcher />
          {!loading && user && (
            <UserMenu variant="desktop" logOutLabel={t('logOut')} />
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

        <BurgerButton
          open={menuOpen}
          onClick={toggleMenu}
          label={menuOpen ? t('closeMenu') : t('openMenu')}
          aria-controls="mobile-nav"
        />
      </div>

      <div
        id="mobile-nav"
        className="mobile-nav-sheet md:hidden"
        data-open={menuOpen}
        aria-hidden={!menuOpen}
        {...(!menuOpen ? { inert: true } : {})}
      >
        <div className="mobile-nav-sheet__inner">
          <nav className="flex flex-col gap-3 px-4 pt-1">
            {mobileLinks.map((item) => (
              <MobileNavPill
                key={item.href}
                href={item.href}
                active={item.active}
                onClick={closeMenu}
              >
                {item.label}
              </MobileNavPill>
            ))}

            {!loading && !user && (
              <>
                <MobileNavPill
                  href="/login"
                  active={pathname.startsWith('/login')}
                  onClick={closeMenu}
                >
                  {t('logIn')}
                </MobileNavPill>
                <Link
                  href="/register"
                  onClick={closeMenu}
                  className="mobile-nav-pill mobile-nav-pill--ghost"
                >
                  <span>{t('register')}</span>
                </Link>
              </>
            )}
          </nav>

          <div className="mobile-nav-footer mx-4 mt-4 flex items-center gap-3 border-t border-white/10 pt-4 pb-5">
            <LocaleSwitcher className="shrink-0" />
            {!loading && user && (
              <UserMenu
                variant="mobile"
                onLogout={closeMenu}
                logOutLabel={t('logOut')}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
