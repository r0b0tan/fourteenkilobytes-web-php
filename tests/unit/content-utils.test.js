/**
 * Unit tests for content-utils.js
 */

import { describe, it, expect } from 'vitest';
import { contentHasSections } from '../../public/admin/lib/content-utils.js';

describe('Content Utils Module', () => {
  describe('contentHasSections()', () => {
    it('should return false for empty array', () => {
      expect(contentHasSections([])).toBe(false);
    });

    it('should return false for null', () => {
      expect(contentHasSections(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(contentHasSections(undefined)).toBe(false);
    });

    it('should return false for non-array', () => {
      expect(contentHasSections('not an array')).toBe(false);
      expect(contentHasSections({})).toBe(false);
      expect(contentHasSections(123)).toBe(false);
    });

    it('should return false when content has no sections', () => {
      const content = [
        { type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] },
        { type: 'heading', level: 1, children: [{ type: 'text', text: 'Title' }] },
      ];
      expect(contentHasSections(content)).toBe(false);
    });

    it('should return true when content has a section block', () => {
      const content = [
        { type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] },
        { type: 'section', children: [] },
      ];
      expect(contentHasSections(content)).toBe(true);
    });

    it('should return true when section is nested in children', () => {
      const content = [
        {
          type: 'container',
          children: [
            { type: 'section', children: [] },
          ],
        },
      ];
      expect(contentHasSections(content)).toBe(true);
    });

    it('should return true when section is deeply nested', () => {
      const content = [
        {
          type: 'container',
          children: [
            {
              type: 'wrapper',
              children: [
                { type: 'section', children: [] },
              ],
            },
          ],
        },
      ];
      expect(contentHasSections(content)).toBe(true);
    });

    it('should return true when section is in layout cells', () => {
      const content = [
        {
          type: 'layout',
          cells: [
            { children: [{ type: 'section', children: [] }] },
          ],
        },
      ];
      expect(contentHasSections(content)).toBe(true);
    });

    it('should return true when section is in multiple cells', () => {
      const content = [
        {
          type: 'layout',
          cells: [
            { children: [{ type: 'paragraph', children: [] }] },
            { children: [{ type: 'section', children: [] }] },
          ],
        },
      ];
      expect(contentHasSections(content)).toBe(true);
    });

    it('should handle mixed content with sections', () => {
      const content = [
        { type: 'paragraph', children: [{ type: 'text', text: 'Intro' }] },
        { type: 'section', children: [{ type: 'paragraph', children: [] }] },
        { type: 'heading', level: 2, children: [{ type: 'text', text: 'Title' }] },
      ];
      expect(contentHasSections(content)).toBe(true);
    });

    it('should handle complex nested structure', () => {
      const content = [
        {
          type: 'layout',
          cells: [
            {
              children: [
                {
                  type: 'container',
                  children: [
                    { type: 'section', children: [] },
                  ],
                },
              ],
            },
          ],
        },
      ];
      expect(contentHasSections(content)).toBe(true);
    });

    it('should return false when cells exist but have no sections', () => {
      const content = [
        {
          type: 'layout',
          cells: [
            { children: [{ type: 'paragraph', children: [] }] },
            { children: [{ type: 'heading', level: 1, children: [] }] },
          ],
        },
      ];
      expect(contentHasSections(content)).toBe(false);
    });

    it('should handle blocks with null children', () => {
      const content = [
        { type: 'container', children: null },
      ];
      expect(contentHasSections(content)).toBe(false);
    });

    it('should handle blocks with undefined children', () => {
      const content = [
        { type: 'container' },
      ];
      expect(contentHasSections(content)).toBe(false);
    });

    it('should handle null blocks in array', () => {
      const content = [
        null,
        { type: 'paragraph', children: [] },
      ];
      expect(contentHasSections(content)).toBe(false);
    });

    it('should handle invalid block types', () => {
      const content = [
        'string block',
        123,
        null,
        { type: 'paragraph', children: [] },
      ];
      expect(contentHasSections(content)).toBe(false);
    });
  });
});
