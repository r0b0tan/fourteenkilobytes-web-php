import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEditorBlockFactory } from '../../public/admin/lib/editor/block-factory.js';

function createDeps(overrides = {}) {
  return {
    onPreviewRequested: vi.fn(),
    onCostRailChanged: vi.fn(),
    moveBlock: vi.fn(),
    serializeBlock: vi.fn(() => ({ type: 'paragraph' })),
    getBlockElFromSource: vi.fn(() => () => {
      const clone = document.createElement('div');
      clone.className = 'block-item';
      return clone;
    }),
    insertBlockDirectlyBelow: vi.fn(),
    updateBlockStyling: vi.fn(),

    createInnerAddBlock: vi.fn(() => document.createElement('div')),
    createSectionBlock: vi.fn(),
    createLayoutBlock: vi.fn(),

    createTextBlockTypeSelector: vi.fn(() => document.createElement('select')),
    createHeadingLevelSelector: vi.fn(() => document.createElement('select')),
    createListTypeSelector: vi.fn(() => document.createElement('select')),
    createBlockTypeLabel: vi.fn(() => document.createElement('span')),
    createFormatButtons: vi.fn(() => document.createElement('div')),
    createBlockSelectorControl: vi.fn(() => {
      const wrap = document.createElement('div');
      const input = document.createElement('input');
      input.className = 'block-selector-input';
      wrap.appendChild(input);
      return wrap;
    }),
    createByteIndicator: vi.fn(() => {
      const el = document.createElement('div');
      el.className = 'block-byte-indicator';
      return el;
    }),

    createBloglistContent: vi.fn(() => document.createElement('div')),
    createListContent: vi.fn(() => {
      const ul = document.createElement('ul');
      ul.className = 'editable-list';
      const li = document.createElement('li');
      li.contentEditable = 'true';
      li.textContent = 'Item';
      ul.appendChild(li);
      return ul;
    }),
    createDividerContent: vi.fn(() => document.createElement('hr')),
    createSpacerContent: vi.fn(() => document.createElement('div')),
    createCodeblockContent: vi.fn(() => {
      const d = document.createElement('div');
      d.className = 'block-content';
      return d;
    }),
    createBlockquoteContent: vi.fn(() => {
      const d = document.createElement('div');
      d.className = 'block-content';
      return d;
    }),
    createHeadingContent: vi.fn(() => {
      const d = document.createElement('div');
      d.className = 'block-content';
      return d;
    }),
    createParagraphContent: vi.fn(() => {
      const d = document.createElement('div');
      d.className = 'block-content';
      d.contentEditable = 'true';
      return d;
    }),

    onFormatClick: vi.fn(),
    Compiler: { getPatternClass: vi.fn(() => '') },
    ...overrides,
  };
}

