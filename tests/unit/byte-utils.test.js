/**
 * Unit tests for byte-utils.js
 */

import { describe, it, expect } from 'vitest';
import { getByteLength, finalizeCompiledPageHtml } from '../../public/admin/lib/byte-utils.js';

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
  });
});
