import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/lib/db';
import { mockShop, mockSubscription } from '../../setup';

// Mock the Prisma client
const mockPrisma = {
  shop: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  subscription: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  setting: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  session: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
};

vi.mock('@/lib/db', async () => {
  const actual = await vi.importActual('@/lib/db');
  return {
    ...actual,
    prisma: mockPrisma,
  };
});

describe('Database utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findShopByDomain', () => {
    it('should find a shop by domain', async () => {
      const mockShopWithRelations = {
        ...mockShop,
        subscriptions: [mockSubscription],
        settings: [],
      };

      mockPrisma.shop.findUnique.mockResolvedValue(mockShopWithRelations);

      const result = await db.findShopByDomain('test-shop.myshopify.com');

      expect(mockPrisma.shop.findUnique).toHaveBeenCalledWith({
        where: { shopifyDomain: 'test-shop.myshopify.com' },
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          settings: true,
        },
      });
      expect(result).toEqual(mockShopWithRelations);
    });

    it('should return null if shop not found', async () => {
      mockPrisma.shop.findUnique.mockResolvedValue(null);

      const result = await db.findShopByDomain('nonexistent-shop.myshopify.com');

      expect(result).toBeNull();
    });
  });

  describe('createOrUpdateShop', () => {
    it('should create a new shop', async () => {
      const shopData = {
        domain: 'new-shop.myshopify.com',
        myshopify_domain: 'new-shop.myshopify.com',
        name: 'New Shop',
        email: 'new@example.com',
        currency: 'USD',
        primary_locale: 'en',
        timezone: 'America/New_York',
        plan_name: 'basic',
        plan_display_name: 'Basic',
      };

      const createdShop = {
        ...mockShop,
        shopifyDomain: shopData.domain,
        name: shopData.name,
        email: shopData.email,
        subscriptions: [],
        settings: [],
      };

      mockPrisma.shop.upsert.mockResolvedValue(createdShop);

      const result = await db.createOrUpdateShop(shopData);

      expect(mockPrisma.shop.upsert).toHaveBeenCalledWith({
        where: { shopifyDomain: shopData.domain },
        update: expect.objectContaining({
          name: shopData.name,
          email: shopData.email,
          updatedAt: expect.any(Date),
        }),
        create: expect.objectContaining({
          shopifyDomain: shopData.domain,
          myshopifyDomain: shopData.myshopify_domain,
          name: shopData.name,
          email: shopData.email,
        }),
        include: {
          subscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          settings: true,
        },
      });
      expect(result).toEqual(createdShop);
    });
  });

  describe('getActiveSubscription', () => {
    it('should return active subscription for shop', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(mockSubscription);

      const result = await db.getActiveSubscription('test-shop-id');

      expect(mockPrisma.subscription.findFirst).toHaveBeenCalledWith({
        where: {
          shopId: 'test-shop-id',
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(mockSubscription);
    });

    it('should return null if no active subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const result = await db.getActiveSubscription('test-shop-id');

      expect(result).toBeNull();
    });
  });

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      const subscriptionData = {
        shopId: 'test-shop-id',
        shopifySubscriptionId: 'gid://shopify/AppSubscription/123',
        name: 'Test Plan',
        status: 'PENDING' as const,
        price: 9.99,
        currency: 'USD',
        interval: 'EVERY_30_DAYS',
        test: true,
      };

      const createdSubscription = {
        ...mockSubscription,
        ...subscriptionData,
      };

      mockPrisma.subscription.create.mockResolvedValue(createdSubscription);

      const result = await db.createSubscription(subscriptionData);

      expect(mockPrisma.subscription.create).toHaveBeenCalledWith({
        data: subscriptionData,
      });
      expect(result).toEqual(createdSubscription);
    });
  });

  describe('getShopSettings', () => {
    it('should return specific setting value', async () => {
      const mockSetting = {
        id: 'setting-id',
        shopId: 'test-shop-id',
        key: 'popup_settings',
        value: { message: 'Test message' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.setting.findUnique.mockResolvedValue(mockSetting);

      const result = await db.getShopSettings('test-shop-id', 'popup_settings');

      expect(mockPrisma.setting.findUnique).toHaveBeenCalledWith({
        where: { shopId_key: { shopId: 'test-shop-id', key: 'popup_settings' } },
      });
      expect(result).toEqual(mockSetting.value);
    });

    it('should return all settings when no key specified', async () => {
      const mockSettings = [
        {
          id: 'setting-1',
          shopId: 'test-shop-id',
          key: 'popup_settings',
          value: { message: 'Test message' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'setting-2',
          shopId: 'test-shop-id',
          key: 'theme_info',
          value: { themeId: 123 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.setting.findMany.mockResolvedValue(mockSettings);

      const result = await db.getShopSettings('test-shop-id');

      expect(mockPrisma.setting.findMany).toHaveBeenCalledWith({
        where: { shopId: 'test-shop-id' },
      });
      expect(result).toEqual({
        popup_settings: { message: 'Test message' },
        theme_info: { themeId: 123 },
      });
    });
  });

  describe('updateShopSettings', () => {
    it('should update shop settings', async () => {
      const settingValue = { message: 'Updated message' };
      const updatedSetting = {
        id: 'setting-id',
        shopId: 'test-shop-id',
        key: 'popup_settings',
        value: settingValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.setting.upsert.mockResolvedValue(updatedSetting);

      const result = await db.updateShopSettings('test-shop-id', 'popup_settings', settingValue);

      expect(mockPrisma.setting.upsert).toHaveBeenCalledWith({
        where: { shopId_key: { shopId: 'test-shop-id', key: 'popup_settings' } },
        update: { value: settingValue, updatedAt: expect.any(Date) },
        create: { shopId: 'test-shop-id', key: 'popup_settings', value: settingValue },
      });
      expect(result).toEqual(updatedSetting);
    });
  });

  describe('createAuditLog', () => {
    it('should create an audit log entry', async () => {
      const logData = {
        shopId: 'test-shop-id',
        action: 'settings_updated',
        resource: 'popup_settings',
        details: { field: 'message' },
      };

      const createdLog = {
        id: 'log-id',
        ...logData,
        createdAt: new Date(),
      };

      mockPrisma.auditLog.create.mockResolvedValue(createdLog);

      const result = await db.createAuditLog(logData);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: logData,
      });
      expect(result).toEqual(createdLog);
    });
  });
});
