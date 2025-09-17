import { Inter } from 'next/font/google';
import { Suspense } from 'react';
import AppProvider from '@/components/AppProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Privacy Popup - Shopify App',
  description: 'Add customizable privacy popups to your Shopify store',
  robots: 'noindex, nofollow', // Prevent indexing of admin interface
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <Suspense fallback={<LoadingSpinner />}>
            <AppProvider>
              {children}
            </AppProvider>
          </Suspense>
        </ErrorBoundary>
      </body>
    </html>
  );
}
