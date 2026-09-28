import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import { BRAND } from '@/lib/brand.config';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — SMM Panel`,
    template: `%s — ${BRAND.name}`,
  },
  description: BRAND.tagline,
  applicationName: BRAND.name,
  keywords: [
    'SMM Panel',
    'Social Media Marketing',
    'Digital Services',
    'MJ Digital Service',
  ],
  authors: [
    {
      name: BRAND.name,
    },
  ],
  creator: BRAND.name,
  publisher: BRAND.name,
  icons: {
    icon: BRAND.logo,
    shortcut: BRAND.logo,
    apple: BRAND.logo,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
  colorScheme: 'light dark',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        {children}

        <Toaster
          position="top-right"
          richColors
          closeButton
          expand={false}
          duration={4000}
          toastOptions={{
            classNames: {
              toast:
                'rounded-xl border border-slate-200 shadow-xl',
              title: 'font-semibold',
              description: 'text-sm',
            },
          }}
        />
      </body>
    </html>
  );
}