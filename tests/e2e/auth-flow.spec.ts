import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Shopify API responses
    await page.route('**/api/auth/**', (route) => {
      const url = route.request().url();
      
      if (url.includes('/api/auth?shop=')) {
        // Mock OAuth initiation
        route.fulfill({
          status: 302,
          headers: {
            'Location': 'https://test-shop.myshopify.com/admin/oauth/authorize?client_id=test&scope=read_themes,write_themes&redirect_uri=http://localhost:3000/api/auth/callback'
          }
        });
      } else if (url.includes('/api/auth/callback')) {
        // Mock OAuth callback
        route.fulfill({
          status: 302,
          headers: {
            'Location': '/dashboard?shop=test-shop.myshopify.com&host=test-host'
          }
        });
      } else {
        route.continue();
      }
    });

    // Mock other API endpoints
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      
      if (url.includes('/api/billing/cancel')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              hasActiveSubscription: false,
              availablePlans: [
                {
                  id: 'basic',
                  name: 'Privacy Popup Basic',
                  price: 4.99,
                  currency: 'USD',
                  interval: 'monthly',
                  trialDays: 7,
                  features: ['Basic popup', 'Position options', 'Cookie consent'],
                },
              ],
            },
          }),
        });
      } else if (url.includes('/api/settings')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              popupSettings: {
                message: 'We use cookies to enhance your browsing experience.',
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
              hasActiveSubscription: false,
            },
          }),
        });
      } else {
        route.continue();
      }
    });
  });

  test('should redirect to OAuth when shop parameter is provided', async ({ page }) => {
    // Navigate to the app with shop parameter
    await page.goto('/?shop=test-shop.myshopify.com');

    // Should redirect to OAuth flow
    await expect(page).toHaveURL(/oauth\/authorize/);
  });

  test('should complete OAuth flow and redirect to dashboard', async ({ page }) => {
    // Simulate OAuth callback
    await page.goto('/api/auth/callback?shop=test-shop.myshopify.com&code=test-code&state=test-state');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    // Mock authentication error
    await page.route('**/api/auth/callback**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Authentication failed' }),
      });
    });

    await page.goto('/api/auth/callback?shop=test-shop.myshopify.com&error=access_denied');

    // Should show error message
    await expect(page.locator('text=Authentication failed')).toBeVisible();
  });

  test('should validate shop domain format', async ({ page }) => {
    // Try with invalid shop domain
    await page.goto('/?shop=invalid-domain');

    // Should show error for invalid domain
    await expect(page.locator('text=Invalid shop domain')).toBeVisible();
  });

  test('should require shop parameter for authentication', async ({ page }) => {
    // Navigate without shop parameter
    await page.goto('/api/auth');

    // Should show error for missing shop
    await expect(page.locator('text=Missing shop parameter')).toBeVisible();
  });
});

test.describe('Session Management', () => {
  test('should maintain session across page reloads', async ({ page }) => {
    // Mock authenticated session
    await page.addInitScript(() => {
      window.sessionStorage.setItem('shopify-app-session', JSON.stringify({
        shop: 'test-shop.myshopify.com',
        accessToken: 'test-token',
        scope: 'read_themes,write_themes',
      }));
    });

    await page.goto('/dashboard?shop=test-shop.myshopify.com&host=test-host');
    
    // Should show dashboard without redirecting to auth
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Reload page
    await page.reload();
    
    // Should still show dashboard
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should redirect to auth when session expires', async ({ page }) => {
    // Mock expired session
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session expired' }),
      });
    });

    await page.goto('/dashboard?shop=test-shop.myshopify.com&host=test-host');

    // Should redirect to authentication
    await expect(page).toHaveURL(/auth/);
  });

  test('should handle CSRF protection', async ({ page }) => {
    // Mock CSRF error
    await page.route('**/api/settings**', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'CSRF token mismatch' }),
        });
      } else {
        route.continue();
      }
    });

    await page.goto('/settings?shop=test-shop.myshopify.com&host=test-host');

    // Try to save settings
    await page.fill('[data-testid="message-input"]', 'Updated message');
    await page.click('[data-testid="save-button"]');

    // Should show CSRF error
    await expect(page.locator('text=CSRF token mismatch')).toBeVisible();
  });
});
