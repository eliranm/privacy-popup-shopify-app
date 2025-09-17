import { NextRequest, NextResponse } from 'next/server';
import { shopify, shopifyHelpers } from '@/lib/shopify';
import { db } from '@/lib/db';

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

    // Get shop from database
    const shopRecord = await db.findShopByDomain(shop);
    if (!shopRecord) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Get active subscription
    const activeSubscription = await db.getActiveSubscription(shopRecord.id);
    if (!activeSubscription) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Cancel subscription via Shopify API
    const cancelResult = await shopifyHelpers.cancelAppSubscription(
      session,
      activeSubscription.shopifySubscriptionId
    );

    if (cancelResult.userErrors && cancelResult.userErrors.length > 0) {
      const errorMessage = cancelResult.userErrors
        .map((error: any) => error.message)
        .join(', ');
      
      return NextResponse.json(
        { error: `Subscription cancellation failed: ${errorMessage}` },
        { status: 400 }
      );
    }

    // Update subscription status in database
    const updatedSubscription = await db.updateSubscriptionStatus(
      activeSubscription.shopifySubscriptionId,
      'CANCELLED'
    );

    // Log subscription cancellation
    await db.createAuditLog({
      shopId: shopRecord.id,
      action: 'subscription_cancelled',
      resource: 'subscription',
      resourceId: activeSubscription.id,
      details: {
        shopifySubscriptionId: activeSubscription.shopifySubscriptionId,
        reason: 'user_initiated',
      },
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancelledAt: updatedSubscription.updatedAt,
      },
    });

  } catch (error) {
    console.error('Subscription cancellation error:', error);
    
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

// Get billing portal information
export async function GET(request: NextRequest) {
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

    // Get shop from database
    const shopRecord = await db.findShopByDomain(shop);
    if (!shopRecord) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    // Get current subscriptions from Shopify
    const subscriptions = await shopifyHelpers.getAppSubscriptions(session);
    
    // Get active subscription from database
    const activeSubscription = await db.getActiveSubscription(shopRecord.id);

    // Define available plans
    const availablePlans = [
      {
        id: 'basic',
        name: 'Privacy Popup Basic',
        price: 4.99,
        currency: 'USD',
        interval: 'monthly',
        trialDays: 7,
        features: [
          'Customizable privacy popup',
          'Multiple position options',
          'Basic styling options',
          'Cookie consent tracking',
        ],
      },
      {
        id: 'premium',
        name: 'Privacy Popup Premium',
        price: 9.99,
        currency: 'USD',
        interval: 'monthly',
        trialDays: 7,
        features: [
          'All Basic features',
          'Advanced styling options',
          'Custom CSS support',
          'Analytics dashboard',
          'Priority support',
        ],
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        currentSubscription: activeSubscription,
        shopifySubscriptions: subscriptions,
        availablePlans,
        hasActiveSubscription: !!activeSubscription,
        trialInfo: activeSubscription?.trialEnd ? {
          trialEnd: activeSubscription.trialEnd,
          daysRemaining: Math.max(0, Math.ceil(
            (activeSubscription.trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )),
        } : null,
      },
    });

  } catch (error) {
    console.error('Billing portal error:', error);
    
    return NextResponse.json(
      { error: 'Failed to load billing information' },
      { status: 500 }
    );
  }
}
