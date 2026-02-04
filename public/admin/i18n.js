/**
 * i18n Module for fourteenkilobytes Admin Panel
 *
 * Usage:
 * - HTML: <span data-i18n="nav.overview">Overview</span>
 * - HTML placeholder: <input data-i18n-placeholder="search.placeholder">
 * - HTML title: <button data-i18n-title="actions.delete">
 * - JavaScript: t('messages.saved') or t('messages.deleted', { slug: 'my-post' })
 */

const i18n = {
  locale: 'en',
  translations: {},
  loaded: false,

  async init() {
    this.locale = localStorage.getItem('adminLanguage') || 'en';
    try {
      const res = await fetch(`/admin/lang/${this.locale}.json`);
      if (!res.ok) {
        // Fallback to English if locale file not found
        const fallback = await fetch('/admin/lang/en.json');
        this.translations = await fallback.json();
      } else {
        this.translations = await res.json();
      }
      this.loaded = true;
      this.translatePage();
      // Dispatch event for listeners waiting on i18n
      window.dispatchEvent(new Event('i18n:ready'));
      // Update html lang attribute
      document.documentElement.lang = this.locale === 'de' ? 'de' : 'en';
    } catch (err) {
      console.error('i18n: Failed to load translations', err);
      this.loaded = true; // Mark as loaded even on error to prevent blocking
      window.dispatchEvent(new Event('i18n:ready'));
    }
  },

  /**
   * Get translation for a key
   * @param {string} key - Dot-notation key like 'nav.overview'
   * @param {Object} params - Optional parameters for interpolation {{name}}
   * @returns {string} Translated string or key if not found
   */
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;

    for (const k of keys) {
      if (value === undefined || value === null) return key;
      value = value[k];
    }

    if (typeof value !== 'string') return key;

    // Replace {{param}} placeholders
    return value.replace(/\{\{(\w+)\}\}/g, (_, p) => {
      return params[p] !== undefined ? params[p] : `{{${p}}}`;
    });
  },

  /**
   * Translate all elements with data-i18n attributes on the page
   */
  translatePage() {
    // Translate text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const translated = this.t(key);
      if (translated !== key) {
        el.textContent = translated;
      }
    });

    // Translate placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      const translated = this.t(key);
      if (translated !== key) {
        el.placeholder = translated;
      }
    });

    // Translate title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.dataset.i18nTitle;
      const translated = this.t(key);
      if (translated !== key) {
        el.title = translated;
      }
    });

    // Translate aria-label attributes
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.dataset.i18nAria;
      const translated = this.t(key);
      if (translated !== key) {
        el.setAttribute('aria-label', translated);
      }
    });
  },

  /**
   * Get the current locale
   * @returns {string} Current locale code (e.g., 'en', 'de')
   */
  getLocale() {
    return this.locale;
  },

  /**
   * Get locale for date/number formatting (e.g., 'en-US', 'de-DE')
   * @returns {string} Full locale code
   */
  getFullLocale() {
    return this.locale === 'de' ? 'de-DE' : 'en-US';
  },

  /**
   * Set locale and reload page
   * @param {string} locale - New locale code
   */
  setLocale(locale) {
    if (locale !== this.locale) {
      localStorage.setItem('adminLanguage', locale);
      window.location.reload();
    }
  }
};

// Global translation function
window.t = (key, params) => i18n.t(key, params);

// Helper to wait for i18n to be ready (returns immediately if already loaded)
window.i18nReady = () => new Promise(resolve => {
  if (i18n.loaded) return resolve();
  window.addEventListener('i18n:ready', resolve, { once: true });
});

// Show loading overlay during navigation (smooth page transitions)
window.showNavigationOverlay = () => {
  // Avoid duplicate overlays
  if (document.querySelector('.loading-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div></div>';
  document.body.appendChild(overlay);
};

// Auto-attach navigation overlay to internal links (runs after DOM ready)
function setupNavigationOverlay() {
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    // Skip external links, hash links, and special links
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    if (link.target === '_blank') return;
    if (link.id === 'logout-btn') return;

    // Show overlay for internal navigation
    showNavigationOverlay();
  });
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    i18n.init();
    setupNavigationOverlay();
  });
} else {
  i18n.init();
  setupNavigationOverlay();
}

// Export for module usage
window.i18n = i18n;
