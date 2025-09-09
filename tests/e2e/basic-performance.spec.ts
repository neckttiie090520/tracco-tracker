import { test, expect, type Page } from '@playwright/test';

// Helper function to monitor console for performance issues
async function setupPerformanceMonitoring(page: Page) {
  const logs: any[] = [];
  const errors: any[] = [];
  const networkRequests: any[] = [];
  
  // Monitor console messages
  page.on('console', (msg) => {
    const text = msg.text();
    logs.push({ 
      type: msg.type(), 
      text, 
      timestamp: Date.now(),
      url: msg.location()?.url || ''
    });
    
    if (msg.type() === 'error' || text.includes('error') || text.includes('failed')) {
      errors.push({ text, timestamp: Date.now() });
    }
  });
  
  // Monitor page errors
  page.on('pageerror', (error) => {
    errors.push({ 
      text: error.message, 
      timestamp: Date.now(), 
      type: 'pageerror',
      stack: error.stack
    });
  });
  
  // Monitor network requests
  page.on('request', (request) => {
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      timestamp: Date.now(),
      resourceType: request.resourceType()
    });
  });
  
  return { logs, errors, networkRequests };
}

// Helper to inject network timing monitor
async function injectNetworkTimingMonitor(page: Page) {
  await page.addInitScript(() => {
    (window as any).networkTimings = [];
    
    const originalFetch = window.fetch;
    window.fetch = async (input: any, init: any) => {
      const start = performance.now();
      const url = typeof input === 'string' ? input : input.url;
      
      try {
        const response = await originalFetch(input, init);
        const end = performance.now();
        const duration = end - start;
        
        (window as any).networkTimings.push({
          url,
          method: init?.method || 'GET',
          duration,
          success: response.ok,
          status: response.status,
          timestamp: Date.now()
        });
        
        // Log slow requests
        if (duration > 1000) {
          console.warn(`🐌 Slow network request: ${url} took ${duration.toFixed(2)}ms`);
        }
        
        return response;
      } catch (error) {
        const end = performance.now();
        const duration = end - start;
        
        (window as any).networkTimings.push({
          url,
          method: init?.method || 'GET',
          duration,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
        
        throw error;
      }
    };
  });
}

test.describe('Basic Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupPerformanceMonitoring(page);
    await injectNetworkTimingMonitor(page);
  });

  test('Home page loading performance', async ({ page }) => {
    console.log('🚀 Testing home page performance...');
    
    const startTime = Date.now();
    
    // Navigate to home page
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Home page load time: ${loadTime}ms`);
    
    // Get network timings
    const networkTimings = await page.evaluate(() => (window as any).networkTimings || []);
    
    if (networkTimings.length > 0) {
      console.log(`📊 Network requests made: ${networkTimings.length}`);
      
      // Analyze slow requests
      const slowRequests = networkTimings.filter((req: any) => req.duration > 1000);
      if (slowRequests.length > 0) {
        console.log('🐌 Slow requests detected:');
        slowRequests.forEach((req: any) => {
          console.log(`  - ${req.method} ${req.url}: ${req.duration.toFixed(2)}ms`);
        });
      }
      
      // Analyze failed requests  
      const failedRequests = networkTimings.filter((req: any) => !req.success);
      if (failedRequests.length > 0) {
        console.log('❌ Failed requests:');
        failedRequests.forEach((req: any) => {
          console.log(`  - ${req.method} ${req.url}: ${req.error || 'Unknown error'}`);
        });
      }
    }
    
    // Basic performance assertions
    expect(loadTime).toBeLessThan(10000); // Home page should load within 10 seconds
  });

  test('Check for console errors and warnings', async ({ page }) => {
    console.log('🔍 Checking for console errors...');
    
    const { logs, errors } = await setupPerformanceMonitoring(page);
    
    await page.goto('/');
    await page.waitForLoadState('networkidle', { timeout: 10000 });
    
    // Wait for any async operations
    await page.waitForTimeout(3000);
    
    // Analyze console logs
    const errorLogs = logs.filter(log => log.type === 'error');
    const warningLogs = logs.filter(log => log.type === 'warning');
    const infoLogs = logs.filter(log => log.type === 'log' || log.type === 'info');
    
    console.log(`📊 Console activity:`);
    console.log(`  - Errors: ${errorLogs.length}`);
    console.log(`  - Warnings: ${warningLogs.length}`);
    console.log(`  - Info/Debug: ${infoLogs.length}`);
    
    if (errorLogs.length > 0) {
      console.log('❌ Console errors:');
      errorLogs.forEach(log => {
        console.log(`  - ${log.text}`);
      });
    }
    
    if (warningLogs.length > 0) {
      console.log('⚠️ Console warnings:');
      warningLogs.slice(0, 5).forEach(log => { // Show first 5 warnings
        console.log(`  - ${log.text}`);
      });
    }
    
    // Look for specific performance-related issues
    const performanceIssues = logs.filter(log => 
      log.text.includes('slow') ||
      log.text.includes('timeout') ||
      log.text.includes('hanging') ||
      log.text.includes('Operation timed out')
    );
    
    if (performanceIssues.length > 0) {
      console.log('⚠️ Performance issues detected:');
      performanceIssues.forEach(issue => {
        console.log(`  - ${issue.text}`);
      });
    }
    
    // Performance assertions - be lenient for now
    expect(errorLogs.length).toBeLessThan(5); // Allow some errors but not too many
    expect(performanceIssues.length).toBeLessThan(10); // Allow some performance warnings
  });

  test('Navigation performance test', async ({ page }) => {
    console.log('🚀 Testing navigation performance...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for navigation links
    const workshopLinks = page.locator('a[href*="/workshop/"]');
    const linkCount = await workshopLinks.count();
    
    console.log(`🔗 Found ${linkCount} workshop links`);
    
    if (linkCount > 0) {
      // Test clicking the first workshop link
      const startTime = Date.now();
      
      await workshopLinks.first().click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      
      const navigationTime = Date.now() - startTime;
      console.log(`⏱️ Navigation time: ${navigationTime}ms`);
      
      // Get network timings for this navigation
      const networkTimings = await page.evaluate(() => (window as any).networkTimings || []);
      const recentRequests = networkTimings.filter((req: any) => 
        Date.now() - req.timestamp < navigationTime + 1000
      );
      
      console.log(`📊 Network requests during navigation: ${recentRequests.length}`);
      
      const slowNavRequests = recentRequests.filter((req: any) => req.duration > 2000);
      if (slowNavRequests.length > 0) {
        console.log('🐌 Slow requests during navigation:');
        slowNavRequests.forEach((req: any) => {
          console.log(`  - ${req.url}: ${req.duration.toFixed(2)}ms`);
        });
      }
      
      expect(navigationTime).toBeLessThan(15000); // Navigation should complete within 15 seconds
    } else {
      console.log('ℹ️ No workshop links found for navigation test');
    }
  });

  test('Copy button functionality test', async ({ page }) => {
    console.log('🚀 Testing copy button functionality...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to a workshop page if available
    const workshopLinks = page.locator('a[href*="/workshop/"]');
    if (await workshopLinks.count() > 0) {
      await workshopLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Look for copy buttons
      const copyButtons = page.locator('button[title="คัดลอกรหัสกลุ่ม"]');
      const copyButtonCount = await copyButtons.count();
      
      console.log(`📋 Found ${copyButtonCount} copy buttons`);
      
      if (copyButtonCount > 0) {
        // Test copy button click
        const startTime = Date.now();
        await copyButtons.first().click();
        
        // Wait for success message
        const successMessage = page.locator('.fixed.top-20.right-4.bg-green-500');
        await expect(successMessage).toBeVisible({ timeout: 2000 });
        
        const responseTime = Date.now() - startTime;
        console.log(`⏱️ Copy button response time: ${responseTime}ms`);
        
        // Verify success message content
        await expect(successMessage).toHaveText('คัดลอกรหัสกลุ่มแล้ว');
        
        // Wait for message to disappear
        await expect(successMessage).not.toBeVisible({ timeout: 4000 });
        
        expect(responseTime).toBeLessThan(1000); // Should be very fast
        console.log('✅ Copy button test passed');
      } else {
        console.log('ℹ️ No copy buttons found on this page');
      }
    } else {
      console.log('ℹ️ No workshop links found for copy button test');
    }
  });
});