'use client';

import { usePathname } from 'next/navigation';

export function AnimatedMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  return (
    <main
      key={pathname}
      className={
        isLanding
          ? 'animate-in'
          : 'animate-in mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8'
      }
    >
      {children}
    </main>
  );
}
