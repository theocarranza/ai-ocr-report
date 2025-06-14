
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter, PT_Sans } from 'next/font/google';
import { TranslationProvider } from './TranslationProvider'; // Removed initI18nextInstance and getOptions from here
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

// Temporarily use hardcoded strings to avoid calling initI18nextInstance here
// This is to test if multiple initializations are causing the stack overflow.
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "File Insights (Static Title)",
    description: "Extract insights from your files. (Static Description)",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = fallbackLng; // Assuming 'pt_br'
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
