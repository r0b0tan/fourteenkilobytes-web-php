import { describe, test, expect, vi } from 'vitest';
import {
  createBloglistContent,
  createAuthorContent,
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

describe('createAuthorContent', () => {
  test('creates author block without block element', () => {
    const content = createAuthorContent();

    expect(content.className).toContain('block-author');
    expect(content.contentEditable).toBe('false');
    expect(content.querySelector('.bloglist-config')).toBeTruthy();
    const checkboxes = content.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(3);
    checkboxes.forEach(cb => expect(cb.checked).toBe(true));
  });

  test('creates author block with block element and sets defaults', () => {
    const block = { dataset: {} };
    createAuthorContent({ block });

    expect(block.dataset.showPublished).toBe('true');
    expect(block.dataset.showModified).toBe('true');
    expect(block.dataset.showAuthor).toBe('true');
    expect(block.dataset.tags).toBe('');
  });

  test('does not override existing dataset values', () => {
    const block = { dataset: { showPublished: 'false', showModified: 'true', showAuthor: 'false', tags: 'a, b' } };
    const content = createAuthorContent({ block });

    expect(block.dataset.showPublished).toBe('false');
    const checkboxes = content.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes[0].checked).toBe(false);
    expect(checkboxes[1].checked).toBe(true);
    expect(checkboxes[2].checked).toBe(false);
  });

  test('shows existing tags in text input', () => {
    const block = { dataset: { showPublished: 'true', showModified: 'true', showAuthor: 'true', tags: 'css, design' } };
    const content = createAuthorContent({ block });

    const tagsInput = content.querySelector('input[type="text"]');
    expect(tagsInput.value).toBe('css, design');
  });

  test('toggle change updates block dataset and calls onChange', () => {
    const block = { dataset: {} };
    const onChange = vi.fn();
    const content = createAuthorContent({ block, onChange });

    const checkbox = content.querySelectorAll('input[type="checkbox"]')[0];
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));

    expect(block.dataset.showPublished).toBe('false');
    expect(onChange).toHaveBeenCalled();
  });

  test('toggle change without block or onChange does not throw', () => {
    const content = createAuthorContent();
    const checkbox = content.querySelectorAll('input[type="checkbox"]')[0];
    checkbox.checked = false;

    expect(() => checkbox.dispatchEvent(new Event('change'))).not.toThrow();
  });

  test('tags input updates block dataset and calls onChange', () => {
    const block = { dataset: {} };
    const onChange = vi.fn();
    const content = createAuthorContent({ block, onChange });

    const tagsInput = content.querySelector('input[type="text"]');
    tagsInput.value = 'foo, bar';
    tagsInput.dispatchEvent(new Event('input'));

    expect(block.dataset.tags).toBe('foo, bar');
    expect(onChange).toHaveBeenCalled();
  });

  test('tags input without block or onChange does not throw', () => {
    const content = createAuthorContent();
    const tagsInput = content.querySelector('input[type="text"]');
    tagsInput.value = 'test';

    expect(() => tagsInput.dispatchEvent(new Event('input'))).not.toThrow();
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

  test('restores list items from HTML wrapped in ul/ol', () => {
    const initialHtml = '<ul><li>First</li><li>Second</li></ul>';
    const content = createListContent({ listType: 'unordered', initialHtml });

    const items = content.querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('First');
    expect(items[1].textContent).toBe('Second');
  });

  test('restores list item with attributes via <li class="..."> pattern', () => {
    const initialHtml = '<li class="active">Styled item</li>';
    const content = createListContent({ listType: 'unordered', initialHtml });

    const items = content.querySelectorAll('li');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Styled item');
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

  test('falls back to 1rem when input is cleared', () => {
    const block = { dataset: {} };
    const content = createSpacerContent({ block, height: '2rem' });

    const input = content.querySelector('.spacer-height-input');
    input.value = '';
    input.dispatchEvent(new Event('input'));

    expect(block.dataset.height).toBe('1rem');
    expect(content.querySelector('.spacer-preview').style.height).toBe('1rem');
  });

  test('input change without block or onChange does not throw', () => {
    const content = createSpacerContent({ height: '2rem' });
    const input = content.querySelector('.spacer-height-input');
    input.value = '4rem';

    expect(() => input.dispatchEvent(new Event('input'))).not.toThrow();
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
