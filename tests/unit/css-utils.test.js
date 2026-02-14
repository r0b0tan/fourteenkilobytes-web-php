/**
 * Unit tests for css-utils.js
 */

import { describe, it, expect } from 'vitest';
import { stripCssComments, minifyCss, minifyHtmlDocument } from '../../public/admin/lib/css-utils.js';

describe('CSS Utils Module', () => {
  describe('stripCssComments()', () => {
    it('should remove single-line comments', () => {
      const css = '/* comment */ body { color: red; }';
      expect(stripCssComments(css)).toBe(' body { color: red; }');
    });

    it('should remove multi-line comments', () => {
      const css = `
        /*
         * Multi-line comment
         * with multiple lines
         */
        body { color: blue; }
      `;
      expect(stripCssComments(css)).toContain('body { color: blue; }');
      expect(stripCssComments(css)).not.toContain('Multi-line comment');
    });

    it('should remove all comments from CSS', () => {
      const css = '/* header */ h1 { font-size: 2em; } /* footer */ p { margin: 0; }';
      const result = stripCssComments(css);
      expect(result).not.toContain('/*');
      expect(result).not.toContain('*/');
      expect(result).toContain('h1 { font-size: 2em; }');
      expect(result).toContain('p { margin: 0; }');
    });

    it('should handle CSS without comments', () => {
      const css = 'body { color: red; }';
      expect(stripCssComments(css)).toBe(css);
    });

    it('should handle empty string', () => {
      expect(stripCssComments('')).toBe('');
    });
  });

  describe('minifyCss()', () => {
    it('should remove comments', () => {
      const css = '/* comment */ body { color: red; }';
      const result = minifyCss(css);
      expect(result).not.toContain('/*');
      expect(result).not.toContain('comment');
    });

    it('should remove whitespace', () => {
      const css = 'body {\n  color: red;\n  margin: 0;\n}';
      const result = minifyCss(css);
      expect(result).toBe('body{color:red;margin:0}');
    });

    it('should remove unnecessary zeros from units', () => {
      const css = 'div { margin: 0px; padding: 0rem; width: 0%; }';
      const result = minifyCss(css);
      expect(result).toBe('div{margin:0;padding:0;width:0}');
    });

    it('should shorten hex colors', () => {
      const css = 'div { color: #ff00ff; background: #aabbcc; }';
      const result = minifyCss(css);
      expect(result).toBe('div{color:#f0f;background:#abc}');
    });

    it('should replace transparent with shorthand', () => {
      const css = 'div { background: rgba(255,255,255,0); }';
      const result = minifyCss(css);
      expect(result).toBe('div{background:transparent}');
    });

    it('should remove trailing semicolons before }', () => {
      const css = 'div { color: red; }';
      const result = minifyCss(css);
      expect(result).toBe('div{color:red}');
    });

    it('should preserve calc() expressions', () => {
      const css = 'div { width: calc(100% - 20px); }';
      const result = minifyCss(css);
      expect(result).toContain('calc(100% - 20px)');
    });

    it('should preserve calc() with addition', () => {
      const css = 'div { width: calc(50% + 10px); }';
      const result = minifyCss(css);
      expect(result).toContain('calc(50% + 10px)');
    });

    it('should preserve calc() with multiple operations', () => {
      const css = 'div { width: calc(100% - 20px + 5px); }';
      const result = minifyCss(css);
      expect(result).toContain('calc(100% - 20px + 5px)');
    });

    it('should preserve CSS variables with -- prefix', () => {
      const css = 'div { color: var(--primary-color); }';
      const result = minifyCss(css);
      expect(result).toContain('--primary-color');
    });

    it('should handle complex CSS', () => {
      const css = `
        /* Base styles */
        body {
          margin: 0px;
          padding: 0rem;
          color: #ff00ff;
        }
        .container {
          width: calc(100% - 40px);
          background: rgba(255,255,255,0);
        }
      `;
      const result = minifyCss(css);
      expect(result).toContain('body{margin:0;padding:0;color:#f0f}');
      expect(result).toContain('.container{width:calc(100% - 40px);background:transparent}');
    });
  });

  describe('minifyHtmlDocument()', () => {
    it('should minify CSS in <style> tags', () => {
      const html = '<style>body { color: red; }</style>';
      const result = minifyHtmlDocument(html);
      expect(result).toBe('<style>body{color:red}</style>');
    });

    it('should minify inline styles', () => {
      const html = '<div style="color: red; margin: 0px;">Text</div>';
      const result = minifyHtmlDocument(html);
      expect(result).toBe('<div style="color:red;margin:0;">Text</div>');
    });

    it('should remove empty inline styles', () => {
      const html = '<div style="">Text</div>';
      const result = minifyHtmlDocument(html);
      expect(result).toBe('<div>Text</div>');
    });

    it('should remove quotes from simple attributes', () => {
      const html = '<div class="container" id="main" rel="nofollow" target="_blank" lang="en">Text</div>';
      const result = minifyHtmlDocument(html);
      expect(result).toBe('<div class=container id=main rel=nofollow target=_blank lang=en>Text</div>');
    });

    it('should remove HTML comments', () => {
      const html = '<!-- Comment --><div>Text</div>';
      const result = minifyHtmlDocument(html);
      expect(result).toBe('<div>Text</div>');
    });

    it('should preserve IE conditional comments', () => {
      const html = '<!--[if IE]><div>IE Only</div><![endif]--><div>Text</div>';
      const result = minifyHtmlDocument(html);
      expect(result).toContain('<!--[if IE]>');
    });

    it('should remove whitespace between tags', () => {
      const html = '<div>\n  <p>Text</p>\n</div>';
      const result = minifyHtmlDocument(html);
      expect(result).toBe('<div><p>Text</p></div>');
    });

    it('should handle complex HTML document', () => {
      const html = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <style>
              body {
                margin: 0px;
                padding: 0rem;
              }
            </style>
          </head>
          <body>
            <!-- Main content -->
            <div class="container" style="color: red; margin: 0px;">
              <p>Hello World</p>
            </div>
          </body>
        </html>
      `;
      const result = minifyHtmlDocument(html);
      expect(result).not.toContain('<!--');
      expect(result).not.toContain('\n');
      expect(result).toContain('body{margin:0;padding:0}');
      expect(result).toContain('style="color:red;margin:0;"');
    });
  });
});
