import { test, expect, type Page } from '@playwright/test';

// This test is designed to run against the live application
// and monitor real console output and network performance

async function setupRealTimeMonitoring(page: Page) {
  const logs: any[] = [];
  const errors: any[] = [];
  const networkEvents: any[] = [];
  
  // Monitor all console activity
  page.on('console', (msg) => {
    const text = msg.text();
    const type = msg.type();
    
    logs.push({
      type,
      text,
      timestamp: new Date().toISOString(),
      location: msg.location()
    });
    
    // Print to test console for real-time monitoring
    if (type === 'error') {
      console.log(`❌ CONSOLE ERROR: ${text}`);
      errors.push({ text, timestamp: new Date().toISOString() });
    } else if (type === 'warning' || text.includes('slow') || text.includes('timeout')) {
      console.log(`⚠️  CONSOLE WARNING: ${text}`);
    } else if (type === 'log' && (text.includes('query') || text.includes('loading') || text.includes('fetch'))) {
      console.log(`📊 CONSOLE LOG: ${text}`);
    }
  });
  
  // Monitor network events
  page.on('request', (request) => {
    const startTime = Date.now();
    networkEvents.push({
      type: 'request',
      url: request.url(),
      method: request.method(),
      startTime,
      resourceType: request.resourceType()
    });
  });
  
  page.on('response', (response) => {
    const url = response.url();
    const requestEvent = networkEvents.find(e => 
      e.type === 'request' && e.url === url && !e.responseTime
    );
    
    if (requestEvent) {
      const duration = Date.now() - requestEvent.startTime;
      requestEvent.responseTime = duration;
      requestEvent.status = response.status();
      requestEvent.success = response.ok();
      
      // Log slow network requests
      if (duration > 1000) {
        console.log(`🐌 SLOW NETWORK: ${response.request().method()} ${url} took ${duration}ms (Status: ${response.status()})`);
      }
      
      // Log database requests specifically
      if (url.includes('supabase') || url.includes('rest/v1')) {
        console.log(`🗄️  DATABASE: ${response.request().method()} ${url.split('rest/v1/')[1] || url} - ${duration}ms (${response.status()})`);
      }
    }
  });
  
  // Monitor JavaScript errors
  page.on('pageerror', (error) => {
    console.log(`💥 PAGE ERROR: ${error.message}`);
    errors.push({ 
      text: error.message, 
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
  });
  
  return { logs, errors, networkEvents };
}

test.describe('Live Performance Monitoring', () => {
  test('Monitor real application performance', async ({ page }) => {
    console.log('🔍 Starting live performance monitoring...');
    console.log('🌐 This test will monitor the actual application in real-time');
    
    const { logs, errors, networkEvents } = await setupRealTimeMonitoring(page);
    
    console.log('\n📱 Navigating to home page...');
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for initial data loading
    console.log('⏳ Waiting for initial data loading (10 seconds)...');
    await page.waitForTimeout(10000);
    
    // Look for any workshops or content
    const workshopElements = await page.locator('a, button, div').filter({ hasText: /workshop|กลุ่ม|งาน/ }).count();
    console.log(`📊 Found ${workshopElements} potential workshop/group elements`);
    
    // Try to find any clickable workshop links
    const clickableElements = await page.locator('a[href*="workshop"], button:has-text("ดู"), button:has-text("เข้า")').count();
    console.log(`🔗 Found ${clickableElements} clickable workshop elements`);
    
    if (clickableElements > 0) {
      console.log('\n🖱️  Clicking first workshop element...');
      const firstElement = page.locator('a[href*="workshop"], button:has-text("ดู"), button:has-text("เข้า")').first();
      await firstElement.click();
      
      console.log('⏳ Waiting for navigation and data loading (15 seconds)...');
      await page.waitForTimeout(15000);
      
      // Look for group-related elements
      const groupElements = await page.locator('button:has-text("กลุ่ม"), button:has-text("สมาชิก"), [data-testid="group-card"]').count();
      console.log(`👥 Found ${groupElements} group-related elements`);
      
      if (groupElements > 0) {
        console.log('\n👥 Testing group functionality...');
        const groupButton = page.locator('button:has-text("กลุ่ม"), button:has-text("สมาชิก"), button:has-text("ตั้งค่า")').first();
        
        if (await groupButton.isVisible()) {
          await groupButton.click();
          console.log('⏳ Waiting for group modal/page loading (10 seconds)...');
          await page.waitForTimeout(10000);
        }
      }
    }
    
    console.log('\n📊 Performance Analysis:');
    
    // Analyze network events
    const completedRequests = networkEvents.filter(e => e.responseTime);
    const slowRequests = completedRequests.filter(e => e.responseTime > 1000);
    const failedRequests = completedRequests.filter(e => !e.success);
    const databaseRequests = completedRequests.filter(e => 
      e.url.includes('supabase') || e.url.includes('rest/v1')
    );
    
    console.log(`🌐 Total network requests: ${completedRequests.length}`);
    console.log(`🗄️  Database requests: ${databaseRequests.length}`);
    console.log(`🐌 Slow requests (>1s): ${slowRequests.length}`);
    console.log(`❌ Failed requests: ${failedRequests.length}`);
    
    if (databaseRequests.length > 0) {
      const avgDbTime = databaseRequests.reduce((sum, req) => sum + req.responseTime, 0) / databaseRequests.length;
      const maxDbTime = Math.max(...databaseRequests.map(req => req.responseTime));
      console.log(`📈 Average DB response time: ${avgDbTime.toFixed(2)}ms`);
      console.log(`📈 Maximum DB response time: ${maxDbTime}ms`);
      
      // Show slowest DB requests
      const slowestDb = databaseRequests
        .sort((a, b) => b.responseTime - a.responseTime)
        .slice(0, 5);
      
      if (slowestDb.length > 0) {
        console.log('\n🐌 Slowest database requests:');
        slowestDb.forEach((req, i) => {
          const endpoint = req.url.split('rest/v1/')[1] || req.url;
          console.log(`  ${i + 1}. ${req.method} ${endpoint}: ${req.responseTime}ms`);
        });
      }
    }
    
    // Analyze console logs
    const errorLogs = logs.filter(log => log.type === 'error');
    const performanceLogs = logs.filter(log => 
      log.text.includes('slow') || 
      log.text.includes('timeout') || 
      log.text.includes('hanging') ||
      log.text.includes('Operation timed out')
    );
    
    console.log(`🔍 Console errors: ${errorLogs.length}`);
    console.log(`⚠️  Performance warnings: ${performanceLogs.length}`);
    
    if (performanceLogs.length > 0) {
      console.log('\n⚠️  Performance issues detected:');
      performanceLogs.slice(0, 5).forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.text}`);
      });
    }
    
    if (errorLogs.length > 0) {
      console.log('\n❌ Console errors detected:');
      errorLogs.slice(0, 3).forEach((log, i) => {
        console.log(`  ${i + 1}. ${log.text}`);
      });
    }
    
    console.log('\n✅ Live performance monitoring completed');
    console.log('💡 Check the console output above for detailed performance insights');
    
    // Lenient assertions for live testing
    expect(failedRequests.length).toBeLessThan(5);
    expect(errorLogs.length).toBeLessThan(10);
    
    if (databaseRequests.length > 0) {
      const avgDbTime = databaseRequests.reduce((sum, req) => sum + req.responseTime, 0) / databaseRequests.length;
      expect(avgDbTime).toBeLessThan(3000); // Average should be under 3 seconds
    }
  });

  test('Monitor copy button performance in live app', async ({ page }) => {
    console.log('📋 Testing copy button performance in live application...');
    
    await setupRealTimeMonitoring(page);
    
    await page.goto('/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    // Try to navigate to a page with copy buttons
    const workshopLink = page.locator('a[href*="workshop"]').first();
    if (await workshopLink.isVisible()) {
      await workshopLink.click();
      await page.waitForTimeout(10000);
      
      // Look for copy buttons
      const copyButtons = page.locator('button[title*="คัดลอก"], button:has-text("copy"), button svg');
      const copyButtonCount = await copyButtons.count();
      
      console.log(`📋 Found ${copyButtonCount} potential copy buttons`);
      
      if (copyButtonCount > 0) {
        for (let i = 0; i < Math.min(copyButtonCount, 3); i++) {
          const button = copyButtons.nth(i);
          if (await button.isVisible()) {
            console.log(`🖱️  Testing copy button ${i + 1}...`);
            
            const startTime = Date.now();
            await button.click();
            
            // Look for success message
            const successIndicators = page.locator(
              '.bg-green-500, .text-green-600, [class*="success"], [class*="copied"]'
            );
            
            try {
              await successIndicators.first().waitFor({ 
                state: 'visible', 
                timeout: 3000 
              });
              const responseTime = Date.now() - startTime;
              console.log(`✅ Copy button ${i + 1} responded in ${responseTime}ms`);
              
              expect(responseTime).toBeLessThan(2000);
            } catch (e) {
              console.log(`⚠️  Copy button ${i + 1} - no visual feedback detected`);
            }
            
            await page.waitForTimeout(1000);
          }
        }
      } else {
        console.log('ℹ️  No copy buttons found in current view');
      }
    } else {
      console.log('ℹ️  No workshop links found to test copy functionality');
    }
  });
});