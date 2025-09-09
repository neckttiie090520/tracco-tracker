import { test, expect, type Page } from '@playwright/test';
import { 
  PerformanceMonitor, 
  AuthHelper, 
  NavigationHelper, 
  TEST_CONFIG 
} from './helpers/test-helpers';

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

test.describe('Enhanced Performance Tests', () => {
  let performanceMonitor: PerformanceMonitor;
  let authHelper: AuthHelper;
  let navHelper: NavigationHelper;

  test.beforeEach(async ({ page }) => {
    performanceMonitor = new PerformanceMonitor(page);
    authHelper = new AuthHelper(page);
    navHelper = new NavigationHelper(page);
    
    await setupPerformanceMonitoring(page);
    await injectNetworkTimingMonitor(page);
    await performanceMonitor.start();
  });

  test.afterEach(async ({ page }) => {
    const metrics = await performanceMonitor.getMetrics();
    const errors = performanceMonitor.getErrors();
    
    console.log('📊 Test Performance Summary:', {
      webVitals: metrics.webVitals,
      networkRequests: metrics.networkRequestCount,
      errors: metrics.errorCount
    });
  });

  test('Comprehensive Home Page Performance Analysis', async ({ page }) => {
    console.log('🚀 Testing comprehensive home page performance...');
    
    const startTime = Date.now();
    
    // Navigate to home page with performance timing
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
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
    
    // Get comprehensive performance metrics
    const performanceMetrics = await performanceMonitor.getMetrics();
    console.log('🔍 Web Vitals Analysis:', performanceMetrics.webVitals);
    console.log('📈 Performance Timings:', performanceMetrics.customTimings);
    
    // Analyze Core Web Vitals
    const { FCP, LCP, CLS, TTFB } = performanceMetrics.webVitals;
    console.log(`📊 Core Web Vitals:`);
    console.log(`   First Contentful Paint: ${FCP}ms`);
    console.log(`   Largest Contentful Paint: ${LCP}ms`);
    console.log(`   Cumulative Layout Shift: ${CLS}`);
    console.log(`   Time to First Byte: ${TTFB}ms`);
    
    // Performance assertions with industry standards
    expect(loadTime).toBeLessThan(12000); // Home page should load within 12 seconds
    if (FCP > 0) expect(FCP).toBeLessThan(2500); // Good FCP < 1.8s, acceptable < 3.0s
    if (LCP > 0) expect(LCP).toBeLessThan(4000); // Good LCP < 2.5s, acceptable < 4.0s
    if (CLS > 0) expect(CLS).toBeLessThan(0.25); // Good CLS < 0.1, acceptable < 0.25
  });

  test('Comprehensive Error Detection and Performance Monitoring', async ({ page }) => {
    console.log('🔍 Comprehensive error and performance analysis...');
    
    const { logs, errors } = await setupPerformanceMonitoring(page);
    
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
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
    
    // Check for memory leaks and resource usage
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (memoryUsage) {
      console.log('💾 Memory Usage:', {
        used: `${(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        total: `${(memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
      });
    }
    
    // Enhanced performance assertions
    expect(errorLogs.length).toBeLessThan(3); // Stricter error tolerance
    expect(performanceIssues.length).toBeLessThan(5); // Stricter performance warning tolerance
  });

  test('Advanced Navigation Performance and User Journey Analysis', async ({ page }) => {
    console.log('🚀 Advanced navigation performance testing...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');
    
    // Test authenticated navigation performance
    await authHelper.loginUser();
    
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
      
      // Analyze navigation performance patterns
      const avgRequestDuration = recentRequests.reduce((sum, req) => sum + req.duration, 0) / recentRequests.length;
      console.log(`📊 Average request duration during navigation: ${avgRequestDuration.toFixed(2)}ms`);
      
      // Check for resource optimization opportunities
      const largeResources = recentRequests.filter((req: any) => req.duration > 3000);
      if (largeResources.length > 0) {
        console.log('🚨 Large resource requests detected:');
        largeResources.forEach((req: any) => {
          console.log(`  - ${req.url}: ${req.duration.toFixed(2)}ms`);
        });
      }
      
      expect(navigationTime).toBeLessThan(12000); // Navigation should complete within 12 seconds
      expect(avgRequestDuration).toBeLessThan(2000); // Average request should be reasonable
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

  test('Memory Usage and Resource Leak Detection', async ({ page }) => {
    console.log('🚀 Testing memory usage and resource leaks...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    // Get initial memory baseline
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    console.log(`💾 Initial memory usage: ${(initialMemory / 1024 / 1024).toFixed(2)}MB`);
    
    // Simulate heavy navigation usage
    const navigationTasks = [
      async () => await navHelper.navigateToPage('/'),
      async () => {
        const workshopLinks = page.locator('a[href*="/workshop/"]');
        if (await workshopLinks.first().isVisible({ timeout: 3000 })) {
          await workshopLinks.first().click();
          await navHelper.waitForPageLoad();
        }
      },
      async () => await page.goBack()
    ];
    
    // Perform navigation tasks multiple times
    for (let i = 0; i < 3; i++) {
      console.log(`🔄 Navigation cycle ${i + 1}`);
      for (const task of navigationTasks) {
        try {
          await task();
          await page.waitForTimeout(1000);
        } catch (error) {
          console.log('Navigation task failed:', error);
        }
      }
      
      // Force garbage collection if available
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
    }
    
    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    console.log(`💾 Final memory usage: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
    const memoryIncrease = finalMemory - initialMemory;
    console.log(`📈 Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    
    // Memory should not increase excessively (allow 50MB increase)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  test('API Response Time and Database Performance', async ({ page }) => {
    console.log('🚀 Testing API and database performance...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    // Monitor API calls during typical user journey
    const apiRequests: any[] = [];
    
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiRequests.push({
          url: response.url(),
          status: response.status(),
          timing: response.timing(),
          size: response.headers()['content-length'] || 0
        });
      }
    });
    
    // Navigate through key pages that make API calls
    const apiTestPages = [
      '/',
      '/profile',
      '/sessions'
    ];
    
    for (const pagePath of apiTestPages) {
      console.log(`📏 Testing API performance on ${pagePath}`);
      try {
        await navHelper.navigateToPage(pagePath);
        await page.waitForTimeout(3000); // Allow API calls to complete
      } catch (error) {
        console.log(`Failed to navigate to ${pagePath}:`, error);
      }
    }
    
    // Analyze API performance
    console.log(`🔌 API Requests Analysis:`);
    console.log(`   Total API calls: ${apiRequests.length}`);
    
    if (apiRequests.length > 0) {
      const slowAPIs = apiRequests.filter(req => {
        return req.timing && (req.timing.responseEnd - req.timing.requestStart) > 2000;
      });
      
      const failedAPIs = apiRequests.filter(req => req.status >= 400);
      
      console.log(`   Slow API calls (>2s): ${slowAPIs.length}`);
      console.log(`   Failed API calls: ${failedAPIs.length}`);
      
      slowAPIs.forEach((api, index) => {
        const duration = api.timing.responseEnd - api.timing.requestStart;
        console.log(`   🐌 Slow API ${index + 1}: ${api.url} (${duration}ms)`);
      });
      
      failedAPIs.forEach((api, index) => {
        console.log(`   ❌ Failed API ${index + 1}: ${api.url} (${api.status})`);
      });
      
      // Performance assertions
      expect(slowAPIs.length).toBeLessThan(3); // Max 2 slow API calls acceptable
      expect(failedAPIs.length).toBe(0); // No failed API calls
    }
  });

  test('Bundle Size and Resource Loading Analysis', async ({ page }) => {
    console.log('🚀 Testing bundle size and resource loading...');
    
    const resourceMetrics: any[] = [];
    
    // Monitor all resource requests
    page.on('response', response => {
      const size = parseInt(response.headers()['content-length'] || '0');
      const url = response.url();
      
      resourceMetrics.push({
        url,
        type: response.request().resourceType(),
        size,
        status: response.status(),
        fromCache: response.fromCache()
      });
    });
    
    await page.goto(TEST_CONFIG.baseURL);
    await page.waitForLoadState('networkidle');
    
    // Analyze resource loading
    console.log(`📦 Resource Loading Analysis:`);
    
    const resourcesByType = resourceMetrics.reduce((acc, resource) => {
      acc[resource.type] = acc[resource.type] || { count: 0, totalSize: 0 };
      acc[resource.type].count++;
      acc[resource.type].totalSize += resource.size;
      return acc;
    }, {});
    
    Object.entries(resourcesByType).forEach(([type, data]: [string, any]) => {
      console.log(`   ${type}: ${data.count} resources, ${(data.totalSize / 1024).toFixed(2)}KB`);
    });
    
    const totalSize = resourceMetrics.reduce((sum, resource) => sum + resource.size, 0);
    console.log(`📈 Total page size: ${(totalSize / 1024).toFixed(2)}KB`);
    
    // Check for oversized resources
    const largeResources = resourceMetrics.filter(resource => resource.size > 1024 * 1024); // > 1MB
    if (largeResources.length > 0) {
      console.log('🚨 Large resources detected:');
      largeResources.forEach(resource => {
        console.log(`   - ${resource.url}: ${(resource.size / 1024 / 1024).toFixed(2)}MB`);
      });
    }
    
    // Performance assertions
    expect(totalSize).toBeLessThan(10 * 1024 * 1024); // Total page size should be < 10MB
    expect(largeResources.length).toBeLessThan(2); // Allow max 1 large resource
  });
});