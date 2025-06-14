
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter, PT_Sans } from 'next/font/google';
import { TranslationProvider, initI18nextInstance } from './TranslationProvider'; // Updated import
import { defaultNS, fallbackLng } from './i18n/settings';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-pt-sans',
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await initI18nextInstance(fallbackLng, defaultNS);
  return {
    title: t('appTitle'),
    description: t('appDescription'),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={fallbackLng} className={`${ptSans.variable} ${inter.variable}`}>
      <head />
      <body className="font-body antialiased">
        <TranslationProvider locale={fallbackLng}>
          {children}
        </TranslationProvider>
        <Toaster />
      </body>
    </html>
  );
}
