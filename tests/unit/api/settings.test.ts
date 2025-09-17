import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/settings/route';
import { mockShop, mockSettings, createMockApiResponse } from '../../setup';

// Mock the dependencies
vi.mock('@/lib/shopify', () => ({
  shopify: {
    session: {
      getOfflineId: vi.fn(() => 'offline_test-shop.myshopify.com'),
    },
    config: {
      sessionStorage: {
        loadSession: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/db', () => ({
  db: {
    findShopByDomain: vi.fn(),
    getShopSettings: vi.fn(),
    updateShopSettings: vi.fn(),
    getActiveSubscription: vi.fn(),
    createAuditLog: vi.fn(),
  },
}));

const mockShopifyModule = await import('@/lib/shopify');
const mockDbModule = await import('@/lib/db');

describe('/api/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET', () => {
    it('should return settings for authenticated shop', async () => {
      // Mock session
      mockShopifyModule.shopify.config.sessionStorage.loadSession.mockResolvedValue({
        shop: 'test-shop.myshopify.com',
        accessToken: 'test-token',
      });

      // Mock shop and settings
      mockDbModule.db.findShopByDomain.mockResolvedValue(mockShop);
      mockDbModule.db.getShopSettings
        .mockResolvedValueOnce(mockSettings) // popup_settings
        .mockResolvedValueOnce({ themeId: 123 }) // theme_info
        .mockResolvedValueOnce(null); // theme_change_notification

      const request = new NextRequest('http://localhost:3000/api/settings?shop=test-shop.myshopify.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.popupSettings).toEqual(mockSettings);
      expect(data.data.themeInfo).toEqual({ themeId: 123 });
      expect(mockDbModule.db.findShopByDomain).toHaveBeenCalledWith('test-shop.myshopify.com');
    });

    it('should return error for missing shop parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing shop parameter');
    });

    it('should return error for invalid session', async () => {
      mockShopifyModule.shopify.config.sessionStorage.loadSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/settings?shop=test-shop.myshopify.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('No active session found');
    });

    it('should return error for shop not found', async () => {
      mockShopifyModule.shopify.config.sessionStorage.loadSession.mockResolvedValue({
        shop: 'test-shop.myshopify.com',
        accessToken: 'test-token',
      });
      mockDbModule.db.findShopByDomain.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/settings?shop=test-shop.myshopify.com');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Shop not found');
    });
  });

  describe('POST', () => {
    const validSettings = {
      message: 'Updated privacy message',
      linkUrl: '/pages/privacy-policy',
      position: 'top',
      maxWidth: 500,
      padding: 25,
      zIndex: 10000,
      dismissible: false,
      bgColor: '#f0f0f0',
      textColor: '#000000',
      linkColor: '#0066cc',
    };

    it('should update settings for subscribed shop', async () => {
      // Mock session and shop
      mockShopifyModule.shopify.config.sessionStorage.loadSession.mockResolvedValue({
        shop: 'test-shop.myshopify.com',
        accessToken: 'test-token',
      });
      mockDbModule.db.findShopByDomain.mockResolvedValue(mockShop);
      mockDbModule.db.getActiveSubscription.mockResolvedValue({
        ...mockSubscription,
        status: 'ACTIVE',
      });
      mockDbModule.db.updateShopSettings.mockResolvedValue(undefined);
      mockDbModule.db.createAuditLog.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/settings?shop=test-shop.myshopify.com', {
        method: 'POST',
        body: JSON.stringify(validSettings),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(validSettings);
      expect(mockDbModule.db.updateShopSettings).toHaveBeenCalledWith(
        mockShop.id,
        'popup_settings',
        validSettings
      );
    });

    it('should restrict features for non-subscribed shop', async () => {
      // Mock session and shop without active subscription
      mockShopifyModule.shopify.config.sessionStorage.loadSession.mockResolvedValue({
        shop: 'test-shop.myshopify.com',
        accessToken: 'test-token',
      });
      mockDbModule.db.findShopByDomain.mockResolvedValue(mockShop);
      mockDbModule.db.getActiveSubscription.mockResolvedValue(null);
      mockDbModule.db.updateShopSettings.mockResolvedValue(undefined);
      mockDbModule.db.createAuditLog.mockResolvedValue(undefined);

      const request = new NextRequest('http://localhost:3000/api/settings?shop=test-shop.myshopify.com', {
        method: 'POST',
        body: JSON.stringify(validSettings),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.warning).toBeDefined();
      expect(data.restrictedFeatures).toContain('custom_colors');
      
      // Should have called updateShopSettings with restricted colors
      const restrictedSettings = {
        ...validSettings,
        bgColor: '#ffffff',
        textColor: '#333333',
        linkColor: '#007ace',
      };
      expect(mockDbModule.db.updateShopSettings).toHaveBeenCalledWith(
        mockShop.id,
        'popup_settings',
        restrictedSettings
      );
    });

    it('should return validation error for invalid settings', async () => {
      mockShopifyModule.shopify.config.sessionStorage.loadSession.mockResolvedValue({
        shop: 'test-shop.myshopify.com',
        accessToken: 'test-token',
      });
      mockDbModule.db.findShopByDomain.mockResolvedValue(mockShop);

      const invalidSettings = {
        ...validSettings,
        message: '', // Invalid: empty message
        maxWidth: 100, // Invalid: below minimum
        bgColor: 'invalid-color', // Invalid: not hex color
      };

      const request = new NextRequest('http://localhost:3000/api/settings?shop=test-shop.myshopify.com', {
        method: 'POST',
        body: JSON.stringify(invalidSettings),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid settings data');
      expect(data.details).toBeDefined();
      expect(data.details.length).toBeGreaterThan(0);
    });

    it('should return error for missing shop parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/settings', {
        method: 'POST',
        body: JSON.stringify(validSettings),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing shop parameter');
    });

    it('should return error for invalid session', async () => {
      mockShopifyModule.shopify.config.sessionStorage.loadSession.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/settings?shop=test-shop.myshopify.com', {
        method: 'POST',
        body: JSON.stringify(validSettings),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('No active session found');
    });
  });
});
