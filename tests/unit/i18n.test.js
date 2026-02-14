/**
 * Unit tests for i18n.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { i18n, t, i18nReady, showNavigationOverlay } from '../../public/admin/i18n.js';
import fs from 'fs';
import path from 'path';

// Mock translations
const enTranslations = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../fixtures/en.json'), 'utf-8')
);
const deTranslations = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../fixtures/de.json'), 'utf-8')
);

describe('i18n Module', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
    document.documentElement.lang = 'en';

    // Reset i18n state
    i18n.locale = 'en';
    i18n.translations = {};
    i18n.loaded = false;

    // Mock localStorage
    const localStorageMock = (() => {
      let store = {};
      return {
        getItem: vi.fn((key) => store[key] || null),
        setItem: vi.fn((key, value) => {
          store[key] = value.toString();
        }),
        removeItem: vi.fn((key) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          store = {};
        }),
      };
    })();
    global.localStorage = localStorageMock;

    // Mock fetch
    global.fetch = vi.fn((url) => {
      if (url.includes('/lang/en.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(enTranslations),
        });
      }
      if (url.includes('/lang/de.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(deTranslations),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
      });
    });

    // Mock window.location.reload
    delete window.location;
    window.location = { reload: vi.fn() };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('init()', () => {
    it('should load English translations by default', async () => {
      await i18n.init();

      expect(fetch).toHaveBeenCalledWith('/lang/en.json');
      expect(i18n.translations).toEqual(enTranslations);
      expect(i18n.loaded).toBe(true);
      expect(document.documentElement.lang).toBe('en');
    });

    it('should load locale from localStorage', async () => {
      localStorage.setItem('adminLanguage', 'de');

      await i18n.init();

      expect(fetch).toHaveBeenCalledWith('/lang/de.json');
      expect(i18n.translations).toEqual(deTranslations);
      expect(i18n.locale).toBe('de');
      expect(document.documentElement.lang).toBe('de');
    });

    it('should fallback to English if locale file not found', async () => {
      localStorage.setItem('adminLanguage', 'fr');

      await i18n.init();

      expect(fetch).toHaveBeenCalledWith('/lang/fr.json');
      expect(fetch).toHaveBeenCalledWith('/lang/en.json');
      expect(i18n.translations).toEqual(enTranslations);
    });

    it('should dispatch i18n:ready event', async () => {
      const listener = vi.fn();
      window.addEventListener('i18n:ready', listener);

      await i18n.init();

      expect(listener).toHaveBeenCalled();
    });

    it('should mark as loaded even on error', async () => {
      global.fetch = vi.fn(() => Promise.reject(new Error('Network error')));
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      await i18n.init();

      expect(i18n.loaded).toBe(true);
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('t()', () => {
    beforeEach(async () => {
      await i18n.init();
    });

    it('should translate simple keys', () => {
      expect(i18n.t('nav.overview')).toBe('Overview');
      expect(i18n.t('nav.new')).toBe('New');
      expect(i18n.t('actions.delete')).toBe('Delete');
    });

    it('should return key if translation not found', () => {
      expect(i18n.t('non.existent.key')).toBe('non.existent.key');
    });

    it('should interpolate parameters', () => {
      expect(i18n.t('messages.deleted', { slug: 'my-post' })).toBe(
        'Post my-post deleted'
      );
    });

    it('should keep placeholder if parameter not provided', () => {
      expect(i18n.t('messages.deleted')).toBe('Post {{slug}} deleted');
    });

    it('should handle multiple parameters', () => {
      i18n.translations.test = { multi: 'Hello {{name}}, you have {{count}} messages' };
      expect(i18n.t('test.multi', { name: 'John', count: 5 })).toBe(
        'Hello John, you have 5 messages'
      );
    });

    it('should return key if value is not a string', () => {
      expect(i18n.t('nav')).toBe('nav'); // nav is an object
    });
  });

  describe('translatePage()', () => {
    beforeEach(async () => {
      await i18n.init();
    });

    it('should translate elements with data-i18n', () => {
      document.body.innerHTML = `
        <span data-i18n="nav.overview">Fallback</span>
        <div data-i18n="actions.delete">Fallback</div>
      `;

      i18n.translatePage();

      expect(document.querySelector('[data-i18n="nav.overview"]').textContent).toBe('Overview');
      expect(document.querySelector('[data-i18n="actions.delete"]').textContent).toBe('Delete');
    });

    it('should translate placeholders with data-i18n-placeholder', () => {
      document.body.innerHTML = `
        <input data-i18n-placeholder="search.placeholder" />
      `;

      i18n.translatePage();

      expect(document.querySelector('input').placeholder).toBe('Search posts...');
    });

    it('should translate title attributes with data-i18n-title', () => {
      document.body.innerHTML = `
        <button data-i18n-title="actions.delete">X</button>
      `;

      i18n.translatePage();

      expect(document.querySelector('button').title).toBe('Delete');
    });

    it('should translate aria-label with data-i18n-aria', () => {
      document.body.innerHTML = `
        <button data-i18n-aria="actions.edit">Edit</button>
      `;

      i18n.translatePage();

      expect(document.querySelector('button').getAttribute('aria-label')).toBe('Edit');
    });

    it('should not change content if translation not found', () => {
      document.body.innerHTML = `
        <span data-i18n="non.existent">Original</span>
      `;

      i18n.translatePage();

      expect(document.querySelector('span').textContent).toBe('Original');
    });
  });

  describe('getLocale()', () => {
    it('should return current locale', async () => {
      await i18n.init();
      expect(i18n.getLocale()).toBe('en');
    });

    it('should return correct locale after init with different locale', async () => {
      localStorage.setItem('adminLanguage', 'de');
      await i18n.init();
      expect(i18n.getLocale()).toBe('de');
    });
  });

  describe('getFullLocale()', () => {
    it('should return en-US for English', async () => {
      await i18n.init();
      expect(i18n.getFullLocale()).toBe('en-US');
    });

    it('should return de-DE for German', async () => {
      localStorage.setItem('adminLanguage', 'de');
      await i18n.init();
      expect(i18n.getFullLocale()).toBe('de-DE');
    });
  });

  describe('setLocale()', () => {
    beforeEach(async () => {
      await i18n.init();
    });

    it('should set locale in localStorage and reload', () => {
      i18n.setLocale('de');

      expect(localStorage.setItem).toHaveBeenCalledWith('adminLanguage', 'de');
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should not reload if locale is the same', () => {
      i18n.setLocale('en');

      expect(localStorage.setItem).not.toHaveBeenCalled();
      expect(window.location.reload).not.toHaveBeenCalled();
    });
  });

  describe('exported i18nReady()', () => {
    it('should resolve immediately if already loaded', async () => {
      i18n.loaded = true;

      const start = Date.now();
      await i18nReady();
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10); // Should be instant
    });

    it('should wait for i18n:ready event if not loaded', async () => {
      i18n.loaded = false;

      const promise = i18nReady();

      // Simulate init completing
      setTimeout(() => {
        i18n.loaded = true;
        window.dispatchEvent(new Event('i18n:ready'));
      }, 50);

      await promise;
      expect(i18n.loaded).toBe(true);
    });
  });

  describe('exported t()', () => {
    beforeEach(async () => {
      await i18n.init();
    });

    it('should translate using exported t()', () => {
      expect(t('nav.overview')).toBe('Overview');
      expect(t('messages.deleted', { slug: 'test' })).toBe('Post test deleted');
    });
  });

  describe('showNavigationOverlay()', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should create loading overlay', () => {
      showNavigationOverlay();

      const overlay = document.querySelector('.loading-overlay');
      expect(overlay).toBeTruthy();
      expect(overlay.querySelector('.loading-spinner')).toBeTruthy();
    });

    it('should not create duplicate overlays', () => {
      showNavigationOverlay();
      showNavigationOverlay();
      showNavigationOverlay();

      const overlays = document.querySelectorAll('.loading-overlay');
      expect(overlays.length).toBe(1);
    });
  });
});
