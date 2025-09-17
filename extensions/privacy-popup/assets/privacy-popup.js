/**
 * Privacy Popup - Accessible and performant privacy notice overlay
 * Follows WCAG 2.1 AA guidelines and modern web standards
 */
(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.PrivacyPopup) return;

  const STORAGE_KEY = 'privacy-popup-dismissed';
  const FOCUS_TRAP_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  class PrivacyPopup {
    constructor() {
      this.container = document.getElementById('privacy-popup-container');
      this.popup = null;
      this.isVisible = false;
      this.focusableElements = [];
      this.previousFocus = null;
      
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
      // Check if already dismissed
      if (this.settings.dismissible && this.isDismissed()) {
        return;
      }

      this.createPopup();
      this.bindEvents();
      this.show();
    }

    createPopup() {
      const popup = document.createElement('div');
      popup.className = `privacy-popup privacy-popup--${this.settings.position}`;
      popup.setAttribute('role', 'dialog');
      popup.setAttribute('aria-modal', 'true');
      popup.setAttribute('aria-labelledby', 'privacy-popup-title');
      popup.setAttribute('aria-describedby', 'privacy-popup-content');
      popup.setAttribute('aria-hidden', 'true');
      popup.setAttribute('tabindex', '-1');

      // Set CSS custom properties for styling
      popup.style.setProperty('--popup-bg-color', this.settings.bgColor);
      popup.style.setProperty('--popup-text-color', this.settings.textColor);
      popup.style.setProperty('--popup-link-color', this.settings.linkColor);
      popup.style.setProperty('--popup-max-width', `${this.settings.maxWidth}px`);
      popup.style.setProperty('--popup-padding', `${this.settings.padding}px`);
      popup.style.setProperty('--popup-z-index', this.settings.zIndex);

      const closeButton = this.settings.dismissible ? 
        `<button class="privacy-popup__close" aria-label="Close privacy notice" type="button">&times;</button>` : '';

      const linkText = this.settings.linkUrl ? 
        ` <a href="${this.escapeHtml(this.settings.linkUrl)}" class="privacy-popup__link" target="_blank" rel="noopener">Learn more</a>` : '';

      popup.innerHTML = `
        ${closeButton}
        <div class="privacy-popup__content" id="privacy-popup-content">
          <p id="privacy-popup-title" class="sr-only">Privacy Notice</p>
          ${this.escapeHtml(this.settings.message)}${linkText}
        </div>
        <div class="privacy-popup__actions">
          <button class="privacy-popup__button" type="button" data-action="accept">
            Accept
          </button>
          ${this.settings.dismissible ? 
            '<button class="privacy-popup__button privacy-popup__button--secondary" type="button" data-action="dismiss">Dismiss</button>' : ''}
        </div>
      `;

      this.container.appendChild(popup);
      this.popup = popup;
      
      // Update focusable elements
      this.updateFocusableElements();
    }

    bindEvents() {
      if (!this.popup) return;

      // Action buttons
      this.popup.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        if (action === 'accept' || action === 'dismiss') {
          this.dismiss();
        }
      });

      // Close button
      const closeBtn = this.popup.querySelector('.privacy-popup__close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.dismiss());
      }

      // Keyboard events
      this.popup.addEventListener('keydown', (e) => this.handleKeydown(e));

      // Prevent clicks from bubbling
      this.popup.addEventListener('click', (e) => e.stopPropagation());
    }

    handleKeydown(e) {
      switch (e.key) {
        case 'Escape':
          if (this.settings.dismissible) {
            e.preventDefault();
            this.dismiss();
          }
          break;
        case 'Tab':
          this.handleTabKey(e);
          break;
      }
    }

    handleTabKey(e) {
      if (this.focusableElements.length === 0) return;

      const firstElement = this.focusableElements[0];
      const lastElement = this.focusableElements[this.focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    updateFocusableElements() {
      if (!this.popup) return;
      
      this.focusableElements = Array.from(
        this.popup.querySelectorAll(FOCUS_TRAP_SELECTOR)
      ).filter(el => !el.disabled && el.offsetParent !== null);
    }

    show() {
      if (!this.popup || this.isVisible) return;

      // Store previous focus
      this.previousFocus = document.activeElement;

      // Show popup
      this.container.style.display = 'block';
      this.popup.setAttribute('aria-hidden', 'false');
      this.isVisible = true;

      // Focus management
      requestAnimationFrame(() => {
        if (this.focusableElements.length > 0) {
          this.focusableElements[0].focus();
        } else {
          this.popup.focus();
        }
      });

      // Announce to screen readers
      this.announceToScreenReader('Privacy notice displayed');
    }

    hide() {
      if (!this.popup || !this.isVisible) return;

      this.popup.setAttribute('aria-hidden', 'true');
      this.isVisible = false;

      // Restore focus
      if (this.previousFocus && typeof this.previousFocus.focus === 'function') {
        this.previousFocus.focus();
      }

      // Hide container after transition
      setTimeout(() => {
        this.container.style.display = 'none';
      }, 300);
    }

    dismiss() {
      if (this.settings.dismissible) {
        localStorage.setItem(STORAGE_KEY, 'true');
      }
      this.hide();
      this.announceToScreenReader('Privacy notice dismissed');
    }

    isDismissed() {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }

    announceToScreenReader(message) {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      
      setTimeout(() => {
        document.body.removeChild(announcement);
      }, 1000);
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Public API
    destroy() {
      if (this.popup) {
        this.hide();
        this.popup.remove();
        this.popup = null;
      }
      this.isVisible = false;
    }

    reset() {
      localStorage.removeItem(STORAGE_KEY);
      if (!this.isVisible) {
        this.show();
      }
    }
  }

  // Screen reader only class
  const style = document.createElement('style');
  style.textContent = `
    .sr-only {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    }
  `;
  document.head.appendChild(style);

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.PrivacyPopup = new PrivacyPopup();
    });
  } else {
    window.PrivacyPopup = new PrivacyPopup();
  }

  // Expose reset function for admin integration
  window.resetPrivacyPopup = function() {
    if (window.PrivacyPopup) {
      window.PrivacyPopup.reset();
    }
  };

})();
