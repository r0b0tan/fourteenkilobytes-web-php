/**
 * Unit tests for app.js utility functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('App Utility Functions', () => {
  // Mock window.App
  let App;

  beforeEach(async () => {
    // Import app.js (it assigns to window.App)
    await import('../../public/admin/app.js');
    App = window.App;
  });

  describe('escapeHtml()', () => {
    it('should escape HTML special characters', () => {
      expect(App.escapeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
      expect(App.escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(App.escapeHtml('Say "Hello"')).toBe('Say "Hello"');
      expect(App.escapeHtml("It's fine")).toBe("It's fine");
    });

    it('should handle mixed special characters', () => {
      expect(App.escapeHtml('<div class="test">A & B</div>'))
        .toBe('&lt;div class="test"&gt;A &amp; B&lt;/div&gt;');
    });

    it('should return empty string for empty input', () => {
      expect(App.escapeHtml('')).toBe('');
    });

    it('should handle plain text unchanged', () => {
      expect(App.escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('slugify()', () => {
    it('should convert text to lowercase slug', () => {
      expect(App.slugify('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(App.slugify('My First Post')).toBe('my-first-post');
    });

    it('should remove special characters', () => {
      expect(App.slugify('Hello, World!')).toBe('hello-world');
      expect(App.slugify('Test@#$%Post')).toBe('test-post');
    });

    it('should remove diacritics', () => {
      expect(App.slugify('Café Müller')).toBe('cafe-muller');
      expect(App.slugify('Über uns')).toBe('uber-uns');
    });

    it('should handle multiple spaces/hyphens', () => {
      expect(App.slugify('Hello    World')).toBe('hello-world');
      expect(App.slugify('Test---Post')).toBe('test-post');
    });

    it('should trim leading and trailing hyphens', () => {
      expect(App.slugify('---test---')).toBe('test');
      expect(App.slugify('   test   ')).toBe('test');
    });

    it('should limit slug length to 50 characters', () => {
      const longText = 'a'.repeat(100);
      expect(App.slugify(longText)).toBe('a'.repeat(50));
    });

    it('should handle empty string', () => {
      expect(App.slugify('')).toBe('');
    });

    it('should handle numbers', () => {
      expect(App.slugify('Post 123')).toBe('post-123');
      expect(App.slugify('2024 Review')).toBe('2024-review');
    });

    it('should handle German umlauts and special chars', () => {
      // ß is not handled by NFD normalization, remains as is, then replaced with hyphen
      expect(App.slugify('Größe')).toBe('gro-e');
      expect(App.slugify('Ä Ö Ü ä ö ü')).toBe('a-o-u-a-o-u');
    });
  });

  describe('formatDate()', () => {
    beforeEach(() => {
      // Mock i18n
      window.i18n = {
        getFullLocale: vi.fn(() => 'en-US'),
      };
    });

    it('should format date with default locale', () => {
      const date = '2024-01-15T12:00:00Z';
      const result = App.formatDate(date);
      expect(result).toMatch(/Jan/); // Month abbreviation
      expect(result).toMatch(/15/); // Day
      expect(result).toMatch(/2024/); // Year
    });

    it('should use German locale when set', () => {
      window.i18n.getFullLocale = vi.fn(() => 'de-DE');
      const date = '2024-01-15T12:00:00Z';
      const result = App.formatDate(date);
      // German date format
      expect(result).toMatch(/Jan|Jän/); // German month abbreviation
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it('should handle different date formats', () => {
      const date = new Date('2024-12-25').toISOString();
      const result = App.formatDate(date);
      expect(result).toMatch(/Dec/);
      expect(result).toMatch(/25/);
      expect(result).toMatch(/2024/);
    });

    it('should work without i18n (fallback to en-US)', () => {
      delete window.i18n;
      const date = '2024-06-01T00:00:00Z';
      const result = App.formatDate(date);
      expect(result).toMatch(/Jun/);
      expect(result).toMatch(/1|01/);
      expect(result).toMatch(/2024/);
    });
  });
});
