import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEditorSourceLoader } from '../../public/admin/lib/editor/source-loader.js';

function makeBaseBlockElement(type) {
  const block = document.createElement('div');
  block.className = 'block-item';
  block.dataset.type = type;

  const selectorInput = document.createElement('input');
  selectorInput.className = 'block-selector-input';
  block.appendChild(selectorInput);

  if (type === 'list') {
    const list = document.createElement('ul');
    list.className = 'editable-list';
    block.appendChild(list);
  }

  return block;
}

function makeSectionBlockElement() {
  const block = makeBaseBlockElement('section');

  const controls = document.createElement('div');
  controls.className = 'section-controls';
  const bgInput = document.createElement('input');
  bgInput.type = 'color';
  controls.appendChild(bgInput);
  block.appendChild(controls);

  const inner = document.createElement('div');
  inner.className = 'section-inner-wrapper';
  const c1 = document.createElement('input');
  c1.type = 'color';
  const c2 = document.createElement('input');
  c2.type = 'color';
  const c3 = document.createElement('input');
  c3.type = 'color';
  inner.append(c1, c2, c3);
  block.appendChild(inner);

  const patternSelect = document.createElement('select');
  patternSelect.className = 'section-pattern-select';
  block.appendChild(patternSelect);

  const patternRow = document.createElement('div');
  patternRow.className = 'section-pattern-row';
  const opacityRange = document.createElement('input');
  opacityRange.type = 'range';
  patternRow.appendChild(opacityRange);
  block.appendChild(patternRow);

  const opacityInput = document.createElement('input');
  opacityInput.className = 'section-opacity-input';
  block.appendChild(opacityInput);

  const widthInput = document.createElement('input');
  widthInput.className = 'section-width-input';
  block.appendChild(widthInput);

  const paddingInput = document.createElement('input');
  paddingInput.className = 'section-padding-input';
  block.appendChild(paddingInput);

  const alignSelect = document.createElement('select');
  alignSelect.className = 'section-align-select';
  block.appendChild(alignSelect);

  const preview = document.createElement('div');
  preview.className = 'section-preview';
  block.appendChild(preview);

  const sectionBlocks = document.createElement('div');
  sectionBlocks.className = 'section-blocks';
  block.appendChild(sectionBlocks);

  return block;
}

function makeLayoutBlockElement() {
  const block = makeBaseBlockElement('layout');
  const grid = document.createElement('div');
  grid.className = 'layout-cells-grid';
  const existingCell = document.createElement('div');
  existingCell.className = 'layout-cell';
  grid.appendChild(existingCell);
  block.appendChild(grid);
  return block;
}

