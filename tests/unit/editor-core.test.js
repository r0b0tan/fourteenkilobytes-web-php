/**
 * Unit tests for editor-core.js
 * Critical data serialization/deserialization functions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  inlineNodesToHtml,
  parseInlineNodes,
  selectorFromSourceBlock,
  serializeBlock,
  buildInputFromData,
} from '../../public/admin/lib/editor-core.js';

describe('Editor Core Module', () => {
  describe('inlineNodesToHtml()', () => {
    it('should return empty string for null/undefined', () => {
      expect(inlineNodesToHtml(null)).toBe('');
      expect(inlineNodesToHtml(undefined)).toBe('');
    });

    it('should return empty string for non-array', () => {
      expect(inlineNodesToHtml('not an array')).toBe('');
      expect(inlineNodesToHtml({})).toBe('');
    });

    it('should convert text nodes', () => {
      const nodes = [{ type: 'text', text: 'Hello' }];
      expect(inlineNodesToHtml(nodes)).toBe('Hello');
    });

    it('should escape HTML entities in text', () => {
      const nodes = [{ type: 'text', text: '<script>&alert("XSS")</script>' }];
      expect(inlineNodesToHtml(nodes)).toBe('&lt;script&gt;&amp;alert("XSS")&lt;/script&gt;');
    });

    it('should convert linebreak nodes', () => {
      const nodes = [
        { type: 'text', text: 'Line 1' },
        { type: 'linebreak' },
        { type: 'text', text: 'Line 2' },
      ];
      expect(inlineNodesToHtml(nodes)).toBe('Line 1<br>Line 2');
    });

    it('should convert bold nodes', () => {
      const nodes = [{
        type: 'bold',
        children: [{ type: 'text', text: 'Bold text' }]
      }];
      expect(inlineNodesToHtml(nodes)).toBe('<b>Bold text</b>');
    });

    it('should convert italic nodes', () => {
      const nodes = [{
        type: 'italic',
        children: [{ type: 'text', text: 'Italic text' }]
      }];
      expect(inlineNodesToHtml(nodes)).toBe('<i>Italic text</i>');
    });

    it('should convert underline nodes', () => {
      const nodes = [{
        type: 'underline',
        children: [{ type: 'text', text: 'Underlined' }]
      }];
      expect(inlineNodesToHtml(nodes)).toBe('<u>Underlined</u>');
    });

    it('should convert strikethrough nodes', () => {
      const nodes = [{
        type: 'strikethrough',
        children: [{ type: 'text', text: 'Struck' }]
      }];
      expect(inlineNodesToHtml(nodes)).toBe('<s>Struck</s>');
    });

    it('should convert code nodes', () => {
      const nodes = [{
        type: 'code',
        children: [{ type: 'text', text: 'const x = 1;' }]
      }];
      expect(inlineNodesToHtml(nodes)).toBe('<code>const x = 1;</code>');
    });

    it('should convert link nodes', () => {
      const nodes = [{
        type: 'link',
        href: 'https://example.com',
        children: [{ type: 'text', text: 'Click here' }]
      }];
      expect(inlineNodesToHtml(nodes)).toBe('<a href="https://example.com">Click here</a>');
    });

    it('should handle nested formatting', () => {
      const nodes = [{
        type: 'bold',
        children: [{
          type: 'italic',
          children: [{ type: 'text', text: 'Bold and italic' }]
        }]
      }];
      expect(inlineNodesToHtml(nodes)).toBe('<b><i>Bold and italic</i></b>');
    });

    it('should handle complex mixed formatting', () => {
      const nodes = [
        { type: 'text', text: 'Normal ' },
        {
          type: 'bold',
          children: [{ type: 'text', text: 'bold' }]
        },
        { type: 'text', text: ' and ' },
        {
          type: 'link',
          href: '/page',
          children: [
            {
              type: 'italic',
              children: [{ type: 'text', text: 'italic link' }]
            }
          ]
        },
      ];
      expect(inlineNodesToHtml(nodes)).toBe('Normal <b>bold</b> and <a href="/page"><i>italic link</i></a>');
    });

    it('should handle unknown node types gracefully', () => {
      const nodes = [{
        type: 'unknown',
        children: [{ type: 'text', text: 'fallback' }]
      }];
      expect(inlineNodesToHtml(nodes)).toBe('fallback');
    });
  });

  describe('parseInlineNodes()', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('should parse plain text', () => {
      container.textContent = 'Hello World';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([{ type: 'text', text: 'Hello World' }]);
    });

    it('should return empty text node for empty element', () => {
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([{ type: 'text', text: '' }]);
    });

    it('should parse <br> as linebreak', () => {
      container.innerHTML = 'Line 1<br>Line 2';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'text', text: 'Line 1' },
        { type: 'linebreak' },
        { type: 'text', text: 'Line 2' },
      ]);
    });

    it('should parse <b> and <strong> as bold', () => {
      container.innerHTML = '<b>Bold</b> and <strong>Strong</strong>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'bold', children: [{ type: 'text', text: 'Bold' }] },
        { type: 'text', text: ' and ' },
        { type: 'bold', children: [{ type: 'text', text: 'Strong' }] },
      ]);
    });

    it('should parse <i> and <em> as italic', () => {
      container.innerHTML = '<i>Italic</i> and <em>Emphasis</em>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'italic', children: [{ type: 'text', text: 'Italic' }] },
        { type: 'text', text: ' and ' },
        { type: 'italic', children: [{ type: 'text', text: 'Emphasis' }] },
      ]);
    });

    it('should parse <u> as underline', () => {
      container.innerHTML = '<u>Underlined</u>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'underline', children: [{ type: 'text', text: 'Underlined' }] },
      ]);
    });

    it('should parse <s> and <strike> as strikethrough', () => {
      container.innerHTML = '<s>Struck 1</s> and <strike>Struck 2</strike>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'strikethrough', children: [{ type: 'text', text: 'Struck 1' }] },
        { type: 'text', text: ' and ' },
        { type: 'strikethrough', children: [{ type: 'text', text: 'Struck 2' }] },
      ]);
    });

    it('should parse <code> as code', () => {
      container.innerHTML = '<code>const x = 1;</code>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'code', children: [{ type: 'text', text: 'const x = 1;' }] },
      ]);
    });

    it('should parse valid links', () => {
      container.innerHTML = '<a href="https://example.com">Link</a>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'link', href: 'https://example.com', children: [{ type: 'text', text: 'Link' }] },
      ]);
    });

    it('should parse relative path links', () => {
      container.innerHTML = '<a href="/page">Page</a>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'link', href: '/page', children: [{ type: 'text', text: 'Page' }] },
      ]);
    });

    it('should parse anchor links', () => {
      container.innerHTML = '<a href="#section">Anchor</a>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'link', href: '#section', children: [{ type: 'text', text: 'Anchor' }] },
      ]);
    });

    it('should parse mailto links', () => {
      container.innerHTML = '<a href="mailto:test@example.com">Email</a>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'link', href: 'mailto:test@example.com', children: [{ type: 'text', text: 'Email' }] },
      ]);
    });

    it('should parse tel links', () => {
      container.innerHTML = '<a href="tel:+1234567890">Phone</a>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'link', href: 'tel:+1234567890', children: [{ type: 'text', text: 'Phone' }] },
      ]);
    });

    it('should strip invalid links (empty href)', () => {
      container.innerHTML = '<a href="">Bad link</a>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'text', text: 'Bad link' },
      ]);
    });

    it('should strip invalid links (javascript:)', () => {
      container.innerHTML = '<a href="javascript:alert(1)">XSS</a>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'text', text: 'XSS' },
      ]);
    });

    it('should strip links without href attribute', () => {
      container.innerHTML = '<a>No href</a>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'text', text: 'No href' },
      ]);
    });

    it('should parse nested formatting', () => {
      container.innerHTML = '<b><i>Bold and italic</i></b>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([{
        type: 'bold',
        children: [{
          type: 'italic',
          children: [{ type: 'text', text: 'Bold and italic' }]
        }]
      }]);
    });

    it('should ignore unknown tags', () => {
      container.innerHTML = '<span>Span text</span>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([{ type: 'text', text: 'Span text' }]);
    });

    it('should handle complex mixed content', () => {
      container.innerHTML = 'Normal <b>bold</b> <i>italic</i> <a href="/link">link</a> <code>code</code>';
      const nodes = parseInlineNodes(container);
      expect(nodes).toEqual([
        { type: 'text', text: 'Normal ' },
        { type: 'bold', children: [{ type: 'text', text: 'bold' }] },
        { type: 'text', text: ' ' },
        { type: 'italic', children: [{ type: 'text', text: 'italic' }] },
        { type: 'text', text: ' ' },
        { type: 'link', href: '/link', children: [{ type: 'text', text: 'link' }] },
        { type: 'text', text: ' ' },
        { type: 'code', children: [{ type: 'text', text: 'code' }] },
      ]);
    });
  });

  describe('parseInlineNodes() ↔ inlineNodesToHtml() round-trip', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('should round-trip plain text', () => {
      const original = 'Hello World';
      container.innerHTML = original;
      const nodes = parseInlineNodes(container);
      const html = inlineNodesToHtml(nodes);
      expect(html).toBe(original);
    });

    it('should round-trip with line breaks', () => {
      const original = 'Line 1<br>Line 2';
      container.innerHTML = original;
      const nodes = parseInlineNodes(container);
      const html = inlineNodesToHtml(nodes);
      expect(html).toBe(original);
    });

    it('should round-trip bold text', () => {
      const original = '<b>Bold text</b>';
      container.innerHTML = original;
      const nodes = parseInlineNodes(container);
      const html = inlineNodesToHtml(nodes);
      expect(html).toBe(original);
    });

    it('should round-trip nested formatting', () => {
      const original = '<b><i>Bold italic</i></b>';
      container.innerHTML = original;
      const nodes = parseInlineNodes(container);
      const html = inlineNodesToHtml(nodes);
      expect(html).toBe(original);
    });

    it('should round-trip complex formatting', () => {
      const original = 'Normal <b>bold</b> <i>italic</i> <u>underline</u> <s>strike</s> <code>code</code>';
      container.innerHTML = original;
      const nodes = parseInlineNodes(container);
      const html = inlineNodesToHtml(nodes);
      expect(html).toBe(original);
    });

    it('should round-trip links', () => {
      const original = '<a href="https://example.com">Link</a>';
      container.innerHTML = original;
      const nodes = parseInlineNodes(container);
      const html = inlineNodesToHtml(nodes);
      expect(html).toBe(original);
    });

    it('should handle HTML entities correctly', () => {
      // Input has escaped entities
      container.innerHTML = '&lt;script&gt;&amp;alert()&lt;/script&gt;';
      const nodes = parseInlineNodes(container);
      // parseInlineNodes reads textContent (decoded), inlineNodesToHtml re-escapes
      const html = inlineNodesToHtml(nodes);
      expect(html).toBe('&lt;script&gt;&amp;alert()&lt;/script&gt;');
    });
  });

  describe('selectorFromSourceBlock()', () => {
    it('should return empty string for null/undefined', () => {
      expect(selectorFromSourceBlock(null)).toBe('');
      expect(selectorFromSourceBlock(undefined)).toBe('');
    });

    it('should return empty string for empty object', () => {
      expect(selectorFromSourceBlock({})).toBe('');
    });

    it('should prioritize explicit selector', () => {
      const block = {
        selector: '.my-class',
        id: 'my-id',
        className: 'other-class',
      };
      expect(selectorFromSourceBlock(block)).toBe('.my-class');
    });

    it('should use id if no selector', () => {
      const block = { id: 'my-id' };
      expect(selectorFromSourceBlock(block)).toBe('#my-id');
    });

    it('should use className if no selector or id', () => {
      const block = { className: 'my-class' };
      expect(selectorFromSourceBlock(block)).toBe('.my-class');
    });

    it('should handle multiple classes', () => {
      const block = { className: 'class-one class-two' };
      expect(selectorFromSourceBlock(block)).toBe('.class-one.class-two');
    });

    it('should trim whitespace from selector', () => {
      const block = { selector: '  .my-class  ' };
      expect(selectorFromSourceBlock(block)).toBe('.my-class');
    });

    it('should trim whitespace from id', () => {
      const block = { id: '  my-id  ' };
      expect(selectorFromSourceBlock(block)).toBe('#my-id');
    });

    it('should handle whitespace in className', () => {
      const block = { className: '  class-one   class-two  ' };
      expect(selectorFromSourceBlock(block)).toBe('.class-one.class-two');
    });

    it('should return empty string for empty selector', () => {
      const block = { selector: '' };
      expect(selectorFromSourceBlock(block)).toBe('');
    });

    it('should return empty string for whitespace-only values', () => {
      expect(selectorFromSourceBlock({ selector: '   ' })).toBe('');
      expect(selectorFromSourceBlock({ id: '   ' })).toBe('');
      expect(selectorFromSourceBlock({ className: '   ' })).toBe('');
    });
  });

  describe('serializeBlock() - simple blocks', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('should serialize paragraph block', () => {
      const block = document.createElement('div');
      block.classList.add('block-item');
      block.dataset.type = 'paragraph';
      const content = document.createElement('div');
      content.classList.add('block-content');
      content.contentEditable = 'true';
      content.textContent = 'Hello World';
      block.appendChild(content);
      container.appendChild(block);

      const serialized = serializeBlock(block);
      expect(serialized).toEqual({
        type: 'paragraph',
        children: [{ type: 'text', text: 'Hello World' }],
      });
    });

    it('should serialize heading block', () => {
      const block = document.createElement('div');
      block.classList.add('block-item');
      block.dataset.type = 'heading';
      block.dataset.level = '2';
      const content = document.createElement('div');
      content.classList.add('block-content');
      content.textContent = 'Title';
      block.appendChild(content);
      container.appendChild(block);

      const serialized = serializeBlock(block);
      expect(serialized).toEqual({
        type: 'heading',
        level: 2,
        children: [{ type: 'text', text: 'Title' }],
      });
    });

    it('should serialize blockquote', () => {
      const block = document.createElement('div');
      block.classList.add('block-item');
      block.dataset.type = 'blockquote';
      const content = document.createElement('div');
      content.classList.add('block-content');
      content.textContent = 'Quote';
      block.appendChild(content);
      container.appendChild(block);

      const serialized = serializeBlock(block);
      expect(serialized).toEqual({
        type: 'blockquote',
        children: [{ type: 'text', text: 'Quote' }],
      });
    });

    it('should serialize codeblock', () => {
      const block = document.createElement('div');
      block.classList.add('block-item');
      block.dataset.type = 'codeblock';
      const content = document.createElement('div');
      content.classList.add('block-content');
      content.textContent = 'const x = 1;';
      block.appendChild(content);
      container.appendChild(block);

      const serialized = serializeBlock(block);
      expect(serialized).toEqual({
        type: 'codeblock',
        content: 'const x = 1;',
      });
    });

    it('should serialize divider', () => {
      const block = document.createElement('div');
      block.classList.add('block-item');
      block.dataset.type = 'divider';
      container.appendChild(block);

      const serialized = serializeBlock(block);
      expect(serialized).toEqual({ type: 'divider' });
    });

    it('should serialize spacer', () => {
      const block = document.createElement('div');
      block.classList.add('block-item');
      block.dataset.type = 'spacer';
      block.dataset.height = '2rem';
      container.appendChild(block);

      const serialized = serializeBlock(block);
      expect(serialized).toEqual({
        type: 'spacer',
        height: '2rem',
      });
    });

    it('should serialize bloglist', () => {
      const block = document.createElement('div');
      block.classList.add('block-item');
      block.dataset.type = 'bloglist';
      container.appendChild(block);

      const serialized = serializeBlock(block);
      expect(serialized).toEqual({ type: 'bloglist' });
    });

    it('should include selector when present', () => {
      const block = document.createElement('div');
      block.classList.add('block-item');
      block.dataset.type = 'paragraph';
      block.dataset.selector = '.my-paragraph';
      const content = document.createElement('div');
      content.classList.add('block-content');
      content.textContent = 'Text';
      block.appendChild(content);
      container.appendChild(block);

      const serialized = serializeBlock(block);
      expect(serialized).toEqual({
        type: 'paragraph',
        selector: '.my-paragraph',
        children: [{ type: 'text', text: 'Text' }],
      });
    });
  });

  describe('serializeBlock() - list blocks', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('should serialize unordered list', () => {
      const block = document.createElement('div');
      block.classList.add('block-item');
      block.dataset.type = 'unordered-list';
      block.dataset.listType = 'unordered';
      const list = document.createElement('ul');
      list.classList.add('editable-list');
      const li1 = document.createElement('li');
      li1.textContent = 'Item 1';
      const li2 = document.createElement('li');
      li2.textContent = 'Item 2';
      list.appendChild(li1);
      list.appendChild(li2);
      block.appendChild(list);
      container.appendChild(block);

      const serialized = serializeBlock(block);
      expect(serialized).toEqual({
        type: 'unordered-list',
        items: [
          { children: [{ type: 'text', text: 'Item 1' }] },
          { children: [{ type: 'text', text: 'Item 2' }] },
        ],
      });
    });

    it('should serialize ordered list', () => {
      const block = document.createElement('div');
      block.classList.add('block-item');
      block.dataset.type = 'ordered-list';
      block.dataset.listType = 'ordered';
      const list = document.createElement('ol');
      list.classList.add('editable-list');
      const li1 = document.createElement('li');
      li1.textContent = 'First';
      const li2 = document.createElement('li');
      li2.textContent = 'Second';
      list.appendChild(li1);
      list.appendChild(li2);
      block.appendChild(list);
      container.appendChild(block);

      const serialized = serializeBlock(block);
      expect(serialized).toEqual({
        type: 'ordered-list',
        items: [
          { children: [{ type: 'text', text: 'First' }] },
          { children: [{ type: 'text', text: 'Second' }] },
        ],
      });
    });
  });

  describe('serializeBlock() - section blocks', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('should serialize section with nested blocks', () => {
      // Create section block
      const section = document.createElement('div');
      section.classList.add('block-item');
      section.dataset.type = 'section';
      section.dataset.background = '#ffffff';
      section.dataset.color = '#000000';
      section.dataset.pattern = 'dots';
      section.dataset.patternColor = '#cccccc';
      section.dataset.patternOpacity = '0.5';
      section.dataset.width = 'narrow';
      section.dataset.padding = 'medium';
      section.dataset.align = 'center';

      // Create section blocks container
      const sectionBlocks = document.createElement('div');
      sectionBlocks.classList.add('section-blocks');

      // Create nested paragraph
      const para = document.createElement('div');
      para.classList.add('block-item');
      para.dataset.type = 'paragraph';
      const paraContent = document.createElement('div');
      paraContent.classList.add('block-content');
      paraContent.textContent = 'Section content';
      para.appendChild(paraContent);
      sectionBlocks.appendChild(para);

      section.appendChild(sectionBlocks);
      container.appendChild(section);

      const serialized = serializeBlock(section);
      expect(serialized).toEqual({
        type: 'section',
        background: '#ffffff',
        color: '#000000',
        pattern: 'dots',
        patternColor: '#cccccc',
        patternOpacity: '0.5',
        width: 'narrow',
        padding: 'medium',
        align: 'center',
        children: [{
          type: 'paragraph',
          children: [{ type: 'text', text: 'Section content' }],
        }],
      });
    });

    it('should serialize section with multiple nested blocks', () => {
      const section = document.createElement('div');
      section.classList.add('block-item');
      section.dataset.type = 'section';
      section.dataset.background = '#f0f0f0';
      section.dataset.color = '#333333';

      const sectionBlocks = document.createElement('div');
      sectionBlocks.classList.add('section-blocks');

      // Heading
      const heading = document.createElement('div');
      heading.classList.add('block-item');
      heading.dataset.type = 'heading';
      heading.dataset.level = '2';
      const headingContent = document.createElement('div');
      headingContent.classList.add('block-content');
      headingContent.textContent = 'Title';
      heading.appendChild(headingContent);
      sectionBlocks.appendChild(heading);

      // Paragraph
      const para = document.createElement('div');
      para.classList.add('block-item');
      para.dataset.type = 'paragraph';
      const paraContent = document.createElement('div');
      paraContent.classList.add('block-content');
      paraContent.textContent = 'Description';
      para.appendChild(paraContent);
      sectionBlocks.appendChild(para);

      section.appendChild(sectionBlocks);
      container.appendChild(section);

      const serialized = serializeBlock(section);
      expect(serialized.children).toHaveLength(2);
      expect(serialized.children[0].type).toBe('heading');
      expect(serialized.children[1].type).toBe('paragraph');
    });

    it('should serialize section with selector', () => {
      const section = document.createElement('div');
      section.classList.add('block-item');
      section.dataset.type = 'section';
      section.dataset.selector = '#hero-section';
      section.dataset.background = '#ffffff';
      section.dataset.color = '#000000';

      const sectionBlocks = document.createElement('div');
      sectionBlocks.classList.add('section-blocks');
      section.appendChild(sectionBlocks);
      container.appendChild(section);

      const serialized = serializeBlock(section);
      expect(serialized.selector).toBe('#hero-section');
    });

    it('should serialize section with null optional fields', () => {
      const section = document.createElement('div');
      section.classList.add('block-item');
      section.dataset.type = 'section';
      section.dataset.background = '#ffffff';
      section.dataset.color = '#000000';
      // No pattern, patternColor, patternOpacity, width, padding, align

      const sectionBlocks = document.createElement('div');
      sectionBlocks.classList.add('section-blocks');
      section.appendChild(sectionBlocks);
      container.appendChild(section);

      const serialized = serializeBlock(section);
      expect(serialized.pattern).toBeNull();
      expect(serialized.patternColor).toBeNull();
      expect(serialized.patternOpacity).toBeNull();
      expect(serialized.width).toBeNull();
      expect(serialized.padding).toBeNull();
      expect(serialized.align).toBeNull();
    });
  });

  describe('serializeBlock() - layout blocks', () => {
    let container;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('should serialize layout with cells', () => {
      // Create layout block
      const layout = document.createElement('div');
      layout.classList.add('block-item');
      layout.dataset.type = 'layout';
      layout.dataset.columns = '2';

      // Create cells grid
      const cellsGrid = document.createElement('div');
      cellsGrid.classList.add('layout-cells-grid');

      // Cell 1
      const cell1 = document.createElement('div');
      cell1.classList.add('layout-cell');
      cell1.dataset.textAlign = 'left';
      cell1.dataset.padding = 'small';
      cell1.dataset.margin = 'none';
      cell1.dataset.width = '50%';
      const cell1Blocks = document.createElement('div');
      cell1Blocks.classList.add('layout-cell-blocks');
      const para1 = document.createElement('div');
      para1.classList.add('block-item');
      para1.dataset.type = 'paragraph';
      const para1Content = document.createElement('div');
      para1Content.classList.add('block-content');
      para1Content.textContent = 'Cell 1 content';
      para1.appendChild(para1Content);
      cell1Blocks.appendChild(para1);
      cell1.appendChild(cell1Blocks);
      cellsGrid.appendChild(cell1);

      // Cell 2
      const cell2 = document.createElement('div');
      cell2.classList.add('layout-cell');
      cell2.dataset.textAlign = 'right';
      cell2.dataset.padding = 'medium';
      cell2.dataset.margin = 'small';
      cell2.dataset.width = '320px';
      const cell2Blocks = document.createElement('div');
      cell2Blocks.classList.add('layout-cell-blocks');
      const para2 = document.createElement('div');
      para2.classList.add('block-item');
      para2.dataset.type = 'paragraph';
      const para2Content = document.createElement('div');
      para2Content.classList.add('block-content');
      para2Content.textContent = 'Cell 2 content';
      para2.appendChild(para2Content);
      cell2Blocks.appendChild(para2);
      cell2.appendChild(cell2Blocks);
      cellsGrid.appendChild(cell2);

      layout.appendChild(cellsGrid);
      container.appendChild(layout);

      const serialized = serializeBlock(layout);
      expect(serialized).toEqual({
        type: 'layout',
        columns: 2,
        cells: [
          {
            children: [{
              type: 'paragraph',
              children: [{ type: 'text', text: 'Cell 1 content' }],
            }],
            textAlign: 'left',
            padding: 'small',
            margin: 'none',
            width: '50%',
          },
          {
            children: [{
              type: 'paragraph',
              children: [{ type: 'text', text: 'Cell 2 content' }],
            }],
            textAlign: 'right',
            padding: 'medium',
            margin: 'small',
            width: '320px',
          },
        ],
      });
    });

    it('should serialize layout with 3 columns', () => {
      const layout = document.createElement('div');
      layout.classList.add('block-item');
      layout.dataset.type = 'layout';
      layout.dataset.columns = '3';

      const cellsGrid = document.createElement('div');
      cellsGrid.classList.add('layout-cells-grid');

      // Create 3 empty cells
      for (let i = 0; i < 3; i++) {
        const cell = document.createElement('div');
        cell.classList.add('layout-cell');
        const cellBlocks = document.createElement('div');
        cellBlocks.classList.add('layout-cell-blocks');
        cell.appendChild(cellBlocks);
        cellsGrid.appendChild(cell);
      }

      layout.appendChild(cellsGrid);
      container.appendChild(layout);

      const serialized = serializeBlock(layout);
      expect(serialized.columns).toBe(3);
      expect(serialized.cells).toHaveLength(3);
    });

    it('should serialize layout with selector', () => {
      const layout = document.createElement('div');
      layout.classList.add('block-item');
      layout.dataset.type = 'layout';
      layout.dataset.columns = '2';
      layout.dataset.selector = '.two-col-layout';

      const cellsGrid = document.createElement('div');
      cellsGrid.classList.add('layout-cells-grid');
      layout.appendChild(cellsGrid);
      container.appendChild(layout);

      const serialized = serializeBlock(layout);
      expect(serialized.selector).toBe('.two-col-layout');
    });

    it('should serialize layout cells with null optional fields', () => {
      const layout = document.createElement('div');
      layout.classList.add('block-item');
      layout.dataset.type = 'layout';
      layout.dataset.columns = '2';

      const cellsGrid = document.createElement('div');
      cellsGrid.classList.add('layout-cells-grid');

      const cell = document.createElement('div');
      cell.classList.add('layout-cell');
      // No textAlign, padding, margin, width
      const cellBlocks = document.createElement('div');
      cellBlocks.classList.add('layout-cell-blocks');
      cell.appendChild(cellBlocks);
      cellsGrid.appendChild(cell);

      layout.appendChild(cellsGrid);
      container.appendChild(layout);

      const serialized = serializeBlock(layout);
      expect(serialized.cells[0].textAlign).toBeNull();
      expect(serialized.cells[0].padding).toBeNull();
      expect(serialized.cells[0].margin).toBeNull();
      expect(serialized.cells[0].width).toBeNull();
    });

    it('should serialize layout with multiple blocks in cells', () => {
      const layout = document.createElement('div');
      layout.classList.add('block-item');
      layout.dataset.type = 'layout';
      layout.dataset.columns = '1';

      const cellsGrid = document.createElement('div');
      cellsGrid.classList.add('layout-cells-grid');

      const cell = document.createElement('div');
      cell.classList.add('layout-cell');
      const cellBlocks = document.createElement('div');
      cellBlocks.classList.add('layout-cell-blocks');

      // Add heading
      const heading = document.createElement('div');
      heading.classList.add('block-item');
      heading.dataset.type = 'heading';
      heading.dataset.level = '3';
      const headingContent = document.createElement('div');
      headingContent.classList.add('block-content');
      headingContent.textContent = 'Title';
      heading.appendChild(headingContent);
      cellBlocks.appendChild(heading);

      // Add paragraph
      const para = document.createElement('div');
      para.classList.add('block-item');
      para.dataset.type = 'paragraph';
      const paraContent = document.createElement('div');
      paraContent.classList.add('block-content');
      paraContent.textContent = 'Text';
      para.appendChild(paraContent);
      cellBlocks.appendChild(para);

      cell.appendChild(cellBlocks);
      cellsGrid.appendChild(cell);
      layout.appendChild(cellsGrid);
      container.appendChild(layout);

      const serialized = serializeBlock(layout);
      expect(serialized.cells[0].children).toHaveLength(2);
      expect(serialized.cells[0].children[0].type).toBe('heading');
      expect(serialized.cells[0].children[1].type).toBe('paragraph');
    });
  });

  describe('buildInputFromData()', () => {
    it('should build minimal input with defaults', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test-page',
          title: 'Test Page',
          pageType: 'post',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);

      expect(input.slug).toBe('test-page');
      expect(input.title).toBe('Test Page');
      expect(input.pageType).toBe('post');
      expect(input.content).toEqual([{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]);
      expect(input.navigation).toBeNull();
      expect(input.footer).toBeNull();
      expect(input.css).toBeNull();
      expect(input.meta).toBeNull();
      expect(input.icons).toEqual([]);
      expect(input.posts).toEqual([]);
      expect(input.allowPagination).toBe(false);
      expect(input.buildId).toBeDefined();
    });

    it('should use content when provided', () => {
      const data = {
        content: [
          { type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] },
        ],
        fields: { slug: 'test', title: 'Test' },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.content).toEqual(data.content);
    });

    it('should include navigation when enabled with items', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          navEnabled: true,
          navItems: [
            { text: 'Home', href: '/' },
            { text: 'About', href: '/about' },
          ],
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.navigation).toEqual({
        items: [
          { text: 'Home', href: '/' },
          { text: 'About', href: '/about' },
        ],
      });
    });

    it('should not include navigation when disabled', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          navEnabled: false,
          navItems: [{ text: 'Home', href: '/' }],
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.navigation).toBeNull();
    });

    it('should not include navigation when enabled but no items', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          navEnabled: true,
          navItems: [],
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.navigation).toBeNull();
    });

    it('should include footer when enabled with text', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          footerEnabled: true,
          footerText: '© 2024 Test',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.footer).toEqual({ content: '© 2024 Test' });
    });

    it('should trim footer text', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          footerEnabled: true,
          footerText: '  © 2024  ',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.footer).toEqual({ content: '© 2024' });
    });

    it('should not include footer when disabled', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          footerEnabled: false,
          footerText: '© 2024',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.footer).toBeNull();
    });

    it('should not include footer when enabled but empty text', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          footerEnabled: true,
          footerText: '   ',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.footer).toBeNull();
    });

    it('should include CSS when enabled with rules', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          cssEnabled: true,
          cssRules: 'body { color: red; }',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.css).toEqual({ rules: 'body { color: red; }' });
    });

    it('should trim CSS rules', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          cssEnabled: true,
          cssRules: '  body { margin: 0; }  ',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.css).toEqual({ rules: 'body { margin: 0; }' });
    });

    it('should not include CSS when disabled', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          cssEnabled: false,
          cssRules: 'body { color: red; }',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.css).toBeNull();
    });

    it('should include meta when enabled with description', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          metaEnabled: true,
          metaDescription: 'Test description',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.meta).toEqual({ description: 'Test description' });
    });

    it('should include meta when enabled with author', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          metaEnabled: true,
          metaAuthor: 'John Doe',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.meta).toEqual({ author: 'John Doe' });
    });

    it('should include meta with both description and author', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          metaEnabled: true,
          metaDescription: 'Description',
          metaAuthor: 'Author',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.meta).toEqual({
        description: 'Description',
        author: 'Author',
      });
    });

    it('should trim meta fields', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          metaEnabled: true,
          metaDescription: '  Desc  ',
          metaAuthor: '  Auth  ',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.meta).toEqual({
        description: 'Desc',
        author: 'Auth',
      });
    });

    it('should not include meta when disabled', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          metaEnabled: false,
          metaDescription: 'Description',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.meta).toBeNull();
    });

    it('should not include meta when enabled but all fields empty', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          metaEnabled: true,
          metaDescription: '   ',
          metaAuthor: '',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.meta).toBeNull();
    });

    it('should include titleOverride when enabled', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          titleOverrideEnabled: true,
          titleOverride: 'Custom Title',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.titleOverride).toBe('Custom Title');
    });

    it('should trim titleOverride', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          titleOverrideEnabled: true,
          titleOverride: '  Custom  ',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.titleOverride).toBe('Custom');
    });

    it('should not include titleOverride when disabled', () => {
      const data = {
        content: [],
        fields: {
          slug: 'test',
          title: 'Test',
          titleOverrideEnabled: false,
          titleOverride: 'Custom',
        },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.titleOverride).toBeNull();
    });

    it('should include siteTitle from globalConfig', () => {
      const data = {
        content: [],
        fields: { slug: 'test', title: 'Test' },
        globalConfig: {
          siteTitleEnabled: true,
          siteTitle: 'My Site',
        },
      };

      const input = buildInputFromData(data);
      expect(input.siteTitle).toBe('My Site');
    });

    it('should not include siteTitle when disabled in globalConfig', () => {
      const data = {
        content: [],
        fields: { slug: 'test', title: 'Test' },
        globalConfig: {
          siteTitleEnabled: false,
          siteTitle: 'My Site',
        },
      };

      const input = buildInputFromData(data);
      expect(input.siteTitle).toBeNull();
    });

    it('should include posts when provided', () => {
      const posts = [
        { slug: 'post-1', title: 'Post 1' },
        { slug: 'post-2', title: 'Post 2' },
      ];
      const data = {
        content: [],
        fields: { slug: 'test', title: 'Test' },
        globalConfig: {},
        posts,
      };

      const input = buildInputFromData(data);
      expect(input.posts).toEqual(posts);
    });

    it('should respect allowPagination parameter', () => {
      const data = {
        content: [],
        fields: { slug: 'test', title: 'Test' },
        globalConfig: {},
      };

      const input = buildInputFromData(data, true);
      expect(input.allowPagination).toBe(true);
    });

    it('should use default slug when empty', () => {
      const data = {
        content: [],
        fields: { slug: '', title: 'Test' },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.slug).toBe('untitled');
    });

    it('should use default title when empty', () => {
      const data = {
        content: [],
        fields: { slug: 'test', title: '' },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.title).toBe('Untitled');
    });

    it('should trim slug and title', () => {
      const data = {
        content: [],
        fields: { slug: '  my-slug  ', title: '  My Title  ' },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.slug).toBe('my-slug');
      expect(input.title).toBe('My Title');
    });

    it('should use provided buildId', () => {
      const buildId = 'custom-build-id';
      const data = {
        content: [],
        fields: { slug: 'test', title: 'Test', buildId },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.buildId).toBe(buildId);
    });

    it('should generate buildId when not provided', () => {
      const data = {
        content: [],
        fields: { slug: 'test', title: 'Test' },
        globalConfig: {},
      };

      const input = buildInputFromData(data);
      expect(input.buildId).toBeDefined();
      expect(typeof input.buildId).toBe('string');
    });

    it('should handle complex complete input', () => {
      const data = {
        content: [
          { type: 'heading', level: 1, children: [{ type: 'text', text: 'Title' }] },
          { type: 'paragraph', children: [{ type: 'text', text: 'Content' }] },
        ],
        fields: {
          slug: 'complex-page',
          title: 'Complex Page',
          pageType: 'page',
          navEnabled: true,
          navItems: [{ text: 'Home', href: '/' }],
          footerEnabled: true,
          footerText: '© 2024',
          cssEnabled: true,
          cssRules: 'body { margin: 0; }',
          metaEnabled: true,
          metaDescription: 'Description',
          metaAuthor: 'Author',
          titleOverrideEnabled: true,
          titleOverride: 'Override',
        },
        globalConfig: {
          siteTitleEnabled: true,
          siteTitle: 'Site Title',
        },
        posts: [{ slug: 'post-1', title: 'Post 1' }],
      };

      const input = buildInputFromData(data, true);

      expect(input.slug).toBe('complex-page');
      expect(input.title).toBe('Complex Page');
      expect(input.pageType).toBe('page');
      expect(input.content).toEqual(data.content);
      expect(input.navigation).toEqual({ items: [{ text: 'Home', href: '/' }] });
      expect(input.footer).toEqual({ content: '© 2024' });
      expect(input.css).toEqual({ rules: 'body { margin: 0; }' });
      expect(input.meta).toEqual({ description: 'Description', author: 'Author' });
      expect(input.titleOverride).toBe('Override');
      expect(input.siteTitle).toBe('Site Title');
      expect(input.posts).toEqual([{ slug: 'post-1', title: 'Post 1' }]);
      expect(input.allowPagination).toBe(true);
      expect(input.icons).toEqual([]);
    });
  });
});
