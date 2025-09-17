import { chromium, FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');

  // Start the development server if not in CI
  if (!process.env.CI && !process.env.BASE_URL) {
    console.log('📡 Starting development server...');
    
    // Install dependencies if needed
    try {
      await execAsync('npm ci');
      console.log('✅ Dependencies installed');
    } catch (error) {
      console.warn('⚠️  Failed to install dependencies:', error);
    }

    // Generate Prisma client
    try {
      await execAsync('npm run db:generate');
      console.log('✅ Prisma client generated');
    } catch (error) {
      console.warn('⚠️  Failed to generate Prisma client:', error);
    }

    // Build the application
    try {
      await execAsync('npm run build');
      console.log('✅ Application built');
    } catch (error) {
      console.warn('⚠️  Failed to build application:', error);
    }
  }

  // Setup test database if needed
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('test')) {
    console.log('🗄️  Setting up test database...');
    try {
      await execAsync('npm run db:push');
      console.log('✅ Test database setup complete');
    } catch (error) {
      console.warn('⚠️  Failed to setup test database:', error);
    }
  }

  // Create a browser instance for authentication if needed
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Store authentication state if we need to test authenticated flows
  // This would typically involve logging into Shopify Partner Dashboard
  // and setting up test stores, but for now we'll skip this
  
  await page.close();
  await context.close();
  await browser.close();

  console.log('✅ Global setup complete');
}

export default globalSetup;
