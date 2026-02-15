import { describe, test, expect } from 'vitest';
import {
  parseSelector,
  selectorToAttributes,
  renderBlockHtml,
  estimateBlockSize,
  estimateContentSize
} from '../../public/admin/lib/byte-estimation.js';

describe('parseSelector', () => {
  test('parses id and classes from #id.class1.class2', () => {
    expect(parseSelector('#foo.bar.baz')).toEqual({
      id: 'foo',
      classes: ['bar', 'baz']
    });
  });

  test('parses only id from #id', () => {
    expect(parseSelector('#myid')).toEqual({
      id: 'myid',
      classes: []
    });
  });

  test('parses classes from .class1.class2', () => {
    expect(parseSelector('.foo.bar')).toEqual({
      id: '',
      classes: ['foo', 'bar']
    });
  });

  test('parses single class without dot prefix', () => {
    expect(parseSelector('myclass')).toEqual({
      id: '',
      classes: ['myclass']
    });
  });

  test('returns empty for null or empty string', () => {
    expect(parseSelector(null)).toEqual({ id: '', classes: [] });
    expect(parseSelector('')).toEqual({ id: '', classes: [] });
    expect(parseSelector('   ')).toEqual({ id: '', classes: [] });
  });

  test('sanitizes invalid characters', () => {
    expect(parseSelector('#foo@bar.baz$qux')).toEqual({
      id: 'foobar',
      classes: ['bazqux']
    });
  });

  test('handles non-string selector inputs', () => {
    expect(parseSelector(42)).toEqual({ id: '', classes: [] });
    expect(parseSelector({})).toEqual({ id: '', classes: [] });
  });
});

describe('selectorToAttributes', () => {
  test('generates id and class attributes', () => {
    expect(selectorToAttributes('#foo.bar.baz')).toBe(' id="foo" class="bar baz"');
  });

  test('generates only id attribute', () => {
    expect(selectorToAttributes('#myid')).toBe(' id="myid"');
  });

  test('generates only class attribute', () => {
    expect(selectorToAttributes('.foo.bar')).toBe(' class="foo bar"');
  });

  test('merges base classes', () => {
    expect(selectorToAttributes('.bar', ['foo'])).toBe(' class="foo bar"');
  });

  test('returns empty string for no selector', () => {
    expect(selectorToAttributes('')).toBe('');
    expect(selectorToAttributes(null)).toBe('');
  });

  test('handles base classes without selector', () => {
    expect(selectorToAttributes('', ['foo', 'bar'])).toBe(' class="foo bar"');
  });
});

