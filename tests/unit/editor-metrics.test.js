import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEditorMetricsManager } from '../../public/admin/lib/editor/metrics.js';

function makeEl(tag = 'div') {
  return document.createElement(tag);
}

function createDeps(overrides = {}) {
  return {
    formatBytes: (value) => `${value} B`,
    breakdownBase: makeEl(),
    breakdownTitle: makeEl(),
    breakdownFavicon: makeEl(),
    breakdownNav: makeEl(),
    breakdownMeta: makeEl(),
    breakdownFooter: makeEl(),
    breakdownCss: makeEl(),
    breakdownContent: makeEl(),
    breakdownTotal: makeEl(),
    navBytesEl: makeEl(),
    metaBytesEl: makeEl(),
    footerBytesEl: makeEl(),
    cssBytesEl: makeEl(),
    costContentTotal: makeEl(),
    pieChart: makeEl(),
    piePercent: makeEl(),
    pieContentDot: makeEl(),
    titleInput: { value: 'Page Title' },
    titleOverrideEnabled: { checked: false },
    titleOverrideInput: { value: '' },
    browserTitleBytesEl: makeEl(),
    titleBytesEl: makeEl(),
    getGlobalConfig: vi.fn(() => ({ siteTitleEnabled: true, siteTitle: 'Site' })),
    serializeBlock: vi.fn(),
    estimateBlockSize: vi.fn(),
    blockEditor: makeEl(),
    ...overrides,
  };
}

describe('editor/metrics', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('updates breakdown, percentages and chart text for normal byte usage', () => {
    const deps = createDeps();
    const manager = createEditorMetricsManager(deps);

    manager.updateByteCounter(7000, 2000, 5000, {
      base: 100,
      title: 10,
      favicon: 0,
      navigation: 200,
      meta: 50,
      footer: 80,
      css: 40,
      content: 6520,
    });

    expect(deps.breakdownBase.textContent).toBe('100 B');
    expect(deps.breakdownTotal.textContent).toBe('7000 B / 14.336 B');
    expect(deps.costContentTotal.textContent).toBe('5000 B');
    expect(deps.piePercent.textContent).toBe('49%');
    expect(deps.pieChart.style.background).toContain('conic-gradient');
    expect(deps.pieContentDot.classList.contains('warning')).toBe(false);
    expect(deps.pieContentDot.classList.contains('danger')).toBe(false);
  });

  it('marks warning and danger thresholds deterministically', () => {
    const warningDeps = createDeps();
    const warningManager = createEditorMetricsManager(warningDeps);
    warningManager.updateByteCounter(12000, 1000, 11000, null);
    expect(warningDeps.pieContentDot.classList.contains('warning')).toBe(true);
    expect(warningDeps.piePercent.textContent).toBe('84%');

    const dangerDeps = createDeps();
    const dangerManager = createEditorMetricsManager(dangerDeps);
    dangerManager.updateByteCounter(15000, 1000, 14000, null);
    expect(dangerDeps.pieContentDot.classList.contains('danger')).toBe(true);
    expect(dangerDeps.piePercent.textContent).toBe('100%');
  });

  it('computes title bytes and browser title bytes with override and site title', () => {
    const deps = createDeps();
    const manager = createEditorMetricsManager(deps);

    manager.updateTitleBytes();
    expect(deps.titleBytesEl.textContent).toBe('10 B');
    expect(deps.browserTitleBytesEl.textContent).toBe('32 B');

    deps.titleOverrideEnabled.checked = true;
    deps.titleOverrideInput.value = 'Custom Browser';
    manager.updateTitleBytes();

    expect(deps.browserTitleBytesEl.textContent).toBe('29 B');
  });

  it('updates block byte indicators and total content rail with nested structures', () => {
    const blockEditor = makeEl();

    function block(type, extras = {}) {
      const b = makeEl();
      b.className = 'block-item';
      b.dataset.type = type;
      if (extras.level) b.dataset.level = String(extras.level);
      if (extras.listType) b.dataset.listType = extras.listType;
      const indicator = makeEl();
      indicator.className = 'block-byte-indicator';
      b.appendChild(indicator);
      return b;
    }

    const heading = block('heading', { level: 2 });
    const paragraph = block('paragraph');
    const list = block('list', { listType: 'ordered' });

    const section = block('section');
    const sectionBlocks = makeEl();
    sectionBlocks.className = 'section-blocks';
    sectionBlocks.appendChild(block('paragraph'));
    section.appendChild(sectionBlocks);

    const layout = block('layout');
    const cellsGrid = makeEl();
    cellsGrid.className = 'layout-cells-grid';
    const layoutCell = makeEl();
    layoutCell.className = 'layout-cell';
    const cellBlocks = makeEl();
    cellBlocks.className = 'layout-cell-blocks';
    cellBlocks.appendChild(block('divider'));
    layoutCell.appendChild(cellBlocks);
    cellsGrid.appendChild(layoutCell);
    layout.appendChild(cellsGrid);

    blockEditor.append(heading, paragraph, list, section, layout);

    const deps = createDeps({
      blockEditor,
      serializeBlock: vi.fn((el) => ({
        type: el.dataset.type,
        level: el.dataset.level ? Number(el.dataset.level) : undefined,
        listType: el.dataset.listType,
      })),
      estimateBlockSize: vi.fn((data) => {
        if (data.type === 'heading') return 30;
        if (data.type === 'paragraph') return 20;
        if (data.type === 'list') return 25;
        if (data.type === 'section') return 40;
        if (data.type === 'layout') return 35;
        if (data.type === 'divider') return 10;
        return 5;
      }),
    });

    const manager = createEditorMetricsManager(deps);
    manager.updateCostRail();

    expect(heading.querySelector('.block-byte-indicator').textContent).toContain('H2');
    expect(list.querySelector('.block-byte-indicator').textContent).toContain('OL');
    expect(section.querySelector('.block-byte-indicator').textContent).toContain('Section');
    expect(layout.querySelector('.block-byte-indicator').textContent).toContain('Layout');

    expect(deps.costContentTotal.textContent).toBe('154 B');
  });
});
