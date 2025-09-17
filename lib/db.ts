import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
  });
};

export const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Utility functions for common database operations
export const db = {
  // Shop operations
  async findShopByDomain(domain: string) {
    return prisma.shop.findUnique({
      where: { shopifyDomain: domain },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        settings: true,
      },
    });
  },

  async createOrUpdateShop(shopData: any) {
    const {
      domain,
      name,
      email,
      myshopify_domain,
      currency,
      primary_locale,
      timezone,
      plan_name,
      plan_display_name,
      ...rest
    } = shopData;

    return prisma.shop.upsert({
      where: { shopifyDomain: domain },
      update: {
        name,
        email,
        currency,
        primaryLocale: primary_locale,
        timezone,
        planName: plan_name,
        planDisplayName: plan_display_name,
        updatedAt: new Date(),
        ...rest,
      },
      create: {
        shopifyDomain: domain,
        myshopifyDomain: myshopify_domain || domain,
        name,
        email,
        currency,
        primaryLocale: primary_locale,
        timezone,
        planName: plan_name,
        planDisplayName: plan_display_name,
        ...rest,
      },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        settings: true,
      },
    });
  },

  // Subscription operations
  async getActiveSubscription(shopId: string) {
    return prisma.subscription.findFirst({
      where: {
        shopId,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async createSubscription(data: {
    shopId: string;
    shopifySubscriptionId: string;
    name: string;
    status: 'PENDING' | 'ACTIVE';
    price: number;
    currency: string;
    interval: string;
    trialEnd?: Date;
    test?: boolean;
  }) {
    return prisma.subscription.create({
      data,
    });
  },

  async updateSubscriptionStatus(
    shopifySubscriptionId: string,
    status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'FROZEN' | 'PAUSED'
  ) {
    return prisma.subscription.update({
      where: { shopifySubscriptionId },
      data: { status, updatedAt: new Date() },
    });
  },

  // Settings operations
  async getShopSettings(shopId: string, key?: string) {
    if (key) {
      const setting = await prisma.setting.findUnique({
        where: { shopId_key: { shopId, key } },
      });
      return setting?.value;
    }

    const settings = await prisma.setting.findMany({
      where: { shopId },
    });

    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, any>);
  },

  async updateShopSettings(shopId: string, key: string, value: any) {
    return prisma.setting.upsert({
      where: { shopId_key: { shopId, key } },
      update: { value, updatedAt: new Date() },
      create: { shopId, key, value },
    });
  },

  // Audit log operations
  async createAuditLog(data: {
    shopId: string;
    action: string;
    resource?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    userAgent?: string;
    ipAddress?: string;
  }) {
    return prisma.auditLog.create({
      data,
    });
  },

  async getAuditLogs(shopId: string, options: {
    page?: number;
    limit?: number;
    action?: string;
    resource?: string;
  } = {}) {
    const { page = 1, limit = 50, action, resource } = options;
    const skip = (page - 1) * limit;

    const where = {
      shopId,
      ...(action && { action }),
      ...(resource && { resource }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  // Session operations (for Shopify session storage)
  async findSession(id: string) {
    return prisma.session.findUnique({
      where: { id },
    });
  },

  async storeSession(session: any) {
    const {
      id,
      shop,
      state,
      isOnline,
      scope,
      expires,
      accessToken,
      userId,
      firstName,
      lastName,
      email,
      accountOwner,
      locale,
      collaborator,
      emailVerified,
    } = session;

    return prisma.session.upsert({
      where: { id },
      update: {
        state,
        scope,
        expires,
        accessToken,
        userId: userId ? BigInt(userId) : null,
        firstName,
        lastName,
        email,
        accountOwner,
        locale,
        collaborator,
        emailVerified,
        updatedAt: new Date(),
      },
      create: {
        id,
        shop,
        state,
        isOnline,
        scope,
        expires,
        accessToken,
        userId: userId ? BigInt(userId) : null,
        firstName,
        lastName,
        email,
        accountOwner,
        locale,
        collaborator,
        emailVerified,
      },
    });
  },

  async deleteSession(id: string) {
    return prisma.session.delete({
      where: { id },
    });
  },

  async deleteSessionsByShop(shop: string) {
    return prisma.session.deleteMany({
      where: { shop },
    });
  },

  // Cleanup operations
  async cleanupExpiredSessions() {
    return prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    });
  },

  async cleanupShopData(shopId: string) {
    // Delete in order to respect foreign key constraints
    await prisma.auditLog.deleteMany({ where: { shopId } });
    await prisma.setting.deleteMany({ where: { shopId } });
    await prisma.subscription.deleteMany({ where: { shopId } });
    await prisma.shop.delete({ where: { id: shopId } });
  },
};

export default prisma;
