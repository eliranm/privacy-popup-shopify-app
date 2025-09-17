import { test, expect } from '@playwright/test';

test.describe('Privacy Popup Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Create a mock storefront page with the privacy popup
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Store</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          .content { height: 200vh; background: linear-gradient(to bottom, #f0f0f0, #e0e0e0); }
        </style>
      </head>
      <body>
        <div class="content">
          <h1>Test Store</h1>
          <p>This is a test storefront page.</p>
        </div>
        
        <!-- Privacy Popup Container -->
        <div 
          id="privacy-popup-container"
          data-message="We use cookies to enhance your browsing experience and analyze our traffic. By continuing to use our site, you consent to our use of cookies."
          data-link-url="/pages/privacy-policy"
          data-position="bottom"
          data-max-width="400"
          data-padding="20"
          data-z-index="9999"
          data-dismissible="true"
          data-bg-color="#ffffff"
          data-text-color="#333333"
          data-link-color="#007ace"
          style="display: none;"
        >
        </div>

        <!-- Load the popup CSS -->
        <link rel="stylesheet" href="/extensions/privacy-popup/assets/privacy-popup.css">
        
        <!-- Load the popup JavaScript -->
        <script src="/extensions/privacy-popup/assets/privacy-popup.js"></script>
      </body>
      </html>
    `);

    // Mock the CSS and JS files
    await page.route('**/privacy-popup.css', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/css',
        body: `
          .privacy-popup-container { position: fixed; font-family: Arial, sans-serif; }
          .privacy-popup { 
            background: var(--popup-bg-color, #ffffff);
            color: var(--popup-text-color, #333333);
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            max-width: var(--popup-max-width, 400px);
            padding: var(--popup-padding, 20px);
            z-index: var(--popup-z-index, 9999);
            transition: transform 0.3s ease, opacity 0.3s ease;
          }
          .privacy-popup[aria-hidden="true"] { opacity: 0; pointer-events: none; }
          .privacy-popup[aria-hidden="false"] { opacity: 1; pointer-events: auto; }
          .privacy-popup--bottom { bottom: 20px; left: 50%; transform: translateX(-50%) translateY(20px); }
          .privacy-popup--bottom[aria-hidden="false"] { transform: translateX(-50%) translateY(0); }
          .privacy-popup--top { top: 20px; left: 50%; transform: translateX(-50%) translateY(-20px); }
          .privacy-popup--top[aria-hidden="false"] { transform: translateX(-50%) translateY(0); }
          .privacy-popup--left { left: 20px; top: 50%; transform: translateY(-50%) translateX(-20px); }
          .privacy-popup--left[aria-hidden="false"] { transform: translateY(-50%) translateX(0); }
          .privacy-popup--right { right: 20px; top: 50%; transform: translateY(-50%) translateX(20px); }
          .privacy-popup--right[aria-hidden="false"] { transform: translateY(-50%) translateX(0); }
          .privacy-popup__link { color: var(--popup-link-color, #007ace); text-decoration: underline; }
          .privacy-popup__button { 
            background: var(--popup-link-color, #007ace); 
            color: white; 
            border: none; 
            padding: 8px 16px; 
            border-radius: 4px; 
            cursor: pointer; 
          }
          .privacy-popup__button--secondary { 
            background: transparent; 
            color: var(--popup-text-color, #333333); 
            border: 1px solid rgba(0, 0, 0, 0.2); 
          }
          .privacy-popup__close { 
            position: absolute; 
            top: 8px; 
            right: 8px; 
            background: transparent; 
            border: none; 
            cursor: pointer; 
          }
          .privacy-popup__actions { margin-top: 16px; display: flex; gap: 12px; justify-content: flex-end; }
        `,
      });
    });

    await page.route('**/privacy-popup.js', (route) => {
      // Serve the actual popup JavaScript (simplified version for testing)
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          (function() {
            'use strict';
            
            const STORAGE_KEY = 'privacy-popup-dismissed';
            
            class PrivacyPopup {
              constructor() {
                this.container = document.getElementById('privacy-popup-container');
                this.popup = null;
                this.isVisible = false;
                
                if (!this.container) return;
                
                this.settings = this.getSettings();
                this.init();
              }
              
              getSettings() {
                const dataset = this.container.dataset;
                return {
                  message: dataset.message || '',
                  linkUrl: dataset.linkUrl || '',
                  position: dataset.position || 'bottom',
                  maxWidth: parseInt(dataset.maxWidth) || 400,
                  padding: parseInt(dataset.padding) || 20,
                  zIndex: parseInt(dataset.zIndex) || 9999,
                  dismissible: dataset.dismissible === 'true',
                  bgColor: dataset.bgColor || '#ffffff',
                  textColor: dataset.textColor || '#333333',
                  linkColor: dataset.linkColor || '#007ace'
                };
              }
              
              init() {
                if (this.settings.dismissible && this.isDismissed()) {
                  return;
                }
                
                this.createPopup();
                this.bindEvents();
                this.show();
              }
              
              createPopup() {
                const popup = document.createElement('div');
                popup.className = 'privacy-popup privacy-popup--' + this.settings.position;
                popup.setAttribute('role', 'dialog');
                popup.setAttribute('aria-modal', 'true');
                popup.setAttribute('aria-labelledby', 'privacy-popup-title');
                popup.setAttribute('aria-describedby', 'privacy-popup-content');
                popup.setAttribute('aria-hidden', 'true');
                popup.setAttribute('tabindex', '-1');
                popup.setAttribute('data-testid', 'privacy-popup');
                
                popup.style.setProperty('--popup-bg-color', this.settings.bgColor);
                popup.style.setProperty('--popup-text-color', this.settings.textColor);
                popup.style.setProperty('--popup-link-color', this.settings.linkColor);
                popup.style.setProperty('--popup-max-width', this.settings.maxWidth + 'px');
                popup.style.setProperty('--popup-padding', this.settings.padding + 'px');
                popup.style.setProperty('--popup-z-index', this.settings.zIndex);
                
                const closeButton = this.settings.dismissible ? 
                  '<button class="privacy-popup__close" aria-label="Close privacy notice" type="button" data-testid="close-button">&times;</button>' : '';
                
                const linkText = this.settings.linkUrl ? 
                  ' <a href="' + this.settings.linkUrl + '" class="privacy-popup__link" target="_blank" rel="noopener" data-testid="privacy-link">Learn more</a>' : '';
                
                popup.innerHTML = 
                  closeButton +
                  '<div class="privacy-popup__content" id="privacy-popup-content">' +
                    '<p id="privacy-popup-title" style="display: none;">Privacy Notice</p>' +
                    this.settings.message + linkText +
                  '</div>' +
                  '<div class="privacy-popup__actions">' +
                    '<button class="privacy-popup__button" type="button" data-action="accept" data-testid="accept-button">Accept</button>' +
                    (this.settings.dismissible ? '<button class="privacy-popup__button privacy-popup__button--secondary" type="button" data-action="dismiss" data-testid="dismiss-button">Dismiss</button>' : '') +
                  '</div>';
                
                this.container.appendChild(popup);
                this.popup = popup;
              }
              
              bindEvents() {
                if (!this.popup) return;
                
                this.popup.addEventListener('click', (e) => {
                  const action = e.target.dataset.action;
                  if (action === 'accept' || action === 'dismiss') {
                    this.dismiss();
                  }
                });
                
                const closeBtn = this.popup.querySelector('.privacy-popup__close');
                if (closeBtn) {
                  closeBtn.addEventListener('click', () => this.dismiss());
                }
                
                this.popup.addEventListener('keydown', (e) => {
                  if (e.key === 'Escape' && this.settings.dismissible) {
                    e.preventDefault();
                    this.dismiss();
                  }
                });
              }
              
              show() {
                if (!this.popup || this.isVisible) return;
                
                this.container.style.display = 'block';
                this.popup.setAttribute('aria-hidden', 'false');
                this.isVisible = true;
                
                setTimeout(() => {
                  const firstButton = this.popup.querySelector('button');
                  if (firstButton) firstButton.focus();
                }, 100);
              }
              
              hide() {
                if (!this.popup || !this.isVisible) return;
                
                this.popup.setAttribute('aria-hidden', 'true');
                this.isVisible = false;
                
                setTimeout(() => {
                  this.container.style.display = 'none';
                }, 300);
              }
              
              dismiss() {
                if (this.settings.dismissible) {
                  localStorage.setItem(STORAGE_KEY, 'true');
                }
                this.hide();
              }
              
              isDismissed() {
                return localStorage.getItem(STORAGE_KEY) === 'true';
              }
              
              reset() {
                localStorage.removeItem(STORAGE_KEY);
                if (!this.isVisible) {
                  this.show();
                }
              }
            }
            
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', () => {
                window.PrivacyPopup = new PrivacyPopup();
              });
            } else {
              window.PrivacyPopup = new PrivacyPopup();
            }
            
            window.resetPrivacyPopup = function() {
              if (window.PrivacyPopup) {
                window.PrivacyPopup.reset();
              }
            };
          })();
        `,
      });
    });
  });

  test('should display privacy popup on page load', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Wait for popup to appear
    await expect(page.locator('[data-testid="privacy-popup"]')).toBeVisible({ timeout: 5000 });
    
    // Check popup content
    await expect(page.locator('[data-testid="privacy-popup"]')).toContainText(
      'We use cookies to enhance your browsing experience'
    );
    
    // Check buttons are present
    await expect(page.locator('[data-testid="accept-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="dismiss-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="privacy-link"]')).toBeVisible();
  });

  test('should position popup correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const popup = page.locator('[data-testid="privacy-popup"]');
    await expect(popup).toBeVisible();
    
    // Check bottom position (default)
    await expect(popup).toHaveClass(/privacy-popup--bottom/);
    
    // Check positioning styles
    const boundingBox = await popup.boundingBox();
    const viewportSize = page.viewportSize();
    
    if (boundingBox && viewportSize) {
      // Should be near bottom of screen
      expect(boundingBox.y).toBeGreaterThan(viewportSize.height * 0.7);
      
      // Should be horizontally centered
      const centerX = boundingBox.x + boundingBox.width / 2;
      const viewportCenterX = viewportSize.width / 2;
      expect(Math.abs(centerX - viewportCenterX)).toBeLessThan(50);
    }
  });

  test('should dismiss popup when accept button is clicked', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const popup = page.locator('[data-testid="privacy-popup"]');
    await expect(popup).toBeVisible();
    
    // Click accept button
    await page.click('[data-testid="accept-button"]');
    
    // Popup should disappear
    await expect(popup).toHaveAttribute('aria-hidden', 'true');
    await expect(popup).not.toBeVisible();
    
    // Should persist dismissal
    const dismissed = await page.evaluate(() => 
      localStorage.getItem('privacy-popup-dismissed')
    );
    expect(dismissed).toBe('true');
  });

  test('should dismiss popup when dismiss button is clicked', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const popup = page.locator('[data-testid="privacy-popup"]');
    await expect(popup).toBeVisible();
    
    // Click dismiss button
    await page.click('[data-testid="dismiss-button"]');
    
    // Popup should disappear
    await expect(popup).toHaveAttribute('aria-hidden', 'true');
    await expect(popup).not.toBeVisible();
  });

  test('should dismiss popup when close button is clicked', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const popup = page.locator('[data-testid="privacy-popup"]');
    await expect(popup).toBeVisible();
    
    // Click close button
    await page.click('[data-testid="close-button"]');
    
    // Popup should disappear
    await expect(popup).toHaveAttribute('aria-hidden', 'true');
    await expect(popup).not.toBeVisible();
  });

  test('should dismiss popup when Escape key is pressed', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const popup = page.locator('[data-testid="privacy-popup"]');
    await expect(popup).toBeVisible();
    
    // Focus the popup and press Escape
    await popup.focus();
    await page.keyboard.press('Escape');
    
    // Popup should disappear
    await expect(popup).toHaveAttribute('aria-hidden', 'true');
    await expect(popup).not.toBeVisible();
  });

  test('should not show popup again after dismissal', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    // Dismiss popup
    await page.click('[data-testid="accept-button"]');
    await expect(page.locator('[data-testid="privacy-popup"]')).not.toBeVisible();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Popup should not appear
    await expect(page.locator('[data-testid="privacy-popup"]')).not.toBeVisible();
  });

  test('should open privacy policy link in new tab', async ({ page, context }) => {
    await page.waitForLoadState('networkidle');
    
    const popup = page.locator('[data-testid="privacy-popup"]');
    await expect(popup).toBeVisible();
    
    // Set up new page listener
    const newPagePromise = context.waitForEvent('page');
    
    // Click privacy link
    await page.click('[data-testid="privacy-link"]');
    
    // Check new tab opened
    const newPage = await newPagePromise;
    await newPage.waitForLoadState();
    
    expect(newPage.url()).toContain('/pages/privacy-policy');
  });

  test('should be accessible with screen readers', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    
    const popup = page.locator('[data-testid="privacy-popup"]');
    await expect(popup).toBeVisible();
    
    // Check ARIA attributes
    await expect(popup).toHaveAttribute('role', 'dialog');
    await expect(popup).toHaveAttribute('aria-modal', 'true');
    await expect(popup).toHaveAttribute('aria-labelledby', 'privacy-popup-title');
    await expect(popup).toHaveAttribute('aria-describedby', 'privacy-popup-content');
    
    // Check keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveAttribute('data-testid', 'accept-button');
    
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'dismiss-button');
    
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'close-button');
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForLoadState('networkidle');
    
    const popup = page.locator('[data-testid="privacy-popup"]');
    await expect(popup).toBeVisible();
    
    // Check popup fits on mobile screen
    const boundingBox = await popup.boundingBox();
    if (boundingBox) {
      expect(boundingBox.width).toBeLessThanOrEqual(375 - 40); // Account for margins
      expect(boundingBox.x).toBeGreaterThanOrEqual(20); // Left margin
    }
    
    // Check buttons are still clickable
    await page.click('[data-testid="accept-button"]');
    await expect(popup).not.toBeVisible();
  });

  test('should handle different positions', async ({ page }) => {
    // Test top position
    await page.evaluate(() => {
      const container = document.getElementById('privacy-popup-container');
      if (container) {
        container.dataset.position = 'top';
      }
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const popup = page.locator('[data-testid="privacy-popup"]');
    await expect(popup).toBeVisible();
    await expect(popup).toHaveClass(/privacy-popup--top/);
    
    // Check positioning
    const boundingBox = await popup.boundingBox();
    if (boundingBox) {
      expect(boundingBox.y).toBeLessThan(100); // Should be near top
    }
  });

  test('should respect custom styling', async ({ page }) => {
    await page.evaluate(() => {
      const container = document.getElementById('privacy-popup-container');
      if (container) {
        container.dataset.bgColor = '#ff0000';
        container.dataset.textColor = '#ffffff';
        container.dataset.linkColor = '#ffff00';
      }
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const popup = page.locator('[data-testid="privacy-popup"]');
    await expect(popup).toBeVisible();
    
    // Check custom colors are applied
    const backgroundColor = await popup.evaluate(el => 
      getComputedStyle(el).getPropertyValue('--popup-bg-color')
    );
    expect(backgroundColor).toBe('#ff0000');
    
    const textColor = await popup.evaluate(el => 
      getComputedStyle(el).getPropertyValue('--popup-text-color')
    );
    expect(textColor).toBe('#ffffff');
    
    const linkColor = await popup.evaluate(el => 
      getComputedStyle(el).getPropertyValue('--popup-link-color')
    );
    expect(linkColor).toBe('#ffff00');
  });
});
