'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M9 21h6M10 17h4M12 3a6 6 0 0 0-3.5 10.8c.7.55 1.1 1.25 1.25 2.2h4.5c.15-.95.55-1.65 1.25-2.2A6 6 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative pb-1 transition-colors duration-200 hover:text-white ${
        active ? 'text-white' : 'text-white/80'
      }`}
    >
      {children}
      <span
        className={`absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-[var(--gold-from)] transition-transform duration-300 ease-out ${
          active ? 'scale-x-100' : 'scale-x-0'
        }`}
      />
    </Link>
  );
}

export function Nav() {
  const pathname = usePathname();
  const createActive = pathname.startsWith('/create');
  const quizzesActive = pathname === '/quizzes' || pathname.startsWith('/quizzes/');

  return (
    <header className="border-b border-white/10 bg-[var(--navy-deep)]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link
          href="/quizzes"
          className="flex items-center gap-2.5 text-white transition-opacity duration-200 hover:opacity-90"
        >
          <LightbulbIcon className="h-6 w-6 text-[var(--gold-from)] transition-transform duration-300 hover:rotate-6" />
          <span className="font-serif text-2xl font-semibold tracking-tight">Quiz Builder</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium">
          <NavLink href="/create" active={createActive}>
            Create quiz
          </NavLink>
          <NavLink href="/quizzes" active={quizzesActive}>
            Quizzes
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
