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

    const shopData = JSON.parse(body);
    const shopDomain = shopData.myshopify_domain || shopData.domain;

    if (!shopDomain) {
      return NextResponse.json(
        { error: 'Missing shop domain in webhook' },
        { status: 400 }
      );
    }

    // Find existing shop
    const existingShop = await db.findShopByDomain(shopDomain);
    if (!existingShop) {
      console.warn(`Shop update webhook received for unknown shop: ${shopDomain}`);
      return NextResponse.json({ success: true });
    }

    // Update shop data
    const updatedShop = await db.createOrUpdateShop({
      domain: shopDomain,
      myshopify_domain: shopData.myshopify_domain,
      name: shopData.name,
      email: shopData.email,
      currency: shopData.currency,
      primary_locale: shopData.primary_locale,
      timezone: shopData.iana_timezone,
      plan_name: shopData.plan_name,
      plan_display_name: shopData.plan_display_name,
      // Additional fields from webhook
      province: shopData.province,
      country: shopData.country,
      address1: shopData.address1,
      zip: shopData.zip,
      city: shopData.city,
      phone: shopData.phone,
      latitude: shopData.latitude,
      longitude: shopData.longitude,
      currencySymbol: shopData.currency,
      moneyFormat: shopData.money_format,
      moneyWithCurrencyFormat: shopData.money_with_currency_format,
      weightUnit: shopData.weight_unit,
      passwordEnabled: shopData.password_enabled,
      hasStorefront: shopData.has_storefront,
      eligibleForCardReaderGiveaway: shopData.eligible_for_card_reader_giveaway,
      eligibleForPayments: shopData.eligible_for_payments,
      googleAppsDomain: shopData.google_apps_domain,
      googleAppsLoginEnabled: shopData.google_apps_login_enabled,
      moneyInEmailsFormat: shopData.money_in_emails_format,
      moneyWithCurrencyInEmailsFormat: shopData.money_with_currency_in_emails_format,
      taxShipping: shopData.tax_shipping,
      countyTaxes: shopData.county_taxes,
      setupRequired: shopData.setup_required,
      checkoutApiSupported: shopData.checkout_api_supported,
      multiLocationEnabled: shopData.multi_location_enabled,
      hasDiscounts: shopData.has_discounts,
      hasGiftCards: shopData.has_gift_cards,
    });

    // Log the update
    await db.createAuditLog({
      shopId: updatedShop.id,
      action: 'shop_updated',
      resource: 'shop',
      resourceId: updatedShop.id,
      details: {
        updatedFields: Object.keys(shopData),
        webhookId: shopData.id,
        updatedAt: shopData.updated_at,
      },
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
    });

    console.log(`Successfully updated shop: ${shopDomain}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Shop updated successfully' 
    });

  } catch (error) {
    console.error('Shop update webhook error:', error);
    
    return NextResponse.json(
      { error: 'Failed to process shop update webhook' },
      { status: 500 }
    );
  }
}
