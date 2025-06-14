
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter, PT_Sans } from 'next/font/google';
// Removed i18n related imports

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

// Simplified metadata without using i18n for now
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'File Insights', // Hardcoded English
    description: 'Extract insights from your files.', // Hardcoded English
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Hardcoding lang to 'en' as i18n is temporarily removed
    <html lang="en" className={`${ptSans.variable} ${inter.variable}`}>
      <head />
      <body className="font-body antialiased">
        {/* TranslationProvider removed */}
        {children}
        <Toaster />
      </body>
    </html>
  );
}
