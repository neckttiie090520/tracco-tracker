import { test, expect, type Page } from '@playwright/test';

// Performance thresholds (in milliseconds)
const PERFORMANCE_THRESHOLDS = {
  INITIAL_LOAD: 5000,
  GROUP_LOAD: 3000,
  MEMBER_LOAD: 2000,
  SUBMISSION_LOAD: 2000,
  NAVIGATION: 1000,
};

// Helper function to wait for network idle
async function waitForNetworkIdle(page: Page, timeout: number = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

// Helper function to monitor console for errors and performance
async function setupConsoleMonitoring(page: Page) {
  const logs: any[] = [];
  const errors: any[] = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    logs.push({ type: msg.type(), text, timestamp: Date.now() });
    
    if (msg.type() === 'error' || text.includes('error') || text.includes('failed')) {
      errors.push({ text, timestamp: Date.now() });
    }
  });
  
  page.on('pageerror', (error) => {
    errors.push({ text: error.message, timestamp: Date.now(), type: 'pageerror' });
  });
  
  return { logs, errors };
}

// Helper function to measure time for operations
async function measureTime<T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await operation();
  const duration = Date.now() - start;
  return { result, duration };
}

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupConsoleMonitoring(page);
    
    // Mock login or setup authentication
    // You might need to adjust this based on your authentication system
    await page.goto('/');
  });

  test('Workshop feed page loading performance', async ({ page }) => {
    console.log('🚀 Testing workshop feed page loading performance...');
    
    const { logs, errors } = await setupConsoleMonitoring(page);
    
    // Measure initial page load
    const { duration: loadDuration } = await measureTime(async () => {
      // Replace with actual workshop ID from your database
      await page.goto('/workshop/some-workshop-id');
      await waitForNetworkIdle(page);
    });
    
    console.log(`⏱️ Initial page load: ${loadDuration}ms`);
    expect(loadDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIAL_LOAD);
    
    // Check for errors in console
    const queryErrors = errors.filter(e => 
      e.text.includes('query') || 
      e.text.includes('Failed to fetch') ||
      e.text.includes('timeout')
    );
    
    if (queryErrors.length > 0) {
      console.log('❌ Query errors found:', queryErrors);
    }
    
    // Look for slow query warnings
    const slowQueries = logs.filter(log => 
      log.text.includes('slow') || 
      log.text.includes('timeout') ||
      log.text.includes('Operation timed out')
    );
    
    if (slowQueries.length > 0) {
      console.log('⚠️ Slow queries detected:', slowQueries);
    }
    
    expect(queryErrors.length).toBe(0);
  });

  test('Group data loading performance', async ({ page }) => {
    console.log('🚀 Testing group data loading performance...');
    
    const { logs, errors } = await setupConsoleMonitoring(page);
    
    await page.goto('/workshop/some-workshop-id');
    await waitForNetworkIdle(page);
    
    // Look for group cards
    const groupCards = page.locator('[data-testid="group-card"]');
    const groupCount = await groupCards.count();
    
    if (groupCount > 0) {
      console.log(`📊 Found ${groupCount} group cards`);
      
      // Measure time for group settings to load
      const { duration: groupLoadDuration } = await measureTime(async () => {
        await groupCards.first().locator('button:has-text("ตั้งค่ากลุ่ม")').click();
        await page.waitForSelector('[data-testid="group-management-modal"]', { timeout: 5000 });
      });
      
      console.log(`⏱️ Group settings load: ${groupLoadDuration}ms`);
      expect(groupLoadDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.GROUP_LOAD);
      
      // Check for member loading performance
      const membersList = page.locator('[data-testid="members-list"]');
      if (await membersList.isVisible()) {
        const memberItems = membersList.locator('[data-testid="member-item"]');
        const memberCount = await memberItems.count();
        console.log(`👥 Found ${memberCount} members`);
      }
    }
    
    // Check for specific query performance issues
    const memberQueryErrors = errors.filter(e => 
      e.text.includes('Failed to fetch members') ||
      e.text.includes('listMembers error')
    );
    
    if (memberQueryErrors.length > 0) {
      console.log('❌ Member query errors:', memberQueryErrors);
    }
  });

  test('Database query monitoring', async ({ page }) => {
    console.log('🚀 Monitoring database query performance...');
    
    const { logs, errors } = await setupConsoleMonitoring(page);
    
    // Navigate to workshop page and trigger various data loads
    await page.goto('/workshop/some-workshop-id');
    await waitForNetworkIdle(page);
    
    // Wait for all network activity to complete
    await page.waitForTimeout(3000);
    
    // Analyze console logs for performance indicators
    const queryLogs = logs.filter(log => 
      log.text.includes('query') ||
      log.text.includes('fetch') ||
      log.text.includes('loading') ||
      log.text.includes('timeout') ||
      log.text.includes('slow')
    );
    
    console.log(`📊 Total query-related logs: ${queryLogs.length}`);
    
    // Report slow operations
    const slowOperations = logs.filter(log => 
      log.text.includes('Operation timed out') ||
      log.text.includes('slow') ||
      log.text.includes('hanging')
    );
    
    if (slowOperations.length > 0) {
      console.log('⚠️ Slow operations detected:');
      slowOperations.forEach(op => {
        console.log(`  - ${op.text} (${op.type})`);
      });
    }
    
    // Report database errors
    const dbErrors = errors.filter(e => 
      e.text.includes('supabase') ||
      e.text.includes('database') ||
      e.text.includes('query') ||
      e.text.includes('Failed to fetch')
    );
    
    if (dbErrors.length > 0) {
      console.log('❌ Database errors detected:');
      dbErrors.forEach(err => {
        console.log(`  - ${err.text}`);
      });
    }
    
    // Performance assertions
    expect(slowOperations.length).toBeLessThan(3); // Allow some slow operations but not too many
    expect(dbErrors.length).toBe(0); // No database errors should occur
  });

  test('Copy party code performance', async ({ page }) => {
    console.log('🚀 Testing copy party code feature...');
    
    await page.goto('/workshop/some-workshop-id');
    await waitForNetworkIdle(page);
    
    // Look for party code copy button
    const copyButton = page.locator('button[title="คัดลอกรหัสกลุ่ม"]');
    
    if (await copyButton.count() > 0) {
      const { duration: copyDuration } = await measureTime(async () => {
        await copyButton.first().click();
        await page.waitForSelector('.fixed.top-20.right-4.bg-green-500', { timeout: 2000 });
      });
      
      console.log(`⏱️ Copy button response: ${copyDuration}ms`);
      expect(copyDuration).toBeLessThan(500); // Should be very fast
      
      // Verify success message appears and disappears
      const successMessage = page.locator('.fixed.top-20.right-4.bg-green-500');
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toHaveText('คัดลอกรหัสกลุ่มแล้ว');
      
      // Wait for message to disappear (should take ~3 seconds)
      await expect(successMessage).not.toBeVisible({ timeout: 4000 });
    } else {
      console.log('ℹ️ No party code copy buttons found on this page');
    }
  });
});

