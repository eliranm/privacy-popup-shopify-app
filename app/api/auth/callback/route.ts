import { NextRequest, NextResponse } from 'next/server';
import { shopify, shopifyHelpers } from '@/lib/shopify';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    
    // Complete OAuth flow
    const callbackResponse = await shopify.auth.callback({
      rawRequest: request,
      rawResponse: NextResponse,
    });

    const { session } = callbackResponse;
    
    if (!session) {
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }

    // Get shop information from Shopify
    const shopInfo = await shopifyHelpers.getShopInfo(session);
    
    // Create or update shop in database
    const shop = await db.createOrUpdateShop({
      domain: session.shop,
      myshopify_domain: session.shop,
      name: shopInfo.name,
      email: shopInfo.email,
      currency: shopInfo.currency,
      primary_locale: shopInfo.primary_locale,
      timezone: shopInfo.iana_timezone,
      plan_name: shopInfo.plan_name,
      plan_display_name: shopInfo.plan_display_name,
      // Additional shop fields
      province: shopInfo.province,
      country: shopInfo.country,
      address1: shopInfo.address1,
      zip: shopInfo.zip,
      city: shopInfo.city,
      phone: shopInfo.phone,
      latitude: shopInfo.latitude,
      longitude: shopInfo.longitude,
      currencySymbol: shopInfo.currency,
      moneyFormat: shopInfo.money_format,
      moneyWithCurrencyFormat: shopInfo.money_with_currency_format,
      weightUnit: shopInfo.weight_unit,
      passwordEnabled: shopInfo.password_enabled,
      hasStorefront: shopInfo.has_storefront,
      eligibleForCardReaderGiveaway: shopInfo.eligible_for_card_reader_giveaway,
      eligibleForPayments: shopInfo.eligible_for_payments,
      googleAppsDomain: shopInfo.google_apps_domain,
      googleAppsLoginEnabled: shopInfo.google_apps_login_enabled,
      moneyInEmailsFormat: shopInfo.money_in_emails_format,
      moneyWithCurrencyInEmailsFormat: shopInfo.money_with_currency_in_emails_format,
      taxShipping: shopInfo.tax_shipping,
      countyTaxes: shopInfo.county_taxes,
      setupRequired: shopInfo.setup_required,
      checkoutApiSupported: shopInfo.checkout_api_supported,
      multiLocationEnabled: shopInfo.multi_location_enabled,
      hasDiscounts: shopInfo.has_discounts,
      hasGiftCards: shopInfo.has_gift_cards,
    });

    // Initialize default settings if not exists
    const existingSettings = await db.getShopSettings(shop.id, 'popup_settings');
    if (!existingSettings) {
      await db.updateShopSettings(shop.id, 'popup_settings', {
        message: 'We use cookies to enhance your browsing experience and analyze our traffic. By continuing to use our site, you consent to our use of cookies.',
        linkUrl: '/pages/privacy-policy',
        position: 'bottom',
        maxWidth: 400,
        padding: 20,
        zIndex: 9999,
        dismissible: true,
        bgColor: '#ffffff',
        textColor: '#333333',
        linkColor: '#007ace',
      });
    }

    // Register webhooks
    try {
      await shopifyHelpers.registerWebhooks(session);
    } catch (webhookError) {
      console.error('Failed to register webhooks:', webhookError);
      // Don't fail the auth flow if webhooks fail
    }

    // Log successful installation
    await db.createAuditLog({
      shopId: shop.id,
      action: 'app_installed',
      resource: 'app',
      details: {
        shop: session.shop,
        userId: session.userId,
        scope: session.scope,
      },
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
    });

    // Redirect to the app dashboard
    const redirectUrl = new URL('/dashboard', process.env.SHOPIFY_APP_URL);
    redirectUrl.searchParams.set('shop', session.shop);
    redirectUrl.searchParams.set('host', url.searchParams.get('host') || '');

    return NextResponse.redirect(redirectUrl.toString());
    
  } catch (error) {
    console.error('Auth callback error:', error);
    
    // Log failed installation
    const shop = new URL(request.url).searchParams.get('shop');
    if (shop) {
      try {
        await db.createAuditLog({
          shopId: shop,
          action: 'app_install_failed',
          resource: 'app',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
          userAgent: request.headers.get('user-agent') || undefined,
          ipAddress: request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown',
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
    }
    
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
