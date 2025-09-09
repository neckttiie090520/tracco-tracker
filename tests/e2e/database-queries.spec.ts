import { test, expect, type Page } from '@playwright/test';

interface QueryLog {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

// Helper to inject query monitoring script
async function injectQueryMonitor(page: Page) {
  await page.addInitScript(() => {
    // Monitor fetch requests to Supabase
    const originalFetch = window.fetch;
    (window as any).queryLogs = [];
    
    window.fetch = async (input: any, init: any) => {
      const start = Date.now();
      const url = typeof input === 'string' ? input : input.url;
      
      try {
        const response = await originalFetch(input, init);
        const duration = Date.now() - start;
        
        if (url.includes('supabase.co') || url.includes('rest/v1')) {
          (window as any).queryLogs.push({
            operation: url.split('rest/v1/')[1] || url,
            duration,
            success: response.ok,
            timestamp: Date.now(),
            status: response.status,
            method: init?.method || 'GET'
          });
          
          // Log slow queries to console
          if (duration > 1000) {
            console.warn(`🐌 Slow query detected: ${url} took ${duration}ms`);
          }
        }
        
        return response;
      } catch (error) {
        const duration = Date.now() - start;
        (window as any).queryLogs.push({
          operation: url.split('rest/v1/')[1] || url,
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

// Helper to get query logs from page
async function getQueryLogs(page: Page): Promise<QueryLog[]> {
  return await page.evaluate(() => (window as any).queryLogs || []);
}

test.describe('Database Query Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await injectQueryMonitor(page);
  });

  test('Analyze workshop feed page query performance', async ({ page }) => {
    console.log('🔍 Analyzing database queries for workshop feed...');
    
    // Navigate to workshop page
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get a workshop link and click it
    const workshopLinks = page.locator('a[href*="/workshop/"]');
    const workshopCount = await workshopLinks.count();
    
    if (workshopCount === 0) {
      console.log('ℹ️ No workshops found, skipping query analysis');
      return;
    }
    
    // Click on first workshop
    await workshopLinks.first().click();
    await page.waitForLoadState('networkidle');
    
    // Wait for all async operations to complete
    await page.waitForTimeout(5000);
    
    // Analyze query logs
    const queryLogs = await getQueryLogs(page);
    console.log(`📊 Total database queries: ${queryLogs.length}`);
    
    // Categorize queries
    const groupQueries = queryLogs.filter(q => q.operation.includes('task_groups') || q.operation.includes('task_group_members'));
    const userQueries = queryLogs.filter(q => q.operation.includes('users'));
    const submissionQueries = queryLogs.filter(q => q.operation.includes('submissions'));
    const taskQueries = queryLogs.filter(q => q.operation.includes('tasks'));
    
    console.log(`👥 Group-related queries: ${groupQueries.length}`);
    console.log(`👤 User-related queries: ${userQueries.length}`);  
    console.log(`📝 Submission queries: ${submissionQueries.length}`);
    console.log(`📋 Task queries: ${taskQueries.length}`);
    
    // Identify slow queries
    const slowQueries = queryLogs.filter(q => q.duration > 1000);
    if (slowQueries.length > 0) {
      console.log('🐌 Slow queries detected:');
      slowQueries.forEach(q => {
        console.log(`  - ${q.operation}: ${q.duration}ms ${q.success ? '✅' : '❌'}`);
      });
    }
    
    // Identify failed queries
    const failedQueries = queryLogs.filter(q => !q.success);
    if (failedQueries.length > 0) {
      console.log('❌ Failed queries:');
      failedQueries.forEach(q => {
        console.log(`  - ${q.operation}: ${q.error || 'Unknown error'}`);
      });
    }
    
    // Performance assertions
    expect(slowQueries.length).toBeLessThan(3); // Allow some slow queries but not many
    expect(failedQueries.length).toBe(0); // No failed queries
    
    // Check for N+1 query patterns (multiple similar queries)
    const operationCounts = queryLogs.reduce((acc, q) => {
      const baseOp = q.operation.split('?')[0]; // Remove query parameters
      acc[baseOp] = (acc[baseOp] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const suspiciousOperations = Object.entries(operationCounts)
      .filter(([_, count]) => count > 5)
      .map(([op, count]) => ({ operation: op, count }));
    
    if (suspiciousOperations.length > 0) {
      console.log('⚠️ Possible N+1 query patterns:');
      suspiciousOperations.forEach(({ operation, count }) => {
        console.log(`  - ${operation}: ${count} times`);
      });
    }
  });

  test('Test group member loading performance', async ({ page }) => {
    console.log('🔍 Testing group member loading performance...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to a workshop with groups
    const workshopLinks = page.locator('a[href*="/workshop/"]');
    if (await workshopLinks.count() > 0) {
      await workshopLinks.first().click();
      await page.waitForLoadState('networkidle');
      
      // Look for group management buttons
      const groupButtons = page.locator('button:has-text("ตั้งค่ากลุ่ม")');
      const groupCount = await groupButtons.count();
      
      if (groupCount > 0) {
        console.log(`👥 Found ${groupCount} groups to test`);
        
        // Clear previous logs
        await page.evaluate(() => (window as any).queryLogs = []);
        
        // Click group settings button
        const startTime = Date.now();
        await groupButtons.first().click();
        
        // Wait for modal to appear
        await page.waitForSelector('[class*="modal"], [class*="dialog"], .fixed', { timeout: 5000 });
        const modalLoadTime = Date.now() - startTime;
        
        console.log(`⏱️ Group modal load time: ${modalLoadTime}ms`);
        
        // Wait for member data to load
        await page.waitForTimeout(2000);
        
        // Analyze member loading queries
        const memberQueries = await getQueryLogs(page);
        const memberRelatedQueries = memberQueries.filter(q => 
          q.operation.includes('task_group_members') || 
          q.operation.includes('users')
        );
        
        console.log(`📊 Member-related queries: ${memberRelatedQueries.length}`);
        
        // Check for efficient member loading
        const slowMemberQueries = memberRelatedQueries.filter(q => q.duration > 1000);
        if (slowMemberQueries.length > 0) {
          console.log('🐌 Slow member queries:');
          slowMemberQueries.forEach(q => {
            console.log(`  - ${q.operation}: ${q.duration}ms`);
          });
        }
        
        expect(modalLoadTime).toBeLessThan(3000);
        expect(slowMemberQueries.length).toBeLessThan(2);
      } else {
        console.log('ℹ️ No groups found for member loading test');
      }
    }
  });

  test('Monitor real-time query performance during user interactions', async ({ page }) => {
    console.log('🔍 Monitoring queries during user interactions...');
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate through different pages and monitor queries
    const workshopLinks = page.locator('a[href*="/workshop/"]');
    if (await workshopLinks.count() > 0) {
      // Clear query logs
      await page.evaluate(() => (window as any).queryLogs = []);
      
      // Simulate user navigation
      await workshopLinks.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Test tab switching if tabs exist
      const tabs = page.locator('button:has-text("ภาพรวม"), button:has-text("เอกสาร"), button:has-text("งาน")');
      const tabCount = await tabs.count();
      
      for (let i = 0; i < Math.min(tabCount, 3); i++) {
        await tabs.nth(i).click();
        await page.waitForTimeout(1000);
      }
      
      // Test copy party code if available
      const copyButtons = page.locator('button[title="คัดลอกรหัสกลุ่ม"]');
      if (await copyButtons.count() > 0) {
        await copyButtons.first().click();
        await page.waitForTimeout(500);
      }
      
      // Analyze all queries from user interaction
      const allQueries = await getQueryLogs(page);
      console.log(`📊 Total queries during interaction: ${allQueries.length}`);
      
      // Performance summary
      const avgDuration = allQueries.reduce((sum, q) => sum + q.duration, 0) / allQueries.length;
      const maxDuration = Math.max(...allQueries.map(q => q.duration));
      const minDuration = Math.min(...allQueries.map(q => q.duration));
      
      console.log(`📊 Query performance summary:`);
      console.log(`  - Average duration: ${avgDuration.toFixed(2)}ms`);
      console.log(`  - Max duration: ${maxDuration}ms`);
      console.log(`  - Min duration: ${minDuration}ms`);
      
      // Identify performance bottlenecks
      const bottlenecks = allQueries
        .filter(q => q.duration > avgDuration * 2)
        .sort((a, b) => b.duration - a.duration);
      
      if (bottlenecks.length > 0) {
        console.log('🎯 Performance bottlenecks identified:');
        bottlenecks.slice(0, 5).forEach((q, i) => {
          console.log(`  ${i + 1}. ${q.operation}: ${q.duration}ms`);
        });
      }
      
      expect(avgDuration).toBeLessThan(1000);
      expect(maxDuration).toBeLessThan(5000);
    }
  });
});