import { describe, test, expect, vi } from 'vitest';
import {
  createTextBlockTypeSelector,
  createHeadingLevelSelector,
  createListTypeSelector,
  createBlockTypeLabel,
  createFormatButtons
} from '../../public/admin/lib/block-type-selectors.js';

describe('createTextBlockTypeSelector', () => {
  test('creates selector with correct options', () => {
    const select = createTextBlockTypeSelector('paragraph');

    expect(select.tagName).toBe('SELECT');
    expect(select.className).toBe('block-type-select');
    expect(select.querySelectorAll('option').length).toBe(3);
    expect(select.value).toBe('paragraph');
  });

  test('calls onChange when value changes', () => {
    const onChange = vi.fn();
    const select = createTextBlockTypeSelector('paragraph', onChange);

    select.value = 'blockquote';
    select.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith('blockquote');
  });
});

describe('createHeadingLevelSelector', () => {
  test('creates selector with 6 levels', () => {
    const select = createHeadingLevelSelector('2');

    expect(select.querySelectorAll('option').length).toBe(6);
    expect(select.value).toBe('2');
  });

  test('defaults to level 2', () => {
    const select = createHeadingLevelSelector(null);
    expect(select.value).toBe('2');
  });

  test('calls onChange when level changes', () => {
    const onChange = vi.fn();
    const select = createHeadingLevelSelector('2', onChange);

    select.value = '3';
    select.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith('3');
  });
});

describe('createListTypeSelector', () => {
  test('creates selector for ordered/unordered', () => {
    const select = createListTypeSelector('unordered');

    expect(select.querySelectorAll('option').length).toBe(2);
    expect(select.value).toBe('unordered');
  });

  test('calls onChange when type changes', () => {
    const onChange = vi.fn();
    const select = createListTypeSelector('unordered', onChange);

    select.value = 'ordered';
    select.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith('ordered');
  });
});

describe('createBlockTypeLabel', () => {
  test('creates divider label', () => {
    const label = createBlockTypeLabel('divider');

    expect(label.textContent).toBe('Divider');
    expect(label.getAttribute('data-i18n')).toBe('editor.blockDivider');
  });

  test('creates spacer label', () => {
    const label = createBlockTypeLabel('spacer');

    expect(label.textContent).toBe('Spacer');
    expect(label.getAttribute('data-i18n')).toBe('editor.blockSpacer');
  });

  test('creates bloglist label', () => {
    const label = createBlockTypeLabel('bloglist');

    expect(label.textContent).toBe('Bloglist');
    expect(label.getAttribute('data-i18n')).toBe('editor.blockBloglist');
  });
});

describe('createFormatButtons', () => {
  test('creates 6 format buttons', () => {
    const block = document.createElement('div');
    const buttons = createFormatButtons(vi.fn(), block);

    expect(buttons.className).toBe('block-format-buttons');
    expect(buttons.querySelectorAll('button').length).toBe(6);
  });

  test('calls onFormatClick when button clicked', () => {
    const onFormatClick = vi.fn();
    const block = document.createElement('div');
    const buttons = createFormatButtons(onFormatClick, block);

    const boldBtn = buttons.querySelector('button[data-cmd="bold"]');
    boldBtn.click();

    expect(onFormatClick).toHaveBeenCalledWith('bold', block);
  });

  test('includes all format types', () => {
    const buttons = createFormatButtons(vi.fn(), document.createElement('div'));

    expect(buttons.querySelector('[data-cmd="bold"]')).toBeTruthy();
    expect(buttons.querySelector('[data-cmd="italic"]')).toBeTruthy();
    expect(buttons.querySelector('[data-cmd="underline"]')).toBeTruthy();
    expect(buttons.querySelector('[data-cmd="strikethrough"]')).toBeTruthy();
    expect(buttons.querySelector('[data-cmd="code"]')).toBeTruthy();
    expect(buttons.querySelector('[data-cmd="link"]')).toBeTruthy();
  });
});
