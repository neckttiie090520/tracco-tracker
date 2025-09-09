import { test, expect } from '@playwright/test';
import { 
  PerformanceMonitor,
  AuthHelper,
  NavigationHelper,
  ResponsiveHelper,
  TEST_CONFIG 
} from './helpers/test-helpers';

test.describe('Responsive Design Tests', () => {
  let performanceMonitor: PerformanceMonitor;
  let authHelper: AuthHelper;
  let navHelper: NavigationHelper;
  let responsiveHelper: ResponsiveHelper;

  test.beforeEach(async ({ page }) => {
    performanceMonitor = new PerformanceMonitor(page);
    authHelper = new AuthHelper(page);
    navHelper = new NavigationHelper(page);
    responsiveHelper = new ResponsiveHelper(page);
    
    await performanceMonitor.start();
  });

  test('Cross-Device Navigation Consistency', async ({ page }) => {
    console.log('🚀 Testing Cross-Device Navigation Consistency...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    const viewports = [
      { name: 'Desktop', width: 1920, height: 1080 },
      { name: 'Laptop', width: 1366, height: 768 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Small Mobile', width: 320, height: 568 }
    ];
    
    for (const viewport of viewports) {
      console.log(`📱 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000);
      
      // Check main navigation accessibility
      const navElements = page.locator('nav, .nav, [role="navigation"], .navbar');
      const navCount = await navElements.count();
      console.log(`   Navigation elements visible: ${navCount}`);
      
      // Check for mobile menu on smaller screens
      if (viewport.width <= 768) {
        const mobileMenu = page.locator('.hamburger, .mobile-menu, [data-testid="mobile-menu"], button[aria-label*="menu"]');
        const hasMobileMenu = await mobileMenu.first().isVisible({ timeout: 2000 });
        console.log(`   Mobile menu available: ${hasMobileMenu}`);
        
        if (hasMobileMenu) {
          await mobileMenu.first().click();
          await page.waitForTimeout(500);
          
          // Check if menu opens
          const menuOpen = page.locator('.menu-open, .nav-open, .mobile-nav-open');
          const isMenuOpen = await menuOpen.first().isVisible({ timeout: 2000 });
          console.log(`   Mobile menu opens correctly: ${isMenuOpen}`);
          
          // Close menu
          if (isMenuOpen) {
            await mobileMenu.first().click();
          }
        }
      }
      
      // Check content accessibility and readability
      const mainContent = page.locator('main, .main-content, .content, [role="main"]');
      const contentVisible = await mainContent.first().isVisible({ timeout: 3000 });
      console.log(`   Main content accessible: ${contentVisible}`);
      
      // Check for horizontal scrolling issues
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidthActual = await page.evaluate(() => window.innerWidth);
      const hasHorizontalScroll = bodyWidth > viewportWidthActual + 5; // 5px tolerance
      console.log(`   Has horizontal scroll issue: ${hasHorizontalScroll}`);
      
      if (hasHorizontalScroll) {
        console.log(`   ⚠️ Potential horizontal scroll: body=${bodyWidth}px, viewport=${viewportWidthActual}px`);
      }
      
      // Basic assertion - content should be accessible
      expect(contentVisible || navCount > 0).toBeTruthy();
    }
  });

  test('Interactive Elements Touch-Friendly Testing', async ({ page }) => {
    console.log('🚀 Testing Touch-Friendly Interactive Elements...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    // Test on mobile viewport
    await responsiveHelper.setMobileViewport();
    await page.waitForTimeout(1000);
    
    // Find interactive elements
    const buttons = page.locator('button');
    const links = page.locator('a[href]');
    const inputs = page.locator('input, textarea, select');
    
    const buttonCount = await buttons.count();
    const linkCount = await links.count();
    const inputCount = await inputs.count();
    
    console.log(`📱 Interactive elements found:`);
    console.log(`   Buttons: ${buttonCount}`);
    console.log(`   Links: ${linkCount}`);
    console.log(`   Form inputs: ${inputCount}`);
    
    // Test button touch targets (should be at least 44x44px)
    const smallButtons = [];
    const buttonElements = await buttons.all();
    
    for (let i = 0; i < Math.min(buttonElements.length, 10); i++) { // Test first 10 buttons
      const button = buttonElements[i];
      if (await button.isVisible({ timeout: 1000 })) {
        const boundingBox = await button.boundingBox();
        if (boundingBox) {
          const isTooBig = boundingBox.width >= 44 && boundingBox.height >= 44;
          if (!isTooBig) {
            smallButtons.push({ width: boundingBox.width, height: boundingBox.height });
          }
        }
      }
    }
    
    console.log(`📏 Buttons with adequate touch targets: ${buttonElements.length - smallButtons.length}/${buttonElements.length}`);
    if (smallButtons.length > 0) {
      console.log(`⚠️ Small touch targets found: ${smallButtons.length} buttons`);
      smallButtons.slice(0, 3).forEach((btn, idx) => {
        console.log(`   Button ${idx + 1}: ${btn.width}x${btn.height}px`);
      });
    }
    
    // Test form accessibility on mobile
    if (inputCount > 0) {
      const firstInput = inputs.first();
      if (await firstInput.isVisible({ timeout: 2000 })) {
        // Test focus and typing
        await firstInput.focus();
        await page.waitForTimeout(500);
        
        const isFocused = await firstInput.evaluate(el => document.activeElement === el);
        console.log(`📝 Form input focus works: ${isFocused}`);
        
        // Test virtual keyboard space (check if content adjusts)
        const viewportHeightBefore = await page.evaluate(() => window.innerHeight);
        await firstInput.type('test input');
        await page.waitForTimeout(1000);
        const viewportHeightAfter = await page.evaluate(() => window.innerHeight);
        
        console.log(`⌨️ Viewport adjustment for keyboard: ${viewportHeightBefore}px → ${viewportHeightAfter}px`);
      }
    }
  });

  test('Layout Breakpoint Testing', async ({ page }) => {
    console.log('🚀 Testing Layout Breakpoints...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    // Test common CSS breakpoints
    const breakpoints = [
      { name: '4K', width: 2560 },
      { name: 'Desktop XL', width: 1920 },
      { name: 'Desktop', width: 1366 },
      { name: 'Laptop', width: 1024 },
      { name: 'Tablet Landscape', width: 768 },
      { name: 'Tablet Portrait', width: 600 },
      { name: 'Mobile Large', width: 480 },
      { name: 'Mobile', width: 375 },
      { name: 'Mobile Small', width: 320 }
    ];
    
    const layoutMetrics = [];
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ width: breakpoint.width, height: 800 });
      await page.waitForTimeout(1000);
      
      // Measure layout metrics
      const metrics = await page.evaluate(() => {
        const body = document.body;
        const main = document.querySelector('main, .main-content, .content') as HTMLElement;
        
        return {
          bodyWidth: body.scrollWidth,
          bodyHeight: body.scrollHeight,
          mainWidth: main ? main.offsetWidth : 0,
          mainHeight: main ? main.offsetHeight : 0,
          hasOverflow: body.scrollWidth > window.innerWidth,
          elements: {
            buttons: document.querySelectorAll('button').length,
            inputs: document.querySelectorAll('input, textarea, select').length,
            images: document.querySelectorAll('img').length,
            containers: document.querySelectorAll('div, section, article').length
          }
        };
      });
      
      layoutMetrics.push({
        breakpoint: breakpoint.name,
        width: breakpoint.width,
        ...metrics
      });
      
      console.log(`📏 ${breakpoint.name} (${breakpoint.width}px):`);
      console.log(`   Content size: ${metrics.mainWidth}x${metrics.mainHeight}px`);
      console.log(`   Overflow issue: ${metrics.hasOverflow}`);
      console.log(`   Elements: ${Object.values(metrics.elements).reduce((a, b) => a + b, 0)}`);
      
      // Check for layout shifts
      const layoutShiftScore = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsScore = 0;
          const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                clsScore += (entry as any).value;
              }
            });
          });
          
          observer.observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => {
            observer.disconnect();
            resolve(clsScore);
          }, 2000);
        });
      });
      
      console.log(`   Layout shift score: ${layoutShiftScore}`);
    }
    
    // Analyze breakpoint behavior
    const overflowBreakpoints = layoutMetrics.filter(m => m.hasOverflow);
    if (overflowBreakpoints.length > 0) {
      console.log(`⚠️ Breakpoints with overflow issues: ${overflowBreakpoints.map(b => b.breakpoint).join(', ')}`);
    }
    
    // Ensure no critical breakpoints have major issues
    const criticalBreakpoints = layoutMetrics.filter(m => 
      ['Desktop', 'Tablet Portrait', 'Mobile'].includes(m.breakpoint)
    );
    const problematicCritical = criticalBreakpoints.filter(m => m.hasOverflow);
    
    expect(problematicCritical.length).toBeLessThan(2); // Allow some minor issues but not on all critical breakpoints
  });

  test('Image and Media Responsive Behavior', async ({ page }) => {
    console.log('🚀 Testing Image and Media Responsive Behavior...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    const viewports = [
      { name: 'Desktop', width: 1366 },
      { name: 'Tablet', width: 768 },
      { name: 'Mobile', width: 375 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: 800 });
      await page.waitForTimeout(1000);
      
      console.log(`📸 Testing media on ${viewport.name}...`);
      
      // Find images
      const images = page.locator('img');
      const imageCount = await images.count();
      console.log(`   Images found: ${imageCount}`);
      
      if (imageCount > 0) {
        // Test first few images
        const testImageCount = Math.min(imageCount, 5);
        let oversizedImages = 0;
        let brokenImages = 0;
        
        for (let i = 0; i < testImageCount; i++) {
          const img = images.nth(i);
          if (await img.isVisible({ timeout: 2000 })) {
            const boundingBox = await img.boundingBox();
            const naturalSize = await img.evaluate((el: HTMLImageElement) => ({
              naturalWidth: el.naturalWidth,
              naturalHeight: el.naturalHeight,
              complete: el.complete,
              src: el.src
            }));
            
            if (boundingBox) {
              // Check if image exceeds viewport width
              if (boundingBox.width > viewport.width) {
                oversizedImages++;
              }
              
              // Check if image is broken
              if (!naturalSize.complete || naturalSize.naturalWidth === 0) {
                brokenImages++;
              }
            }
          }
        }
        
        console.log(`   Oversized images: ${oversizedImages}/${testImageCount}`);
        console.log(`   Broken images: ${brokenImages}/${testImageCount}`);
      }
      
      // Check for video/iframe elements
      const videos = page.locator('video, iframe');
      const videoCount = await videos.count();
      console.log(`   Video/iframe elements: ${videoCount}`);
      
      if (videoCount > 0) {
        const firstVideo = videos.first();
        if (await firstVideo.isVisible({ timeout: 2000 })) {
          const videoBounds = await firstVideo.boundingBox();
          if (videoBounds) {
            const isResponsive = videoBounds.width <= viewport.width;
            console.log(`   Video responsive: ${isResponsive} (${videoBounds.width}px)`);
          }
        }
      }
    }
  });

  test('Typography and Text Readability Scaling', async ({ page }) => {
    console.log('🚀 Testing Typography and Text Readability...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    const viewports = [
      { name: 'Desktop', width: 1366 },
      { name: 'Tablet', width: 768 },
      { name: 'Mobile', width: 375 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: 800 });
      await page.waitForTimeout(1000);
      
      console.log(`📝 Testing typography on ${viewport.name}...`);
      
      // Analyze text elements
      const textMetrics = await page.evaluate(() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const paragraphs = Array.from(document.querySelectorAll('p, div, span'));
        const buttons = Array.from(document.querySelectorAll('button'));
        
        const getTextMetrics = (elements: Element[]) => {
          return elements.slice(0, 5).map(el => {
            const styles = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return {
              fontSize: parseFloat(styles.fontSize),
              lineHeight: styles.lineHeight,
              width: rect.width,
              height: rect.height,
              text: el.textContent?.substring(0, 50) || ''
            };
          });
        };
        
        return {
          headings: getTextMetrics(headings),
          paragraphs: getTextMetrics(paragraphs.filter(el => el.textContent && el.textContent.trim().length > 10)),
          buttons: getTextMetrics(buttons)
        };
      });
      
      // Check font size adequacy
      const smallTexts = [
        ...textMetrics.paragraphs.filter(t => t.fontSize < 14),
        ...textMetrics.buttons.filter(t => t.fontSize < 14)
      ];
      
      console.log(`   Text elements analyzed:`);
      console.log(`     Headings: ${textMetrics.headings.length}`);
      console.log(`     Paragraphs: ${textMetrics.paragraphs.length}`);
      console.log(`     Buttons: ${textMetrics.buttons.length}`);
      console.log(`   Small text elements (< 14px): ${smallTexts.length}`);
      
      // Check for very large headings that might break layout
      const largeHeadings = textMetrics.headings.filter(h => h.fontSize > viewport.width * 0.1);
      if (largeHeadings.length > 0) {
        console.log(`   ⚠️ Potentially oversized headings: ${largeHeadings.length}`);
      }
      
      // Ensure readable font sizes on mobile
      if (viewport.name === 'Mobile') {
        const tooSmallText = smallTexts.filter(t => t.fontSize < 12);
        console.log(`   Text too small for mobile (< 12px): ${tooSmallText.length}`);
        expect(tooSmallText.length).toBeLessThan(5); // Allow some but not many
      }
    }
  });

  test('Form Usability Across Devices', async ({ page }) => {
    console.log('🚀 Testing Form Usability Across Devices...');
    
    await page.goto(TEST_CONFIG.baseURL);
    await authHelper.loginUser();
    
    const viewports = [
      { name: 'Desktop', width: 1366, height: 768 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Mobile', width: 375, height: 667 }
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);
      
      console.log(`📋 Testing forms on ${viewport.name}...`);
      
      // Find forms
      const forms = page.locator('form');
      const formCount = await forms.count();
      console.log(`   Forms found: ${formCount}`);
      
      if (formCount > 0) {
        const firstForm = forms.first();
        
        // Analyze form elements
        const formMetrics = await firstForm.evaluate((form: HTMLFormElement) => {
          const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
          const buttons = Array.from(form.querySelectorAll('button'));
          const labels = Array.from(form.querySelectorAll('label'));
          
          const getElementMetrics = (elements: Element[]) => {
            return elements.map(el => {
              const rect = el.getBoundingClientRect();
              const styles = window.getComputedStyle(el);
              return {
                width: rect.width,
                height: rect.height,
                padding: styles.padding,
                fontSize: parseFloat(styles.fontSize),
                type: el.tagName.toLowerCase(),
                inputType: (el as HTMLInputElement).type || ''
              };
            });
          };
          
          return {
            inputs: getElementMetrics(inputs),
            buttons: getElementMetrics(buttons),
            labels: getElementMetrics(labels)
          };
        });
        
        console.log(`   Form elements:`);
        console.log(`     Inputs: ${formMetrics.inputs.length}`);
        console.log(`     Buttons: ${formMetrics.buttons.length}`);
        console.log(`     Labels: ${formMetrics.labels.length}`);
        
        // Check touch-friendly input sizes on mobile
        if (viewport.name === 'Mobile') {
          const smallInputs = formMetrics.inputs.filter(input => 
            input.height < 44 || input.width < 200
          );
          const smallButtons = formMetrics.buttons.filter(btn => 
            btn.height < 44 || btn.width < 100
          );
          
          console.log(`   Small inputs on mobile: ${smallInputs.length}`);
          console.log(`   Small buttons on mobile: ${smallButtons.length}`);
          
          // Test form interaction
          const firstInput = page.locator('input, textarea').first();
          if (await firstInput.isVisible({ timeout: 2000 })) {
            await firstInput.tap(); // Use tap instead of click for mobile
            await page.waitForTimeout(500);
            
            const isFocused = await firstInput.evaluate(el => document.activeElement === el);
            console.log(`   Mobile input focus: ${isFocused}`);
          }
        }
        
        // Test form scrolling behavior
        const formBounds = await firstForm.boundingBox();
        if (formBounds && formBounds.height > viewport.height) {
          console.log(`   Form requires scrolling: ${formBounds.height}px > ${viewport.height}px`);
          
          // Test scroll to bottom of form
          await firstForm.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);
        }
      }
    }
  });
});