test.describe('Load Testing', () => {
  test('Multiple concurrent page loads', async ({ browser }) => {
    console.log('🚀 Testing concurrent page load performance...');
    
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const pages = await Promise.all(contexts.map(ctx => ctx.newPage()));
    
    // Setup console monitoring for all pages
    const monitoringSetups = await Promise.all(pages.map(setupConsoleMonitoring));
    
    // Load pages concurrently
    const { duration: concurrentLoadDuration } = await measureTime(async () => {
      await Promise.all(pages.map(page => {
        return page.goto('/workshop/some-workshop-id').then(() => waitForNetworkIdle(page));
      }));
    });
    
    console.log(`⏱️ Concurrent load (3 pages): ${concurrentLoadDuration}ms`);
    
    // Check for errors across all pages
    const allErrors = monitoringSetups.flatMap(setup => setup.errors);
    const queryErrors = allErrors.filter(e => 
      e.text.includes('query') || 
      e.text.includes('Failed to fetch')
    );
    
    if (queryErrors.length > 0) {
      console.log('❌ Query errors during concurrent load:', queryErrors);
    }
    
    // Cleanup
    await Promise.all(contexts.map(ctx => ctx.close()));
    
    expect(queryErrors.length).toBeLessThan(3); // Allow some errors under load but not many
  });
});