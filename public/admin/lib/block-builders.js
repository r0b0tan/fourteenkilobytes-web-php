/**
 * Block Builders Module
 *
 * Complex block builders for Section and Layout blocks.
 * These are extracted from createBlockElement() for better maintainability.
 */

import { createBlockActions, createByteIndicator } from './block-ui-utils.js';

// Alignment SVG icons
const alignSvgs = {
  left: '<svg width="14" height="14" viewBox="0 0 14 14"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="7" x2="9" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="1" y1="11" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  center: '<svg width="14" height="14" viewBox="0 0 14 14"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="7" x2="11" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="2" y1="11" x2="12" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  right: '<svg width="14" height="14" viewBox="0 0 14 14"><line x1="1" y1="3" x2="13" y2="3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="5" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="11" x2="13" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
};

/**
 * Creates a Section block element
 * @param {Object} config - Configuration object
 * @param {boolean} config.isNested - Whether this is a nested block
 * @param {Object} config.callbacks - Callback functions
 * @param {Function} config.callbacks.onSelectorChange - Called when CSS selector changes
 * @param {Function} config.callbacks.onMoveUp - Called when move up clicked
 * @param {Function} config.callbacks.onMoveDown - Called when move down clicked
 * @param {Function} config.callbacks.onDuplicate - Called when duplicate clicked
 * @param {Function} config.callbacks.onDelete - Called when delete clicked
 * @param {Function} config.callbacks.onChange - Called when any section property changes
 * @param {Function} config.callbacks.createInnerAddBlock - Function to create inner add block
 * @param {Object} config.Compiler - Compiler module with getPatternClass method
 * @returns {HTMLElement} Section block element
 */
