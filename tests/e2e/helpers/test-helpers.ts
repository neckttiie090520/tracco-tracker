import { Page, expect } from '@playwright/test';

// Test data configurations
export const TEST_CONFIG = {
  baseURL: 'https://traco-tracker.vercel.app',
  testUser: {
    email: 'tracotracker@gmail.com',
    password: 'your-test-password' // This should be set in env or config
  },
  timeouts: {
    pageLoad: 15000,
    navigation: 10000,
    element: 5000
  }
};

// Performance monitoring helper
export class PerformanceMonitor {
  private logs: any[] = [];
  private errors: any[] = [];
  private networkRequests: any[] = [];
  private performanceMetrics: any = {};

  constructor(private page: Page) {}

  async start() {
    // Monitor console messages
    this.page.on('console', (msg) => {
      const text = msg.text();
      this.logs.push({ 
        type: msg.type(), 
        text, 
        timestamp: Date.now(),
        url: msg.location()?.url || ''
      });
      
      if (msg.type() === 'error' || text.includes('error') || text.includes('failed')) {
        this.errors.push({ text, timestamp: Date.now() });
      }
    });
    
    // Monitor page errors
    this.page.on('pageerror', (error) => {
      this.errors.push({ 
        text: error.message, 
        timestamp: Date.now(), 
        type: 'pageerror',
        stack: error.stack
      });
    });
    
    // Monitor network requests
    this.page.on('request', (request) => {
      this.networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now(),
        resourceType: request.resourceType()
      });
    });

    // Inject performance timing script
    await this.page.addInitScript(() => {
      (window as any).performanceTimings = {
        marks: [],
        measures: [],
        navigationStart: performance.timeOrigin
      };

      // Override performance.mark to capture timing data
      const originalMark = performance.mark;
      performance.mark = function(name) {
        (window as any).performanceTimings.marks.push({
          name,
          timestamp: performance.now()
        });
        return originalMark.call(this, name);
      };

      // Override performance.measure
      const originalMeasure = performance.measure;
      performance.measure = function(name, startMark, endMark) {
        const result = originalMeasure.call(this, name, startMark, endMark);
        (window as any).performanceTimings.measures.push({
          name,
          duration: result ? result.duration : 0,
          timestamp: performance.now()
        });
        return result;
      };
    });
  }

  async getMetrics() {
    // Get Web Vitals
    const webVitals = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {
          FCP: 0,
          LCP: 0,
          FID: 0,
          CLS: 0,
          TTFB: 0
        };

        // First Contentful Paint
        new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              vitals.FCP = entry.startTime;
            }
          });
        }).observe({ entryTypes: ['paint'] });

        // Largest Contentful Paint
        new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            vitals.LCP = entry.startTime;
          });
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // Time to First Byte
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          vitals.TTFB = navigation.responseStart - navigation.requestStart;
        }

        setTimeout(() => resolve(vitals), 2000);
      });
    });

    // Get custom performance timings
    const customTimings = await this.page.evaluate(() => {
      return (window as any).performanceTimings || {};
    });

    this.performanceMetrics = {
      webVitals,
      customTimings,
      networkRequestCount: this.networkRequests.length,
      errorCount: this.errors.length,
      consoleLogs: this.logs.length
    };

    return this.performanceMetrics;
  }

  getErrors() {
    return this.errors;
  }

  getLogs() {
    return this.logs;
  }

  getNetworkRequests() {
    return this.networkRequests;
  }
}

// Authentication helper
export class AuthHelper {
  constructor(private page: Page) {}

