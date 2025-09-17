import { FullConfig } from '@playwright/test';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');

  // Clean up test database if needed
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('test')) {
    console.log('🗄️  Cleaning up test database...');
    try {
      await execAsync('npm run db:reset -- --force');
      console.log('✅ Test database cleaned up');
    } catch (error) {
      console.warn('⚠️  Failed to clean up test database:', error);
    }
  }

  // Clean up any temporary files
  try {
    await execAsync('rm -rf test-results/tmp');
    console.log('✅ Temporary files cleaned up');
  } catch (error) {
    console.warn('⚠️  Failed to clean up temporary files:', error);
  }

  // Kill any remaining processes if needed
  if (!process.env.CI) {
    try {
      // Kill any Node.js processes that might be hanging around
      await execAsync('pkill -f "node.*next" || true');
      console.log('✅ Processes cleaned up');
    } catch (error) {
      console.warn('⚠️  Failed to clean up processes:', error);
    }
  }

  console.log('✅ Global teardown complete');
}

export default globalTeardown;
