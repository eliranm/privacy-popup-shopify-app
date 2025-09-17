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
  List,
  Box,
  Divider,
  Modal,
  TextContainer,
  Toast,
  Frame,
  ProgressBar,
  CalloutCard
} from '@shopify/polaris';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

interface BillingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  trialDays?: number;
  features: string[];
}

interface Subscription {
  id: string;
  name: string;
  status: string;
  price: number;
  currency: string;
  trialEnd?: string;
  currentPeriodEnd?: string;
}

interface BillingData {
  currentSubscription?: Subscription;
  hasActiveSubscription: boolean;
  availablePlans: BillingPlan[];
  trialInfo?: {
    trialEnd: string;
    daysRemaining: number;
  };
}

export default function Billing() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BillingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [toast, setToast] = useState<{ content: string; error?: boolean } | null>(null);
  
  const searchParams = useSearchParams();
  const shop = searchParams?.get('shop') || '';
  const host = searchParams?.get('host') || '';

  useEffect(() => {
    if (shop) {
      fetchBillingData();
    }
  }, [shop]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/billing/cancel?shop=${shop}`);
      if (!response.ok) {
        throw new Error('Failed to fetch billing data');
      }

      const result = await response.json();
      setData(result.data);
    } catch (err) {
      console.error('Billing fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    try {
      setSubscribing(planId);
      setError(null);

      const response = await fetch(`/api/billing/subscribe?shop=${shop}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId, test: true }), // Use test mode in development
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create subscription');
      }

      // Redirect to Shopify's subscription confirmation page
      if (result.confirmationUrl) {
        window.location.href = result.confirmationUrl;
      } else {
        setToast({
          content: 'Subscription created successfully',
          error: false,
        });
        fetchBillingData(); // Refresh data
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
      setToast({
        content: 'Failed to create subscription',
        error: true,
      });
    } finally {
      setSubscribing(null);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      setError(null);

      const response = await fetch(`/api/billing/cancel?shop=${shop}`, {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to cancel subscription');
      }

      setToast({
        content: 'Subscription cancelled successfully',
        error: false,
      });
      
      setShowCancelModal(false);
      fetchBillingData(); // Refresh data
    } catch (err) {
      console.error('Cancel subscription error:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel subscription');
      setToast({
        content: 'Failed to cancel subscription',
        error: true,
      });
    } finally {
      setCancelling(false);
    }
  };

  const dismissToast = useCallback(() => setToast(null), []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error && !data) {
    return (
      <Page title="Billing">
        <Banner status="critical" title="Error loading billing data">
          <p>{error}</p>
          <Button onClick={fetchBillingData} outline>
            Retry
          </Button>
        </Banner>
      </Page>
    );
  }

  const currentSubscription = data?.currentSubscription;
  const hasActiveSubscription = data?.hasActiveSubscription || false;
  const trialInfo = data?.trialInfo;
  const availablePlans = data?.availablePlans || [];

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { status: 'success' | 'attention' | 'warning' | 'critical'; label: string }> = {
      'ACTIVE': { status: 'success', label: 'Active' },
      'PENDING': { status: 'attention', label: 'Pending' },
      'CANCELLED': { status: 'warning', label: 'Cancelled' },
      'EXPIRED': { status: 'critical', label: 'Expired' },
      'FROZEN': { status: 'warning', label: 'Frozen' },
      'PAUSED': { status: 'attention', label: 'Paused' },
    };
    
    const statusInfo = statusMap[status] || { status: 'attention' as const, label: status };
    return <Badge status={statusInfo.status}>{statusInfo.label}</Badge>;
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(price);
  };

  const toastMarkup = toast ? (
    <Toast
      content={toast.content}
      error={toast.error}
      onDismiss={dismissToast}
    />
  ) : null;

  const cancelModalMarkup = (
    <Modal
      open={showCancelModal}
      onClose={() => setShowCancelModal(false)}
      title="Cancel Subscription"
      primaryAction={{
        content: 'Cancel Subscription',
        onAction: handleCancelSubscription,
        loading: cancelling,
        destructive: true,
      }}
      secondaryActions={[
        {
          content: 'Keep Subscription',
          onAction: () => setShowCancelModal(false),
        },
      ]}
    >
      <Modal.Section>
        <TextContainer>
          <p>
            Are you sure you want to cancel your subscription? You'll lose access to:
          </p>
          <List type="bullet">
            <List.Item>Custom color options</List.Item>
            <List.Item>Advanced styling features</List.Item>
            <List.Item>Priority support</List.Item>
          </List>
          <p>
            Your subscription will remain active until the end of the current billing period.
          </p>
        </TextContainer>
      </Modal.Section>
    </Modal>
  );

  return (
    <Frame>
      <Page
        title="Billing & Subscription"
        subtitle="Manage your Privacy Popup subscription"
        breadcrumbs={[{ content: 'Dashboard', url: `/dashboard?shop=${shop}&host=${host}` }]}
      >
        <Layout>
          <Layout.Section>
            <Stack vertical spacing="loose">
              {error && (
                <Banner status="critical" title="Error">
                  <p>{error}</p>
                </Banner>
              )}

              {/* Current Subscription */}
              {hasActiveSubscription && currentSubscription ? (
                <Card>
                  <Box padding="4">
                    <Stack vertical spacing="loose">
                      <Stack distribution="equalSpacing" alignment="center">
                        <Text variant="headingMd" as="h3">
                          Current Subscription
                        </Text>
                        {getStatusBadge(currentSubscription.status)}
                      </Stack>
                      
                      <Stack distribution="equalSpacing">
                        <Stack vertical spacing="tight">
                          <Text variant="bodyMd" color="subdued">Plan</Text>
                          <Text variant="bodyMd">{currentSubscription.name}</Text>
                        </Stack>
                        
                        <Stack vertical spacing="tight">
                          <Text variant="bodyMd" color="subdued">Price</Text>
                          <Text variant="bodyMd">
                            {formatPrice(currentSubscription.price, currentSubscription.currency)}/month
                          </Text>
                        </Stack>
                        
                        {currentSubscription.currentPeriodEnd && (
                          <Stack vertical spacing="tight">
                            <Text variant="bodyMd" color="subdued">Next Billing</Text>
                            <Text variant="bodyMd">
                              {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}
                            </Text>
                          </Stack>
                        )}
                      </Stack>

                      {trialInfo && trialInfo.daysRemaining > 0 && (
                        <Banner status="info" title={`${trialInfo.daysRemaining} days left in trial`}>
                          <p>
                            Your trial ends on {new Date(trialInfo.trialEnd).toLocaleDateString()}.
                            You won't be charged until then.
                          </p>
                          <Box paddingBlockStart="2">
                            <ProgressBar 
                              progress={Math.max(0, Math.min(100, ((7 - trialInfo.daysRemaining) / 7) * 100))}
                              size="small"
                            />
                          </Box>
                        </Banner>
                      )}
                      
                      <Divider />
                      
                      <Stack distribution="trailing">
                        <Button
                          onClick={() => setShowCancelModal(true)}
                          outline
                          destructive
                        >
                          Cancel Subscription
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                </Card>
              ) : (
                /* No Active Subscription */
                <CalloutCard
                  title="Choose Your Plan"
                  illustration="https://cdn.shopify.com/s/files/1/0757/9955/files/empty-state.svg"
                  primaryAction={{
                    content: 'Start Free Trial',
                    onAction: () => handleSubscribe('basic'),
                    loading: subscribing === 'basic',
                  }}
                >
                  <p>
                    Start your free trial and unlock advanced customization options for your privacy popup.
                  </p>
                </CalloutCard>
              )}

              {/* Available Plans */}
              <Card>
                <Box padding="4">
                  <Stack vertical spacing="loose">
                    <Text variant="headingMd" as="h3">
                      Available Plans
                    </Text>
                    
                    <Layout>
                      {availablePlans.map((plan) => (
                        <Layout.Section key={plan.id} oneHalf>
                          <Card>
                            <Box padding="4">
                              <Stack vertical spacing="loose">
                                <Stack distribution="equalSpacing" alignment="center">
                                  <Text variant="headingMd" as="h4">
                                    {plan.name}
                                  </Text>
                                  {plan.id === 'premium' && (
                                    <Badge status="info">Popular</Badge>
                                  )}
                                </Stack>
                                
                                <Stack alignment="baseline">
                                  <Text variant="headingLg" as="p">
                                    {formatPrice(plan.price, plan.currency)}
                                  </Text>
                                  <Text variant="bodyMd" color="subdued">
                                    /month
                                  </Text>
                                </Stack>
                                
                                {plan.trialDays && (
                                  <Text variant="bodyMd" color="subdued">
                                    {plan.trialDays}-day free trial
                                  </Text>
                                )}
                                
                                <Box paddingBlockStart="2">
                                  <List type="bullet">
                                    {plan.features.map((feature, index) => (
                                      <List.Item key={index}>{feature}</List.Item>
                                    ))}
                                  </List>
                                </Box>
                                
                                <Button
                                  primary={plan.id === 'basic'}
                                  outline={plan.id !== 'basic'}
                                  fullWidth
                                  onClick={() => handleSubscribe(plan.id)}
                                  loading={subscribing === plan.id}
                                  disabled={
                                    hasActiveSubscription && 
                                    currentSubscription?.name.toLowerCase().includes(plan.id)
                                  }
                                >
                                  {hasActiveSubscription && 
                                   currentSubscription?.name.toLowerCase().includes(plan.id)
                                    ? 'Current Plan'
                                    : subscribing === plan.id
                                    ? 'Creating...'
                                    : hasActiveSubscription
                                    ? `Switch to ${plan.name}`
                                    : `Start ${plan.trialDays}-Day Trial`
                                  }
                                </Button>
                              </Stack>
                            </Box>
                          </Card>
                        </Layout.Section>
                      ))}
                    </Layout>
                  </Stack>
                </Box>
              </Card>

              {/* Billing FAQ */}
              <Card>
                <Box padding="4">
                  <Stack vertical spacing="loose">
                    <Text variant="headingMd" as="h3">
                      Frequently Asked Questions
                    </Text>
                    
                    <Stack vertical spacing="loose">
                      <Box>
                        <Text variant="bodyMd" fontWeight="semibold" as="p">
                          What happens during the free trial?
                        </Text>
                        <Text variant="bodyMd" color="subdued">
                          You get full access to all premium features for 7 days. You won't be charged until the trial ends.
                        </Text>
                      </Box>
                      
                      <Box>
                        <Text variant="bodyMd" fontWeight="semibold" as="p">
                          Can I cancel anytime?
                        </Text>
                        <Text variant="bodyMd" color="subdued">
                          Yes, you can cancel your subscription at any time. You'll keep access until the end of your current billing period.
                        </Text>
                      </Box>
                      
                      <Box>
                        <Text variant="bodyMd" fontWeight="semibold" as="p">
                          What payment methods do you accept?
                        </Text>
                        <Text variant="bodyMd" color="subdued">
                          All payments are processed securely through Shopify. We accept all major credit cards.
                        </Text>
                      </Box>
                      
                      <Box>
                        <Text variant="bodyMd" fontWeight="semibold" as="p">
                          Need help?
                        </Text>
                        <Text variant="bodyMd" color="subdued">
                          Contact our support team at{' '}
                          <Link external url="mailto:support@example.com">
                            support@example.com
                          </Link>
                        </Text>
                      </Box>
                    </Stack>
                  </Stack>
                </Box>
              </Card>
            </Stack>
          </Layout.Section>

          <Layout.Section secondary>
            <Stack vertical spacing="loose">
              {/* Plan Comparison */}
              <Card>
                <Box padding="4">
                  <Stack vertical spacing="loose">
                    <Text variant="headingMd" as="h3">
                      Feature Comparison
                    </Text>
                    
                    <Box>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '1px solid #e1e3e5' }}>
                              Feature
                            </th>
                            <th style={{ textAlign: 'center', padding: '8px 0', borderBottom: '1px solid #e1e3e5' }}>
                              Free
                            </th>
                            <th style={{ textAlign: 'center', padding: '8px 0', borderBottom: '1px solid #e1e3e5' }}>
                              Premium
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                              Basic popup
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                              ✓
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                              ✓
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                              Position options
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                              ✓
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                              ✓
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                              Custom colors
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                              ✗
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                              ✓
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                              Priority support
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                              ✗
                            </td>
                            <td style={{ textAlign: 'center', padding: '8px 0', borderBottom: '1px solid #f1f2f3' }}>
                              ✓
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </Box>
                  </Stack>
                </Box>
              </Card>

              {/* Contact Support */}
              <Card>
                <Box padding="4">
                  <Stack vertical spacing="loose">
                    <Text variant="headingMd" as="h3">
                      Need Help?
                    </Text>
                    
                    <Text variant="bodyMd">
                      Have questions about billing or need help choosing the right plan?
                    </Text>
                    
                    <Button
                      external
                      url="mailto:support@example.com"
                      outline
                      fullWidth
                    >
                      Contact Support
                    </Button>
                  </Stack>
                </Box>
              </Card>
            </Stack>
          </Layout.Section>
        </Layout>
      </Page>
      
      {cancelModalMarkup}
      {toastMarkup}
    </Frame>
  );
}
