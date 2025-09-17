import type { Shop, Subscription, Setting, AuditLog, SubscriptionStatus } from '@prisma/client';

// Re-export Prisma types
export type { Shop, Subscription, Setting, AuditLog, SubscriptionStatus };

// Extended types with relations
export interface ShopWithSubscriptions extends Shop {
  subscriptions: Subscription[];
  settings: Setting[];
}

export interface ShopWithActiveSubscription extends Shop {
  activeSubscription?: Subscription | null;
}

// Popup settings type
export interface PopupSettings {
  message: string;
  linkUrl: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  maxWidth: number;
  padding: number;
  zIndex: number;
  dismissible: boolean;
  bgColor: string;
  textColor: string;
  linkColor: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Shopify types
export interface ShopifySession {
  id: string;
  shop: string;
  state: string;
  isOnline: boolean;
  scope?: string;
  expires?: Date;
  accessToken: string;
  userId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  accountOwner: boolean;
  locale?: string;
  collaborator?: boolean;
  emailVerified?: boolean;
}

export interface ShopifyWebhookPayload {
  id: number;
  name: string;
  email: string;
  domain: string;
  province: string;
  country: string;
  address1: string;
  zip: string;
  city: string;
  source: string;
  phone: string;
  latitude: number;
  longitude: number;
  primary_locale: string;
  address2: string;
  created_at: string;
  updated_at: string;
  country_code: string;
  country_name: string;
  currency: string;
  customer_email: string;
  timezone: string;
  iana_timezone: string;
  shop_owner: string;
  money_format: string;
  money_with_currency_format: string;
  weight_unit: string;
  province_code: string;
  taxes_included: boolean;
  auto_configure_tax_inclusivity: boolean;
  tax_shipping: boolean;
  county_taxes: boolean;
  plan_display_name: string;
  plan_name: string;
  has_discounts: boolean;
  has_gift_cards: boolean;
  myshopify_domain: string;
  google_apps_domain: string;
  google_apps_login_enabled: boolean;
  money_in_emails_format: string;
  money_with_currency_in_emails_format: string;
  eligible_for_payments: boolean;
  requires_extra_payments_agreement: boolean;
  password_enabled: boolean;
  has_storefront: boolean;
  eligible_for_card_reader_giveaway: boolean;
  finances: boolean;
  primary_location_id: number;
  cookie_consent_level: string;
  visitor_tracking_consent_preference: string;
  checkout_api_supported: boolean;
  multi_location_enabled: boolean;
  setup_required: boolean;
  pre_launch_enabled: boolean;
  enabled_presentment_currencies: string[];
}

// Billing types
export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  trialDays?: number;
  features: string[];
}

export interface SubscriptionCreateInput {
  name: string;
  lineItems: Array<{
    plan: {
      appRecurringPricingDetails: {
        price: {
          amount: number;
          currencyCode: string;
        };
        interval: string;
      };
    };
  }>;
  trialDays?: number;
  test?: boolean;
}

// Theme extension types
export interface ThemeInfo {
  id: number;
  name: string;
  role: string;
  theme_store_id?: number;
  previewable: boolean;
  processing: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppEmbedStatus {
  enabled: boolean;
  themeId?: number;
  themeName?: string;
  blockId?: string;
}

// Error types
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

// Audit log types
export interface AuditLogEntry {
  id: string;
  shopId: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
}
