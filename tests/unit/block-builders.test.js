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
});
