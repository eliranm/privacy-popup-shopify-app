import { NextRequest, NextResponse } from 'next/server';
import { shopify, shopifyHelpers } from '@/lib/shopify';
import { db } from '@/lib/db';
import { z } from 'zod';

const subscribeSchema = z.object({
  planId: z.string().optional().default('basic'),
  test: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    // Get session
    const sessionId = shopify.session.getOfflineId(shop);
    const session = await shopify.config.sessionStorage.loadSession(sessionId);

    if (!session) {
      return NextResponse.json(
        { error: 'No active session found' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { planId, test } = subscribeSchema.parse(body);

    // Get shop from database
    const shopRecord = await db.findShopByDomain(shop);
    if (!shopRecord) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Check if shop already has an active subscription
    const activeSubscription = await db.getActiveSubscription(shopRecord.id);
    if (activeSubscription) {
      return NextResponse.json(
        { error: 'Shop already has an active subscription' },
        { status: 400 }
      );
    }

    // Define billing plans
    const plans = {
      basic: {
        name: 'Privacy Popup Basic',
        price: 4.99,
        currency: 'USD',
        interval: 'EVERY_30_DAYS',
        trialDays: 7,
        features: [
          'Customizable privacy popup',
          'Multiple position options',
          'Basic styling options',
          'Cookie consent tracking',
        ],
      },
      premium: {
        name: 'Privacy Popup Premium',
        price: 9.99,
        currency: 'USD',
        interval: 'EVERY_30_DAYS',
        trialDays: 7,
        features: [
          'All Basic features',
          'Advanced styling options',
          'Custom CSS support',
          'Analytics dashboard',
          'Priority support',
        ],
      },
    };

    const selectedPlan = plans[planId as keyof typeof plans] || plans.basic;

    // Create subscription via Shopify Billing API
    const subscriptionResult = await shopifyHelpers.createAppSubscription(session, {
      name: selectedPlan.name,
      price: selectedPlan.price,
      currency: selectedPlan.currency,
      interval: selectedPlan.interval,
      trialDays: selectedPlan.trialDays,
      test,
    });

    if (subscriptionResult.userErrors && subscriptionResult.userErrors.length > 0) {
      const errorMessage = subscriptionResult.userErrors
        .map((error: any) => error.message)
        .join(', ');
      
      return NextResponse.json(
        { error: `Subscription creation failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    const { appSubscription, confirmationUrl } = subscriptionResult;

    if (!appSubscription) {
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      );
    }

    // Store subscription in database
    const subscription = await db.createSubscription({
      shopId: shopRecord.id,
      shopifySubscriptionId: appSubscription.id,
      name: appSubscription.name,
      status: 'PENDING',
      price: selectedPlan.price,
      currency: selectedPlan.currency,
      interval: selectedPlan.interval,
      trialEnd: appSubscription.trialDays 
        ? new Date(Date.now() + appSubscription.trialDays * 24 * 60 * 60 * 1000)
        : undefined,
      test,
    });

    // Log subscription creation
    await db.createAuditLog({
      shopId: shopRecord.id,
      action: 'subscription_created',
      resource: 'subscription',
      resourceId: subscription.id,
      details: {
        planId,
        price: selectedPlan.price,
        currency: selectedPlan.currency,
        trialDays: selectedPlan.trialDays,
        test,
        shopifySubscriptionId: appSubscription.id,
      },
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        name: subscription.name,
        status: subscription.status,
        price: subscription.price,
        currency: subscription.currency,
        trialEnd: subscription.trialEnd,
      },
      confirmationUrl,
    });

  } catch (error) {
    console.error('Subscription creation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}
