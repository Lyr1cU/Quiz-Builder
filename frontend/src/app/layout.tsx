import type { Metadata } from 'next';
import { Cormorant_Garamond, Source_Sans_3 } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { AnimatedMain } from '@/components/AnimatedMain';
import { LocaleEnterReplay } from '@/components/LocaleEnterReplay';
import { Nav } from '@/components/Nav';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import './globals.css';

const display = Cormorant_Garamond({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
});

const body = Source_Sans_3({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
});

export const metadata: Metadata = {
  title: 'Quiz Builder',
  description: 'Create and manage custom quizzes',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={cn(display.variable, body.variable, 'font-sans')}>
      <body className="antialiased">
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <LocaleEnterReplay />
            <div className="page-shell">
              <Nav />
              <div className="page-scroll">
                <AnimatedMain>{children}</AnimatedMain>
              </div>
            </div>
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
