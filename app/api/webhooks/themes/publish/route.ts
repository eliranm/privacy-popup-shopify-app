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

    const themeData = JSON.parse(body);
    const shopDomain = request.headers.get('x-shopify-shop-domain');

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Missing shop domain in webhook headers' },
        { status: 400 }
      );
    }

    // Find shop in database
    const shop = await db.findShopByDomain(shopDomain);
    if (!shop) {
      console.warn(`Theme publish webhook received for unknown shop: ${shopDomain}`);
      return NextResponse.json({ success: true });
    }

    // Only process if this is the main theme being published
    if (themeData.role === 'main') {
      // Log theme publish event
      await db.createAuditLog({
        shopId: shop.id,
        action: 'theme_published',
        resource: 'theme',
        resourceId: themeData.id.toString(),
        details: {
          themeId: themeData.id,
          themeName: themeData.name,
          role: themeData.role,
          publishedAt: new Date().toISOString(),
          webhookData: {
            id: themeData.id,
            name: themeData.name,
            role: themeData.role,
            created_at: themeData.created_at,
            updated_at: themeData.updated_at,
          },
        },
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
      });

      // Update shop settings with new theme info
      const themeSettings = await db.getShopSettings(shop.id, 'theme_info') || {};
      await db.updateShopSettings(shop.id, 'theme_info', {
        ...themeSettings,
        mainThemeId: themeData.id,
        mainThemeName: themeData.name,
        lastPublished: new Date().toISOString(),
      });

      console.log(`Main theme published for shop ${shopDomain}: ${themeData.name} (ID: ${themeData.id})`);

      // Note: We could trigger a re-check of app embed status here if needed
      // This would be useful for dashboard notifications about theme changes
      try {
        // Store a flag that theme was changed for dashboard to pick up
        await db.updateShopSettings(shop.id, 'theme_change_notification', {
          themeId: themeData.id,
          themeName: themeData.name,
          changedAt: new Date().toISOString(),
          acknowledged: false,
        });
      } catch (settingsError) {
        console.error('Failed to set theme change notification:', settingsError);
        // Don't fail the webhook for this
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Theme publish processed successfully' 
    });

  } catch (error) {
    console.error('Theme publish webhook error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process theme publish webhook' },
      { status: 500 }
    );
  }
}