function createDeps() {
  const titleInput = document.createElement('input');
  const slugInput = document.createElement('input');
  const pageTypeSelect = document.createElement('select');
  const postOption = document.createElement('option');
  postOption.value = 'post';
  postOption.textContent = 'post';
  const pageOption = document.createElement('option');
  pageOption.value = 'page';
  pageOption.textContent = 'page';
  pageTypeSelect.append(postOption, pageOption);

  const titleOverrideEnabled = document.createElement('input');
  titleOverrideEnabled.type = 'checkbox';
  const titleOverrideInput = document.createElement('input');

  const navEnabled = document.createElement('input');
  navEnabled.type = 'checkbox';
  const navLinks = document.createElement('div');

  const footerEnabled = document.createElement('input');
  footerEnabled.type = 'checkbox';
  const footerText = document.createElement('textarea');

  const metaEnabled = document.createElement('input');
  metaEnabled.type = 'checkbox';
  const metaDescription = document.createElement('textarea');
  const metaAuthor = document.createElement('input');

  const cssEnabled = document.createElement('input');
  cssEnabled.type = 'checkbox';
  const cssRules = document.createElement('textarea');

  const blockEditor = document.createElement('div');

  document.body.append(
    titleInput,
    slugInput,
    pageTypeSelect,
    titleOverrideEnabled,
    titleOverrideInput,
    navEnabled,
    navLinks,
    footerEnabled,
    footerText,
    metaEnabled,
    metaDescription,
    metaAuthor,
    cssEnabled,
    cssRules,
    blockEditor
  );

  return {
    titleInput,
    slugInput,
    pageTypeSelect,
    titleOverrideEnabled,
    titleOverrideInput,
    navEnabled,
    navLinks,
    footerEnabled,
    footerText,
    metaEnabled,
    metaDescription,
    metaAuthor,
    cssEnabled,
    cssRules,
    blockEditor,

    createBlockElement: vi.fn((type, level, html, listType) => {
      if (type === 'section') return makeSectionBlockElement();
      if (type === 'layout') return makeLayoutBlockElement();
      if (type === 'unordered-list' || type === 'ordered-list' || type === 'list') return makeBaseBlockElement('list');
      return makeBaseBlockElement(type);
    }),
    inlineNodesToHtml: vi.fn((children) => (children?.[0]?.text ? children[0].text : '')),
    setupListKeyHandlers: vi.fn(),
    createNavChip: vi.fn((text, href) => {
      const chip = document.createElement('span');
      chip.className = 'nav-chip';
      chip.textContent = text;
      chip.dataset.href = href;
      return chip;
    }),
    loadGlobalNavigation: vi.fn(),
    loadGlobalFooter: vi.fn(),
    loadGlobalMeta: vi.fn(),
    loadGlobalCSS: vi.fn(),
    onPreviewRequested: vi.fn(),
    Compiler: { getPatternClass: vi.fn(() => '') },
  };
}

