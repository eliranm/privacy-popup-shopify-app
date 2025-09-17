'use client';

import { Navigation as PolarisNavigation } from '@shopify/polaris';
import { HomeIcon, SettingsIcon, CreditCardIcon, DocumentIcon } from '@shopify/polaris-icons';
import { usePathname, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const shop = searchParams?.get('shop') || '';
  const host = searchParams?.get('host') || '';
  
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (shop) params.set('shop', shop);
    if (host) params.set('host', host);
    return params.toString();
  }, [shop, host]);

  const navigationItems = [
    {
      url: `/dashboard?${queryString}`,
      label: 'Dashboard',
      icon: HomeIcon,
      selected: pathname === '/dashboard',
    },
    {
      url: `/settings?${queryString}`,
      label: 'Popup Settings',
      icon: SettingsIcon,
      selected: pathname === '/settings',
    },
    {
      url: `/billing?${queryString}`,
      label: 'Billing',
      icon: CreditCardIcon,
      selected: pathname === '/billing',
    },
    {
      url: `/logs?${queryString}`,
      label: 'Activity Logs',
      icon: DocumentIcon,
      selected: pathname === '/logs',
    },
  ];

  return (
    <PolarisNavigation location={pathname}>
      <PolarisNavigation.Section
        items={navigationItems}
        separator
      />
    </PolarisNavigation>
  );
}
