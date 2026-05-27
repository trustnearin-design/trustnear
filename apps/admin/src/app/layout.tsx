import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { ThemePrelude } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'TrustNear Admin',
  description: 'TrustNear operations console — KYC review, bookings, config.',
  robots: { index: false, follow: false },
  icons: {
    icon: '/icon.png',
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply saved theme class before paint to avoid light-mode flash */}
        <script dangerouslySetInnerHTML={{ __html: ThemePrelude }} />
      </head>
      <body className="min-h-screen bg-surface-muted text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