describe('editor/source-loader', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('loads source fields and applies selector to restored block', () => {
    const deps = createDeps();
    const loader = createEditorSourceLoader(deps);

    const source = {
      title: 'Loaded Title',
      slug: 'loaded-slug',
      pageType: 'page',
      content: [
        {
          type: 'heading',
          level: 2,
          selector: '#hero.big',
          children: [{ type: 'text', text: 'Welcome' }],
        },
      ],
      titleOverride: { enabled: true, title: 'Browser Title' },
      navigation: { items: [{ text: 'Home', href: '/index.html' }] },
      footer: { content: 'Footer Text' },
      meta: { description: 'Desc', author: 'Author' },
      css: { rules: 'body{margin:0}' },
    };

    loader.loadFromSource(source);

    expect(deps.titleInput.value).toBe('Loaded Title');
    expect(deps.slugInput.value).toBe('loaded-slug');
    expect(deps.pageTypeSelect.value).toBe('page');

    const block = deps.blockEditor.querySelector('.block-item');
    expect(block).not.toBeNull();
    expect(block.dataset.selector).toBe('#hero.big');
    expect(block.querySelector('.block-selector-input')?.value).toBe('#hero.big');

    expect(deps.titleOverrideEnabled.checked).toBe(true);
    expect(deps.titleOverrideInput.value).toBe('Browser Title');
    expect(deps.navEnabled.checked).toBe(true);
    expect(deps.navLinks.querySelectorAll('.nav-chip').length).toBe(1);
    expect(deps.footerEnabled.checked).toBe(true);
    expect(deps.footerText.value).toBe('Footer Text');
    expect(deps.metaEnabled.checked).toBe(true);
    expect(deps.cssEnabled.checked).toBe(true);
    expect(deps.cssRules.value).toBe('body{margin:0}');
  });

  it('uses global fallbacks and paragraph placeholder for empty source content', () => {
    const deps = createDeps();
    const loader = createEditorSourceLoader(deps);

    loader.loadFromSource({
      title: '',
      slug: '',
      pageType: 'post',
      content: [],
      navigation: null,
      footer: null,
      meta: null,
      css: null,
    });

    expect(deps.blockEditor.querySelectorAll('.block-item').length).toBe(1);
    expect(deps.loadGlobalNavigation).toHaveBeenCalled();
    expect(deps.loadGlobalFooter).toHaveBeenCalled();
    expect(deps.loadGlobalMeta).toHaveBeenCalled();
    expect(deps.loadGlobalCSS).toHaveBeenCalled();
    expect(deps.navEnabled.checked).toBe(false);
    expect(deps.footerEnabled.checked).toBe(false);
    expect(deps.metaEnabled.checked).toBe(false);
    expect(deps.cssEnabled.checked).toBe(false);
  });

  it('restores section/layout/list structures and wires layout interactions', () => {
    const deps = createDeps();
    const loader = createEditorSourceLoader(deps);

    loader.loadFromSource({
      title: 'Complex',
      slug: 'complex',
      pageType: 'post',
      content: [
        {
          type: 'unordered-list',
          selector: '.list-a',
          items: [{ children: [{ type: 'text', text: 'One' }] }],
        },
        {
          type: 'section',
          selector: '#hero.section',
          background: '#112233',
          color: '#ffffff',
          pattern: 'dots',
          patternColor: '#abcdef',
          patternOpacity: '0.2',
          width: '80%',
          padding: '2rem',
          align: 'center',
          children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Inside section' }] }],
        },
        {
          type: 'layout',
          selector: '.grid-main',
          columns: 1,
          cells: [
            {
              textAlign: 'right',
              padding: '4px',
              margin: '2px',
              children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Cell content' }] }],
            },
          ],
        },
      ],
      navigation: null,
      footer: null,
      meta: null,
      css: null,
    });

    expect(deps.setupListKeyHandlers).toHaveBeenCalled();

    const section = deps.blockEditor.querySelector('[data-type="section"]');
    expect(section).not.toBeNull();
    expect(section.dataset.selector).toBe('#hero.section');
    expect(section.querySelector('.section-preview')?.style.textAlign).toBe('center');

    const layout = deps.blockEditor.querySelector('[data-type="layout"]');
    expect(layout).not.toBeNull();
    expect(layout.dataset.columns).toBe('1');

    const alignBtn = layout.querySelector('.layout-align-btn[data-align="center"]');
    alignBtn.click();
    const cell = layout.querySelector('.layout-cell');
    expect(cell.dataset.textAlign).toBe('center');

    const [padInput, , widthInput] = layout.querySelectorAll('.layout-toolbar-input input');
    padInput.value = '8px';
    padInput.dispatchEvent(new Event('input'));
    expect(cell.dataset.padding).toBe('8px');

    widthInput.value = '70%';
    widthInput.dispatchEvent(new Event('input'));
    expect(cell.dataset.width).toBe('70%');

    const addBtn = layout.querySelector('.layout-cell-add-btn');
    addBtn.click();
    const dropdownFirst = layout.querySelector('.layout-cell-dropdown button');
    dropdownFirst.click();
    expect(deps.onPreviewRequested).toHaveBeenCalled();

    const deleteBtn = layout.querySelector('.layout-toolbar-delete');
    deleteBtn.click();
    expect(cell.querySelector('.layout-cell-blocks').children.length).toBe(0);
  });

  it('restores up to two blocks per layout cell', () => {
    const deps = createDeps();
    const loader = createEditorSourceLoader(deps);

    loader.loadFromSource({
      title: 'Two items',
      slug: 'two-items',
      pageType: 'post',
      content: [
        {
          type: 'layout',
          columns: 1,
          cells: [
            {
              children: [
                { type: 'heading', level: 2, children: [{ type: 'text', text: 'Headline' }] },
                { type: 'paragraph', children: [{ type: 'text', text: 'Body text' }] },
              ],
            },
          ],
        },
      ],
      navigation: null,
      footer: null,
      meta: null,
      css: null,
    });

    const layout = deps.blockEditor.querySelector('[data-type="layout"]');
    const cell = layout.querySelector('.layout-cell');
    const cellBlocks = cell.querySelector('.layout-cell-blocks');

    expect(cellBlocks.children.length).toBe(2);
    expect(cell.classList.contains('layout-cell-maxed')).toBe(true);
  });
});
