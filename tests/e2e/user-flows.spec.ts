import { test, expect, type Page } from '@playwright/test';
import { 
  PerformanceMonitor, 
  AuthHelper, 
  NavigationHelper, 
  UIHelper,
  ResponsiveHelper,
  TEST_CONFIG 
} from './helpers/test-helpers';

test.describe('User Flow Tests - Happy Path Scenarios', () => {
  let page: Page;
  let perfMonitor: PerformanceMonitor;
  let authHelper: AuthHelper;
  let navHelper: NavigationHelper;
  let uiHelper: UIHelper;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    perfMonitor = new PerformanceMonitor(page);
    authHelper = new AuthHelper(page);
    navHelper = new NavigationHelper(page);
    uiHelper = new UIHelper(page);
    
    await perfMonitor.start();
  });

  test.afterEach(async () => {
    const metrics = await perfMonitor.getMetrics();
    const errors = perfMonitor.getErrors();
    
    console.log('📊 Performance Metrics:', JSON.stringify(metrics, null, 2));
    
    if (errors.length > 0) {
      console.log('❌ Errors detected:', errors);
    }
    
    await page.close();
  });

  test('Complete User Onboarding Journey', async () => {
    // Test user registration and first-time setup
    test.setTimeout(60000);

    await test.step('Navigate to homepage and check initial load', async () => {
      await page.goto(TEST_CONFIG.baseURL);
      await page.waitForLoadState('networkidle');
      
      // Check if page loads properly
      await expect(page).toHaveTitle(/Traco|Workshop/);
      
      // Check for critical elements
      const mainContent = page.locator('main, [role="main"], .main-content').first();
      await expect(mainContent).toBeVisible({ timeout: 10000 });
    });

    await test.step('User Authentication Flow', async () => {
      const loginSuccess = await authHelper.loginUser();
      expect(loginSuccess).toBe(true);
      
      // Verify we're on dashboard or logged in
      await page.waitForSelector('[data-testid="dashboard"], main, .dashboard', { timeout: 10000 });
      
      // Check for user-specific content
      const userGreeting = page.locator('text=/สวัสดี|Hello|Welcome/i');
      await expect(userGreeting.first()).toBeVisible({ timeout: 5000 });
    });

    await test.step('Dashboard Overview Check', async () => {
      // Check for key dashboard elements
      const workshopCount = page.locator('text=/workshop/i');
      const taskCount = page.locator('text=/งาน|task/i');
      const quickActions = page.locator('text=/quick action|ด่วน/i');
      
      await expect(workshopCount.first()).toBeVisible({ timeout: 5000 });
      // Dashboard should show user statistics
      await expect(page.locator('text=/\\d+/')).toHaveCount({ minimum: 3 }); // Should show numbers
    });
  });

  test('Workshop Discovery and Registration Flow', async () => {
    test.setTimeout(90000);
    
    await authHelper.loginUser();

    await test.step('Navigate to Workshop Listings', async () => {
      // Look for workshop/session navigation
      const workshopNav = page.locator('a, button', { hasText: /workshop|session|เซสชัน|งานสัมมนา/i });
      
      if (await workshopNav.first().isVisible({ timeout: 5000 })) {
        await workshopNav.first().click();
        await page.waitForLoadState('networkidle');
      } else {
        // Try direct navigation to workshop page
        await navHelper.navigateToPage('/workshops');
      }
    });

    await test.step('Browse Available Workshops', async () => {
      // Check for workshop cards/listings
      const workshopCards = page.locator('[data-testid="workshop-card"], .workshop-card, .workshop');
      const cardCount = await workshopCards.count();
      
      console.log(`Found ${cardCount} workshop cards`);
      
      if (cardCount > 0) {
        // Test workshop card interaction
        await workshopCards.first().hover();
        
        // Check for key workshop information
        await expect(workshopCards.first().locator('text=/\\d+.*คน|participant/i')).toBeVisible({ timeout: 3000 });
      }
    });

    await test.step('Workshop Registration Process', async () => {
      // Look for registration button
      const registerButton = page.locator('button, a', { hasText: /ลงทะเบียน|register|เข้าร่วม|join/i });
      
      if (await registerButton.first().isVisible({ timeout: 5000 })) {
        await registerButton.first().click();
        await page.waitForTimeout(2000);
        
        // Check for registration confirmation or form
        const confirmButton = page.locator('button', { hasText: /ยืนยัน|confirm|ok/i });
        if (await confirmButton.isVisible({ timeout: 3000 })) {
          await confirmButton.click();
        }
        
        // Look for success message or navigation to registered workshops
        await page.waitForTimeout(3000);
      }
    });
  });

  test('Task Submission and Management Flow', async () => {
    test.setTimeout(90000);
    
    await authHelper.loginUser();

    await test.step('Navigate to Tasks/Assignments', async () => {
      // Look for tasks section
      const taskSection = page.locator('text=/งาน|task|assignment/i');
      
      if (await taskSection.first().isVisible({ timeout: 5000 })) {
        await taskSection.first().click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('View Available Tasks', async () => {
      // Check for task listings
      const taskCards = page.locator('[data-testid="task-card"], .task, button:has-text("test"), button:has-text("งาน")');
      const taskCount = await taskCards.count();
      
      console.log(`Found ${taskCount} tasks`);
      
      if (taskCount > 0) {
        // Check task details
        await expect(taskCards.first()).toBeVisible();
        
        // Look for task status indicators
        const statusIndicators = page.locator('text=/ส่งแล้ว|submitted|ยังไม่ส่ง|pending/i');
        await expect(statusIndicators.first()).toBeVisible({ timeout: 3000 });
      }
    });

    await test.step('Task Submission Process', async () => {
      // Look for unsubmitted tasks
      const pendingTask = page.locator('button, .task', { hasText: /ยังไม่ส่ง|pending/i });
      
      if (await pendingTask.first().isVisible({ timeout: 5000 })) {
        await pendingTask.first().click();
        await page.waitForTimeout(2000);
        
        // Look for submission form
        const urlInput = page.locator('input[type="url"], input[placeholder*="http"], input[placeholder*="drive"], input[placeholder*="docs"]');
        const notesInput = page.locator('textarea, input[placeholder*="หมายเหตุ"], input[placeholder*="note"]');
        
        if (await urlInput.first().isVisible({ timeout: 3000 })) {
          await urlInput.first().fill('https://docs.google.com/document/d/test-submission');
          
          if (await notesInput.first().isVisible({ timeout: 2000 })) {
            await notesInput.first().fill('Test submission from automated test');
          }
          
          // Submit the task
          const submitButton = page.locator('button', { hasText: /ส่งงาน|submit|บันทึก|save/i });
          if (await submitButton.first().isVisible({ timeout: 3000 })) {
            await submitButton.first().click();
            await page.waitForTimeout(3000);
            
            // Check for success indication
            await expect(page.locator('text=/ส่งแล้ว|submitted|สำเร็จ|success/i').first()).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });
  });

  test('Profile Management and Settings', async () => {
    test.setTimeout(60000);
    
    await authHelper.loginUser();

    await test.step('Access User Profile', async () => {
      // Look for profile button/link
      const profileButton = page.locator('[data-testid="profile"], button:has-text("profile"), .profile, img[alt*="avatar"], button:has-text("tracotracker")');
      
      if (await profileButton.first().isVisible({ timeout: 5000 })) {
        await profileButton.first().click();
        await page.waitForTimeout(1000);
      }
      
      // Look for profile/settings options
      const profileOption = page.locator('a, button', { hasText: /โปรไฟล์|profile|settings|ตั้งค่า/i });
      if (await profileOption.first().isVisible({ timeout: 3000 })) {
        await profileOption.first().click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('View Profile Information', async () => {
      // Check for profile form fields
      const nameField = page.locator('input[type="text"], input[placeholder*="name"], input[placeholder*="ชื่อ"]');
      const emailField = page.locator('input[type="email"]');
      
      if (await nameField.first().isVisible({ timeout: 5000 })) {
        const currentName = await nameField.first().inputValue();
        console.log('Current user name:', currentName);
        
        // Test profile editing (if editable)
        if (await nameField.first().isEditable()) {
          await nameField.first().fill(currentName + ' (Updated)');
          
          const saveButton = page.locator('button', { hasText: /save|บันทึก|update|อัปเดต/i });
          if (await saveButton.first().isVisible({ timeout: 3000 })) {
            await saveButton.first().click();
            await page.waitForTimeout(2000);
          }
        }
      }
    });
  });

  test('Session Feed and Material Access', async () => {
    test.setTimeout(60000);
    
    await authHelper.loginUser();

    await test.step('Navigate to Session Feed', async () => {
      // Try multiple ways to access session feed
      await navHelper.navigateToPage('/session-feed');
      
      // Alternative: look for session feed navigation
      const sessionLink = page.locator('a', { hasText: /session|เซสชัน/i });
      if (await sessionLink.first().isVisible({ timeout: 3000 })) {
        await sessionLink.first().click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Verify Session Content Loading', async () => {
      // Check for session title/header
      const sessionTitle = page.locator('h1, h2, .title', { hasText: /โครงการ|project|workshop/i });
      await expect(sessionTitle.first()).toBeVisible({ timeout: 10000 });
      
      // Check for workshop listings in session
      const workshopSection = page.locator('text=/workshop/i');
      await expect(workshopSection.first()).toBeVisible({ timeout: 5000 });
      
      // Check for embedded materials (iframe, etc.)
      const materialFrame = page.locator('iframe');
      if (await materialFrame.first().isVisible({ timeout: 3000 })) {
        console.log('📄 Session materials found');
      }
    });

    await test.step('Test Material Interaction', async () => {
      // Look for material download/view buttons
      const viewButton = page.locator('a, button', { hasText: /ดูสไลด์|view|ดู|download/i });
      
      if (await viewButton.first().isVisible({ timeout: 5000 })) {
        // Test external link handling
        const [popup] = await Promise.all([
          page.waitForEvent('popup', { timeout: 5000 }).catch(() => null),
          viewButton.first().click()
        ]);
        
        if (popup) {
          await popup.waitForLoadState('networkidle');
          console.log('📄 Material opened in new tab:', popup.url());
          await popup.close();
        }
      }
    });
  });

  test('Group Formation and Management', async () => {
    test.setTimeout(90000);
    
    await authHelper.loginUser();

    await test.step('Navigate to Group Tasks', async () => {
      // Look for group-type tasks
      const groupTask = page.locator('button, .task', { hasText: /กลุ่ม|group/i });
      
      if (await groupTask.first().isVisible({ timeout: 5000 })) {
        await groupTask.first().click();
        await page.waitForTimeout(2000);
      }
    });

    await test.step('Test Group Creation Flow', async () => {
      // Look for group creation interface
      const createGroupButton = page.locator('button', { hasText: /สร้างกลุ่ม|create.*group/i });
      
      if (await createGroupButton.first().isVisible({ timeout: 5000 })) {
        await createGroupButton.first().click();
        await page.waitForTimeout(1000);
        
        // Fill group creation form
        const groupNameInput = page.locator('input[placeholder*="ชื่อกลุ่ม"], input[placeholder*="group name"]');
        if (await groupNameInput.first().isVisible({ timeout: 3000 })) {
          await groupNameInput.first().fill('Test Group from E2E');
          
          const submitButton = page.locator('button', { hasText: /สร้าง|create/i });
          if (await submitButton.first().isVisible()) {
            await submitButton.first().click();
            await page.waitForTimeout(3000);
          }
        }
      }
    });

    await test.step('Test Group Join by Code', async () => {
      // Look for join group interface
      const joinGroupSection = page.locator('text=/เข้าร่วมด้วยรหัส|join.*code/i');
      
      if (await joinGroupSection.first().isVisible({ timeout: 5000 })) {
        const codeInput = page.locator('input[placeholder*="ABC123"], input.tracking-widest, input[placeholder*="รหัส"]');
        
        if (await codeInput.first().isVisible({ timeout: 3000 })) {
          await codeInput.first().fill('TEST123');
          
          const joinButton = page.locator('button', { hasText: /เข้าร่วม|join/i });
          if (await joinButton.first().isVisible()) {
            await joinButton.first().click();
            await page.waitForTimeout(2000);
          }
        }
      }
    });
  });

  test('End-to-End User Journey Performance', async () => {
    test.setTimeout(120000);
    
    const journeySteps = [];
    
    await test.step('Complete User Journey with Performance Tracking', async () => {
      // Step 1: Login
      const loginStart = Date.now();
      await authHelper.loginUser();
      journeySteps.push({ step: 'Login', duration: Date.now() - loginStart });
      
      // Step 2: Dashboard
      const dashboardStart = Date.now();
      await navHelper.navigateToPage('/dashboard');
      journeySteps.push({ step: 'Dashboard Load', duration: Date.now() - dashboardStart });
      
      // Step 3: Session Feed
      const sessionStart = Date.now();
      await navHelper.navigateToPage('/session-feed');
      journeySteps.push({ step: 'Session Feed Load', duration: Date.now() - sessionStart });
      
      // Step 4: Task Interaction
      const taskStart = Date.now();
      const taskButton = page.locator('button:has-text("test"), button:has-text("งาน")');
      if (await taskButton.first().isVisible({ timeout: 5000 })) {
        await taskButton.first().click();
        await page.waitForTimeout(2000);
      }
      journeySteps.push({ step: 'Task Interaction', duration: Date.now() - taskStart });
      
      // Report journey performance
      console.log('🚀 User Journey Performance:', journeySteps);
      
      // Verify no critical errors occurred during journey
      const errors = perfMonitor.getErrors();
      const criticalErrors = errors.filter(error => 
        error.text.includes('TypeError') || 
        error.text.includes('ReferenceError') ||
        error.text.includes('Network Error') ||
        error.type === 'pageerror'
      );
      
      expect(criticalErrors.length).toBe(0);
    });
  });
});

// Responsive Design Tests
test.describe('Responsive Design Tests', () => {
  let page: Page;
  let responsiveHelper: ResponsiveHelper;
  let authHelper: AuthHelper;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    responsiveHelper = new ResponsiveHelper(page);
    authHelper = new AuthHelper(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('Mobile Responsive Layout and Navigation', async () => {
    await responsiveHelper.setMobileViewport();
    await authHelper.loginUser();

    await test.step('Test Mobile Dashboard Layout', async () => {
      // Check if content adapts to mobile viewport
      const mainContent = page.locator('main, [role="main"]');
      await expect(mainContent).toBeVisible();
      
      // Check for mobile-specific UI elements
      await responsiveHelper.testMobileMenu();
    });

    await test.step('Test Mobile Navigation', async () => {
      // Test navigation on mobile
      await page.goto(`${TEST_CONFIG.baseURL}/session-feed`);
      await page.waitForLoadState('networkidle');
      
      // Verify content is accessible on mobile
      const content = page.locator('h1, h2, .title');
      await expect(content.first()).toBeVisible({ timeout: 10000 });
    });
  });

  test('Tablet Layout Compatibility', async () => {
    await responsiveHelper.setTabletViewport();
    await authHelper.loginUser();

    await test.step('Test Tablet Dashboard', async () => {
      const dashboard = page.locator('main, [role="main"]');
      await expect(dashboard).toBeVisible();
      
      // Check for proper layout scaling
      const cards = page.locator('.card, [class*="card"], [class*="grid"]');
      if (await cards.first().isVisible({ timeout: 5000 })) {
        console.log(`Found ${await cards.count()} cards on tablet view`);
      }
    });
  });

  test('Desktop Full Feature Access', async () => {
    await responsiveHelper.setDesktopViewport();
    await authHelper.loginUser();

    await test.step('Test Desktop Full Functionality', async () => {
      // Verify all features are accessible on desktop
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`);
      
      const quickActions = page.locator('text=/quick action/i');
      if (await quickActions.first().isVisible({ timeout: 5000 })) {
        console.log('✅ Quick actions visible on desktop');
      }
      
      // Test workshop cards layout
      const workshopSection = page.locator('text=/workshop/i');
      await expect(workshopSection.first()).toBeVisible({ timeout: 5000 });
    });
  });
});