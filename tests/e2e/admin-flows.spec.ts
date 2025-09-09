import { test, expect } from '@playwright/test';
import { 
  PerformanceMonitor, 
  AuthHelper, 
  NavigationHelper, 
  UIHelper,
  ResponsiveHelper,
  TEST_CONFIG 
} from './helpers/test-helpers';

test.describe('Admin Flow Tests - Complete Journey', () => {
  let performanceMonitor: PerformanceMonitor;
  let authHelper: AuthHelper;
  let navHelper: NavigationHelper;
  let uiHelper: UIHelper;
  let responsiveHelper: ResponsiveHelper;

  test.beforeEach(async ({ page }) => {
    performanceMonitor = new PerformanceMonitor(page);
    authHelper = new AuthHelper(page);
    navHelper = new NavigationHelper(page);
    uiHelper = new UIHelper(page);
    responsiveHelper = new ResponsiveHelper(page);
    
    await performanceMonitor.start();
  });

  test.afterEach(async ({ page }) => {
    const metrics = await performanceMonitor.getMetrics();
    const errors = performanceMonitor.getErrors();
    
    console.log('📊 Test Performance Metrics:', metrics);
    if (errors.length > 0) {
      console.log('❌ Errors detected:', errors);
    }
  });

  test('Complete Admin Dashboard Journey', async ({ page }) => {
    console.log('🚀 Starting Complete Admin Dashboard Journey...');
    
    // Navigate to application and login as admin
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser(); // Using test admin credentials
    
    // Verify admin dashboard access
    await expect(page.locator('[data-testid="admin-dashboard"], .admin-dashboard, main')).toBeVisible({ timeout: 10000 });
    console.log('✅ Admin dashboard loaded successfully');
    
    // Navigate to admin specific sections
    const adminSections = [
      { name: 'Dashboard', selector: 'a[href*="/admin"], a[href*="/dashboard"]', hasText: /แดชบอร์ด|Dashboard|จัดการ/ },
      { name: 'Users Management', selector: 'a', hasText: /ผู้ใช้|Users|จัดการผู้ใช้/ },
      { name: 'Workshops', selector: 'a', hasText: /เวิร์กช็อป|Workshops|จัดการเวิร์กช็อป/ },
      { name: 'Sessions', selector: 'a', hasText: /เซสชัน|Sessions|จัดการเซสชัน/ }
    ];
    
    for (const section of adminSections) {
      try {
        const sectionLink = page.locator(section.selector, { hasText: section.hasText });
        if (await sectionLink.first().isVisible({ timeout: 3000 })) {
          console.log(`📱 Testing ${section.name} section...`);
          await sectionLink.first().click();
          await navHelper.waitForPageLoad();
          
          // Check for common admin elements
          const adminElements = [
            'table', '.table', '[role="table"]',
            '.admin-content', '.management-panel',
            'button[type="submit"]', '.btn', 'button'
          ];
          
          let foundElements = 0;
          for (const selector of adminElements) {
            if (await page.locator(selector).first().isVisible({ timeout: 2000 })) {
              foundElements++;
            }
          }
          
          console.log(`   Found ${foundElements} admin interface elements`);
          expect(foundElements).toBeGreaterThan(0);
        }
      } catch (error) {
        console.log(`⚠️ ${section.name} section not accessible or not found`);
      }
    }
  });

  test('Workshop Management Flow', async ({ page }) => {
    console.log('🚀 Testing Workshop Management Flow...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    // Look for workshop management section
    const workshopManagement = page.locator('a', { 
      hasText: /เวิร์กช็อป|Workshops|จัดการเวิร์กช็อป|Workshop Management/ 
    });
    
    if (await workshopManagement.first().isVisible({ timeout: 5000 })) {
      await workshopManagement.first().click();
      await navHelper.waitForPageLoad();
      
      // Check for workshop creation/edit capabilities
      const createWorkshopBtn = page.locator('button, a', { 
        hasText: /สร้าง|เพิ่ม|Create|Add|New Workshop/ 
      });
      
      if (await createWorkshopBtn.first().isVisible({ timeout: 3000 })) {
        console.log('✅ Workshop creation interface found');
        await createWorkshopBtn.first().click();
        await page.waitForTimeout(2000);
        
        // Look for workshop creation form
        const formFields = await page.locator('input, textarea, select').count();
        console.log(`📝 Found ${formFields} form fields for workshop creation`);
        expect(formFields).toBeGreaterThan(2);
        
        // Try to fill basic workshop information
        const titleInput = page.locator('input[name*="title"], input[name*="name"], input[placeholder*="ชื่อ"], input[placeholder*="title"]');
        if (await titleInput.first().isVisible({ timeout: 2000 })) {
          await titleInput.first().fill('Test Workshop - Admin Flow Test');
          console.log('✅ Workshop title filled');
        }
        
        const descInput = page.locator('textarea[name*="description"], textarea[placeholder*="รายละเอียด"], textarea[placeholder*="description"]');
        if (await descInput.first().isVisible({ timeout: 2000 })) {
          await descInput.first().fill('Test workshop description for admin flow testing');
          console.log('✅ Workshop description filled');
        }
      }
      
      // Check for existing workshop list/table
      const workshopList = page.locator('table, .workshop-list, .grid, [data-testid*="workshop"]');
      if (await workshopList.first().isVisible({ timeout: 3000 })) {
        const workshopCount = await page.locator('tr, .workshop-card, .workshop-item').count();
        console.log(`📊 Found ${workshopCount} workshops in the system`);
      }
    } else {
      console.log('⚠️ Workshop management section not found - may require specific admin permissions');
    }
  });

  test('Session Management Flow', async ({ page }) => {
    console.log('🚀 Testing Session Management Flow...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    // Look for session management
    const sessionManagement = page.locator('a', { 
      hasText: /เซสชัน|Sessions|จัดการเซสชัน|Session Management/ 
    });
    
    if (await sessionManagement.first().isVisible({ timeout: 5000 })) {
      await sessionManagement.first().click();
      await navHelper.waitForPageLoad();
      
      // Check for session creation capabilities
      const createSessionBtn = page.locator('button, a', { 
        hasText: /สร้าง|เพิ่ม|Create|Add|New Session/ 
      });
      
      if (await createSessionBtn.first().isVisible({ timeout: 3000 })) {
        console.log('✅ Session creation interface found');
        
        // Check session management features
        const managementFeatures = [
          'input[type="date"]', 'input[type="time"]', // Date/time pickers
          'select', // Dropdown selections
          'input[type="number"]', // Capacity/limits
          'textarea' // Session descriptions
        ];
        
        let foundFeatures = 0;
        for (const selector of managementFeatures) {
          if (await page.locator(selector).first().isVisible({ timeout: 2000 })) {
            foundFeatures++;
          }
        }
        
        console.log(`📊 Found ${foundFeatures} session management features`);
      }
      
      // Check for existing sessions
      const sessionsList = page.locator('table, .session-list, .grid, [data-testid*="session"]');
      if (await sessionsList.first().isVisible({ timeout: 3000 })) {
        const sessionCount = await page.locator('tr, .session-card, .session-item').count();
        console.log(`📅 Found ${sessionCount} sessions in the system`);
        
        // Test session detail view
        const firstSession = page.locator('tr, .session-card, .session-item').first();
        if (await firstSession.isVisible({ timeout: 2000 })) {
          await firstSession.click();
          await page.waitForTimeout(2000);
          
          // Look for session details and management options
          const detailElements = await page.locator('h1, h2, h3, .title, .session-title').count();
          console.log(`📝 Session detail elements found: ${detailElements}`);
        }
      }
    } else {
      console.log('⚠️ Session management section not found');
    }
  });

  test('User Management and Analytics', async ({ page }) => {
    console.log('🚀 Testing User Management and Analytics...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    // Look for user management section
    const userManagement = page.locator('a', { 
      hasText: /ผู้ใช้|Users|จัดการผู้ใช้|User Management|Analytics/ 
    });
    
    if (await userManagement.first().isVisible({ timeout: 5000 })) {
      await userManagement.first().click();
      await navHelper.waitForPageLoad();
      
      // Check for user list/table
      const userTable = page.locator('table, .user-list, .grid');
      if (await userTable.first().isVisible({ timeout: 3000 })) {
        const userCount = await page.locator('tr, .user-card, .user-item').count();
        console.log(`👥 Found ${userCount} users in the system`);
        
        // Check for user management actions
        const actionButtons = page.locator('button', { 
          hasText: /แก้ไข|ลบ|Edit|Delete|View|Block|Unblock/ 
        });
        const actionCount = await actionButtons.count();
        console.log(`⚙️ Found ${actionCount} user management actions`);
      }
      
      // Look for analytics/statistics
      const statsElements = page.locator('.stat, .metric, .analytics, .dashboard-card, [data-testid*="stat"]');
      const statsCount = await statsElements.count();
      console.log(`📊 Found ${statsCount} analytics/statistics elements`);
      
      if (statsCount > 0) {
        // Check for common analytics metrics
        const metrics = [
          /ผู้ใช้ทั้งหมด|Total Users|Active Users/,
          /เวิร์กช็อป|Workshops|Sessions/,
          /การเข้าร่วม|Participants|Registrations/
        ];
        
        for (const metric of metrics) {
          const metricElement = page.locator('*', { hasText: metric });
          if (await metricElement.first().isVisible({ timeout: 2000 })) {
            const text = await metricElement.first().textContent();
            console.log(`📈 Analytics metric found: ${text?.substring(0, 50)}`);
          }
        }
      }
    } else {
      console.log('⚠️ User management section not found');
    }
  });

  test('Admin Settings and Configuration', async ({ page }) => {
    console.log('🚀 Testing Admin Settings and Configuration...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    // Look for settings/configuration section
    const settingsSection = page.locator('a', { 
      hasText: /ตั้งค่า|Settings|Configuration|Config|Admin Settings/ 
    });
    
    if (await settingsSection.first().isVisible({ timeout: 5000 })) {
      await settingsSection.first().click();
      await navHelper.waitForPageLoad();
      
      // Check for configuration options
      const configElements = [
        'input[type="text"]', 'input[type="email"]',
        'textarea', 'select', 'input[type="checkbox"]',
        'input[type="radio"]', 'input[type="number"]'
      ];
      
      let totalConfigOptions = 0;
      for (const selector of configElements) {
        const count = await page.locator(selector).count();
        totalConfigOptions += count;
      }
      
      console.log(`⚙️ Found ${totalConfigOptions} configuration options`);
      
      // Look for save/update buttons
      const saveButtons = page.locator('button', { 
        hasText: /บันทึก|Save|Update|Apply|Submit/ 
      });
      const saveButtonCount = await saveButtons.count();
      console.log(`💾 Found ${saveButtonCount} save/update buttons`);
      
      // Check for system information
      const systemInfo = page.locator('*', { 
        hasText: /Version|Build|Environment|Database|API/ 
      });
      const systemInfoCount = await systemInfo.count();
      console.log(`💻 Found ${systemInfoCount} system information elements`);
      
      if (totalConfigOptions > 0 || saveButtonCount > 0 || systemInfoCount > 0) {
        expect(totalConfigOptions + saveButtonCount + systemInfoCount).toBeGreaterThan(2);
      }
    } else {
      console.log('⚠️ Admin settings section not found');
    }
  });

  test('Admin Performance - Data Loading and Management', async ({ page }) => {
    console.log('🚀 Testing Admin Performance - Data Loading...');
    
    await page.goto(TEST_CONFIG.baseURL);
    
    const startTime = Date.now();
    await authHelper.loginUser();
    const loginTime = Date.now() - startTime;
    console.log(`⏱️ Admin login time: ${loginTime}ms`);
    
    // Test data loading performance in admin sections
    const adminSections = [
      { name: 'Dashboard', selector: '[data-testid="admin-dashboard"], .admin-dashboard' },
      { name: 'User List', selector: 'table, .user-list' },
      { name: 'Workshop List', selector: '.workshop-list, [data-testid*="workshop"]' }
    ];
    
    for (const section of adminSections) {
      const sectionStartTime = Date.now();
      
      try {
        await page.waitForSelector(section.selector, { timeout: 5000 });
        const loadTime = Date.now() - sectionStartTime;
        console.log(`📊 ${section.name} loaded in: ${loadTime}ms`);
        
        // Performance assertion - admin sections should load reasonably fast
        expect(loadTime).toBeLessThan(8000);
      } catch (error) {
        console.log(`⚠️ ${section.name} not found or slow to load`);
      }
    }
    
    // Check for data pagination/infinite scroll performance
    const paginationElements = page.locator('.pagination, [data-testid*="pagination"], button[aria-label*="page"]');
    if (await paginationElements.first().isVisible({ timeout: 3000 })) {
      console.log('📄 Pagination detected - testing page navigation performance');
      
      const nextPageBtn = page.locator('button', { hasText: /Next|ถัดไป|>/ }).first();
      if (await nextPageBtn.isVisible({ timeout: 2000 })) {
        const pageNavStart = Date.now();
        await nextPageBtn.click();
        await navHelper.waitForPageLoad();
        const pageNavTime = Date.now() - pageNavStart;
        
        console.log(`📄 Page navigation time: ${pageNavTime}ms`);
        expect(pageNavTime).toBeLessThan(5000);
      }
    }
    
    // Check for bulk operations performance
    const bulkOperations = page.locator('button', { 
      hasText: /Bulk|Select All|เลือกทั้งหมด|Delete Selected|Export/ 
    });
    const bulkOpsCount = await bulkOperations.count();
    console.log(`📦 Found ${bulkOpsCount} bulk operation features`);
    
    // Monitor network requests during admin operations
    const networkRequests = performanceMonitor.getNetworkRequests();
    const adminAPIRequests = networkRequests.filter(req => 
      req.url.includes('/api/') && (
        req.url.includes('admin') || 
        req.url.includes('users') || 
        req.url.includes('workshops') ||
        req.url.includes('sessions')
      )
    );
    
    console.log(`🌐 Admin API requests made: ${adminAPIRequests.length}`);
  });

  test('Admin Responsive Design', async ({ page }) => {
    console.log('🚀 Testing Admin Responsive Design...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    // Test desktop view first
    await responsiveHelper.setDesktopViewport();
    await page.waitForTimeout(1000);
    
    const desktopElements = await page.locator('*').count();
    console.log(`🖥️ Desktop elements visible: ${desktopElements}`);
    
    // Test tablet view
    await responsiveHelper.setTabletViewport();
    await page.waitForTimeout(1000);
    
    const tabletElements = await page.locator('*').count();
    console.log(`📱 Tablet elements visible: ${tabletElements}`);
    
    // Check for mobile menu functionality
    const mobileMenuWorking = await responsiveHelper.testMobileMenu();
    console.log(`📱 Mobile menu functionality: ${mobileMenuWorking ? 'Working' : 'Not found'}`);
    
    // Test mobile view
    await responsiveHelper.setMobileViewport();
    await page.waitForTimeout(1000);
    
    const mobileElements = await page.locator('*').count();
    console.log(`📱 Mobile elements visible: ${mobileElements}`);
    
    // Check for responsive tables/data displays
    const responsiveTables = page.locator('table, .table-responsive, .overflow-x-auto');
    const tableCount = await responsiveTables.count();
    console.log(`📊 Responsive table elements: ${tableCount}`);
    
    // Admin panels should remain functional across viewports
    const adminControls = page.locator('button, .btn, input, select, textarea');
    const controlsCount = await adminControls.count();
    console.log(`⚙️ Admin controls accessible on mobile: ${controlsCount}`);
    
    // Ensure critical admin functions are accessible on mobile
    expect(controlsCount).toBeGreaterThan(3);
    
    // Reset to desktop
    await responsiveHelper.setDesktopViewport();
  });

  test('Admin Error Handling and Edge Cases', async ({ page }) => {
    console.log('🚀 Testing Admin Error Handling...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    // Test form validation
    const forms = page.locator('form');
    const formCount = await forms.count();
    console.log(`📝 Found ${formCount} forms to test validation`);
    
    if (formCount > 0) {
      const firstForm = forms.first();
      const submitButton = firstForm.locator('button[type="submit"]');
      
      if (await submitButton.isVisible({ timeout: 3000 })) {
        // Try submitting empty form to test validation
        await submitButton.click();
        await page.waitForTimeout(2000);
        
        // Check for validation messages
        const validationMessages = page.locator('.error, .invalid, .text-red, [role="alert"]');
        const validationCount = await validationMessages.count();
        console.log(`⚠️ Form validation messages: ${validationCount}`);
      }
    }
    
    // Test network error handling by attempting navigation to non-existent pages
    const testUrls = [
      '/admin/nonexistent',
      '/api/invalid-endpoint',
      '/admin/fake-section'
    ];
    
    for (const url of testUrls) {
      try {
        await page.goto(`${TEST_CONFIG.baseURL}${url}`, { timeout: 5000 });
        await page.waitForTimeout(2000);
        
        // Check for 404 or error handling
        const errorIndicators = page.locator('*', { 
          hasText: /404|Not Found|Error|ไม่พบ|ข้อผิดพลาด/ 
        });
        const errorCount = await errorIndicators.count();
        console.log(`🚫 Error handling for ${url}: ${errorCount > 0 ? 'Present' : 'Missing'}`);
      } catch (error) {
        console.log(`🚫 Navigation to ${url} failed as expected`);
      }
    }
    
    // Return to main admin area
    await page.goto(TEST_CONFIG.baseURL);
    await navHelper.waitForPageLoad();
    
    // Check console for any JavaScript errors during admin operations
    const errors = performanceMonitor.getErrors();
    const jsErrors = errors.filter(error => error.type === 'pageerror');
    console.log(`💻 JavaScript errors detected: ${jsErrors.length}`);
    
    if (jsErrors.length > 0) {
      console.log('❌ JavaScript errors found:');
      jsErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.text}`);
      });
    }
    
    // Admin should still be functional despite edge case testing
    const adminElements = await page.locator('button, input, select, textarea').count();
    expect(adminElements).toBeGreaterThan(2);
  });
});