export function createSectionBlock(config) {
  const { isNested, callbacks, Compiler } = config;

  const block = document.createElement('div');
  block.className = 'block-item block-section';
  block.dataset.type = 'section';
  block.dataset.selector = '';
  block.dataset.background = '#ffffff';
  block.dataset.color = '#000000';
  block.dataset.pattern = '';
  block.dataset.width = '';
  block.dataset.padding = '';
  block.dataset.align = '';

  // Header with label and actions
  const header = document.createElement('div');
  header.className = 'block-header';

  const label = document.createElement('span');
  label.className = 'block-type-label';
  label.setAttribute('data-i18n', 'editor.blockSection');
  label.textContent = 'Section';
  header.appendChild(label);

  const actions = createBlockActions({
    onSelectorChange: (value) => {
      block.dataset.selector = value;
      if (callbacks.onChange) callbacks.onChange();
    },
    onMoveUp: callbacks.onMoveUp,
    onMoveDown: callbacks.onMoveDown,
    onDuplicate: callbacks.onDuplicate,
    onDelete: callbacks.onDelete
  }, {
    includeSelector: !isNested,
    selectorValue: ''
  });

  header.appendChild(actions);
  block.appendChild(header);

  // Wrapper for content (controls + preview)
  const contentWrapper = document.createElement('div');
  contentWrapper.className = 'section-inner-wrapper';
  block.appendChild(contentWrapper);

  // Preview area with section background
  const preview = document.createElement('div');
  preview.className = 'section-preview';
  preview.style.backgroundColor = '#ffffff';
  preview.style.color = '#000000';

  const sectionBlocks = document.createElement('div');
  sectionBlocks.className = 'section-blocks';
  preview.appendChild(sectionBlocks);

  // Controls row: color pickers + pattern selector
  const controls = document.createElement('div');
  controls.className = 'section-controls';

  // Background color
  const bgLabel = document.createElement('label');
  bgLabel.innerHTML = '<span data-i18n="editor.sectionBackground">Background</span>:';
  const bgInput = document.createElement('input');
  bgInput.type = 'color';
  bgInput.value = '#ffffff';
  bgInput.addEventListener('input', () => {
    block.dataset.background = bgInput.value;
    preview.style.backgroundColor = bgInput.value;
    if (callbacks.onChange) callbacks.onChange();
  });
  bgLabel.appendChild(bgInput);
  controls.appendChild(bgLabel);

  // Text color
  const colorLabel = document.createElement('label');
  colorLabel.innerHTML = '<span data-i18n="editor.sectionTextColor">Text Color</span>:';
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = '#000000';
  colorInput.addEventListener('input', () => {
    block.dataset.color = colorInput.value;
    preview.style.color = colorInput.value;
    if (callbacks.onChange) callbacks.onChange();
  });
  colorLabel.appendChild(colorInput);
  controls.appendChild(colorLabel);

  // Section Width
  const swLabel = document.createElement('label');
  swLabel.innerHTML = '<span data-i18n="editor.sectionWidth">Width</span>:';
  const swInput = document.createElement('input');
  swInput.type = 'text';
  swInput.className = 'section-width-input';
  swInput.placeholder = '100%';
  swInput.value = '';
  swInput.addEventListener('input', () => {
    block.dataset.width = swInput.value.trim();
    if (callbacks.onChange) callbacks.onChange();
  });
  swLabel.appendChild(swInput);
  controls.appendChild(swLabel);

  // Section Padding
  const spLabel = document.createElement('label');
  spLabel.innerHTML = '<span data-i18n="editor.sectionPadding">Padding</span>:';
  const spInput = document.createElement('input');
  spInput.type = 'text';
  spInput.className = 'section-padding-input';
  spInput.placeholder = '3rem';
  spInput.value = '';
  spInput.addEventListener('input', () => {
    block.dataset.padding = spInput.value.trim();
    preview.style.setProperty('--sp', spInput.value.trim());
    if (callbacks.onChange) callbacks.onChange();
  });
  spLabel.appendChild(spInput);
  controls.appendChild(spLabel);

  // Section Align
  const alLabel = document.createElement('label');
  alLabel.innerHTML = '<span data-i18n="editor.sectionAlign">Align</span>:';
  const alSelect = document.createElement('select');
  alSelect.className = 'section-align-select';
  const alOptions = [
    { value: '', label: 'Default' },
    { value: 'left', label: 'Left' },
    { value: 'center', label: 'Center' },
    { value: 'right', label: 'Right' }
  ];
  alOptions.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    alSelect.appendChild(o);
  });
  alSelect.addEventListener('change', () => {
    block.dataset.align = alSelect.value;
    preview.style.textAlign = alSelect.value;
    if (callbacks.onChange) callbacks.onChange();
  });
  alLabel.appendChild(alSelect);
  controls.appendChild(alLabel);

  // Pattern selector
  const patternLabel = document.createElement('label');
  patternLabel.innerHTML = '<span data-i18n="editor.sectionPattern">Pattern</span>:';
  const patternSelect = document.createElement('select');
  patternSelect.className = 'section-pattern-select';
  const patternOptions = [
    { value: '', i18n: 'editor.sectionPatternNone', label: 'No Pattern' },
    { value: 'dots', i18n: 'editor.sectionPatternDots', label: 'Dots' },
    { value: 'grid', i18n: 'editor.sectionPatternGrid', label: 'Grid' },
    { value: 'stripes', i18n: 'editor.sectionPatternStripes', label: 'Stripes' },
    { value: 'cross', i18n: 'editor.sectionPatternCross', label: 'Crosshatch' },
    { value: 'hexagons', i18n: 'editor.sectionPatternHexagons', label: 'Hexagons' }
  ];
  patternOptions.forEach(opt => {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    o.setAttribute('data-i18n', opt.i18n);
    patternSelect.appendChild(o);
  });
  patternSelect.addEventListener('change', () => {
    block.dataset.pattern = patternSelect.value;
    const patternClass = Compiler.getPatternClass(patternSelect.value);
    preview.className = 'section-preview ' + patternClass;
    contentWrapper.classList.toggle('has-pattern', !!patternSelect.value);
    if (callbacks.onChange) callbacks.onChange();
  });
  patternLabel.appendChild(patternSelect);
  controls.appendChild(patternLabel);

  // Pattern sub-options row
  const patternRow = document.createElement('div');
  patternRow.className = 'section-pattern-row section-pattern-opts';

  // Pattern Color
  const pcLabel = document.createElement('label');
  pcLabel.innerHTML = '<span data-i18n="editor.sectionPatternColor">Pattern Color</span>:';
  const pcInput = document.createElement('input');
  pcInput.type = 'color';
  pcInput.value = '#ffffff';
  pcInput.addEventListener('input', () => {
    block.dataset.patternColor = pcInput.value;
    const opacity = parseFloat(block.dataset.patternOpacity || '0.1');
    const hex = pcInput.value;
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    preview.style.setProperty('--pc', `rgba(${r},${g},${b},${opacity})`);
    if (callbacks.onChange) callbacks.onChange();
  });
  pcLabel.appendChild(pcInput);
  patternRow.appendChild(pcLabel);

  // Pattern Opacity
  const poLabel = document.createElement('label');
  poLabel.innerHTML = '<span data-i18n="editor.sectionPatternOpacity">Opacity</span>:';
  const poInput = document.createElement('input');
  poInput.type = 'range';
  poInput.min = '0';
  poInput.max = '1';
  poInput.step = '0.05';
  poInput.value = '0.1';
  const poNumber = document.createElement('input');
  poNumber.type = 'number';
  poNumber.className = 'section-opacity-input';
  poNumber.min = '0';
  poNumber.max = '1';
  poNumber.step = '0.05';
  poNumber.value = '0.1';

  function updateOpacity(val) {
    block.dataset.patternOpacity = val;
    const opacity = parseFloat(val);
    const hex = block.dataset.patternColor || '#ffffff';
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    preview.style.setProperty('--pc', `rgba(${r},${g},${b},${opacity})`);
    if (callbacks.onChange) callbacks.onChange();
  }

  poInput.addEventListener('input', () => {
    poNumber.value = poInput.value;
    updateOpacity(poInput.value);
  });
  poNumber.addEventListener('input', () => {
    poInput.value = poNumber.value;
    updateOpacity(poNumber.value);
  });
  poLabel.appendChild(poInput);
  poLabel.appendChild(poNumber);
  patternRow.appendChild(poLabel);

  contentWrapper.appendChild(controls);
  contentWrapper.appendChild(patternRow);

  // Inner add-block button
  if (callbacks.createInnerAddBlock) {
    preview.appendChild(callbacks.createInnerAddBlock(block));
  }

  contentWrapper.appendChild(preview);

  // Byte indicator
  block.appendChild(createByteIndicator());

  return block;
}

