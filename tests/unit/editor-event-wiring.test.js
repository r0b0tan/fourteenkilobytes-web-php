import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wireEditorEvents } from '../../public/admin/lib/editor/event-wiring.js';

function el(tag = 'div') {
  return document.createElement(tag);
}

function setupElements() {
  const elements = {
    pageTypeSelect: el('select'),
    pageTypeHint: el('div'),
    titleInput: el('input'),
    slugInput: el('input'),
    addBlockBtn: el('button'),
    addBlockDropdown: el('div'),
    blockEditor: el('div'),
    navLinkPopup: el('div'),
    publishBtn: el('button'),
    clearAllBtn: el('button'),
    titleOverrideEnabled: el('input'),
    titleOverrideInput: el('input'),
    navEnabled: el('input'),
    footerEnabled: el('input'),
    footerText: el('textarea'),
    metaEnabled: el('input'),
    metaDescription: el('textarea'),
    metaAuthor: el('input'),
    cssEnabled: el('input'),
    cssRules: el('textarea'),
    liveCSS: el('style'),
  };

  elements.titleOverrideEnabled.type = 'checkbox';
  elements.navEnabled.type = 'checkbox';
  elements.footerEnabled.type = 'checkbox';
  elements.metaEnabled.type = 'checkbox';
  elements.cssEnabled.type = 'checkbox';

  elements.addBlockDropdown.classList.add('hidden');
  elements.navLinkPopup.classList.add('hidden');

  const optionPage = document.createElement('option');
  optionPage.value = 'page';
  elements.pageTypeSelect.appendChild(optionPage);
  const optionPost = document.createElement('option');
  optionPost.value = 'post';
  elements.pageTypeSelect.appendChild(optionPost);
  elements.pageTypeSelect.value = 'post';

  const dropdownBtn = document.createElement('button');
  dropdownBtn.dataset.type = 'paragraph';
  elements.addBlockDropdown.appendChild(dropdownBtn);

  const blockActionsRow = document.createElement('div');
  blockActionsRow.className = 'block-actions-row';
  blockActionsRow.appendChild(elements.addBlockBtn);

  document.body.append(
    elements.pageTypeSelect,
    elements.pageTypeHint,
    elements.titleInput,
    elements.slugInput,
    blockActionsRow,
    elements.addBlockDropdown,
    elements.blockEditor,
    elements.navLinkPopup,
    elements.publishBtn,
    elements.clearAllBtn,
    elements.titleOverrideEnabled,
    elements.titleOverrideInput,
    elements.navEnabled,
    elements.footerEnabled,
    elements.footerText,
    elements.metaEnabled,
    elements.metaDescription,
    elements.metaAuthor,
    elements.cssEnabled,
    elements.cssRules,
    elements.liveCSS
  );

  return { elements, dropdownBtn };
}

