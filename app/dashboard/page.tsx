'use client';

import { 
  Page, 
  Card, 
  Stack, 
  Text, 
  Button, 
  Badge, 
  Banner,
  Layout,
  CalloutCard,
  List,
  Link,
  Box,
  Divider,
  ProgressBar
} from '@shopify/polaris';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

interface DashboardData {
  shop: {
    name: string;
    domain: string;
    planName: string;
  };
  subscription: {
    status: string;
    name?: string;
    trialDaysLeft?: number;
    isActive: boolean;
  } | null;
  appEmbedStatus: {
    enabled: boolean;
    themeId?: number;
    themeName?: string;
  };
  themeChangeNotification?: {
    themeName: string;
    changedAt: string;
    acknowledged: boolean;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    createdAt: string;
    details?: Record<string, any>;
  }>;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  
  const shop = searchParams?.get('shop') || '';
  const host = searchParams?.get('host') || '';

  useEffect(() => {
    if (shop) {
      fetchDashboardData();
    }
  }, [shop]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch multiple endpoints in parallel
      const [
        shopResponse,
        billingResponse,
        settingsResponse,
        logsResponse
      ] = await Promise.all([
        fetch(`/api/shop?shop=${shop}`),
        fetch(`/api/billing/cancel?shop=${shop}`), // This GET endpoint returns billing info
        fetch(`/api/settings?shop=${shop}`),
        fetch(`/api/logs?shop=${shop}&limit=5`)
      ]);

      if (!shopResponse.ok || !billingResponse.ok || !settingsResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [shopData, billingData, settingsData, logsData] = await Promise.all([
        shopResponse.json(),
        billingResponse.json(),
        settingsResponse.json(),
        logsResponse.json()
      ]);

      setData({
        shop: shopData.data || { name: shop, domain: shop, planName: 'Basic' },
        subscription: billingData.data?.hasActiveSubscription ? {
          status: billingData.data.currentSubscription?.status || 'INACTIVE',
          name: billingData.data.currentSubscription?.name,
          trialDaysLeft: billingData.data.trialInfo?.daysRemaining,
          isActive: billingData.data.hasActiveSubscription,
        } : null,
        appEmbedStatus: {
          enabled: false, // We'll implement theme checking later
          themeId: settingsData.data?.themeInfo?.mainThemeId,
          themeName: settingsData.data?.themeInfo?.mainThemeName,
        },
        themeChangeNotification: settingsData.data?.themeChangeNotification?.acknowledged === false 
          ? settingsData.data.themeChangeNotification 
          : undefined,
        recentActivity: logsData.data?.logs || [],
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeThemeChange = async () => {
    try {
      const response = await fetch(`/api/settings?shop=${shop}&action=acknowledge-theme-change`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setData(prev => prev ? {
          ...prev,
          themeChangeNotification: undefined,
        } : null);
      }
    } catch (err) {
      console.error('Failed to acknowledge theme change:', err);
    }
  };

  const openThemeEditor = () => {
    const themeEditorUrl = `https://${shop}/admin/themes`;
    window.open(themeEditorUrl, '_blank');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <Page title="Dashboard">
        <Banner status="critical" title="Error loading dashboard">
          <p>{error}</p>
          <Button onClick={fetchDashboardData} outline>
            Retry
          </Button>
        </Banner>
      </Page>
    );
  }

  if (!data) {
    return (
      <Page title="Dashboard">
        <Banner status="warning" title="No data available">
          <Button onClick={fetchDashboardData} outline>
            Reload
          </Button>
        </Banner>
      </Page>
    );
  }

  const subscriptionStatus = data.subscription?.isActive ? 'Active' : 'Inactive';
  const subscriptionBadgeStatus = data.subscription?.isActive ? 'success' : 'attention';

  return (
    <Page
      title="Dashboard"
      subtitle={`Welcome to Privacy Popup for ${data.shop.name}`}
      primaryAction={{
        content: 'Open Settings',
        url: `/settings?shop=${shop}&host=${host}`,
      }}
      secondaryActions={[
        {
          content: 'Open Theme Editor',
          onAction: openThemeEditor,
          external: true,
        },
      ]}
    >
      <Layout>
        <Layout.Section>
          <Stack vertical spacing="loose">
            {/* Theme Change Notification */}
            {data.themeChangeNotification && (
              <Banner
                title="Theme Updated"
                status="info"
                action={{
                  content: 'Dismiss',
                  onAction: acknowledgeThemeChange,
                }}
              >
                <p>
                  Your theme "{data.themeChangeNotification.themeName}" was updated. 
                  Please verify that the Privacy Popup is still working correctly.
                </p>
              </Banner>
            )}

            {/* Quick Status Cards */}
            <Layout>
              <Layout.Section oneThird>
                <Card>
                  <Box padding="4">
                    <Stack vertical spacing="tight">
                      <Stack distribution="equalSpacing" alignment="center">
                        <Text variant="headingMd" as="h3">
                          Subscription
                        </Text>
                        <Badge status={subscriptionBadgeStatus}>
                          {subscriptionStatus}
                        </Badge>
                      </Stack>
                      {data.subscription?.trialDaysLeft !== undefined && (
                        <Text variant="bodyMd" color="subdued">
                          {data.subscription.trialDaysLeft} days left in trial
                        </Text>
                      )}
                      {!data.subscription?.isActive && (
                        <Button
                          url={`/billing?shop=${shop}&host=${host}`}
                          size="slim"
                          primary
                        >
                          Upgrade Now
                        </Button>
                      )}
                    </Stack>
                  </Box>
                </Card>
              </Layout.Section>

              <Layout.Section oneThird>
                <Card>
                  <Box padding="4">
                    <Stack vertical spacing="tight">
                      <Stack distribution="equalSpacing" alignment="center">
                        <Text variant="headingMd" as="h3">
                          App Embed
                        </Text>
                        <Badge status={data.appEmbedStatus.enabled ? 'success' : 'attention'}>
                          {data.appEmbedStatus.enabled ? 'Enabled' : 'Not Enabled'}
                        </Badge>
                      </Stack>
                      <Text variant="bodyMd" color="subdued">
                        {data.appEmbedStatus.themeName || 'Theme not detected'}
                      </Text>
                      <Button
                        size="slim"
                        outline
                        onAction={openThemeEditor}
                        external
                      >
                        Open Theme Editor
                      </Button>
                    </Stack>
                  </Box>
                </Card>
              </Layout.Section>

              <Layout.Section oneThird>
                <Card>
                  <Box padding="4">
                    <Stack vertical spacing="tight">
                      <Text variant="headingMd" as="h3">
                        Shop Plan
                      </Text>
                      <Text variant="bodyMd">
                        {data.shop.planName || 'Basic'}
                      </Text>
                      <Text variant="bodyMd" color="subdued">
                        {data.shop.domain}
                      </Text>
                    </Stack>
                  </Box>
                </Card>
              </Layout.Section>
            </Layout>

            {/* Setup Guide */}
            {!data.appEmbedStatus.enabled && (
              <CalloutCard
                title="Complete Your Setup"
                illustration="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
                primaryAction={{
                  content: 'Enable App Embed',
                  onAction: openThemeEditor,
                  external: true,
                }}
              >
                <p>
                  To start showing privacy popups on your store, you need to enable the 
                  Privacy Popup app embed in your theme editor.
                </p>
                
                <Box paddingBlockStart="4">
                  <Text variant="headingMd" as="h4">
                    Quick Setup Steps:
                  </Text>
                  <Box paddingBlockStart="2">
                    <List type="number">
                      <List.Item>
                        Click "Open Theme Editor" to go to your theme customizer
                      </List.Item>
                      <List.Item>
                        Navigate to "App embeds" in the left sidebar
                      </List.Item>
                      <List.Item>
                        Find "Privacy Popup" and toggle it on
                      </List.Item>
                      <List.Item>
                        Customize your popup settings and save
                      </List.Item>
                    </List>
                  </Box>
                </Box>
              </CalloutCard>
            )}

            {/* Recent Activity */}
            <Card>
              <Box padding="4">
                <Stack vertical spacing="loose">
                  <Text variant="headingMd" as="h3">
                    Recent Activity
                  </Text>
                  
                  {data.recentActivity.length > 0 ? (
                    <Stack vertical spacing="tight">
                      {data.recentActivity.map((activity, index) => (
                        <div key={activity.id}>
                          <Stack distribution="equalSpacing" alignment="center">
                            <Stack vertical spacing="extraTight">
                              <Text variant="bodyMd">
                                {formatActivityAction(activity.action)}
                              </Text>
                              <Text variant="bodySm" color="subdued">
                                {new Date(activity.createdAt).toLocaleString()}
                              </Text>
                            </Stack>
                          </Stack>
                          {index < data.recentActivity.length - 1 && (
                            <Box paddingBlockStart="3" paddingBlockEnd="3">
                              <Divider />
                            </Box>
                          )}
                        </div>
                      ))}
                      
                      <Box paddingBlockStart="4">
                        <Link url={`/logs?shop=${shop}&host=${host}`}>
                          View all activity
                        </Link>
                      </Box>
                    </Stack>
                  ) : (
                    <Text variant="bodyMd" color="subdued">
                      No recent activity
                    </Text>
                  )}
                </Stack>
              </Box>
            </Card>
          </Stack>
        </Layout.Section>

        <Layout.Section secondary>
          <Stack vertical spacing="loose">
            {/* Quick Actions */}
            <Card>
              <Box padding="4">
                <Stack vertical spacing="loose">
                  <Text variant="headingMd" as="h3">
                    Quick Actions
                  </Text>
                  
                  <Stack vertical spacing="tight">
                    <Button
                      url={`/settings?shop=${shop}&host=${host}`}
                      size="large"
                      fullWidth
                      primary
                    >
                      Customize Popup
                    </Button>
                    
                    <Button
                      onAction={openThemeEditor}
                      size="large"
                      fullWidth
                      outline
                      external
                    >
                      Theme Editor
                    </Button>
                    
                    <Button
                      url={`/billing?shop=${shop}&host=${host}`}
                      size="large"
                      fullWidth
                      outline
                    >
                      Manage Billing
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Card>

            {/* Help & Support */}
            <Card>
              <Box padding="4">
                <Stack vertical spacing="loose">
                  <Text variant="headingMd" as="h3">
                    Help & Support
                  </Text>
                  
                  <Stack vertical spacing="tight">
                    <Link external url="https://help.shopify.com/manual/online-store/themes/theme-structure/extend/apps">
                      Theme App Extensions Guide
                    </Link>
                    <Link external url="mailto:support@example.com">
                      Contact Support
                    </Link>
                    <Link external url="https://example.com/privacy-popup-docs">
                      Documentation
                    </Link>
                  </Stack>
                </Stack>
              </Box>
            </Card>
          </Stack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

function formatActivityAction(action: string): string {
  const actionMap: Record<string, string> = {
    'app_installed': 'App installed',
    'settings_updated': 'Settings updated',
    'subscription_created': 'Subscription created',
    'subscription_activated': 'Subscription activated',
    'subscription_cancelled': 'Subscription cancelled',
    'theme_published': 'Theme published',
    'app_uninstalled': 'App uninstalled',
  };
  
  return actionMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
