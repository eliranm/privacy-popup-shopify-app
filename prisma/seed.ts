import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Create a test shop for development
  const testShop = await prisma.shop.upsert({
    where: { shopifyDomain: 'test-store.myshopify.com' },
    update: {},
    create: {
      shopifyDomain: 'test-store.myshopify.com',
      myshopifyDomain: 'test-store.myshopify.com',
      name: 'Test Store',
      email: 'test@example.com',
      domain: 'test-store.com',
      currency: 'USD',
      currencySymbol: '$',
      primaryLocale: 'en',
      timezone: 'America/New_York',
      planName: 'basic',
      planDisplayName: 'Basic',
    },
  });

  // Create default settings for the test shop
  await prisma.setting.upsert({
    where: {
      shopId_key: {
        shopId: testShop.id,
        key: 'popup_settings'
      }
    },
    update: {},
    create: {
      shopId: testShop.id,
      key: 'popup_settings',
      value: {
        message: 'We use cookies to enhance your browsing experience and analyze our traffic. By continuing to use our site, you consent to our use of cookies.',
        linkUrl: '/pages/privacy-policy',
        position: 'bottom',
        maxWidth: 400,
        padding: 20,
        zIndex: 9999,
        dismissible: true,
        bgColor: '#ffffff',
        textColor: '#333333',
        linkColor: '#007ace'
      }
    }
  });

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
