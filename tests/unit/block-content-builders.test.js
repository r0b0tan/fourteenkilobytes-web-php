import { describe, test, expect, vi } from 'vitest';
import {
  createBloglistContent,
  createListContent,
  createDividerContent,
  createSpacerContent,
  createCodeblockContent,
  createBlockquoteContent,
  createParagraphContent,
  createHeadingContent
} from '../../public/admin/lib/block-content-builders.js';

describe('createBloglistContent', () => {
  test('creates bloglist placeholder', () => {
    const content = createBloglistContent();

    expect(content.className).toContain('block-bloglist');
    expect(content.contentEditable).toBe('false');
    expect(content.querySelector('.bloglist-config')).toBeTruthy();
  });
});

describe('createListContent', () => {
  test('creates unordered list with empty item', () => {
    const content = createListContent({ listType: 'unordered' });

    expect(content.className).toContain('block-list');
    const list = content.querySelector('ul');
    expect(list).toBeTruthy();
    expect(list.querySelectorAll('li').length).toBe(1);
  });

  test('creates ordered list', () => {
    const content = createListContent({ listType: 'ordered' });

    const list = content.querySelector('ol');
    expect(list).toBeTruthy();
  });

  test('restores list items from HTML', () => {
    const initialHtml = '<li>Item 1</li><li>Item 2</li>';
    const content = createListContent({
      listType: 'unordered',
      initialHtml
    });

    const items = content.querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('Item 1');
    expect(items[1].textContent).toBe('Item 2');
  });

  test('calls setupListKeyHandlers', () => {
    const setupListKeyHandlers = vi.fn();
    createListContent({
      listType: 'unordered',
      setupListKeyHandlers
    });

    expect(setupListKeyHandlers).toHaveBeenCalled();
  });
});

describe('createDividerContent', () => {
  test('creates divider with hr', () => {
    const content = createDividerContent();

    expect(content.className).toContain('block-divider');
    expect(content.contentEditable).toBe('false');
    expect(content.querySelector('hr')).toBeTruthy();
  });
});

describe('createSpacerContent', () => {
  test('creates spacer with default height', () => {
    const block = { dataset: {} };
    const content = createSpacerContent({ block });

    expect(content.className).toContain('block-spacer');
    const preview = content.querySelector('.spacer-preview');
    expect(preview.style.height).toBe('1rem');
  });

  test('creates spacer with custom height', () => {
    const block = { dataset: {} };
    const content = createSpacerContent({ block, height: '2rem' });

    const preview = content.querySelector('.spacer-preview');
    expect(preview.style.height).toBe('2rem');
  });

  test('updates height when input changes', () => {
    const block = { dataset: {} };
    const onChange = vi.fn();
    const content = createSpacerContent({ block, onChange });

    const input = content.querySelector('.spacer-height-input');
    input.value = '3rem';
    input.dispatchEvent(new Event('input'));

    expect(block.dataset.height).toBe('3rem');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('createCodeblockContent', () => {
  test('creates codeblock content', () => {
    const content = createCodeblockContent('const x = 1;');

    expect(content.className).toContain('block-codeblock');
    expect(content.contentEditable).toBe('true');
    expect(content.textContent).toBe('const x = 1;');
  });
});

describe('createBlockquoteContent', () => {
  test('creates blockquote content', () => {
    const content = createBlockquoteContent('<strong>Quote</strong>');

    expect(content.contentEditable).toBe('true');
    expect(content.dataset.placeholder).toBe('Quote...');
    expect(content.innerHTML).toBe('<strong>Quote</strong>');
  });
});

describe('createParagraphContent', () => {
  test('creates paragraph content', () => {
    const content = createParagraphContent('Hello world');

    expect(content.contentEditable).toBe('true');
    expect(content.dataset.placeholder).toBe('Enter text...');
    expect(content.innerHTML).toBe('Hello world');
  });
});

describe('createHeadingContent', () => {
  test('creates heading content', () => {
    const content = createHeadingContent('Title');

    expect(content.contentEditable).toBe('true');
    expect(content.dataset.placeholder).toBe('Heading...');
    expect(content.innerHTML).toBe('Title');
  });
});
