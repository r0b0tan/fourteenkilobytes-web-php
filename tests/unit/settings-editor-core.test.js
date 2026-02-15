import { describe, it, expect, vi, beforeEach } from 'vitest';

const interactionMocks = vi.hoisted(() => ({
  initEditorInteractions: vi.fn(),
}));

const runtimeMocks = vi.hoisted(() => ({
  createEditorRuntime: vi.fn(),
}));

vi.mock('../../public/admin/lib/settings-page/editor-interactions.js', () => ({
  initEditorInteractions: interactionMocks.initEditorInteractions,
}));

vi.mock('../../public/admin/lib/settings-page/editor-runtime.js', () => ({
  createEditorRuntime: runtimeMocks.createEditorRuntime,
}));

import { initEditorCore } from '../../public/admin/lib/settings-page/editor-core.js';

function mountEditorCoreDom() {
  const ids = [
    'admin-language',
    'homepage-select',
    'regenerate-homepage-btn',
    'header-enabled',
    'header-editor',
    'header-links',
    'add-header-link',
    'footer-enabled',
    'footer-editor',
    'footer-content',
    'css-enabled',
    'css-editor',
    'css-mode',
    'css-preset-preview',
    'css-preview-content',
    'css-preview-filename',
    'css-custom-editor',
    'global-css',
    'page-width',
    'meta-enabled',
    'meta-editor',
    'site-title-enabled',
    'site-title-editor',
    'site-title',
    'meta-description',
    'meta-author',
    'link-popup',
    'link-text',
    'link-href',
    'link-save',
    'link-delete',
    'link-cancel',
    'favicon-input',
    'favicon-preview',
    'favicon-remove',
    'favicon-data',
    'rss-enabled',
    'rss-editor',
    'rss-site-url',
    'rss-language',
    'rss-copyright',
    'rss-max-items',
    'rss-ttl',
    'rss-feed-url-preview',
    'rss-url-section',
    'rss-settings-section',
    'rss-copy-btn',
    'rss-preview-link',
    'bloglist-limit',
    'archive-enabled',
    'archive-url-section',
    'archive-link-text-section',
    'archive-slug',
    'archive-link-text',
    'recompile-archive-btn',
    'compression-enabled',
    'class-mangling-enabled',
    'class-mangling-mode',
    'save-btn',
    'discard-btn',
    'overhead-pie-chart',
    'overhead-percent',
  ];

  document.body.innerHTML = '';

  ids.forEach((id) => {
    const tag = ['save-btn', 'discard-btn', 'regenerate-homepage-btn', 'add-header-link', 'link-save', 'link-delete', 'link-cancel', 'rss-copy-btn', 'recompile-archive-btn'].includes(id)
      ? 'button'
      : ['admin-language', 'homepage-select', 'css-mode', 'rss-language', 'class-mangling-mode'].includes(id)
        ? 'select'
        : ['footer-content', 'global-css', 'meta-description'].includes(id)
          ? 'textarea'
          : 'input';
    const node = document.createElement(tag);
    node.id = id;
    if (id === 'discard-btn') node.classList.add('hidden');
    document.body.appendChild(node);
  });

  const tabA = document.createElement('button');
  tabA.className = 'tab-btn';
  tabA.dataset.tab = 'general';
  const tabB = document.createElement('button');
  tabB.className = 'tab-btn';
  tabB.dataset.tab = 'css';
  document.body.append(tabA, tabB);

  const contentA = document.createElement('div');
  contentA.className = 'tab-content';
  contentA.id = 'tab-general';
  const contentB = document.createElement('div');
  contentB.className = 'tab-content';
  contentB.id = 'tab-css';
  document.body.append(contentA, contentB);
}

describe('settings-page/editor-core', () => {
  const baseDeps = {
    App: { stub: true },
    t: vi.fn((k) => k),
    i18n: { setLocale: vi.fn() },
    debounce: vi.fn((fn) => fn),
    formatBytes: vi.fn((n) => `${n} B`),
    showNavigationOverlay: vi.fn(),
    Modal: { confirm: vi.fn() },
    Toast: { success: vi.fn(), error: vi.fn() },
  };

  beforeEach(() => {
    mountEditorCoreDom();
    interactionMocks.initEditorInteractions.mockReset();
    runtimeMocks.createEditorRuntime.mockReset();
  });

  it('wires interactions/runtime and returns runtime loadSettings', () => {
    const helpers = { helper: true };
    const runtime = {
      updateOverhead: vi.fn(),
      bindSaveDiscard: vi.fn(),
      bindUnsavedGuard: vi.fn(),
      loadSettings: vi.fn(),
    };
    interactionMocks.initEditorInteractions.mockReturnValue(helpers);
    runtimeMocks.createEditorRuntime.mockReturnValue(runtime);

    const result = initEditorCore(baseDeps);

    expect(interactionMocks.initEditorInteractions).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.createEditorRuntime).toHaveBeenCalledTimes(1);
    expect(runtimeMocks.createEditorRuntime.mock.calls[0][0].helpers).toBe(helpers);
    expect(runtime.bindSaveDiscard).toHaveBeenCalledTimes(1);
    expect(runtime.bindUnsavedGuard).toHaveBeenCalledTimes(1);
    expect(result.loadSettings).toBe(runtime.loadSettings);
  });

  it('markAsChanged and updateSaveButton toggle save/discard visibility', () => {
    const runtime = {
      updateOverhead: vi.fn(),
      bindSaveDiscard: vi.fn(),
      bindUnsavedGuard: vi.fn(),
      loadSettings: vi.fn(),
    };
    interactionMocks.initEditorInteractions.mockReturnValue({});
    runtimeMocks.createEditorRuntime.mockReturnValue(runtime);

    initEditorCore(baseDeps);

    const interactionsArg = interactionMocks.initEditorInteractions.mock.calls[0][0];
    const runtimeArg = runtimeMocks.createEditorRuntime.mock.calls[0][0];
    const saveBtn = document.getElementById('save-btn');
    const discardBtn = document.getElementById('discard-btn');

    interactionsArg.markAsChanged();
    expect(saveBtn.disabled).toBe(false);
    expect(discardBtn.classList.contains('hidden')).toBe(false);

    runtimeArg.state.hasUnsavedChanges = false;
    runtimeArg.updateSaveButton();
    expect(saveBtn.disabled).toBe(true);
    expect(discardBtn.classList.contains('hidden')).toBe(true);
  });

  it('passes working updateOverhead callback and mapped tab collections', () => {
    const runtime = {
      updateOverhead: vi.fn(),
      bindSaveDiscard: vi.fn(),
      bindUnsavedGuard: vi.fn(),
      loadSettings: vi.fn(),
    };
    interactionMocks.initEditorInteractions.mockReturnValue({});
    runtimeMocks.createEditorRuntime.mockReturnValue(runtime);

    initEditorCore(baseDeps);

    const interactionsArg = interactionMocks.initEditorInteractions.mock.calls[0][0];
    const elements = interactionsArg.elements;
    expect(elements.tabBtns.length).toBe(2);
    expect(elements.tabContents.length).toBe(2);

    interactionsArg.updateOverhead();
    expect(runtime.updateOverhead).toHaveBeenCalledTimes(1);
  });
});
