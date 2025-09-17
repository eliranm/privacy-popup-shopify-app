import { NextRequest, NextResponse } from 'next/server';
import { shopify } from '@/lib/shopify';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');
    const embedded = url.searchParams.get('embedded');

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop parameter' },
        { status: 400 }
      );
    }

    // Validate shop domain
    if (!shop.endsWith('.myshopify.com')) {
      return NextResponse.json(
        { error: 'Invalid shop domain' },
        { status: 400 }
      );
    }

    // Start OAuth flow
    const authRoute = await shopify.auth.begin({
      shop,
      callbackPath: '/api/auth/callback',
      isOnline: false, // Use offline tokens for server-side operations
      rawRequest: request,
      rawResponse: NextResponse,
    });

    // Log auth attempt
    await db.createAuditLog({
      shopId: shop,
      action: 'auth_initiated',
      resource: 'oauth',
      details: { shop, embedded },
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
    });

    return authRoute;
  } catch (error) {
    console.error('Auth initiation error:', error);
    
    return NextResponse.json(
      { error: 'Failed to initiate authentication' },
      { status: 500 }
    );
  }
}

// Handle HMAC verification for embedded apps
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-shopify-hmac-sha256');
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing HMAC signature' },
        { status: 401 }
      );
    }

    // Verify HMAC
    const isValid = shopify.utils.verifyHmac(body, signature);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid HMAC signature' },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);
    const shop = data.shop;

    if (!shop) {
      return NextResponse.json(
        { error: 'Missing shop in request' },
        { status: 400 }
      );
    }

    // Log HMAC verification
    await db.createAuditLog({
      shopId: shop,
      action: 'hmac_verified',
      resource: 'auth',
      details: { shop },
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
    });

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error('HMAC verification error:', error);
    
    return NextResponse.json(
      { error: 'HMAC verification failed' },
      { status: 500 }
    );
  }
}
