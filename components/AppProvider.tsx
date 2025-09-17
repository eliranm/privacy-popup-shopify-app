'use client';

import { AppProvider as PolarisAppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { useSearchParams } from 'next/navigation';
import { ReactNode } from 'react';
import '@shopify/polaris/build/esm/styles.css';

interface AppProviderProps {
  children: ReactNode;
}

export default function AppProvider({ children }: AppProviderProps) {
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop') || '';
  const host = searchParams?.get('host') || '';

  const config = {
    apiKey: process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '',
    host,
    forceRedirect: true,
  };

  return (
    <PolarisAppProvider i18n={{}}>
      <AppBridgeProvider config={config}>
        {children}
      </AppBridgeProvider>
    </PolarisAppProvider>
  );
}
