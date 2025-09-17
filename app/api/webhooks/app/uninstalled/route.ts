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

    const webhookData = JSON.parse(body);
    const shopDomain = webhookData.myshopify_domain || webhookData.domain;

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Missing shop domain in webhook' },
        { status: 400 }
      );
    }

    // Find shop in database
    const shop = await db.findShopByDomain(shopDomain);
    if (!shop) {
      console.warn(`App uninstalled webhook received for unknown shop: ${shopDomain}`);
      return NextResponse.json({ success: true });
    }

    // Log the uninstallation
    await db.createAuditLog({
      shopId: shop.id,
      action: 'app_uninstalled',
      resource: 'app',
      details: {
        shopDomain,
        webhookId: webhookData.id,
        uninstalledAt: new Date().toISOString(),
      },
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
    });

    // Clean up shop data
    try {
      // Delete sessions first
      await db.deleteSessionsByShop(shopDomain);
      
      // Then clean up shop data (this will cascade delete related records)
      await db.cleanupShopData(shop.id);
      
      console.log(`Successfully cleaned up data for uninstalled shop: ${shopDomain}`);
    } catch (cleanupError) {
      console.error(`Failed to cleanup shop data for ${shopDomain}:`, cleanupError);
      
      // Log cleanup failure but don't fail the webhook
      await db.createAuditLog({
        shopId: shop.id,
        action: 'cleanup_failed',
        resource: 'app',
        details: {
          shopDomain,
          error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
        },
      }).catch(logError => {
        console.error('Failed to log cleanup error:', logError);
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'App uninstalled and data cleaned up' 
    });

  } catch (error) {
    console.error('App uninstalled webhook error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process app uninstalled webhook' },
      { status: 500 }
    );
  }
}
