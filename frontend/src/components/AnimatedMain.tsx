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
          ? 'animate-in pt-16'
          : 'animate-in mx-auto max-w-4xl px-4 pb-16 pt-28 sm:px-6 lg:px-8'
      }
    >
      {children}
    </main>
  );
}
