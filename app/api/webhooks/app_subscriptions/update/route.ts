import { NextRequest, NextResponse } from 'next/server';
import { shopifyHelpers } from '@/lib/shopify';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing webhook signature' },
        { status: 401 }
      );
    }

    // Verify webhook signature
    const isValid = shopifyHelpers.verifyWebhookSignature(body, signature);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    const subscriptionData = JSON.parse(body);
    const shopifySubscriptionId = `gid://shopify/AppSubscription/${subscriptionData.id}`;

    // Map Shopify subscription status to our enum
    const statusMapping: Record<string, 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'FROZEN' | 'PAUSED'> = {
      'pending': 'PENDING',
      'active': 'ACTIVE',
      'cancelled': 'CANCELLED',
      'expired': 'EXPIRED',
      'frozen': 'FROZEN',
      'paused': 'PAUSED',
      'declined': 'CANCELLED',
    };

    const newStatus = statusMapping[subscriptionData.status] || 'PENDING';

    // Find and update subscription in database
    const subscription = await db.prisma.subscription.findUnique({
      where: { shopifySubscriptionId },
      include: { shop: true },
    });

    if (!subscription) {
      console.warn(`Subscription update webhook received for unknown subscription: ${shopifySubscriptionId}`);
      return NextResponse.json({ success: true });
    }

    // Update subscription status
    const updatedSubscription = await db.updateSubscriptionStatus(
      shopifySubscriptionId,
      newStatus
    );

    // Update current period end if provided
    if (subscriptionData.billing_on) {
      await db.prisma.subscription.update({
        where: { shopifySubscriptionId },
        data: { 
          currentPeriodEnd: new Date(subscriptionData.billing_on),
          updatedAt: new Date(),
        },
      });
    }

    // Log the subscription update
    await db.createAuditLog({
      shopId: subscription.shopId,
      action: 'subscription_updated',
      resource: 'subscription',
      resourceId: subscription.id,
      details: {
        shopifySubscriptionId,
        oldStatus: subscription.status,
        newStatus,
        billingOn: subscriptionData.billing_on,
        webhookData: {
          id: subscriptionData.id,
          name: subscriptionData.name,
          status: subscriptionData.status,
          created_at: subscriptionData.created_at,
          updated_at: subscriptionData.updated_at,
        },
      },
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
    });

    // Handle specific status changes
    if (newStatus === 'ACTIVE' && subscription.status === 'PENDING') {
      // Subscription activated
      await db.createAuditLog({
        shopId: subscription.shopId,
        action: 'subscription_activated',
        resource: 'subscription',
        resourceId: subscription.id,
        details: {
          shopifySubscriptionId,
          activatedAt: new Date().toISOString(),
          plan: subscription.name,
          price: subscription.price.toString(),
        },
      });

      console.log(`Subscription activated for shop: ${subscription.shop.shopifyDomain}`);
    } else if (newStatus === 'CANCELLED') {
      // Subscription cancelled
      await db.createAuditLog({
        shopId: subscription.shopId,
        action: 'subscription_cancelled_by_shopify',
        resource: 'subscription',
        resourceId: subscription.id,
        details: {
          shopifySubscriptionId,
          cancelledAt: new Date().toISOString(),
          reason: 'shopify_webhook',
        },
      });

      console.log(`Subscription cancelled for shop: ${subscription.shop.shopifyDomain}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Subscription updated successfully',
      subscription: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        updatedAt: updatedSubscription.updatedAt,
      },
    });

  } catch (error) {
    console.error('App subscription update webhook error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process subscription update webhook' },
      { status: 500 }
    );
  }
}