describe('renderBlockHtml', () => {
  test('renders heading block', () => {
    const block = {
      type: 'heading',
      level: 2,
      children: [{ type: 'text', text: 'Hello World' }]
    };
    const html = renderBlockHtml(block);
    expect(html).toContain('<h2');
    expect(html).toContain('Hello World');
    expect(html).toContain('</h2>');
  });

  test('renders paragraph block', () => {
    const block = {
      type: 'paragraph',
      children: [{ type: 'text', text: 'Test paragraph' }]
    };
    const html = renderBlockHtml(block);
    expect(html).toContain('<p');
    expect(html).toContain('Test paragraph');
    expect(html).toContain('</p>');
  });

  test('renders blockquote', () => {
    const block = {
      type: 'blockquote',
      children: [{ type: 'text', text: 'Quote text' }]
    };
    const html = renderBlockHtml(block);
    expect(html).toContain('<blockquote');
    expect(html).toContain('Quote text');
    expect(html).toContain('</blockquote>');
  });

  test('renders unordered list', () => {
    const block = {
      type: 'unordered-list',
      items: [
        { children: [{ type: 'text', text: 'Item 1' }] },
        { children: [{ type: 'text', text: 'Item 2' }] }
      ]
    };
    const html = renderBlockHtml(block);
    expect(html).toContain('<ul');
    expect(html).toContain('<li>Item 1</li>');
    expect(html).toContain('<li>Item 2</li>');
    expect(html).toContain('</ul>');
  });

  test('renders ordered list', () => {
    const block = {
      type: 'ordered-list',
      items: [
        { children: [{ type: 'text', text: 'First' }] },
        { children: [{ type: 'text', text: 'Second' }] }
      ]
    };
    const html = renderBlockHtml(block);
    expect(html).toContain('<ol');
    expect(html).toContain('<li>First</li>');
    expect(html).toContain('</ol>');
  });

  test('renders codeblock with escaped content', () => {
    const block = {
      type: 'codeblock',
      content: '<script>alert("xss")</script>'
    };
    const html = renderBlockHtml(block);
    expect(html).toContain('<pre');
    expect(html).toContain('<code>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
  });

  test('renders divider', () => {
    const block = { type: 'divider' };
    const html = renderBlockHtml(block);
    expect(html).toBe('<hr>');
  });

  test('renders spacer with height', () => {
    const block = {
      type: 'spacer',
      height: '2rem'
    };
    const html = renderBlockHtml(block);
    expect(html).toContain('<div');
    expect(html).toContain('height:2rem');
  });

  test('renders bloglist placeholder', () => {
    const block = { type: 'bloglist' };
    const html = renderBlockHtml(block);
    expect(html).toContain('<div');
    expect(html).toContain('<!-- bloglist -->');
  });

  test('renders section with children', () => {
    const block = {
      type: 'section',
      background: '#ff0000',
      children: [
        { type: 'paragraph', children: [{ type: 'text', text: 'Inside section' }] }
      ]
    };
    const html = renderBlockHtml(block);
    expect(html).toContain('<section');
    expect(html).toContain('--sb:#ff0000');
    expect(html).toContain('Inside section');
    expect(html).toContain('</section>');
  });

  test('renders section with pattern', () => {
    const block = {
      type: 'section',
      pattern: 'dots',
      patternColor: '#ffffff',
      patternOpacity: '0.5',
      children: []
    };
    const html = renderBlockHtml(block);
    expect(html).toContain('bg-pattern-dots');
    expect(html).toContain('--pc:rgba(255,255,255,0.5)');
  });

  test('renders layout with cells', () => {
    const block = {
      type: 'layout',
      columns: 2,
      cells: [
        {
          children: [
            { type: 'paragraph', children: [{ type: 'text', text: 'Cell 1' }] }
          ]
        },
        {
          children: [
            { type: 'paragraph', children: [{ type: 'text', text: 'Cell 2' }] }
          ]
        }
      ]
    };
    const html = renderBlockHtml(block);
    expect(html).toContain('class="layout"');
    expect(html).toContain('grid-template-columns:repeat(2,1fr)');
    expect(html).toContain('Cell 1');
    expect(html).toContain('Cell 2');
  });

  test('applies selector to block', () => {
    const block = {
      type: 'paragraph',
      selector: '#myid.myclass',
      children: [{ type: 'text', text: 'Test' }]
    };
    const html = renderBlockHtml(block);
    expect(html).toContain('id="myid"');
    expect(html).toContain('class="myclass"');
  });

  test('handles inline formatting', () => {
    const block = {
      type: 'paragraph',
      children: [
        { type: 'bold', children: [{ type: 'text', text: 'Bold' }] },
        { type: 'text', text: ' ' },
        { type: 'italic', children: [{ type: 'text', text: 'Italic' }] }
      ]
    };
    const html = renderBlockHtml(block);
    expect(html).toContain('<b>Bold</b>');
    expect(html).toContain('<i>Italic</i>');
  });

  test('returns empty string for invalid block input', () => {
    expect(renderBlockHtml(null)).toBe('');
    expect(renderBlockHtml(undefined)).toBe('');
    expect(renderBlockHtml('not-an-object')).toBe('');
  });

  test('layout invariant keeps number of rendered cells equal to input cells', () => {
    const block = {
      type: 'layout',
      columns: 3,
      rows: 2,
      cells: [
        { children: [] },
        { children: [] },
        { children: [] },
        { children: [] },
        { children: [] },
        { children: [] },
      ],
    };

    const html = renderBlockHtml(block);
    const cellCount = (html.match(/class="cell"/g) || []).length;
    expect(cellCount).toBe(6);
  });
});

describe('estimateBlockSize', () => {
  test('estimates bytes for simple paragraph', () => {
    const block = {
      type: 'paragraph',
      children: [{ type: 'text', text: 'Hello' }]
    };
    const bytes = estimateBlockSize(block);
    expect(bytes).toBeGreaterThan(0);
    // <p>Hello</p> = 12 bytes
    expect(bytes).toBeGreaterThanOrEqual(12);
  });

  test('estimates bytes for heading with selector', () => {
    const block = {
      type: 'heading',
      level: 1,
      selector: '#title.main',
      children: [{ type: 'text', text: 'Title' }]
    };
    const bytes = estimateBlockSize(block);
    expect(bytes).toBeGreaterThan(20); // Should include id and class attributes
  });

  test('estimates bytes for section with children', () => {
    const block = {
      type: 'section',
      background: '#000000',
      children: [
        { type: 'paragraph', children: [{ type: 'text', text: 'Content' }] }
      ]
    };
    const bytes = estimateBlockSize(block);
    expect(bytes).toBeGreaterThan(30); // Section tags + styles + content
  });

  test('never returns negative values for invalid input', () => {
    expect(estimateBlockSize(null)).toBeGreaterThanOrEqual(0);
    expect(estimateBlockSize(undefined)).toBeGreaterThanOrEqual(0);
  });
});

describe('estimateContentSize', () => {
  test('estimates total size of multiple blocks', () => {
    const blocks = [
      {
        type: 'heading',
        level: 1,
        children: [{ type: 'text', text: 'Title' }]
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Content' }]
      }
    ];
    const total = estimateContentSize(blocks);
    expect(total).toBeGreaterThan(20);

    const individual = blocks.reduce((sum, block) => sum + estimateBlockSize(block), 0);
    expect(total).toBe(individual);
  });

  test('returns 0 for empty array', () => {
    expect(estimateContentSize([])).toBe(0);
  });

  test('returns 0 for non-array', () => {
    expect(estimateContentSize(null)).toBe(0);
    expect(estimateContentSize(undefined)).toBe(0);
  });
});
