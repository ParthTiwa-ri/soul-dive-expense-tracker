import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProvider } from '@/context/AppContext';

export const metadata: Metadata = {
  title: 'Soul Dive खर्चा | Water Park Expense Manager',
  description: 'Production-minded, offline-first, mobile-first expense manager for Soul Dive Water Park.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.png',
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Soul Dive खर्चा',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0891b2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body className="antialiased min-h-screen bg-slate-100 text-slate-900 selection:bg-cyan-200">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}

