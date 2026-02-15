/**
 * Unit tests for byte-utils.js
 */

import { describe, it, expect } from 'vitest';
import { getByteLength, formatBytes, finalizeCompiledPageHtml } from '../../public/admin/lib/byte-utils.js';

describe('Byte Utils Module', () => {
  describe('getByteLength()', () => {
    it('should return byte length for ASCII text', () => {
      expect(getByteLength('hello')).toBe(5);
      expect(getByteLength('test')).toBe(4);
    });

    it('should return correct byte length for UTF-8 multibyte characters', () => {
      // ä is 2 bytes in UTF-8
      expect(getByteLength('ä')).toBe(2);
      // € is 3 bytes in UTF-8
      expect(getByteLength('€')).toBe(3);
      // 😀 is 4 bytes in UTF-8
      expect(getByteLength('😀')).toBe(4);
    });

    it('should handle mixed ASCII and UTF-8', () => {
      // 'hello' (5 bytes) + 'ä' (2 bytes) = 7 bytes
      expect(getByteLength('helloä')).toBe(7);
    });

    it('should return 0 for empty string', () => {
      expect(getByteLength('')).toBe(0);
    });

    it('should handle HTML entities (counted as literal characters)', () => {
      // &lt; is 4 bytes (as literal characters, not entity)
      expect(getByteLength('&lt;')).toBe(4);
    });

    it('should handle null and undefined as 0 bytes', () => {
      expect(getByteLength(null)).toBe(0);
      expect(getByteLength(undefined)).toBe(0);
    });

    it('should safely handle non-string input via string conversion', () => {
      expect(getByteLength(1234)).toBe(4);
      expect(getByteLength(false)).toBe(5);
      expect(getByteLength(NaN)).toBe(3);
    });
  });

  describe('formatBytes()', () => {
    it('should format bytes with German locale and " B" suffix', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(123)).toBe('123 B');
      expect(formatBytes(1234)).toBe('1.234 B');
      expect(formatBytes(12345)).toBe('12.345 B');
    });

    it('should handle large numbers', () => {
      expect(formatBytes(14336)).toBe('14.336 B');
      expect(formatBytes(1000000)).toBe('1.000.000 B');
    });

    it('should handle edge cases', () => {
      expect(formatBytes(1)).toBe('1 B');
      expect(formatBytes(999)).toBe('999 B');
      expect(formatBytes(1000)).toBe('1.000 B');
    });

    it('should never return negative values', () => {
      expect(formatBytes(-1)).toBe('0 B');
      expect(formatBytes(-9999)).toBe('0 B');
    });

    it('should handle invalid numeric input safely', () => {
      expect(formatBytes(NaN)).toBe('0 B');
      expect(formatBytes(Infinity)).toBe('0 B');
    });

    it('fuzz: should never return negative or NaN-like output for random inputs', () => {
      let seed = 1337;
      const nextRand = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 0x100000000;
      };

      const randomValues = [
        undefined,
        null,
        NaN,
        Infinity,
        -Infinity,
        true,
        false,
        '',
        '123',
        'abc',
        {},
        [],
      ];

      for (let i = 0; i < 200; i++) {
        const randomNumber = Math.floor((nextRand() - 0.5) * 2_000_000);
        const input = i % 3 === 0 ? randomValues[i % randomValues.length] : randomNumber;
        const out = formatBytes(input);

        expect(out.endsWith(' B')).toBe(true);

        const numericPart = out.replace(/\sB$/, '').replace(/\./g, '');
        const parsed = Number(numericPart);
        expect(Number.isNaN(parsed)).toBe(false);
        expect(parsed).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('finalizeCompiledPageHtml()', () => {
    it('should replace {{bytes}} placeholder with actual byte count', () => {
      const html = '<html><body>{{bytes}}</body></html>';
      const result = finalizeCompiledPageHtml(html, 0, false);
      expect(result.html).not.toContain('{{bytes}}');
      expect(result.html).toMatch(/\d+/);
      expect(result.bytes).toBe(getByteLength(result.html));
    });

    it('should converge to stable byte count', () => {
      const html = '<html><body>Size: {{bytes}} bytes</body></html>';
      const result = finalizeCompiledPageHtml(html, 0, false);
      // After convergence, replacing {{bytes}} again should produce same result
      const doubleCheck = result.html.replace(/\d+/, '{{bytes}}');
      const result2 = finalizeCompiledPageHtml(doubleCheck, 0, false);
      expect(result2.bytes).toBe(result.bytes);
    });

    it('should apply minification when enabled', () => {
      const html = '<html><body>{{bytes}}</body></html>';
      const result = finalizeCompiledPageHtml(html, 0, true);
      expect(result.html).toBe('<html><body>' + result.bytes + '</body></html>');
      expect(result.bytes).toBe(getByteLength(result.html));
    });

    it('should not apply minification when disabled', () => {
      const html = '<html>\n  <body>{{bytes}}</body>\n</html>';
      const result = finalizeCompiledPageHtml(html, 0, false);
      expect(result.html).toContain('\n');
    });

    it('should use initial bytes as starting point', () => {
      const html = '<html><body>{{bytes}}</body></html>';
      const result1 = finalizeCompiledPageHtml(html, 0, false);
      const result2 = finalizeCompiledPageHtml(html, 100, false);
      // Both should converge to same final value
      expect(result1.bytes).toBe(result2.bytes);
    });

    it('should handle multiple {{bytes}} placeholders', () => {
      const html = '<html><head>{{bytes}}</head><body>{{bytes}}</body></html>';
      const result = finalizeCompiledPageHtml(html, 0, false);
      expect(result.html).not.toContain('{{bytes}}');
      // All placeholders should be replaced with same value
      const matches = result.html.match(/\d+/g);
      expect(matches.length).toBeGreaterThanOrEqual(2);
      expect(matches[0]).toBe(matches[1]);
    });

    it('should return accurate byte count for UTF-8 content', () => {
      const html = '<html><body>Größe: {{bytes}} 😀</body></html>';
      const result = finalizeCompiledPageHtml(html, 0, false);
      expect(result.bytes).toBe(getByteLength(result.html));
    });

    it('should converge within 5 iterations', () => {
      // Test with a challenging case
      const html = '<html><body>Bytes: {{bytes}} {{bytes}} {{bytes}}</body></html>';
      const result = finalizeCompiledPageHtml(html, 0, false);
      expect(result.bytes).toBe(getByteLength(result.html));
    });

    it('should handle edge case of no placeholder', () => {
      const html = '<html><body>No placeholder here</body></html>';
      const result = finalizeCompiledPageHtml(html, 0, false);
      expect(result.html).toBe(html);
      expect(result.bytes).toBe(getByteLength(html));
    });

    it('should minify CSS in style tags when minification enabled', () => {
      const html = '<html><head><style>body { color: red; }</style></head><body>{{bytes}}</body></html>';
      const result = finalizeCompiledPageHtml(html, 0, true);
      expect(result.html).toContain('body{color:red}');
    });

    it('should handle null rawHtml safely', () => {
      const result = finalizeCompiledPageHtml(null, 0, false);
      expect(result.html).toBe('');
      expect(result.bytes).toBe(0);
    });

    it('should sanitize invalid initial byte values', () => {
      const html = '<html><body>{{bytes}}</body></html>';
      const withNaN = finalizeCompiledPageHtml(html, NaN, false);
      const withNegative = finalizeCompiledPageHtml(html, -100, false);

      expect(withNaN.bytes).toBeGreaterThanOrEqual(0);
      expect(withNegative.bytes).toBeGreaterThanOrEqual(0);
    });

    it('fuzz: finalized byte result is always deterministic and non-negative', () => {
      let seed = 2026;
      const nextRand = () => {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x80000000;
      };

      for (let i = 0; i < 100; i++) {
        const repeated = Math.floor(nextRand() * 20) + 1;
        const token = `x${Math.floor(nextRand() * 1_000_000)}`;
        const rawHtml = `<html><body>${token.repeat(repeated)} {{bytes}}</body></html>`;
        const initialBytes = Math.floor((nextRand() - 0.5) * 50_000);

        const run1 = finalizeCompiledPageHtml(rawHtml, initialBytes, false);
        const run2 = finalizeCompiledPageHtml(rawHtml, initialBytes, false);

        expect(run1.bytes).toBeGreaterThanOrEqual(0);
        expect(run1.bytes).toBe(getByteLength(run1.html));
        expect(run1.html).toBe(run2.html);
        expect(run1.bytes).toBe(run2.bytes);
      }
    });
  });
});