  async loginUser(email = TEST_CONFIG.testUser.email, password = TEST_CONFIG.testUser.password) {
    await this.page.goto(`${TEST_CONFIG.baseURL}/`);
    
    // Wait for login form or check if already logged in
    try {
      await this.page.waitForSelector('[data-testid="login-form"], [data-testid="dashboard"], .dashboard', { timeout: 5000 });
      
      // Check if already logged in
      const isDashboard = await this.page.locator('[data-testid="dashboard"], .dashboard, main').first().isVisible({ timeout: 2000 });
      if (isDashboard) {
        console.log('Already logged in');
        return true;
      }
    } catch (e) {
      console.log('Login form not found immediately, continuing...');
    }

    // Look for login button or form
    const loginButton = this.page.locator('button', { hasText: /เข้าสู่ระบบ|Login|Sign In/i });
    const emailInput = this.page.locator('input[type="email"], input[placeholder*="email" i]');
    
    if (await loginButton.first().isVisible({ timeout: 3000 })) {
      await loginButton.first().click();
      await this.page.waitForTimeout(1000);
    }

    if (await emailInput.first().isVisible({ timeout: 3000 })) {
      await emailInput.first().fill(email);
      await this.page.locator('input[type="password"], input[placeholder*="password" i]').first().fill(password);
      await this.page.locator('button[type="submit"], button', { hasText: /เข้าสู่ระบบ|Login|Sign In/i }).first().click();
    }

    // Wait for successful login
    await this.page.waitForSelector('[data-testid="dashboard"], .dashboard, main', { 
      timeout: TEST_CONFIG.timeouts.navigation 
    });
    
    return true;
  }

  async logout() {
    const logoutButton = this.page.locator('button', { hasText: /ออกจากระบบ|Logout|Sign Out/i });
    if (await logoutButton.isVisible({ timeout: 3000 })) {
      await logoutButton.click();
      await this.page.waitForURL(/login|auth/, { timeout: TEST_CONFIG.timeouts.navigation });
    }
  }
}

// Navigation helper
export class NavigationHelper {
  constructor(private page: Page) {}

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle', { timeout: TEST_CONFIG.timeouts.pageLoad });
  }

  async navigateToPage(path: string) {
    await this.page.goto(`${TEST_CONFIG.baseURL}${path}`);
    await this.waitForPageLoad();
  }

  async clickNavigationLink(text: string) {
    const link = this.page.locator(`nav a, .nav a, [role="navigation"] a`, { hasText: text });
    await expect(link).toBeVisible({ timeout: TEST_CONFIG.timeouts.element });
    await link.click();
    await this.waitForPageLoad();
  }
}

// UI Interaction helper
export class UIHelper {
  constructor(private page: Page) {}

  async fillForm(formData: Record<string, string>) {
    for (const [field, value] of Object.entries(formData)) {
      const input = this.page.locator(`input[name="${field}"], input[id="${field}"], textarea[name="${field}"]`);
      await expect(input).toBeVisible({ timeout: TEST_CONFIG.timeouts.element });
      await input.fill(value);
    }
  }

  async submitForm(submitButtonText = 'Submit') {
    const submitBtn = this.page.locator(`button[type="submit"], button`, { hasText: submitButtonText });
    await expect(submitBtn).toBeVisible({ timeout: TEST_CONFIG.timeouts.element });
    await submitBtn.click();
  }

  async waitForSuccessMessage() {
    await this.page.waitForSelector('.success, .alert-success, [role="alert"]', { 
      timeout: TEST_CONFIG.timeouts.element 
    });
  }

  async checkForErrors() {
    const errorMessages = await this.page.locator('.error, .alert-error, .text-red, .text-danger').allTextContents();
    return errorMessages;
  }
}

// Mobile testing helper
export class ResponsiveHelper {
  constructor(private page: Page) {}

  async setMobileViewport() {
    await this.page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
  }

  async setTabletViewport() {
    await this.page.setViewportSize({ width: 768, height: 1024 }); // iPad
  }

  async setDesktopViewport() {
    await this.page.setViewportSize({ width: 1920, height: 1080 }); // Full HD
  }

  async testMobileMenu() {
    await this.setMobileViewport();
    const mobileMenu = this.page.locator('[data-testid="mobile-menu"], .mobile-menu, .hamburger');
    if (await mobileMenu.isVisible({ timeout: 2000 })) {
      await mobileMenu.click();
      await this.page.waitForTimeout(500);
      return true;
    }
    return false;
  }
}