/**
 * Editor source loader utilities
 */

import { selectorFromSourceBlock } from '../editor-core.js';

const alignSvgs = {
  left: '<svg width="14" height="14" viewBox="0 0 14 14"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="11" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  center: '<svg width="14" height="14" viewBox="0 0 14 14"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="11" x2="12" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  right: '<svg width="14" height="14" viewBox="0 0 14 14"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="5" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="11" x2="13" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
};

function applySelectorToBlockElement(element, block) {
  if (!element) return element;
  const selector = selectorFromSourceBlock(block);
  element.dataset.selector = selector;
  const selectorInput = element.querySelector('.block-selector-input');
  if (selectorInput) {
    selectorInput.value = selector;
  }
  return element;
}

export function createEditorSourceLoader(deps) {
  let blockElFromSource = null;

  function loadFromSource(sourceData) {
    deps.titleInput.value = sourceData.title || '';
    deps.slugInput.value = sourceData.slug || '';
    deps.pageTypeSelect.value = sourceData.pageType || 'post';

    blockElFromSource = function (block, depth = 0) {
      const isNested = depth > 0;
      if (block.type === 'bloglist') {
        return applySelectorToBlockElement(deps.createBlockElement('bloglist', null, '', null, null, isNested), block);
      }
      if (block.type === 'author') {
        const el = deps.createBlockElement('author', null, '', null, null, isNested);
        el.dataset.showPublished = block.showPublished === false ? 'false' : 'true';
        el.dataset.showModified = block.showModified === false ? 'false' : 'true';
        el.dataset.showAuthor = block.showAuthor === false ? 'false' : 'true';
        el.dataset.tags = Array.isArray(block.tags) ? block.tags.join(', ') : '';

        const toggles = el.querySelectorAll('input[type="checkbox"]');
        if (toggles[0]) toggles[0].checked = el.dataset.showPublished !== 'false';
        if (toggles[1]) toggles[1].checked = el.dataset.showModified !== 'false';
        if (toggles[2]) toggles[2].checked = el.dataset.showAuthor !== 'false';
        const tagsInput = el.querySelector('input[type="text"]');
        if (tagsInput) tagsInput.value = el.dataset.tags || '';

        return applySelectorToBlockElement(el, block);
      }
      if (block.type === 'divider') {
        return applySelectorToBlockElement(deps.createBlockElement('divider', null, '', null, null, isNested), block);
      }
      if (block.type === 'spacer') {
        return applySelectorToBlockElement(deps.createBlockElement('spacer', null, '', null, block.height || '1rem', isNested), block);
      }
      if (block.type === 'codeblock') {
        return applySelectorToBlockElement(deps.createBlockElement('codeblock', null, block.content || '', null, null, isNested), block);
      }
      if (block.type === 'unordered-list' || block.type === 'ordered-list') {
        const listType = block.type === 'ordered-list' ? 'ordered' : 'unordered';
        const el = deps.createBlockElement('list', null, '', listType, null, isNested);
        const listEl = el.querySelector('.editable-list');
        if (listEl && block.items) {
          listEl.innerHTML = '';
          block.items.forEach(item => {
            const li = document.createElement('li');
            li.contentEditable = 'true';
            li.innerHTML = deps.inlineNodesToHtml(item.children);
            listEl.appendChild(li);
          });
          deps.setupListKeyHandlers(listEl);
        }
        return applySelectorToBlockElement(el, block);
      }
      if (block.type === 'section') {
        const el = deps.createBlockElement('section', null, '', null, null, isNested);
        el.dataset.background = block.background || '#ffffff';
        el.dataset.color = block.color || '#000000';
        el.dataset.pattern = block.pattern || '';
        el.dataset.patternColor = block.patternColor || '#ffffff';
        el.dataset.patternOpacity = block.patternOpacity || '0.1';
        el.dataset.width = block.width || '';
        el.dataset.padding = block.padding || '';
        el.dataset.align = block.align || '';

        const bgInput = el.querySelector('.section-controls input[type="color"]');
        if (bgInput) bgInput.value = block.background || '#ffffff';

        const colorInputs = el.querySelectorAll('.section-inner-wrapper input[type="color"]');
        if (colorInputs[1]) colorInputs[1].value = block.color || '#000000';
        if (colorInputs[2]) colorInputs[2].value = block.patternColor || '#ffffff';

        const patternSelect = el.querySelector('.section-pattern-select');
        if (patternSelect) patternSelect.value = block.pattern || '';
        const sectionInnerWrapper = el.querySelector('.section-inner-wrapper');
        if (sectionInnerWrapper) sectionInnerWrapper.classList.toggle('has-pattern', !!block.pattern);

        const opacityInput = el.querySelector('.section-pattern-row input[type="range"]');
        if (opacityInput) opacityInput.value = block.patternOpacity || '0.1';
        const opacityNumber = el.querySelector('.section-opacity-input');
        if (opacityNumber) opacityNumber.value = block.patternOpacity || '0.1';

        const widthInput = el.querySelector('.section-width-input');
        if (widthInput) widthInput.value = block.width || '';

        const paddingInput = el.querySelector('.section-padding-input');
        if (paddingInput) paddingInput.value = block.padding || '';

        const alignSelect = el.querySelector('.section-align-select');
        if (alignSelect) alignSelect.value = block.align || '';

        const preview = el.querySelector('.section-preview');
        if (preview) {
          preview.style.backgroundColor = block.background || '#ffffff';
          preview.style.color = block.color || '#000000';
          preview.style.textAlign = block.align || '';
          if (block.padding) preview.style.setProperty('--sp', block.padding);
          const pClass = deps.Compiler.getPatternClass(block.pattern || '');
          preview.className = 'section-preview ' + pClass;

          const opacity = parseFloat(block.patternOpacity || '0.1');
          const hex = block.patternColor || '#ffffff';
          const r = parseInt(hex.substring(1, 3), 16);
          const g = parseInt(hex.substring(3, 5), 16);
          const b = parseInt(hex.substring(5, 7), 16);
          preview.style.setProperty('--pc', `rgba(${r},${g},${b},${opacity})`);
        }
        if (block.children && block.children.length > 0) {
          const sectionBlocks = el.querySelector('.section-blocks');
          block.children.forEach(child => {
            sectionBlocks.appendChild(blockElFromSource(child, depth + 1));
          });
        }
        return applySelectorToBlockElement(el, block);
      }
      if (block.type === 'layout') {
        const el = deps.createBlockElement('layout', null, '', null, null, isNested);
        const MAX_BLOCKS_PER_CELL = 2;
        const cols = block.columns || 2;
        const rows = block.cells ? Math.ceil(block.cells.length / cols) : 2;

        el.dataset.columns = cols;
        el.dataset.rows = rows;

        const cellsGrid = el.querySelector('.layout-cells-grid');
        if (cellsGrid && block.cells && block.cells.length > 0) {
          cellsGrid.querySelectorAll(':scope > .layout-cell').forEach(c => c.remove());

          block.cells.forEach(cellData => {
            const cellEl = document.createElement('div');
            cellEl.className = 'layout-cell';
            const cellBlocks = document.createElement('div');
            cellBlocks.className = 'layout-cell-blocks';

            const toolbar = document.createElement('div');
            toolbar.className = 'layout-cell-toolbar';

            const alignGroup = document.createElement('div');
            alignGroup.className = 'layout-toolbar-group';
            ['left', 'center', 'right'].forEach(align => {
              const abtn = document.createElement('button');
              abtn.type = 'button';
              abtn.className = 'layout-align-btn';
              abtn.dataset.align = align;
              abtn.innerHTML = alignSvgs[align];
              abtn.title = 'Align ' + align;
              if (cellData.textAlign === align) abtn.classList.add('active');
              abtn.addEventListener('click', (e) => {
                e.stopPropagation();
                cellEl.dataset.textAlign = align;
                cellEl.style.textAlign = align;
                alignGroup.querySelectorAll('.layout-align-btn').forEach(b => b.classList.remove('active'));
                abtn.classList.add('active');
                deps.onPreviewRequested();
              });
              alignGroup.appendChild(abtn);
            });
            toolbar.appendChild(alignGroup);

            const padGroup = document.createElement('label');
            padGroup.className = 'layout-toolbar-input';
            padGroup.innerHTML = '<span>P</span>';
            const padInput = document.createElement('input');
            padInput.type = 'text';
            padInput.placeholder = '0';
            padInput.title = 'Padding';
            if (cellData.padding) {
              padInput.value = cellData.padding;
              cellEl.dataset.padding = cellData.padding;
              cellBlocks.style.padding = cellData.padding;
            }
            padInput.addEventListener('input', () => {
              const value = padInput.value.trim();
              cellEl.dataset.padding = value;
              cellBlocks.style.padding = value || '';
              deps.onPreviewRequested();
            });
            padGroup.appendChild(padInput);
            toolbar.appendChild(padGroup);

            const marGroup = document.createElement('label');
            marGroup.className = 'layout-toolbar-input';
            marGroup.innerHTML = '<span>M</span>';
            const marInput = document.createElement('input');
            marInput.type = 'text';
            marInput.placeholder = '0';
            marInput.title = 'Margin';
            if (cellData.margin) {
              marInput.value = cellData.margin;
              cellEl.dataset.margin = cellData.margin;
              cellBlocks.style.margin = cellData.margin;
            }
            marInput.addEventListener('input', () => {
              const value = marInput.value.trim();
              cellEl.dataset.margin = value;
              cellBlocks.style.margin = value || '';
              deps.onPreviewRequested();
            });
            marGroup.appendChild(marInput);
            toolbar.appendChild(marGroup);

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'layout-toolbar-delete';
            delBtn.textContent = '×';
            delBtn.title = 'Delete block';
            delBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const cb = cellEl.querySelector('.layout-cell-blocks');
              cb.innerHTML = '';
              cellEl.classList.remove('layout-cell-maxed');
              deps.onPreviewRequested();
            });
            toolbar.appendChild(delBtn);

            cellEl.appendChild(toolbar);

            if (cellData.textAlign) {
              cellEl.dataset.textAlign = cellData.textAlign;
              cellEl.style.textAlign = cellData.textAlign;
            }

            if (cellData.children && cellData.children.length > 0) {
              cellData.children.slice(0, MAX_BLOCKS_PER_CELL).forEach((child) => {
                cellBlocks.appendChild(blockElFromSource(child, depth + 1));
              });
            }
            cellEl.appendChild(cellBlocks);

            const updateCellCapacityState = () => {
              const blockCount = cellBlocks.querySelectorAll(':scope > .block-item').length;
              const isMaxed = blockCount >= MAX_BLOCKS_PER_CELL;
              cellEl.classList.toggle('layout-cell-maxed', isMaxed);
              if (isMaxed) dropdown.classList.add('hidden');
            };

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'layout-cell-add-btn';
            addBtn.textContent = '+';
            addBtn.title = 'Add block';

            const dropdown = document.createElement('div');
            dropdown.className = 'layout-cell-dropdown hidden';
            const innerTypes = [
              { type: 'paragraph', label: 'Paragraph' },
              { type: 'heading', label: 'H1', level: '1' },
              { type: 'heading', label: 'H2', level: '2' },
              { type: 'heading', label: 'H3', level: '3' },
              { type: 'heading', label: 'H4', level: '4' },
              { type: 'heading', label: 'H5', level: '5' },
              { type: 'heading', label: 'H6', level: '6' },
              { type: 'list', label: 'List', listType: 'unordered' },
              { type: 'divider', label: 'Divider' },
              { type: 'spacer', label: 'Spacer' }
            ];
            innerTypes.forEach(t => {
              const b = document.createElement('button');
              b.type = 'button';
              b.textContent = t.label;
              b.addEventListener('click', (e) => {
                e.stopPropagation();
                const currentCount = cellBlocks.querySelectorAll(':scope > .block-item').length;
                if (currentCount >= MAX_BLOCKS_PER_CELL) {
                  dropdown.classList.add('hidden');
                  return;
                }
                const newBlock = deps.createBlockElement(t.type, t.level, '', t.listType, t.spacerHeight, true);
                cellBlocks.appendChild(newBlock);
                dropdown.classList.add('hidden');
                updateCellCapacityState();
                const focusTarget = newBlock.querySelector('li[contenteditable="true"]') || newBlock.querySelector('.block-content');
                if (focusTarget) focusTarget.focus();
                deps.onPreviewRequested();
              });
              dropdown.appendChild(b);
            });

            addBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const currentCount = cellBlocks.querySelectorAll(':scope > .block-item').length;
              if (currentCount >= MAX_BLOCKS_PER_CELL) {
                dropdown.classList.add('hidden');
                return;
              }
              dropdown.classList.toggle('hidden');
            });
            document.addEventListener('click', () => dropdown.classList.add('hidden'));

            cellEl.appendChild(addBtn);
            cellEl.appendChild(dropdown);
            updateCellCapacityState();

            cellsGrid.appendChild(cellEl);
          });

          cellsGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
          cellsGrid.style.gridTemplateRows = `repeat(${rows}, auto)`;
        }

        return applySelectorToBlockElement(el, block);
      }
      if (block.type === 'heading') {
        return applySelectorToBlockElement(deps.createBlockElement('heading', block.level, deps.inlineNodesToHtml(block.children), null, null, isNested), block);
      }
      if (block.type === 'blockquote') {
        return applySelectorToBlockElement(deps.createBlockElement('blockquote', null, deps.inlineNodesToHtml(block.children), null, null, isNested), block);
      }
      return applySelectorToBlockElement(deps.createBlockElement('paragraph', null, deps.inlineNodesToHtml(block.children), null, null, isNested), block);
    };

    deps.blockEditor.innerHTML = '';
    if (sourceData.content && sourceData.content.length > 0) {
      sourceData.content.forEach(block => {
        deps.blockEditor.appendChild(blockElFromSource(block));
      });
    } else {
      deps.blockEditor.appendChild(deps.createBlockElement('paragraph'));
    }

    if (sourceData.titleOverride && typeof sourceData.titleOverride === 'object' && sourceData.titleOverride.enabled) {
      deps.titleOverrideEnabled.checked = true;
      deps.titleOverrideEnabled.dispatchEvent(new Event('change'));
      deps.titleOverrideInput.value = sourceData.titleOverride.title || '';
    } else if (typeof sourceData.titleOverride === 'string' && sourceData.titleOverride) {
      deps.titleOverrideEnabled.checked = true;
      deps.titleOverrideEnabled.dispatchEvent(new Event('change'));
      deps.titleOverrideInput.value = sourceData.titleOverride;
    } else {
      deps.titleOverrideEnabled.checked = false;
      deps.titleOverrideEnabled.dispatchEvent(new Event('change'));
    }

    if (sourceData.navigation && sourceData.navigation.items && sourceData.navigation.items.length > 0) {
      deps.navEnabled.checked = true;
      deps.navEnabled.dispatchEvent(new Event('change'));
      deps.navLinks.innerHTML = '';
      sourceData.navigation.items.forEach(link => {
        deps.navLinks.appendChild(deps.createNavChip(link.text, link.href));
      });
    } else {
      deps.navEnabled.checked = false;
      deps.navEnabled.dispatchEvent(new Event('change'));
      deps.loadGlobalNavigation();
    }

    if (sourceData.footer && sourceData.footer.content) {
      deps.footerEnabled.checked = true;
      deps.footerEnabled.dispatchEvent(new Event('change'));
      deps.footerText.value = sourceData.footer.content;
    } else {
      deps.footerEnabled.checked = false;
      deps.footerEnabled.dispatchEvent(new Event('change'));
      deps.loadGlobalFooter();
    }

    if (sourceData.meta) {
      deps.metaEnabled.checked = true;
      deps.metaEnabled.dispatchEvent(new Event('change'));
      deps.metaDescription.value = sourceData.meta.description || '';
      deps.metaAuthor.value = sourceData.meta.author || '';
    } else {
      deps.metaEnabled.checked = false;
      deps.metaEnabled.dispatchEvent(new Event('change'));
      deps.loadGlobalMeta();
    }

    if (sourceData.css && sourceData.css.rules) {
      deps.cssEnabled.checked = true;
      deps.cssEnabled.dispatchEvent(new Event('change'));
      deps.cssRules.value = sourceData.css.rules;
    } else {
      deps.cssEnabled.checked = false;
      deps.cssEnabled.dispatchEvent(new Event('change'));
      deps.loadGlobalCSS();
    }
  }

  return {
    loadFromSource,
    getBlockElFromSource: () => blockElFromSource
  };
}