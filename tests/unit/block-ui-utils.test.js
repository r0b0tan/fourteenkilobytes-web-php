import { describe, test, expect, vi, beforeEach } from 'vitest';
import {
  createBlockSelectorControl,
  createBlockActions,
  createBlockHeader,
  createInnerAddBlock,
  createByteIndicator
} from '../../public/admin/lib/block-ui-utils.js';

describe('createBlockSelectorControl', () => {
  test('creates input with correct attributes', () => {
    const input = createBlockSelectorControl({ initialValue: '#test' });

    expect(input.tagName).toBe('INPUT');
    expect(input.type).toBe('text');
    expect(input.className).toBe('block-selector-input');
    expect(input.placeholder).toBe('.your-css-class');
    expect(input.value).toBe('#test');
  });

  test('calls onChange when input changes', () => {
    const onChange = vi.fn();
    const input = createBlockSelectorControl({ onChange });

    input.value = '.my-class';
    input.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith('.my-class');
  });

  test('trims whitespace from input value', () => {
    const onChange = vi.fn();
    const input = createBlockSelectorControl({ onChange });

    input.value = '  .my-class  ';
    input.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith('.my-class');
  });

  test('defaults to empty string if no initial value', () => {
    const input = createBlockSelectorControl({});
    expect(input.value).toBe('');
  });
});

