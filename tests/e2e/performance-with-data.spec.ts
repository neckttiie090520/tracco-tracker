import { test, expect, type Page } from '@playwright/test';

// Performance test with actual data interactions
async function setupAdvancedMonitoring(page: Page) {
  const performanceMetrics = {
    dbQueries: [],
    slowOperations: [],
    errors: [],
    networkRequests: []
  };
  
  // Inject performance monitoring script
  await page.addInitScript(() => {
    (window as any).performanceData = {
      queries: [],
      timings: {},
      startTime: Date.now()
    };
    
    // Override fetch to monitor database calls
    const originalFetch = window.fetch;
    window.fetch = async (input: any, init: any) => {
      const url = typeof input === 'string' ? input : input.url;
      const startTime = performance.now();
      
      try {
        const response = await originalFetch(input, init);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (url.includes('supabase.co') || url.includes('rest/v1')) {
          const queryInfo = {
            url,
            method: init?.method || 'GET',
            duration,
            success: response.ok,
            timestamp: Date.now(),
            status: response.status
          };
          
          (window as any).performanceData.queries.push(queryInfo);
          
          if (duration > 1000) {
            console.warn(`🐌 Slow database query: ${url} took ${duration.toFixed(2)}ms`);
          }
          
          if (!response.ok) {
            console.error(`❌ Database query failed: ${url} - Status ${response.status}`);
          }
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        (window as any).performanceData.queries.push({
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
  
  // Monitor console output
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    
    if (type === 'error') {
      performanceMetrics.errors.push({
        text,
        type: 'console',
        timestamp: Date.now()
      });
      console.log(`❌ CONSOLE ERROR: ${text}`);
    } else if (text.includes('slow') || text.includes('timeout') || text.includes('hanging')) {
      performanceMetrics.slowOperations.push({
        text,
        timestamp: Date.now()
      });
      console.log(`⚠️  PERFORMANCE WARNING: ${text}`);
    } else if (text.includes('query') || text.includes('database') || text.includes('supabase')) {
      console.log(`📊 DATABASE LOG: ${text}`);
    }
  });
  
  return performanceMetrics;
}

async function getPerformanceData(page: Page) {
  return await page.evaluate(() => (window as any).performanceData || { queries: [] });
}

test.describe('Performance Tests with Real Data', () => {
  
  test('Test workshop page performance with manual navigation', async ({ page }) => {
    console.log('🔍 Testing workshop page performance - Please navigate manually');
    
    const metrics = await setupAdvancedMonitoring(page);
    
    // Start at home page
    await page.goto('/', { waitUntil: 'networkidle' });
    
    console.log('👋 Application loaded. Manual testing instructions:');
    console.log('1. If you see workshops, click on one');
    console.log('2. Look for group-related features');
    console.log('3. Try group management if available');
    console.log('4. Test copy buttons if present');
    console.log('⏳ Monitoring for 60 seconds...');
    
    // Monitor for 60 seconds to allow manual interaction
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(5000);
      
      // Get current performance data
      const perfData = await getPerformanceData(page);
      
      if (perfData.queries.length > 0) {
        const recentQueries = perfData.queries.filter(q => 
          Date.now() - q.timestamp < 10000
        );
        
        if (recentQueries.length > 0) {
          console.log(`📊 Recent queries (last 10s): ${recentQueries.length}`);
          
          const slowQueries = recentQueries.filter(q => q.duration > 1000);
          if (slowQueries.length > 0) {
            console.log(`🐌 Slow queries detected: ${slowQueries.length}`);
            slowQueries.forEach(q => {
              const endpoint = q.url.split('rest/v1/')[1] || q.url;
              console.log(`  - ${q.method} ${endpoint}: ${q.duration.toFixed(2)}ms`);
            });
          }
        }
      }
      
      console.log(`⏳ Monitoring... ${60 - (i + 1) * 5} seconds remaining`);
    }
    
    // Final analysis
    const finalPerfData = await getPerformanceData(page);
    console.log('\n📊 Final Performance Analysis:');
    console.log(`🔍 Total database queries: ${finalPerfData.queries.length}`);
    
    if (finalPerfData.queries.length > 0) {
      const avgDuration = finalPerfData.queries.reduce((sum, q) => sum + q.duration, 0) / finalPerfData.queries.length;
      const maxDuration = Math.max(...finalPerfData.queries.map(q => q.duration));
      const slowQueries = finalPerfData.queries.filter(q => q.duration > 1000);
      const failedQueries = finalPerfData.queries.filter(q => !q.success);
      
      console.log(`📈 Average query time: ${avgDuration.toFixed(2)}ms`);
      console.log(`📈 Maximum query time: ${maxDuration.toFixed(2)}ms`);
      console.log(`🐌 Slow queries (>1s): ${slowQueries.length}`);
      console.log(`❌ Failed queries: ${failedQueries.length}`);
      
      if (slowQueries.length > 0) {
        console.log('\n🐌 Slowest queries:');
        slowQueries
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 5)
          .forEach((q, i) => {
            const endpoint = q.url.split('rest/v1/')[1] || q.url;
            console.log(`  ${i + 1}. ${q.method} ${endpoint}: ${q.duration.toFixed(2)}ms`);
          });
      }
      
      // Analyze query patterns for N+1 problems
      const queryTypes = {};
      finalPerfData.queries.forEach(q => {
        const endpoint = q.url.split('rest/v1/')[1]?.split('?')[0] || 'unknown';
        queryTypes[endpoint] = (queryTypes[endpoint] || 0) + 1;
      });
      
      const suspiciousPatterns = Object.entries(queryTypes)
        .filter(([_, count]) => count > 5)
        .sort((a, b) => b[1] - a[1]);
      
      if (suspiciousPatterns.length > 0) {
        console.log('\n⚠️  Possible N+1 query patterns:');
        suspiciousPatterns.forEach(([endpoint, count]) => {
          console.log(`  - ${endpoint}: ${count} queries`);
        });
      }
      
      // Performance assertions
      expect(avgDuration).toBeLessThan(2000);
      expect(slowQueries.length).toBeLessThan(5);
      expect(failedQueries.length).toBe(0);
    }
    
    console.log('\n✅ Performance test completed');
  });

  test('Automated workshop navigation test', async ({ page }) => {
    console.log('🤖 Automated workshop navigation and performance test');
    
    await setupAdvancedMonitoring(page);
    
    // Navigate to home
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Try to find and click workshop elements
    const selectors = [
      'a[href*="/workshop/"]',
      'button:has-text("ดูรายละเอียด")',
      'button:has-text("เข้าร่วม")',
      '.workshop-card a',
      '[data-testid*="workshop"] a'
    ];
    
    let navigated = false;
    for (const selector of selectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      
      if (count > 0) {
        console.log(`🔗 Found ${count} elements with selector: ${selector}`);
        try {
          await elements.first().click({ timeout: 5000 });
          await page.waitForLoadState('networkidle');
          navigated = true;
          console.log('✅ Successfully navigated to workshop page');
          break;
        } catch (e) {
          console.log(`⚠️  Failed to click ${selector}: ${e.message}`);
        }
      }
    }
    
    if (navigated) {
      await page.waitForTimeout(5000);
      
      // Try to interact with group features
      const groupSelectors = [
        'button:has-text("กลุ่ม")',
        'button:has-text("สมาชิก")', 
        'button:has-text("ตั้งค่า")',
        '[data-testid="group-settings-button"]',
        'button[title*="คัดลอก"]'
      ];
      
      for (const selector of groupSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        
        if (count > 0) {
          console.log(`👥 Found ${count} group elements: ${selector}`);
          try {
            await elements.first().click({ timeout: 3000 });
            await page.waitForTimeout(3000);
            console.log(`✅ Clicked group element: ${selector}`);
          } catch (e) {
            console.log(`⚠️  Could not interact with ${selector}`);
          }
        }
      }
      
      // Get final performance data
      const perfData = await getPerformanceData(page);
      
      console.log('\n📊 Automated Test Results:');
      console.log(`🔍 Database queries made: ${perfData.queries.length}`);
      
      if (perfData.queries.length > 0) {
        const slowQueries = perfData.queries.filter(q => q.duration > 1000);
        const avgTime = perfData.queries.reduce((sum, q) => sum + q.duration, 0) / perfData.queries.length;
        
        console.log(`📈 Average query time: ${avgTime.toFixed(2)}ms`);
        console.log(`🐌 Slow queries: ${slowQueries.length}`);
        
        if (slowQueries.length > 0) {
          slowQueries.forEach(q => {
            const endpoint = q.url.split('rest/v1/')[1] || q.url;
            console.log(`  🐌 ${q.method} ${endpoint}: ${q.duration.toFixed(2)}ms`);
          });
        }
        
        expect(avgTime).toBeLessThan(3000);
      }
    } else {
      console.log('ℹ️  Could not find workshop elements to test automatically');
    }
  });
});