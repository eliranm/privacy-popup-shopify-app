import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.SHOPIFY_API_KEY = 'test_api_key';
process.env.SHOPIFY_API_SECRET = 'test_api_secret';
process.env.SCOPES = 'read_themes,write_themes,write_own_subscription_contracts';
process.env.SHOPIFY_APP_URL = 'https://test-app.ngrok.io';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.ENCRYPTION_KEY = 'test_encryption_key_32_characters!';

// Mock Next.js modules
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn((key: string) => {
      const params: Record<string, string> = {
        shop: 'test-shop.myshopify.com',
        host: 'test-host',
      };
      return params[key] || null;
    }),
  })),
  usePathname: vi.fn(() => '/dashboard'),
}));

// Mock Shopify App Bridge
vi.mock('@shopify/app-bridge-react', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => children,
  useAppBridge: vi.fn(),
  useAuthenticatedFetch: vi.fn(() => vi.fn()),
}));

// Mock Polaris components for testing
vi.mock('@shopify/polaris', async () => {
  const actual = await vi.importActual('@shopify/polaris');
  return {
    ...actual,
    AppProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock Prisma client
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => ({
    shop: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    subscription: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    setting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    $disconnect: vi.fn(),
    $connect: vi.fn(),
  })),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'https://test-app.ngrok.io',
    hostname: 'test-app.ngrok.io',
    origin: 'https://test-app.ngrok.io',
    pathname: '/dashboard',
    search: '?shop=test-shop.myshopify.com&host=test-host',
    reload: vi.fn(),
    assign: vi.fn(),
    replace: vi.fn(),
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock console methods in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Global test utilities
export const mockShop = {
  id: 'test-shop-id',
  shopifyDomain: 'test-shop.myshopify.com',
  myshopifyDomain: 'test-shop.myshopify.com',
  name: 'Test Shop',
  email: 'test@example.com',
  currency: 'USD',
  primaryLocale: 'en',
  timezone: 'America/New_York',
  planName: 'basic',
  planDisplayName: 'Basic',
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const mockSubscription = {
  id: 'test-subscription-id',
  shopId: 'test-shop-id',
  shopifySubscriptionId: 'gid://shopify/AppSubscription/123',
  name: 'Privacy Popup Basic',
  status: 'ACTIVE' as const,
  price: 4.99,
  currency: 'USD',
  interval: 'EVERY_30_DAYS',
  test: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  trialEnd: null,
};

export const mockSettings = {
  message: 'We use cookies to enhance your browsing experience.',
  linkUrl: '/pages/privacy-policy',
  position: 'bottom' as const,
  maxWidth: 400,
  padding: 20,
  zIndex: 9999,
  dismissible: true,
  bgColor: '#ffffff',
  textColor: '#333333',
  linkColor: '#007ace',
};

export const createMockApiResponse = <T>(data: T, success = true) => ({
  success,
  data,
  error: success ? undefined : 'Test error',
});

export const mockFetch = (response: any, ok = true) => {
  (global.fetch as any).mockResolvedValueOnce({
    ok,
    json: async () => response,
    text: async () => JSON.stringify(response),
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
  });
};
