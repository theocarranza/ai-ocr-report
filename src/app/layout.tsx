
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter, PT_Sans } from 'next/font/google';
import { TranslationProvider } from './TranslationProvider'; 
import { fallbackLng } from './i18n/settings';

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
  return {
    title: "File Insights (Static Title)",
    description: "Use File Insights to extract insights from your files. (Static Description)",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = fallbackLng; 
  return (
    <html lang={locale} className={`${ptSans.variable} ${inter.variable}`}>
      <head />
      <body className="font-body antialiased">
        <TranslationProvider locale={locale}>
          {children}
        </TranslationProvider>
        <Toaster />
      </body>
    </html>
  );
}
