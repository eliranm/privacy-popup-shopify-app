import { shopifyApi, LATEST_API_VERSION } from '@shopify/shopify-api';
import { restResources } from '@shopify/shopify-api/rest/admin/2023-10';
import { PrismaSessionStorage } from '@shopify/shopify-app-session-storage-prisma';
import { prisma } from './db';

// Validate required environment variables
const requiredEnvVars = {
  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SCOPES,
  SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

// Initialize Shopify API
export const shopify = shopifyApi({
  apiKey: requiredEnvVars.SHOPIFY_API_KEY!,
  apiSecretKey: requiredEnvVars.SHOPIFY_API_SECRET!,
  scopes: requiredEnvVars.SCOPES!.split(','),
  hostName: new URL(requiredEnvVars.SHOPIFY_APP_URL!).hostname,
  hostScheme: new URL(requiredEnvVars.SHOPIFY_APP_URL!).protocol.replace(':', ''),
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    httpRequests: process.env.NODE_ENV === 'development',
    timestamps: true,
  },
  restResources,
});

// Session storage using Prisma
export const sessionStorage = new PrismaSessionStorage(prisma);

// Helper functions for common Shopify operations
export const shopifyHelpers = {
  /**
   * Get shop information from Shopify API
   */
  async getShopInfo(session: any) {
    const client = new shopify.clients.Rest({ session });
    const response = await client.get({ path: 'shop' });
    return response.body.shop;
  },

  /**
   * Get themes for a shop
   */
  async getThemes(session: any) {
    const client = new shopify.clients.Rest({ session });
    const response = await client.get({ path: 'themes' });
    return response.body.themes;
  },

  /**
   * Get the main theme for a shop
   */
  async getMainTheme(session: any) {
    const themes = await this.getThemes(session);
    return themes.find((theme: any) => theme.role === 'main');
  },

  /**
   * Check if app embed is enabled in theme
   */
  async checkAppEmbedStatus(session: any, themeId?: number) {
    try {
      const client = new shopify.clients.Rest({ session });
      
      if (!themeId) {
        const mainTheme = await this.getMainTheme(session);
        themeId = mainTheme?.id;
      }

      if (!themeId) {
        return { enabled: false, error: 'No theme found' };
      }

      // Get theme assets to check for app embed blocks
      const response = await client.get({
        path: `themes/${themeId}/assets`,
      });

      const assets = response.body.assets || [];
      const appEmbedAsset = assets.find((asset: any) => 
        asset.key?.includes('app-embed') || asset.key?.includes('privacy-popup')
      );

      return {
        enabled: !!appEmbedAsset,
        themeId,
        blockId: appEmbedAsset?.key,
      };
    } catch (error) {
      console.error('Error checking app embed status:', error);
      return { enabled: false, error: 'Failed to check status' };
    }
  },

  /**
   * Create GraphQL client for billing operations
   */
  createGraphQLClient(session: any) {
    return new shopify.clients.Graphql({ session });
  },

  /**
   * Create app subscription
   */
  async createAppSubscription(session: any, subscriptionInput: {
    name: string;
    price: number;
    currency: string;
    interval: string;
    trialDays?: number;
    test?: boolean;
  }) {
    const client = this.createGraphQLClient(session);
    
    const mutation = `
      mutation appSubscriptionCreate($name: String!, $lineItems: [AppSubscriptionLineItemInput!]!, $trialDays: Int, $test: Boolean) {
        appSubscriptionCreate(
          name: $name
          lineItems: $lineItems
          trialDays: $trialDays
          test: $test
        ) {
          appSubscription {
            id
            name
            status
            currentPeriodEnd
            trialDays
            test
          }
          confirmationUrl
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      name: subscriptionInput.name,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: subscriptionInput.price,
                currencyCode: subscriptionInput.currency,
              },
              interval: subscriptionInput.interval,
            },
          },
        },
      ],
      trialDays: subscriptionInput.trialDays,
      test: subscriptionInput.test ?? false,
    };

    const response = await client.query({
      data: { query: mutation, variables },
    });

    return response.body.data.appSubscriptionCreate;
  },

  /**
   * Get current app subscriptions
   */
  async getAppSubscriptions(session: any) {
    const client = this.createGraphQLClient(session);
    
    const query = `
      query {
        currentAppInstallation {
          appSubscriptions(first: 10) {
            edges {
              node {
                id
                name
                status
                currentPeriodEnd
                trialDays
                test
                lineItems {
                  id
                  plan {
                    pricingDetails {
                      ... on AppRecurringPricing {
                        price {
                          amount
                          currencyCode
                        }
                        interval
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await client.query({ data: { query } });
    return response.body.data.currentAppInstallation.appSubscriptions.edges.map(
      (edge: any) => edge.node
    );
  },

  /**
   * Cancel app subscription
   */
  async cancelAppSubscription(session: any, subscriptionId: string) {
    const client = this.createGraphQLClient(session);
    
    const mutation = `
      mutation appSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          appSubscription {
            id
            status
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const response = await client.query({
      data: { query: mutation, variables: { id: subscriptionId } },
    });

    return response.body.data.appSubscriptionCancel;
  },

  /**
   * Verify webhook HMAC
   */
  verifyWebhookSignature(data: string, signature: string): boolean {
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.SHOPIFY_API_SECRET);
    hmac.update(data, 'utf8');
    const hash = hmac.digest('base64');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  },

  /**
   * Register webhooks
   */
  async registerWebhooks(session: any) {
    const client = new shopify.clients.Rest({ session });
    const baseUrl = process.env.SHOPIFY_APP_URL;

    const webhooks = [
      {
        topic: 'app/uninstalled',
        address: `${baseUrl}/api/webhooks/app/uninstalled`,
        format: 'json',
      },
      {
        topic: 'shop/update',
        address: `${baseUrl}/api/webhooks/shop/update`,
        format: 'json',
      },
      {
        topic: 'themes/publish',
        address: `${baseUrl}/api/webhooks/themes/publish`,
        format: 'json',
      },
      {
        topic: 'app_subscriptions/update',
        address: `${baseUrl}/api/webhooks/app_subscriptions/update`,
        format: 'json',
      },
    ];

    const results = [];
    for (const webhook of webhooks) {
      try {
        const response = await client.post({
          path: 'webhooks',
          data: { webhook },
        });
        results.push({ success: true, webhook: response.body.webhook });
      } catch (error) {
        console.error(`Failed to register webhook ${webhook.topic}:`, error);
        results.push({ success: false, topic: webhook.topic, error });
      }
    }

    return results;
  },

  /**
   * Get installed webhooks
   */
  async getWebhooks(session: any) {
    const client = new shopify.clients.Rest({ session });
    const response = await client.get({ path: 'webhooks' });
    return response.body.webhooks;
  },
};

export default shopify;
