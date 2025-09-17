import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { db } from '@/lib/db';
import { z } from 'zod';

const popupSettingsSchema = z.object({
  message: z.string().min(1).max(1000),
  linkUrl: z.string().url().or(z.string().regex(/^\//, 'Must be a valid URL or relative path')),
  position: z.enum(['top', 'bottom', 'left', 'right']),
  maxWidth: z.number().min(200).max(800),
  padding: z.number().min(10).max(50),
  zIndex: z.number().min(1).max(99999),
  dismissible: z.boolean(),
  bgColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  linkColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
});

// GET /api/settings - Get current popup settings
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

    // Get popup settings
    const popupSettings = await db.getShopSettings(shopRecord.id, 'popup_settings');
    
    // Get theme info
    const themeInfo = await db.getShopSettings(shopRecord.id, 'theme_info');
    
    // Get theme change notification
    const themeChangeNotification = await db.getShopSettings(shopRecord.id, 'theme_change_notification');

    return NextResponse.json({
      success: true,
      data: {
        popupSettings: popupSettings || {
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
        },
        themeInfo,
        themeChangeNotification,
      },
    });

  } catch (error) {
    console.error('Settings GET error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// POST /api/settings - Update popup settings
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

    // Parse and validate request body
    const body = await request.json();
    const validatedSettings = popupSettingsSchema.parse(body);

    // Check if shop has active subscription for advanced features
    const activeSubscription = await db.getActiveSubscription(shopRecord.id);
    const hasActiveSubscription = activeSubscription?.status === 'ACTIVE';

    // Restrict advanced features based on subscription
    if (!hasActiveSubscription) {
      // Free tier restrictions
      const restrictedSettings = {
        ...validatedSettings,
        // Limit customization options for free users
        bgColor: '#ffffff',
        textColor: '#333333',
        linkColor: '#007ace',
      };
      
      // Update settings with restrictions
      await db.updateShopSettings(shopRecord.id, 'popup_settings', restrictedSettings);
      
      // Log settings update
      await db.createAuditLog({
        shopId: shopRecord.id,
        action: 'settings_updated',
        resource: 'popup_settings',
        details: {
          updatedSettings: restrictedSettings,
          restrictedFeatures: ['custom_colors'],
          subscriptionRequired: true,
        },
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
      });

      return NextResponse.json({
        success: true,
        data: restrictedSettings,
        warning: 'Some advanced styling options require an active subscription',
        restrictedFeatures: ['custom_colors'],
      });
    }

    // Update settings for subscribed users
    await db.updateShopSettings(shopRecord.id, 'popup_settings', validatedSettings);

    // Log settings update
    await db.createAuditLog({
      shopId: shopRecord.id,
      action: 'settings_updated',
      resource: 'popup_settings',
      details: {
        updatedSettings: validatedSettings,
        hasSubscription: true,
      },
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
    });

    return NextResponse.json({
      success: true,
      data: validatedSettings,
      message: 'Settings updated successfully',
    });

  } catch (error) {
    console.error('Settings POST error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid settings data', 
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/settings/theme-notification - Acknowledge theme change notification
export async function PATCH(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');
    const action = url.searchParams.get('action');

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    if (action !== 'acknowledge-theme-change') {
      return NextResponse.json(
        { error: 'Invalid action' },
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

    // Update theme change notification
    const currentNotification = await db.getShopSettings(shopRecord.id, 'theme_change_notification');
    if (currentNotification) {
      await db.updateShopSettings(shopRecord.id, 'theme_change_notification', {
        ...currentNotification,
        acknowledged: true,
        acknowledgedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Theme change notification acknowledged',
    });

  } catch (error) {
    console.error('Settings PATCH error:', error);
    
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    );
  }
}