describe('editor/block-factory', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('handles list Enter and Backspace key invariants', () => {
    const deps = createDeps();
    const { setupListKeyHandlers } = createEditorBlockFactory(deps);

    const list = document.createElement('ul');
    const li1 = document.createElement('li');
    li1.contentEditable = 'true';
    li1.textContent = 'A';
    const li2 = document.createElement('li');
    li2.contentEditable = 'true';
    li2.textContent = 'B';
    list.append(li1, li2);
    document.body.appendChild(list);

    setupListKeyHandlers(list);

    li1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(list.querySelectorAll('li').length).toBe(3);
    expect(deps.onPreviewRequested).toHaveBeenCalled();

    const inserted = list.querySelectorAll('li')[1];
    inserted.innerHTML = '';
    inserted.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));

    expect(list.querySelectorAll('li').length).toBe(2);
    expect(deps.onPreviewRequested).toHaveBeenCalledTimes(2);
  });

  it('creates paragraph block and wires move/duplicate/delete actions', () => {
    const deps = createDeps();
    const { createBlockElement } = createEditorBlockFactory(deps);

    const block = createBlockElement('paragraph');
    document.body.appendChild(block);

    expect(block.dataset.type).toBe('paragraph');
    expect(block.querySelector('.block-byte-indicator')).not.toBeNull();

    const buttons = block.querySelectorAll('.block-item-actions button');
    expect(buttons.length).toBe(4);

    buttons[0].click();
    buttons[1].click();
    expect(deps.moveBlock).toHaveBeenNthCalledWith(1, block, -1);
    expect(deps.moveBlock).toHaveBeenNthCalledWith(2, block, 1);

    buttons[2].click();
    expect(deps.serializeBlock).toHaveBeenCalledWith(block);
    expect(deps.insertBlockDirectlyBelow).toHaveBeenCalled();
    expect(deps.onPreviewRequested).toHaveBeenCalled();

    buttons[3].click();
    expect(document.body.contains(block)).toBe(false);
  });

  it('creates section and layout blocks with callback-driven duplicate/delete behavior', () => {
    let sectionCallbacks;
    let layoutCallbacks;

    const sectionEl = document.createElement('div');
    sectionEl.className = 'block-item';
    sectionEl.dataset.type = 'section';
    const sectionBlocks = document.createElement('div');
    sectionBlocks.className = 'section-blocks';
    sectionEl.appendChild(sectionBlocks);

    const layoutEl = document.createElement('div');
    layoutEl.className = 'block-item';
    layoutEl.dataset.type = 'layout';

    const deps = createDeps({
      createSectionBlock: vi.fn(({ callbacks }) => {
        sectionCallbacks = callbacks;
        return sectionEl;
      }),
      createLayoutBlock: vi.fn(({ callbacks }) => {
        layoutCallbacks = callbacks;
        return layoutEl;
      }),
    });

    const { createBlockElement } = createEditorBlockFactory(deps);

    const createdSection = createBlockElement('section');
    const createdLayout = createBlockElement('layout');

    expect(createdSection).toBe(sectionEl);
    expect(createdLayout).toBe(layoutEl);

    sectionCallbacks.onMoveUp();
    sectionCallbacks.onMoveDown();
    expect(deps.moveBlock).toHaveBeenCalledWith(sectionEl, -1);
    expect(deps.moveBlock).toHaveBeenCalledWith(sectionEl, 1);

    sectionCallbacks.onDuplicate();
    expect(deps.insertBlockDirectlyBelow).toHaveBeenCalledWith(sectionEl, expect.any(HTMLElement));

    document.body.appendChild(sectionEl);
    sectionCallbacks.onDelete();
    expect(document.body.contains(sectionEl)).toBe(false);

    layoutCallbacks.onDuplicate();
    expect(deps.insertBlockDirectlyBelow).toHaveBeenCalledWith(layoutEl, expect.any(HTMLElement));

    document.body.appendChild(layoutEl);
    layoutCallbacks.onDelete();
    expect(document.body.contains(layoutEl)).toBe(false);
  });

  it('updates selector and list type branches deterministically', () => {
    let selectorChange;
    let listTypeChange;

    const deps = createDeps({
      createBlockSelectorControl: vi.fn(({ onChange }) => {
        selectorChange = onChange;
        const wrap = document.createElement('div');
        wrap.appendChild(document.createElement('input'));
        return wrap;
      }),
      createListTypeSelector: vi.fn((initial, onChange) => {
        listTypeChange = onChange;
        return document.createElement('select');
      }),
      createListContent: vi.fn(() => {
        const ul = document.createElement('ul');
        ul.className = 'editable-list';
        ul.appendChild(document.createElement('li'));
        return ul;
      }),
    });

    const { createBlockElement } = createEditorBlockFactory(deps);
    const listBlock = createBlockElement('list', null, '', 'unordered');

    selectorChange('.custom');
    expect(listBlock.dataset.selector).toBe('.custom');

    listTypeChange('ordered');
    expect(listBlock.dataset.listType).toBe('ordered');
    expect(listBlock.querySelector('ol.editable-list')).not.toBeNull();
    expect(deps.onPreviewRequested).toHaveBeenCalled();
  });

  it('does not render byte indicator for nested blocks', () => {
    const deps = createDeps();
    const { createBlockElement } = createEditorBlockFactory(deps);

    const nestedBlock = createBlockElement('paragraph', null, '', null, null, true);
    expect(nestedBlock.querySelector('.block-byte-indicator')).toBeNull();
  });
});