describe('editor/event-wiring', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('updates page type hint and auto-slug behavior', () => {
    const { elements } = setupElements();

    const deps = {
      elements,
      app: { slugify: vi.fn((v) => v.toLowerCase().replace(/\s+/g, '-')) },
      t: vi.fn((k) => k),
      modal: { error: vi.fn(), confirm: vi.fn(async () => true) },
      getDebouncedPreview: vi.fn(() => vi.fn()),
      updatePageTitleSlug: vi.fn(),
      updateTitleBytes: vi.fn(),
      updateByteCounter: vi.fn(),
      updateCostRail: vi.fn(),
      clearAutoSave: vi.fn(),
      loadGlobalNavigation: vi.fn(),
      loadGlobalFooter: vi.fn(),
      loadGlobalMeta: vi.fn(),
      loadGlobalCSS: vi.fn(),
      createBlockElement: vi.fn(() => {
        const block = document.createElement('div');
        block.className = 'block-item';
        const content = document.createElement('div');
        content.className = 'block-content';
        content.setAttribute('contenteditable', 'true');
        block.appendChild(content);
        return block;
      }),
      buildInput: vi.fn(),
      isEditMode: vi.fn(() => false),
      resetEditorForm: vi.fn(),
      validatePublishData: vi.fn(() => ({ valid: true })),
      determinePaginationStrategy: vi.fn(async () => ({ aborted: true, error: 'aborted' })),
      executePublish: vi.fn(),
    };

    wireEditorEvents(deps);

    elements.pageTypeSelect.value = 'page';
    elements.pageTypeSelect.dispatchEvent(new Event('change'));
    expect(elements.pageTypeHint.textContent).toBe('(not in feed)');

    elements.titleInput.value = 'My New Post';
    elements.titleInput.dispatchEvent(new Event('input'));
    expect(elements.slugInput.value).toBe('my-new-post');

    elements.slugInput.value = 'custom';
    elements.slugInput.dispatchEvent(new Event('input'));
    expect(elements.slugInput.dataset.manual).toBe('true');

    elements.titleInput.value = 'Ignore Slug Update';
    elements.titleInput.dispatchEvent(new Event('input'));
    expect(elements.slugInput.value).toBe('custom');
  });

  it('adds a block from dropdown and hides menu', () => {
    const { elements, dropdownBtn } = setupElements();

    const deps = {
      elements,
      app: { slugify: vi.fn((v) => v) },
      t: vi.fn((k) => k),
      modal: { error: vi.fn(), confirm: vi.fn(async () => true) },
      getDebouncedPreview: vi.fn(() => vi.fn()),
      updatePageTitleSlug: vi.fn(),
      updateTitleBytes: vi.fn(),
      updateByteCounter: vi.fn(),
      updateCostRail: vi.fn(),
      clearAutoSave: vi.fn(),
      loadGlobalNavigation: vi.fn(),
      loadGlobalFooter: vi.fn(),
      loadGlobalMeta: vi.fn(),
      loadGlobalCSS: vi.fn(),
      createBlockElement: vi.fn(() => {
        const block = document.createElement('div');
        block.className = 'block-item';
        const content = document.createElement('div');
        content.className = 'block-content';
        block.appendChild(content);
        return block;
      }),
      buildInput: vi.fn(),
      isEditMode: vi.fn(() => false),
      resetEditorForm: vi.fn(),
      validatePublishData: vi.fn(() => ({ valid: true })),
      determinePaginationStrategy: vi.fn(async () => ({ aborted: true, error: 'aborted' })),
      executePublish: vi.fn(),
    };

    wireEditorEvents(deps);

    elements.addBlockBtn.click();
    expect(elements.addBlockDropdown.classList.contains('hidden')).toBe(false);

    dropdownBtn.click();
    expect(elements.blockEditor.querySelectorAll('.block-item').length).toBe(1);
    expect(elements.addBlockDropdown.classList.contains('hidden')).toBe(true);
  });

  it('handles publish validation failure and clear-all reset flow', async () => {
    const { elements } = setupElements();

    elements.titleInput.value = 'Some title';
    elements.slugInput.value = 'some-title';
    elements.pageTypeSelect.value = 'page';
    elements.blockEditor.innerHTML = '<div class="block-item"></div>';

    const modal = { error: vi.fn(), confirm: vi.fn(async () => true) };
    const resetEditorForm = vi.fn();

    const deps = {
      elements,
      app: { slugify: vi.fn((v) => v) },
      t: vi.fn((k) => k),
      modal,
      getDebouncedPreview: vi.fn(() => vi.fn()),
      updatePageTitleSlug: vi.fn(),
      updateTitleBytes: vi.fn(),
      updateByteCounter: vi.fn(),
      updateCostRail: vi.fn(),
      clearAutoSave: vi.fn(),
      loadGlobalNavigation: vi.fn(),
      loadGlobalFooter: vi.fn(),
      loadGlobalMeta: vi.fn(),
      loadGlobalCSS: vi.fn(),
      createBlockElement: vi.fn(() => {
        const block = document.createElement('div');
        block.className = 'block-item';
        return block;
      }),
      buildInput: vi.fn(),
      isEditMode: vi.fn(() => false),
      resetEditorForm,
      validatePublishData: vi.fn(() => ({ valid: false, error: 'missing data' })),
      determinePaginationStrategy: vi.fn(async () => ({ aborted: true, error: 'aborted' })),
      executePublish: vi.fn(),
    };

    wireEditorEvents(deps);

    elements.publishBtn.click();
    expect(modal.error).toHaveBeenCalled();

    await elements.clearAllBtn.click();
    expect(elements.titleInput.value).toBe('');
    expect(elements.slugInput.value).toBe('');
    expect(elements.blockEditor.querySelectorAll('.block-item').length).toBe(1);
    expect(deps.loadGlobalNavigation).toHaveBeenCalled();
    expect(deps.loadGlobalFooter).toHaveBeenCalled();
    expect(deps.loadGlobalMeta).toHaveBeenCalled();
    expect(deps.loadGlobalCSS).toHaveBeenCalled();
    expect(deps.clearAutoSave).toHaveBeenCalled();
    expect(resetEditorForm).not.toHaveBeenCalled();
  });

  it('handles publish confirm=false, aborted pagination, and successful publish in edit mode', async () => {
    const { elements } = setupElements();
    elements.titleInput.value = 'Some title';
    elements.blockEditor.innerHTML = '<div class="block-item"></div>';

    const modal = {
      error: vi.fn(),
      confirm: vi.fn(async () => false)
    };
    const executePublish = vi.fn();
    const determinePaginationStrategy = vi.fn(async () => ({ aborted: true, error: 'stop' }));
    const buildInput = vi.fn(async () => ({ source: {} }));

    const deps = {
      elements,
      app: { slugify: vi.fn((v) => v) },
      t: vi.fn((k) => k),
      modal,
      getDebouncedPreview: vi.fn(() => vi.fn()),
      updatePageTitleSlug: vi.fn(),
      updateTitleBytes: vi.fn(),
      updateByteCounter: vi.fn(),
      updateCostRail: vi.fn(),
      clearAutoSave: vi.fn(),
      loadGlobalNavigation: vi.fn(),
      loadGlobalFooter: vi.fn(),
      loadGlobalMeta: vi.fn(),
      loadGlobalCSS: vi.fn(),
      createBlockElement: vi.fn(() => {
        const block = document.createElement('div');
        block.className = 'block-item';
        return block;
      }),
      buildInput,
      isEditMode: vi.fn(() => true),
      resetEditorForm: vi.fn(),
      validatePublishData: vi.fn(() => ({ valid: true })),
      determinePaginationStrategy,
      executePublish,
    };

    wireEditorEvents(deps);

    elements.publishBtn.click();
    await Promise.resolve();
    expect(modal.confirm).toHaveBeenCalled();
    expect(determinePaginationStrategy).not.toHaveBeenCalled();

    modal.confirm.mockResolvedValueOnce(true);
    elements.publishBtn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(modal.error).toHaveBeenCalledWith('stop');
    expect(executePublish).not.toHaveBeenCalled();

    modal.confirm.mockResolvedValueOnce(true);
    determinePaginationStrategy.mockResolvedValueOnce({ aborted: false, shouldPaginate: true });
    elements.publishBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(buildInput).toHaveBeenCalledWith(true);
    expect(executePublish).toHaveBeenCalled();
  });

  it('hides dropdowns on outside click and updates preview/cost on interactions', async () => {
    const { elements } = setupElements();
    const previewFn = vi.fn();

    const deps = {
      elements,
      app: { slugify: vi.fn((v) => v) },
      t: vi.fn((k) => k),
      modal: { error: vi.fn(), confirm: vi.fn(async () => true) },
      getDebouncedPreview: vi.fn(() => previewFn),
      updatePageTitleSlug: vi.fn(),
      updateTitleBytes: vi.fn(),
      updateByteCounter: vi.fn(),
      updateCostRail: vi.fn(),
      clearAutoSave: vi.fn(),
      loadGlobalNavigation: vi.fn(),
      loadGlobalFooter: vi.fn(),
      loadGlobalMeta: vi.fn(),
      loadGlobalCSS: vi.fn(),
      createBlockElement: vi.fn(() => {
        const block = document.createElement('div');
        block.className = 'block-item';
        const content = document.createElement('div');
        content.className = 'block-content';
        block.appendChild(content);
        return block;
      }),
      buildInput: vi.fn(),
      isEditMode: vi.fn(() => false),
      resetEditorForm: vi.fn(),
      validatePublishData: vi.fn(() => ({ valid: true })),
      determinePaginationStrategy: vi.fn(async () => ({ aborted: true, error: 'aborted' })),
      executePublish: vi.fn(),
    };

    const { observer } = wireEditorEvents(deps);

    elements.addBlockBtn.click();
    elements.navLinkPopup.classList.remove('hidden');
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(elements.addBlockDropdown.classList.contains('hidden')).toBe(true);
    expect(elements.navLinkPopup.classList.contains('hidden')).toBe(true);

    elements.blockEditor.dispatchEvent(new Event('input', { bubbles: true }));
    expect(previewFn).toHaveBeenCalled();
    expect(deps.updateCostRail).toHaveBeenCalled();

    const child = document.createElement('div');
    elements.blockEditor.appendChild(child);
    await Promise.resolve();
    expect(deps.updateCostRail).toHaveBeenCalled();

    observer.disconnect();
  });
});
