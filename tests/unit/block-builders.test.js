import { describe, test, expect, vi } from 'vitest';
import { createSectionBlock, createLayoutBlock } from '../../public/admin/lib/block-builders.js';

describe('createSectionBlock', () => {
  const mockCompiler = {
    getPatternClass: (pattern) => {
      const map = {
        dots: 'bg-pattern-dots',
        grid: 'bg-pattern-grid',
        stripes: 'bg-pattern-stripes',
        cross: 'bg-pattern-cross',
        hexagons: 'bg-pattern-hexagons'
      };
      return map[pattern] || '';
    }
  };

  test('creates section block with correct structure', () => {
    const callbacks = {
      onChange: vi.fn(),
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    expect(block.className).toContain('block-item');
    expect(block.className).toContain('block-section');
    expect(block.dataset.type).toBe('section');
  });

  test('includes header with label', () => {
    const callbacks = {
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const header = block.querySelector('.block-header');
    expect(header).toBeTruthy();

    const label = header.querySelector('.block-type-label');
    expect(label.textContent).toBe('Section');
    expect(label.getAttribute('data-i18n')).toBe('editor.blockSection');
  });

  test('includes action buttons', () => {
    const callbacks = {
      onMoveUp: vi.fn(),
      onMoveDown: vi.fn(),
      onDuplicate: vi.fn(),
      onDelete: vi.fn(),
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const actions = block.querySelector('.block-item-actions');
    expect(actions).toBeTruthy();

    const buttons = actions.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  test('includes background color input', () => {
    const callbacks = {
      onChange: vi.fn(),
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const bgInput = block.querySelector('.section-controls input[type="color"]');
    expect(bgInput).toBeTruthy();
    expect(bgInput.value).toBe('#ffffff');
  });

  test('uses consistent default dataset colors', () => {
    const callbacks = {
      onChange: vi.fn(),
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    expect(block.dataset.background).toBe('#ffffff');
    expect(block.dataset.color).toBe('#000000');
  });

  test('calls onChange when background color changes', () => {
    const onChange = vi.fn();
    const callbacks = {
      onChange,
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const bgInput = block.querySelector('.section-controls input[type="color"]');
    bgInput.value = '#ff0000';
    bgInput.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalled();
    expect(block.dataset.background).toBe('#ff0000');
  });

  test('includes pattern selector', () => {
    const callbacks = {
      onChange: vi.fn(),
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const patternSelect = block.querySelector('.section-pattern-select');
    expect(patternSelect).toBeTruthy();

    const options = patternSelect.querySelectorAll('option');
    expect(options.length).toBe(6); // none, dots, grid, stripes, cross, hexagons
  });

  test('applies pattern class when pattern selected', () => {
    const onChange = vi.fn();
    const callbacks = {
      onChange,
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const patternSelect = block.querySelector('.section-pattern-select');
    const preview = block.querySelector('.section-preview');

    patternSelect.value = 'dots';
    patternSelect.dispatchEvent(new Event('change'));

    expect(block.dataset.pattern).toBe('dots');
    expect(preview.className).toContain('bg-pattern-dots');
    expect(onChange).toHaveBeenCalled();
  });

  test('includes width and padding inputs', () => {
    const callbacks = {
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const widthInput = block.querySelector('.section-width-input');
    const paddingInput = block.querySelector('.section-padding-input');

    expect(widthInput).toBeTruthy();
    expect(paddingInput).toBeTruthy();
    expect(widthInput.placeholder).toBe('100%');
    expect(paddingInput.placeholder).toBe('3rem');
  });

  test('includes align selector', () => {
    const callbacks = {
      onChange: vi.fn(),
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const alignSelect = block.querySelector('.section-align-select');
    expect(alignSelect).toBeTruthy();

    const options = alignSelect.querySelectorAll('option');
    expect(options.length).toBe(4); // default, left, center, right
  });

  test('includes pattern color and opacity controls', () => {
    const callbacks = {
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const patternColorInput = block.querySelector('.section-pattern-row input[type="color"]');
    const opacityInput = block.querySelector('.section-pattern-row input[type="range"]');
    const opacityNumber = block.querySelector('.section-opacity-input');

    expect(patternColorInput).toBeTruthy();
    expect(opacityInput).toBeTruthy();
    expect(opacityNumber).toBeTruthy();
  });

  test('syncs opacity slider and number input', () => {
    const onChange = vi.fn();
    const callbacks = {
      onChange,
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const opacitySlider = block.querySelector('.section-pattern-row input[type="range"]');
    const opacityNumber = block.querySelector('.section-opacity-input');

    opacitySlider.value = '0.5';
    opacitySlider.dispatchEvent(new Event('input'));

    expect(opacityNumber.value).toBe('0.5');
    expect(block.dataset.patternOpacity).toBe('0.5');
    expect(onChange).toHaveBeenCalled();
  });

  test('calls createInnerAddBlock callback', () => {
    const createInnerAddBlock = vi.fn().mockReturnValue(document.createElement('div'));
    const callbacks = {
      createInnerAddBlock
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    expect(createInnerAddBlock).toHaveBeenCalledWith(block);
  });

  test('includes byte indicator', () => {
    const callbacks = {
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const byteIndicator = block.querySelector('.block-byte-indicator');
    expect(byteIndicator).toBeTruthy();
  });

  test('excludes selector control when nested', () => {
    const callbacks = {
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: true,
      callbacks,
      Compiler: mockCompiler
    });

    const selectorInput = block.querySelector('.block-selector-input');
    expect(selectorInput).toBeNull();
  });

  test('includes selector control when not nested', () => {
    const callbacks = {
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const selectorInput = block.querySelector('.block-selector-input');
    expect(selectorInput).toBeTruthy();
  });

  test('updates text color, width, padding and align with trimmed values', () => {
    const onChange = vi.fn();
    const callbacks = {
      onChange,
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const preview = block.querySelector('.section-preview');
    const colorInputs = block.querySelectorAll('.section-controls input[type="color"]');
    const colorInput = colorInputs[1];
    const widthInput = block.querySelector('.section-width-input');
    const paddingInput = block.querySelector('.section-padding-input');
    const alignSelect = block.querySelector('.section-align-select');

    colorInput.value = '#123456';
    colorInput.dispatchEvent(new Event('input'));
    widthInput.value = ' 75% ';
    widthInput.dispatchEvent(new Event('input'));
    paddingInput.value = ' 2rem ';
    paddingInput.dispatchEvent(new Event('input'));
    alignSelect.value = 'center';
    alignSelect.dispatchEvent(new Event('change'));

    expect(block.dataset.color).toBe('#123456');
    expect(preview.style.color).toBe('#123456');
    expect(block.dataset.width).toBe('75%');
    expect(block.dataset.padding).toBe('2rem');
    expect(preview.style.getPropertyValue('--sp')).toBe('2rem');
    expect(block.dataset.align).toBe('center');
    expect(preview.style.textAlign).toBe('center');
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  test('resets pattern class and has-pattern when selecting no pattern', () => {
    const callbacks = {
      onChange: vi.fn(),
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const wrapper = block.querySelector('.section-inner-wrapper');
    const preview = block.querySelector('.section-preview');
    const patternSelect = block.querySelector('.section-pattern-select');

    patternSelect.value = 'grid';
    patternSelect.dispatchEvent(new Event('change'));
    expect(wrapper.classList.contains('has-pattern')).toBe(true);
    expect(preview.className).toContain('bg-pattern-grid');

    patternSelect.value = '';
    patternSelect.dispatchEvent(new Event('change'));
    expect(wrapper.classList.contains('has-pattern')).toBe(false);
    expect(preview.className).toBe('section-preview ');
  });

  test('updates opacity from number input and computes rgba from pattern color', () => {
    const callbacks = {
      onChange: vi.fn(),
      createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createSectionBlock({
      isNested: false,
      callbacks,
      Compiler: mockCompiler
    });

    const preview = block.querySelector('.section-preview');
    const patternColorInput = block.querySelector('.section-pattern-row input[type="color"]');
    const opacityNumber = block.querySelector('.section-opacity-input');
    const opacitySlider = block.querySelector('.section-pattern-row input[type="range"]');

    patternColorInput.value = '#336699';
    patternColorInput.dispatchEvent(new Event('input'));
    expect(preview.style.getPropertyValue('--pc')).toBe('rgba(51,102,153,0.1)');

    opacityNumber.value = '0.45';
    opacityNumber.dispatchEvent(new Event('input'));
    expect(opacitySlider.value).toBe('0.45');
    expect(block.dataset.patternOpacity).toBe('0.45');
    expect(preview.style.getPropertyValue('--pc')).toBe('rgba(51,102,153,0.45)');
  });

  test('handles events without optional callbacks', () => {
    const block = createSectionBlock({
      isNested: false,
      callbacks: {},
      Compiler: mockCompiler
    });

    const bgInput = block.querySelector('.section-controls input[type="color"]');
    const widthInput = block.querySelector('.section-width-input');

    expect(() => {
      bgInput.value = '#abcdef';
      bgInput.dispatchEvent(new Event('input'));
      widthInput.value = ' 90% ';
      widthInput.dispatchEvent(new Event('input'));
    }).not.toThrow();
    expect(block.dataset.background).toBe('#abcdef');
    expect(block.dataset.width).toBe('90%');
  });

  test('does not require createInnerAddBlock callback', () => {
    const block = createSectionBlock({
      isNested: false,
      callbacks: {},
      Compiler: mockCompiler
    });

    const preview = block.querySelector('.section-preview');
    expect(preview).toBeTruthy();
    expect(preview.querySelector('.section-blocks')).toBeTruthy();
  });

  test('handles section input changes without onChange callback across controls', () => {
    const block = createSectionBlock({
      isNested: false,
      callbacks: {
        createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
      },
      Compiler: mockCompiler
    });

    const preview = block.querySelector('.section-preview');
    const colorInputs = block.querySelectorAll('.section-controls input[type="color"]');
    const textColorInput = colorInputs[1];
    const paddingInput = block.querySelector('.section-padding-input');
    const alignSelect = block.querySelector('.section-align-select');
    const patternSelect = block.querySelector('.section-pattern-select');
    const patternColorInput = block.querySelector('.section-pattern-row input[type="color"]');
    const opacitySlider = block.querySelector('.section-pattern-row input[type="range"]');

    expect(() => {
      textColorInput.value = '#445566';
      textColorInput.dispatchEvent(new Event('input'));
      paddingInput.value = ' 1.25rem ';
      paddingInput.dispatchEvent(new Event('input'));
      alignSelect.value = 'right';
      alignSelect.dispatchEvent(new Event('change'));
      patternSelect.value = 'stripes';
      patternSelect.dispatchEvent(new Event('change'));
      patternColorInput.value = '#112233';
      patternColorInput.dispatchEvent(new Event('input'));
      opacitySlider.value = '0.35';
      opacitySlider.dispatchEvent(new Event('input'));
    }).not.toThrow();

    expect(block.dataset.color).toBe('#445566');
    expect(block.dataset.padding).toBe('1.25rem');
    expect(block.dataset.align).toBe('right');
    expect(block.dataset.pattern).toBe('stripes');
    expect(block.dataset.patternOpacity).toBe('0.35');
    expect(preview.style.getPropertyValue('--pc')).toBe('rgba(17,34,51,0.35)');
  });

  test('updates selector and handles optional onChange callback', () => {
    const withChange = createSectionBlock({
      isNested: false,
      callbacks: {
        onChange: vi.fn(),
        createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
      },
      Compiler: mockCompiler
    });

    const withChangeSelector = withChange.querySelector('.block-selector-input');
    withChangeSelector.value = '  .hero  ';
    withChangeSelector.dispatchEvent(new Event('input'));
    expect(withChange.dataset.selector).toBe('.hero');
    expect(withChange.querySelector('.block-selector-input').value).toBe('  .hero  ');

    const withoutChange = createSectionBlock({
      isNested: false,
      callbacks: {
        createInnerAddBlock: vi.fn().mockReturnValue(document.createElement('div'))
      },
      Compiler: mockCompiler
    });

    const withoutChangeSelector = withoutChange.querySelector('.block-selector-input');
    expect(() => {
      withoutChangeSelector.value = '#main';
      withoutChangeSelector.dispatchEvent(new Event('input'));
    }).not.toThrow();
    expect(withoutChange.dataset.selector).toBe('#main');
  });
});

describe('createLayoutBlock', () => {
  test('creates layout block with correct structure', () => {
    const callbacks = {
      onChange: vi.fn(),
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    expect(block.className).toContain('block-item');
    expect(block.className).toContain('block-layout');
    expect(block.dataset.type).toBe('layout');
  });

  test('initializes with 2x2 grid', () => {
    const callbacks = {
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    expect(block.dataset.columns).toBe('2');
    expect(block.dataset.rows).toBe('2');

    const cells = block.querySelectorAll('.layout-cell');
    expect(cells.length).toBe(4); // 2x2 = 4 cells
  });

  test('includes column and row controls', () => {
    const callbacks = {
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const colControls = block.querySelector('.layout-col-controls');
    const rowControls = block.querySelector('.layout-row-controls');

    expect(colControls).toBeTruthy();
    expect(rowControls).toBeTruthy();
  });

  test('adds column when + button clicked', () => {
    const onChange = vi.fn();
    const callbacks = {
      onChange,
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const addColBtn = block.querySelector('.layout-col-controls .layout-control-btn:last-child');
    addColBtn.click();

    expect(block.dataset.columns).toBe('3');
    expect(onChange).toHaveBeenCalled();
  });

  test('removes column when - button clicked', () => {
    const onChange = vi.fn();
    const callbacks = {
      onChange,
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const removeColBtn = block.querySelector('.layout-col-controls .layout-control-btn:first-child');
    removeColBtn.click();

    expect(block.dataset.columns).toBe('1');
    expect(onChange).toHaveBeenCalled();
  });

  test('does not remove column below 1', () => {
    const callbacks = {
      onChange: vi.fn(),
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const removeColBtn = block.querySelector('.layout-col-controls .layout-control-btn:first-child');
    removeColBtn.click(); // 2 -> 1
    removeColBtn.click(); // Should stay at 1

    expect(block.dataset.columns).toBe('1');
  });

  test('limits columns to 6', () => {
    const callbacks = {
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const addColBtn = block.querySelector('.layout-col-controls .layout-control-btn:last-child');
    // Click multiple times
    for (let i = 0; i < 10; i++) {
      addColBtn.click();
    }

    expect(parseInt(block.dataset.columns)).toBeLessThanOrEqual(6);
  });

  test('cell includes alignment buttons', () => {
    const callbacks = {
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const cell = block.querySelector('.layout-cell');
    const alignButtons = cell.querySelectorAll('.layout-align-btn');

    expect(alignButtons.length).toBe(3); // left, center, right
  });

  test('cell includes padding and margin inputs', () => {
    const callbacks = {
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const cell = block.querySelector('.layout-cell');
    const inputs = cell.querySelectorAll('.layout-toolbar-input input');

    expect(inputs.length).toBe(2); // padding and margin
  });

  test('includes byte indicator', () => {
    const callbacks = {
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const byteIndicator = block.querySelector('.block-byte-indicator');
    expect(byteIndicator).toBeTruthy();
  });

  test('excludes selector control when nested and includes when not nested', () => {
    const callbacks = {
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const nestedBlock = createLayoutBlock({
      isNested: true,
      callbacks
    });
    const topLevelBlock = createLayoutBlock({
      isNested: false,
      callbacks
    });

    expect(nestedBlock.querySelector('.block-selector-input')).toBeNull();
    expect(topLevelBlock.querySelector('.block-selector-input')).toBeTruthy();
  });

  test('adds and removes rows and does not go below 1 row', () => {
    const onChange = vi.fn();
    const callbacks = {
      onChange,
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const removeRowBtn = block.querySelector('.layout-row-controls .layout-control-btn:first-child');
    const addRowBtn = block.querySelector('.layout-row-controls .layout-control-btn:last-child');

    addRowBtn.click();
    expect(block.dataset.rows).toBe('3');

    removeRowBtn.click();
    removeRowBtn.click();
    removeRowBtn.click();
    expect(block.dataset.rows).toBe('1');
    expect(onChange).toHaveBeenCalled();
  });

  test('rebuildGrid removes excess cells when shrinking dimensions', () => {
    const callbacks = {
      onChange: vi.fn(),
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const addColBtn = block.querySelector('.layout-col-controls .layout-control-btn:last-child');
    const addRowBtn = block.querySelector('.layout-row-controls .layout-control-btn:last-child');
    const removeColBtn = block.querySelector('.layout-col-controls .layout-control-btn:first-child');
    const removeRowBtn = block.querySelector('.layout-row-controls .layout-control-btn:first-child');

    addColBtn.click();
    addRowBtn.click();
    expect(block.querySelectorAll('.layout-cell').length).toBe(9);

    removeColBtn.click();
    removeColBtn.click();
    removeRowBtn.click();
    removeRowBtn.click();
    expect(block.querySelectorAll('.layout-cell').length).toBe(1);
  });

  test('cell alignment toggles active button and updates textAlign', () => {
    const onChange = vi.fn();
    const callbacks = {
      onChange,
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const cell = block.querySelector('.layout-cell');
    const [leftBtn, centerBtn] = cell.querySelectorAll('.layout-align-btn');

    centerBtn.click();
    expect(cell.dataset.textAlign).toBe('center');
    expect(cell.style.textAlign).toBe('center');
    expect(centerBtn.classList.contains('active')).toBe(true);

    leftBtn.click();
    expect(leftBtn.classList.contains('active')).toBe(true);
    expect(centerBtn.classList.contains('active')).toBe(false);
    expect(onChange).toHaveBeenCalled();
  });

  test('padding and margin inputs apply and clear styles', () => {
    const callbacks = {
      onChange: vi.fn(),
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const cell = block.querySelector('.layout-cell');
    const [padInput, marInput] = cell.querySelectorAll('.layout-toolbar-input input');

    padInput.value = ' 1rem ';
    padInput.dispatchEvent(new Event('input'));
    marInput.value = ' 8px ';
    marInput.dispatchEvent(new Event('input'));

    expect(cell.dataset.padding).toBe('1rem');
    expect(cell.style.padding).toBe('1rem');
    expect(cell.dataset.margin).toBe('8px');
    expect(cell.style.margin).toBe('8px');

    padInput.value = '   ';
    padInput.dispatchEvent(new Event('input'));
    marInput.value = '   ';
    marInput.dispatchEvent(new Event('input'));
    expect(cell.style.padding).toBe('');
    expect(cell.style.margin).toBe('');
  });

  test('delete button clears nested cell blocks', () => {
    const callbacks = {
      onChange: vi.fn(),
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const cell = block.querySelector('.layout-cell');
    const cellBlocks = cell.querySelector('.layout-cell-blocks');
    cellBlocks.appendChild(document.createElement('div'));
    expect(cellBlocks.children.length).toBe(1);

    const deleteBtn = cell.querySelector('.layout-toolbar-delete');
    deleteBtn.click();
    expect(cellBlocks.children.length).toBe(0);
    expect(callbacks.onChange).toHaveBeenCalled();
  });

  test('dropdown adds child block when callback exists and closes on outside click', () => {
    const child = document.createElement('div');
    const content = document.createElement('div');
    content.className = 'block-content';
    content.setAttribute('tabindex', '-1');
    child.appendChild(content);

    const callbacks = {
      onChange: vi.fn(),
      createBlockElement: vi.fn().mockReturnValue(child)
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const cell = block.querySelector('.layout-cell');
    const addBtn = cell.querySelector('.layout-cell-add-btn');
    const dropdown = cell.querySelector('.layout-cell-dropdown');
    const firstTypeBtn = dropdown.querySelector('button');

    addBtn.click();
    expect(dropdown.classList.contains('hidden')).toBe(false);
    firstTypeBtn.click();

    expect(cell.querySelector('.layout-cell-blocks').children.length).toBe(1);
    expect(dropdown.classList.contains('hidden')).toBe(true);
    expect(callbacks.createBlockElement).toHaveBeenCalled();
    expect(callbacks.onChange).toHaveBeenCalled();

    addBtn.click();
    expect(dropdown.classList.contains('hidden')).toBe(false);
    document.dispatchEvent(new MouseEvent('click'));
    expect(dropdown.classList.contains('hidden')).toBe(true);
  });

  test('dropdown click is safe when createBlockElement callback is missing', () => {
    const block = createLayoutBlock({
      isNested: false,
      callbacks: {}
    });

    const cell = block.querySelector('.layout-cell');
    const addBtn = cell.querySelector('.layout-cell-add-btn');
    const dropdown = cell.querySelector('.layout-cell-dropdown');
    const firstTypeBtn = dropdown.querySelector('button');

    addBtn.click();
    expect(() => firstTypeBtn.click()).not.toThrow();
    expect(cell.querySelector('.layout-cell-blocks').children.length).toBe(0);
  });

  test('supports child blocks without focus target', () => {
    const callbacks = {
      onChange: vi.fn(),
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const cell = block.querySelector('.layout-cell');
    const addBtn = cell.querySelector('.layout-cell-add-btn');
    const dropdown = cell.querySelector('.layout-cell-dropdown');

    addBtn.click();
    const firstTypeBtn = dropdown.querySelector('button');
    expect(() => firstTypeBtn.click()).not.toThrow();
    expect(cell.querySelector('.layout-cell-blocks').children.length).toBe(1);
  });

  test('allows up to two nested blocks per layout cell', () => {
    const child = document.createElement('div');
    child.className = 'block-item';
    child.appendChild(document.createElement('div')).className = 'block-content';

    const callbacks = {
      onChange: vi.fn(),
      createBlockElement: vi.fn().mockImplementation(() => {
        const clone = child.cloneNode(true);
        return clone;
      })
    };

    const block = createLayoutBlock({
      isNested: false,
      callbacks
    });

    const cell = block.querySelector('.layout-cell');
    const addBtn = cell.querySelector('.layout-cell-add-btn');
    const dropdown = cell.querySelector('.layout-cell-dropdown');
    const firstTypeBtn = dropdown.querySelector('button');

    addBtn.click();
    firstTypeBtn.click();
    addBtn.click();
    firstTypeBtn.click();
    addBtn.click();
    firstTypeBtn.click();

    expect(cell.querySelector('.layout-cell-blocks').children.length).toBe(2);
    expect(cell.classList.contains('layout-cell-maxed')).toBe(true);
  });

  test('handles cell interactions and add-block without onChange callback', () => {
    const child = document.createElement('div');
    child.appendChild(document.createElement('div')).className = 'block-content';

    const block = createLayoutBlock({
      isNested: false,
      callbacks: {
        createBlockElement: vi.fn().mockReturnValue(child)
      }
    });

    const cell = block.querySelector('.layout-cell');
    const [leftBtn] = cell.querySelectorAll('.layout-align-btn');
    const [padInput, marInput] = cell.querySelectorAll('.layout-toolbar-input input');
    const deleteBtn = cell.querySelector('.layout-toolbar-delete');
    const addBtn = cell.querySelector('.layout-cell-add-btn');
    const dropdown = cell.querySelector('.layout-cell-dropdown');
    const firstTypeBtn = dropdown.querySelector('button');

    expect(() => {
      leftBtn.click();
      padInput.value = ' 12px ';
      padInput.dispatchEvent(new Event('input'));
      marInput.value = ' 6px ';
      marInput.dispatchEvent(new Event('input'));
      deleteBtn.click();
      addBtn.click();
      firstTypeBtn.click();
    }).not.toThrow();

    expect(cell.dataset.textAlign).toBe('left');
    expect(cell.dataset.padding).toBe('12px');
    expect(cell.dataset.margin).toBe('6px');
    expect(cell.querySelector('.layout-cell-blocks').children.length).toBe(1);
  });

  test('updates selector and handles optional onChange callback', () => {
    const onChange = vi.fn();
    const withChange = createLayoutBlock({
      isNested: false,
      callbacks: {
        onChange,
        createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
      }
    });

    const withChangeSelector = withChange.querySelector('.block-selector-input');
    withChangeSelector.value = '  .layout-wrap  ';
    withChangeSelector.dispatchEvent(new Event('input'));
    expect(withChange.dataset.selector).toBe('.layout-wrap');
    expect(onChange).toHaveBeenCalled();

    const withoutChange = createLayoutBlock({
      isNested: false,
      callbacks: {
        createBlockElement: vi.fn().mockReturnValue(document.createElement('div'))
      }
    });

    const withoutChangeSelector = withoutChange.querySelector('.block-selector-input');
    expect(() => {
      withoutChangeSelector.value = '.grid';
      withoutChangeSelector.dispatchEvent(new Event('input'));
    }).not.toThrow();
    expect(withoutChange.dataset.selector).toBe('.grid');
  });
});
