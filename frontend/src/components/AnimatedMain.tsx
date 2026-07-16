'use client';

import { usePathname } from 'next/navigation';

export function AnimatedMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main
      key={pathname}
      className="animate-in mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6"
    >
      {children}
    </main>
  );
}