/**
 * Creates a Layout block element
 * @param {Object} config - Configuration object
 * @param {boolean} config.isNested - Whether this is a nested block
 * @param {Object} config.callbacks - Callback functions
 * @param {Function} config.callbacks.onSelectorChange - Called when CSS selector changes
 * @param {Function} config.callbacks.onMoveUp - Called when move up clicked
 * @param {Function} config.callbacks.onMoveDown - Called when move down clicked
 * @param {Function} config.callbacks.onDuplicate - Called when duplicate clicked
 * @param {Function} config.callbacks.onDelete - Called when delete clicked
 * @param {Function} config.callbacks.onChange - Called when any layout property changes
 * @param {Function} config.callbacks.createBlockElement - Function to create nested blocks
 * @returns {HTMLElement} Layout block element
 */
export function createLayoutBlock(config) {
  const { isNested, callbacks } = config;
  const MAX_BLOCKS_PER_CELL = 2;

  const block = document.createElement('div');
  block.className = 'block-item block-layout';
  block.dataset.type = 'layout';
  block.dataset.selector = '';
  block.dataset.columns = '2';
  block.dataset.rows = '2';

  // Header with label and actions
  const header = document.createElement('div');
  header.className = 'block-header';

  const label = document.createElement('span');
  label.className = 'block-type-label';
  label.setAttribute('data-i18n', 'editor.blockLayout');
  label.textContent = 'Layout';
  header.appendChild(label);

  const actions = createBlockActions({
    onSelectorChange: (value) => {
      block.dataset.selector = value;
      if (callbacks.onChange) callbacks.onChange();
    },
    onMoveUp: callbacks.onMoveUp,
    onMoveDown: callbacks.onMoveDown,
    onDuplicate: callbacks.onDuplicate,
    onDelete: callbacks.onDelete
  }, {
    includeSelector: !isNested,
    selectorValue: ''
  });

  header.appendChild(actions);
  block.appendChild(header);

  // Cells grid
  const cellsGrid = document.createElement('div');
  cellsGrid.className = 'layout-cells-grid';

  // Rebuild grid function
  function rebuildGrid() {
    const cols = parseInt(block.dataset.columns);
    const rows = parseInt(block.dataset.rows);
    cellsGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    cellsGrid.style.gridTemplateRows = `repeat(${rows}, auto)`;

    const totalCells = cols * rows;
    const currentCells = cellsGrid.querySelectorAll(':scope > .layout-cell');

    // Remove excess cells
    if (currentCells.length > totalCells) {
      for (let i = totalCells; i < currentCells.length; i++) {
        currentCells[i].remove();
      }
    }

    // Add missing cells
    while (cellsGrid.querySelectorAll(':scope > .layout-cell').length < totalCells) {
      cellsGrid.appendChild(createLayoutCell());
    }

    if (callbacks.onChange) callbacks.onChange();
  }

  // Create layout cell function
  function createLayoutCell() {
    const cell = document.createElement('div');
    cell.className = 'layout-cell';
    const cellBlocks = document.createElement('div');
    cellBlocks.className = 'layout-cell-blocks';

    // Cell toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'layout-cell-toolbar';

    // Alignment buttons
    const alignGroup = document.createElement('div');
    alignGroup.className = 'layout-toolbar-group';
    ['left', 'center', 'right'].forEach(align => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'layout-align-btn';
      btn.dataset.align = align;
      btn.innerHTML = alignSvgs[align];
      btn.title = 'Align ' + align;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        cell.dataset.textAlign = align;
        cell.style.textAlign = align;
        alignGroup.querySelectorAll('.layout-align-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (callbacks.onChange) callbacks.onChange();
      });
      alignGroup.appendChild(btn);
    });
    toolbar.appendChild(alignGroup);

    // Padding input
    const padGroup = document.createElement('label');
    padGroup.className = 'layout-toolbar-input';
    padGroup.innerHTML = '<span>P</span>';
    const padInput = document.createElement('input');
    padInput.type = 'text';
    padInput.placeholder = '0';
    padInput.title = 'Padding (z.B. 1rem, 8px)';
    padInput.addEventListener('input', () => {
      const value = padInput.value.trim();
      cell.dataset.padding = value;
      cellBlocks.style.padding = value || '';
      if (callbacks.onChange) callbacks.onChange();
    });
    padGroup.appendChild(padInput);
    toolbar.appendChild(padGroup);

    // Margin input
    const marGroup = document.createElement('label');
    marGroup.className = 'layout-toolbar-input';
    marGroup.innerHTML = '<span>M</span>';
    const marInput = document.createElement('input');
    marInput.type = 'text';
    marInput.placeholder = '0';
    marInput.title = 'Margin (z.B. 1rem, 8px)';
    marInput.addEventListener('input', () => {
      const value = marInput.value.trim();
      cell.dataset.margin = value;
      cellBlocks.style.margin = value || '';
      if (callbacks.onChange) callbacks.onChange();
    });
    marGroup.appendChild(marInput);
    toolbar.appendChild(marGroup);

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'layout-toolbar-delete';
    delBtn.textContent = '×';
    delBtn.title = 'Delete block';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const cellBlocks = cell.querySelector('.layout-cell-blocks');
      cellBlocks.innerHTML = '';
      updateCellCapacityState();
      if (callbacks.onChange) callbacks.onChange();
    });
    toolbar.appendChild(delBtn);

    cell.appendChild(toolbar);
    cell.appendChild(cellBlocks);

    function updateCellCapacityState() {
      const blockCount = cellBlocks.querySelectorAll(':scope > .block-item').length;
      const isMaxed = blockCount >= MAX_BLOCKS_PER_CELL;
      cell.classList.toggle('layout-cell-maxed', isMaxed);
      if (isMaxed) dropdown.classList.add('hidden');
    }

    // Add block button with dropdown
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'layout-cell-add-btn';
    addBtn.textContent = '+';
    addBtn.title = 'Add block';

    const dropdown = document.createElement('div');
    dropdown.className = 'layout-cell-dropdown hidden';
    const innerTypes = [
      { type: 'paragraph', label: 'Paragraph' },
      { type: 'heading', label: 'Heading', level: '2' },
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
        if (callbacks.createBlockElement) {
          const childBlock = callbacks.createBlockElement(t.type, t.level, '', t.listType, t.spacerHeight, true);
          cellBlocks.appendChild(childBlock);
          dropdown.classList.add('hidden');
          updateCellCapacityState();
          const focusTarget = childBlock.querySelector('li[contenteditable="true"]') || childBlock.querySelector('.block-content');
          if (focusTarget) focusTarget.focus();
          if (callbacks.onChange) callbacks.onChange();
        }
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

    cell.appendChild(addBtn);
    cell.appendChild(dropdown);

    updateCellCapacityState();

    return cell;
  }

  // Column controls
  const colControls = document.createElement('div');
  colControls.className = 'layout-col-controls';
  const colLabel = document.createElement('span');
  colLabel.className = 'layout-control-label';
  colLabel.textContent = 'Col';
  const removeColBtn = document.createElement('button');
  removeColBtn.type = 'button';
  removeColBtn.className = 'layout-control-btn';
  removeColBtn.textContent = '−';
  removeColBtn.title = 'Remove column';
  removeColBtn.addEventListener('click', () => {
    const cols = parseInt(block.dataset.columns);
    if (cols > 1) {
      block.dataset.columns = cols - 1;
      rebuildGrid();
    }
  });
  const addColBtn = document.createElement('button');
  addColBtn.type = 'button';
  addColBtn.className = 'layout-control-btn';
  addColBtn.textContent = '+';
  addColBtn.title = 'Add column';
  addColBtn.addEventListener('click', () => {
    const cols = parseInt(block.dataset.columns);
    block.dataset.columns = Math.min(cols + 1, 6);
    rebuildGrid();
  });
  colControls.appendChild(removeColBtn);
  colControls.appendChild(colLabel);
  colControls.appendChild(addColBtn);
  cellsGrid.appendChild(colControls);

  // Row controls
  const rowControls = document.createElement('div');
  rowControls.className = 'layout-row-controls';
  const rowLabel = document.createElement('span');
  rowLabel.className = 'layout-control-label';
  rowLabel.textContent = 'Row';
  const removeRowBtn = document.createElement('button');
  removeRowBtn.type = 'button';
  removeRowBtn.className = 'layout-control-btn';
  removeRowBtn.textContent = '−';
  removeRowBtn.title = 'Remove row';
  removeRowBtn.addEventListener('click', () => {
    const rows = parseInt(block.dataset.rows);
    if (rows > 1) {
      block.dataset.rows = rows - 1;
      rebuildGrid();
    }
  });
  const addRowBtn = document.createElement('button');
  addRowBtn.type = 'button';
  addRowBtn.className = 'layout-control-btn';
  addRowBtn.textContent = '+';
  addRowBtn.title = 'Add row';
  addRowBtn.addEventListener('click', () => {
    const rows = parseInt(block.dataset.rows);
    block.dataset.rows = rows + 1;
    rebuildGrid();
  });
  rowControls.appendChild(removeRowBtn);
  rowControls.appendChild(rowLabel);
  rowControls.appendChild(addRowBtn);
  cellsGrid.appendChild(rowControls);

  block.appendChild(cellsGrid);

  // Create initial 2x2 grid
  rebuildGrid();

  // Byte indicator
  block.appendChild(createByteIndicator());

  return block;
}