describe('createBlockActions', () => {
  test('creates actions container with all buttons', () => {
    const callbacks = {
      onMoveUp: vi.fn(),
      onMoveDown: vi.fn(),
      onDuplicate: vi.fn(),
      onDelete: vi.fn()
    };

    const actions = createBlockActions(callbacks);

    expect(actions.className).toBe('block-item-actions');
    const buttons = actions.querySelectorAll('button');
    expect(buttons.length).toBe(4); // up, down, duplicate, delete
  });

  test('includes selector control by default', () => {
    const callbacks = {};
    const actions = createBlockActions(callbacks);

    const selectorInput = actions.querySelector('.block-selector-input');
    expect(selectorInput).toBeTruthy();
  });

  test('excludes selector control when includeSelector is false', () => {
    const callbacks = {};
    const actions = createBlockActions(callbacks, { includeSelector: false });

    const selectorInput = actions.querySelector('.block-selector-input');
    expect(selectorInput).toBeNull();
  });

  test('calls onMoveUp when up button clicked', () => {
    const onMoveUp = vi.fn();
    const actions = createBlockActions({ onMoveUp });

    const upBtn = actions.querySelector('button[title="Move up"]');
    upBtn.click();

    expect(onMoveUp).toHaveBeenCalledTimes(1);
  });

  test('calls onMoveDown when down button clicked', () => {
    const onMoveDown = vi.fn();
    const actions = createBlockActions({ onMoveDown });

    const downBtn = actions.querySelector('button[title="Move down"]');
    downBtn.click();

    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  test('calls onDuplicate when duplicate button clicked', () => {
    const onDuplicate = vi.fn();
    const actions = createBlockActions({ onDuplicate });

    const copyBtn = actions.querySelector('button[title="Duplicate"]');
    copyBtn.click();

    expect(onDuplicate).toHaveBeenCalledTimes(1);
  });

  test('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    const actions = createBlockActions({ onDelete });

    const deleteBtn = actions.querySelector('button[title="Delete"]');
    deleteBtn.click();

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  test('sets initial selector value', () => {
    const callbacks = { onSelectorChange: vi.fn() };
    const actions = createBlockActions(callbacks, { selectorValue: '#initial' });

    const input = actions.querySelector('.block-selector-input');
    expect(input.value).toBe('#initial');
  });

  test('calls onSelectorChange when selector input changes', () => {
    const onSelectorChange = vi.fn();
    const actions = createBlockActions({ onSelectorChange });

    const input = actions.querySelector('.block-selector-input');
    input.value = '.new-class';
    input.dispatchEvent(new Event('input'));

    expect(onSelectorChange).toHaveBeenCalledWith('.new-class');
  });
});

describe('createBlockHeader', () => {
  test('creates header with label', () => {
    const config = {
      label: 'Section',
      i18nKey: 'editor.blockSection',
      callbacks: {}
    };

    const header = createBlockHeader(config);

    expect(header.className).toBe('block-header');
    const label = header.querySelector('.block-type-label');
    expect(label.textContent).toBe('Section');
    expect(label.getAttribute('data-i18n')).toBe('editor.blockSection');
  });

  test('includes actions container', () => {
    const callbacks = {
      onMoveUp: vi.fn(),
      onDelete: vi.fn()
    };

    const header = createBlockHeader({ label: 'Test', callbacks });

    const actions = header.querySelector('.block-item-actions');
    expect(actions).toBeTruthy();
  });

  test('includes extra control when provided', () => {
    const select = document.createElement('select');
    select.className = 'test-select';

    const header = createBlockHeader({
      label: 'Test',
      callbacks: {},
      extraControl: select
    });

    const foundSelect = header.querySelector('.test-select');
    expect(foundSelect).toBeTruthy();
  });

  test('passes options to actions', () => {
    const header = createBlockHeader({
      label: 'Test',
      callbacks: {},
      options: { includeSelector: false }
    });

    const selectorInput = header.querySelector('.block-selector-input');
    expect(selectorInput).toBeNull();
  });
});

describe('createInnerAddBlock', () => {
  test('creates add block row with button and dropdown', () => {
    const onBlockAdd = vi.fn();
    const row = createInnerAddBlock({ onBlockAdd });

    expect(row.className).toBe('section-add-row');
    const btn = row.querySelector('.section-add-block');
    expect(btn).toBeTruthy();
    expect(btn.textContent).toBe('+ Add Block');

    const dropdown = row.querySelector('.add-block-dropdown');
    expect(dropdown).toBeTruthy();
    expect(dropdown.classList.contains('hidden')).toBe(true);
  });

  test('shows dropdown when button clicked', () => {
    const row = createInnerAddBlock({ onBlockAdd: vi.fn() });
    const btn = row.querySelector('.section-add-block');
    const dropdown = row.querySelector('.add-block-dropdown');

    btn.click();
    expect(dropdown.classList.contains('hidden')).toBe(false);

    btn.click();
    expect(dropdown.classList.contains('hidden')).toBe(true);
  });

  test('creates buttons for default block types', () => {
    const row = createInnerAddBlock({ onBlockAdd: vi.fn() });
    const dropdown = row.querySelector('.add-block-dropdown');
    const buttons = dropdown.querySelectorAll('button');

    expect(buttons.length).toBe(7); // paragraph, heading, list, divider, spacer, bloglist, layout
    expect(buttons[0].textContent).toBe('Paragraph');
    expect(buttons[1].textContent).toBe('Heading');
    expect(dropdown.querySelector('[data-type="bloglist"]')).toBeTruthy();
  });

  test('calls onBlockAdd with block config when type selected', () => {
    const onBlockAdd = vi.fn();
    const row = createInnerAddBlock({ onBlockAdd });
    const dropdown = row.querySelector('.add-block-dropdown');
    const paragraphBtn = dropdown.querySelector('[data-type="paragraph"]');

    paragraphBtn.click();

    expect(onBlockAdd).toHaveBeenCalledWith({
      type: 'paragraph',
      level: undefined,
      listType: undefined,
      spacerHeight: undefined
    });
  });

  test('calls onBlockAdd with level for heading', () => {
    const onBlockAdd = vi.fn();
    const row = createInnerAddBlock({ onBlockAdd });
    const dropdown = row.querySelector('.add-block-dropdown');
    const headingBtn = dropdown.querySelector('[data-type="heading"]');

    headingBtn.click();

    expect(onBlockAdd).toHaveBeenCalledWith({
      type: 'heading',
      level: '2',
      listType: undefined,
      spacerHeight: undefined
    });
  });

  test('calls onBlockAdd with listType for list', () => {
    const onBlockAdd = vi.fn();
    const row = createInnerAddBlock({ onBlockAdd });
    const dropdown = row.querySelector('.add-block-dropdown');
    const listBtn = dropdown.querySelector('[data-type="list"]');

    listBtn.click();

    expect(onBlockAdd).toHaveBeenCalledWith({
      type: 'list',
      level: undefined,
      listType: 'unordered',
      spacerHeight: undefined
    });
  });

  test('calls onBlockAdd for bloglist', () => {
    const onBlockAdd = vi.fn();
    const row = createInnerAddBlock({ onBlockAdd });
    const dropdown = row.querySelector('.add-block-dropdown');
    const bloglistBtn = dropdown.querySelector('[data-type="bloglist"]');

    bloglistBtn.click();

    expect(onBlockAdd).toHaveBeenCalledWith({
      type: 'bloglist',
      level: undefined,
      listType: undefined,
      spacerHeight: undefined
    });
  });

  test('hides dropdown after block selected', () => {
    const onBlockAdd = vi.fn();
    const row = createInnerAddBlock({ onBlockAdd });
    const btn = row.querySelector('.section-add-block');
    const dropdown = row.querySelector('.add-block-dropdown');

    // Show dropdown
    btn.click();
    expect(dropdown.classList.contains('hidden')).toBe(false);

    // Select a block
    const paragraphBtn = dropdown.querySelector('[data-type="paragraph"]');
    paragraphBtn.click();

    expect(dropdown.classList.contains('hidden')).toBe(true);
  });

  test('accepts custom block types', () => {
    const customTypes = [
      { type: 'custom1', label: 'Custom 1', i18n: 'custom.1' },
      { type: 'custom2', label: 'Custom 2', i18n: 'custom.2' }
    ];

    const row = createInnerAddBlock({
      onBlockAdd: vi.fn(),
      blockTypes: customTypes
    });

    const dropdown = row.querySelector('.add-block-dropdown');
    const buttons = dropdown.querySelectorAll('button');

    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('Custom 1');
    expect(buttons[1].textContent).toBe('Custom 2');
  });

  test('accepts custom button label', () => {
    const row = createInnerAddBlock({
      onBlockAdd: vi.fn(),
      buttonLabel: 'Custom Label'
    });

    const btn = row.querySelector('.section-add-block');
    expect(btn.textContent).toBe('Custom Label');
  });
});

describe('createByteIndicator', () => {
  test('creates byte indicator with default text', () => {
    const indicator = createByteIndicator();

    expect(indicator.className).toBe('block-byte-indicator');
    expect(indicator.textContent).toBe('0 B');
  });

  test('creates byte indicator with custom text', () => {
    const indicator = createByteIndicator('123 B');

    expect(indicator.textContent).toBe('123 B');
  });
});
