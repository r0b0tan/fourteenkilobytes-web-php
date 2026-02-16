import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getCurrentContextFromSearch, createEditorStateManager } from '../../public/admin/lib/editor/state.js';
import { createEditorBuildInputManager } from '../../public/admin/lib/editor/build-input.js';
import { getEditorDomRefs } from '../../public/admin/lib/editor/dom-refs.js';

describe('editor/state', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.search = '';
  });

  it('derives edit and new context deterministically from URL search', () => {
    expect(getCurrentContextFromSearch('?edit=startseite')).toEqual({ mode: 'edit', slug: 'startseite' });
    expect(getCurrentContextFromSearch('')).toEqual({ mode: 'new', slug: null });
  });

  it('saves and restores source-based autosave for matching context', () => {
    window.location.search = '?edit=post-1';

    const deps = {
      titleInput: { value: 'Title A' },
      slugInput: { value: 'post-1' },
      pageTypeSelect: { value: 'post' },
      titleOverrideEnabled: { checked: false },
      titleOverrideInput: { value: '' },
      navEnabled: { checked: false, dispatchEvent: vi.fn() },
      footerEnabled: { checked: false, dispatchEvent: vi.fn() },
      footerText: { value: '', disabled: false },
      metaEnabled: { checked: false, dispatchEvent: vi.fn() },
      metaDescription: { value: '' },
      metaAuthor: { value: '' },
      cssEnabled: { checked: false, dispatchEvent: vi.fn() },
      cssRules: { value: '' },
      navLinks: document.createElement('div'),
      blockEditor: document.createElement('div'),
      getContentFromBlocks: vi.fn(() => [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] }]),
      getNavigationItems: vi.fn(() => []),
      createBlockElement: vi.fn(() => document.createElement('div')),
      loadFromSource: vi.fn(),
      updatePageTitleSlug: vi.fn(),
    };

    const manager = createEditorStateManager(deps);
    manager.saveToLocalStorage();

    const restored = manager.loadFromLocalStorage();
    expect(restored).toBe(true);
    expect(deps.loadFromSource).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Title A',
      slug: 'post-1',
      pageType: 'post',
    }));
    expect(deps.updatePageTitleSlug).toHaveBeenCalled();
  });

  it('does not restore autosave when context does not match', () => {
    localStorage.setItem('editor-autosave', JSON.stringify({
      context: { mode: 'edit', slug: 'other-post' },
      timestamp: Date.now(),
      source: { title: 'X', slug: 'other-post', pageType: 'post', content: [] },
    }));

    const deps = {
      titleInput: { value: '' },
      slugInput: { value: '' },
      pageTypeSelect: { value: 'post' },
      titleOverrideEnabled: { checked: false },
      titleOverrideInput: { value: '' },
      navEnabled: { checked: false, dispatchEvent: vi.fn() },
      footerEnabled: { checked: false, dispatchEvent: vi.fn() },
      footerText: { value: '', disabled: false },
      metaEnabled: { checked: false, dispatchEvent: vi.fn() },
      metaDescription: { value: '' },
      metaAuthor: { value: '' },
      cssEnabled: { checked: false, dispatchEvent: vi.fn() },
      cssRules: { value: '' },
      navLinks: document.createElement('div'),
      blockEditor: document.createElement('div'),
      getContentFromBlocks: vi.fn(() => []),
      getNavigationItems: vi.fn(() => []),
      createBlockElement: vi.fn(() => document.createElement('div')),
      loadFromSource: vi.fn(),
      updatePageTitleSlug: vi.fn(),
    };

    window.location.search = '?edit=current-post';
    const manager = createEditorStateManager(deps);

    expect(manager.loadFromLocalStorage()).toBe(false);
    expect(deps.loadFromSource).not.toHaveBeenCalled();
  });

  it('expires autosave older than 7 days', () => {
    const oldTimestamp = Date.now() - (8 * 24 * 60 * 60 * 1000);
    localStorage.setItem('editor-autosave', JSON.stringify({
      context: { mode: 'new', slug: null },
      timestamp: oldTimestamp,
      source: { title: 'Old', slug: '', pageType: 'post', content: [] },
    }));

    const manager = createEditorStateManager({
      titleInput: { value: '' },
      slugInput: { value: '' },
      pageTypeSelect: { value: 'post' },
      titleOverrideEnabled: { checked: false },
      titleOverrideInput: { value: '' },
      navEnabled: { checked: false, dispatchEvent: vi.fn() },
      footerEnabled: { checked: false, dispatchEvent: vi.fn() },
      footerText: { value: '', disabled: false },
      metaEnabled: { checked: false, dispatchEvent: vi.fn() },
      metaDescription: { value: '' },
      metaAuthor: { value: '' },
      cssEnabled: { checked: false, dispatchEvent: vi.fn() },
      cssRules: { value: '' },
      navLinks: document.createElement('div'),
      blockEditor: document.createElement('div'),
      getContentFromBlocks: vi.fn(() => []),
      getNavigationItems: vi.fn(() => []),
      createBlockElement: vi.fn(() => document.createElement('div')),
      loadFromSource: vi.fn(),
      updatePageTitleSlug: vi.fn(),
    });

    expect(manager.loadFromLocalStorage()).toBe(false);
    expect(localStorage.getItem('editor-autosave')).toBeNull();
  });

  it('restores legacy autosave shape without source and rebuilds blocks', () => {
    const now = Date.now();
    localStorage.setItem('editor-autosave', JSON.stringify({
      context: { mode: 'new', slug: null },
      title: 'Legacy Title',
      slug: 'legacy-slug',
      pageType: 'page',
      blocks: [
        { type: 'paragraph', level: null, html: '<b>A</b>' },
        { type: 'heading', level: '2', html: 'H2' },
      ],
      titleOverrideEnabled: true,
      titleOverride: 'Browser Legacy',
      navEnabled: true,
      navigation: [{ text: 'Home', href: '/index.html' }],
      footerEnabled: true,
      footer: 'Footer legacy',
      metaEnabled: true,
      metaDescription: 'Desc',
      metaAuthor: 'Author',
      cssEnabled: true,
      css: 'body{margin:0}',
      timestamp: now,
    }));

    const navLinks = document.createElement('div');
    const deps = {
      titleInput: { value: '' },
      slugInput: { value: '' },
      pageTypeSelect: { value: 'post' },
      titleOverrideEnabled: { checked: false, dispatchEvent: vi.fn() },
      titleOverrideInput: { value: '' },
      navEnabled: { checked: false, dispatchEvent: vi.fn() },
      footerEnabled: { checked: false, dispatchEvent: vi.fn() },
      footerText: { value: '', disabled: false },
      metaEnabled: { checked: false, dispatchEvent: vi.fn() },
      metaDescription: { value: '' },
      metaAuthor: { value: '' },
      cssEnabled: { checked: false, dispatchEvent: vi.fn() },
      cssRules: { value: '' },
      navLinks,
      blockEditor: document.createElement('div'),
      getContentFromBlocks: vi.fn(() => []),
      getNavigationItems: vi.fn(() => []),
      createNavChip: vi.fn((text, href) => {
        const chip = document.createElement('span');
        chip.textContent = text;
        chip.dataset.href = href;
        return chip;
      }),
      createBlockElement: vi.fn((type, level, html) => {
        const b = document.createElement('div');
        b.className = 'block-item';
        b.dataset.type = type;
        b.dataset.level = level || '';
        b.innerHTML = html || '';
        return b;
      }),
      loadFromSource: vi.fn(),
      updatePageTitleSlug: vi.fn(),
    };

    const manager = createEditorStateManager(deps);
    const restored = manager.loadFromLocalStorage();

    expect(restored).toBe(true);
    expect(deps.titleInput.value).toBe('Legacy Title');
    expect(deps.slugInput.value).toBe('legacy-slug');
    expect(deps.pageTypeSelect.value).toBe('page');
    expect(deps.blockEditor.querySelectorAll('.block-item').length).toBe(2);
    expect(deps.createBlockElement).toHaveBeenCalledTimes(2);
    expect(deps.navLinks.children.length).toBe(1);
    expect(deps.footerText.value).toBe('Footer legacy');
    expect(deps.metaDescription.value).toBe('Desc');
    expect(deps.cssRules.value).toBe('body{margin:0}');
    expect(deps.loadFromSource).not.toHaveBeenCalled();
  });

  it('clears autosave key explicitly', () => {
    localStorage.setItem('editor-autosave', JSON.stringify({ timestamp: Date.now() }));

    const manager = createEditorStateManager({
      titleInput: { value: '' },
      slugInput: { value: '' },
      pageTypeSelect: { value: 'post' },
      titleOverrideEnabled: { checked: false },
      titleOverrideInput: { value: '' },
      navEnabled: { checked: false, dispatchEvent: vi.fn() },
      footerEnabled: { checked: false, dispatchEvent: vi.fn() },
      footerText: { value: '', disabled: false },
      metaEnabled: { checked: false, dispatchEvent: vi.fn() },
      metaDescription: { value: '' },
      metaAuthor: { value: '' },
      cssEnabled: { checked: false, dispatchEvent: vi.fn() },
      cssRules: { value: '' },
      navLinks: document.createElement('div'),
      blockEditor: document.createElement('div'),
      getContentFromBlocks: vi.fn(() => []),
      getNavigationItems: vi.fn(() => []),
      createBlockElement: vi.fn(() => document.createElement('div')),
      loadFromSource: vi.fn(),
      updatePageTitleSlug: vi.fn(),
    });

    manager.clearAutoSave();
    expect(localStorage.getItem('editor-autosave')).toBeNull();
  });
});

describe('editor/build-input', () => {
  it('collects navigation chips and builds compiler input with posts when bloglist exists', async () => {
    const navLinks = document.createElement('div');
    const chip = document.createElement('span');
    chip.className = 'nav-chip';
    chip.textContent = 'Home';
    chip.dataset.href = '/index.html';
    navLinks.appendChild(chip);

    const blockEditor = document.createElement('div');
    const blockEl = document.createElement('div');
    blockEl.className = 'block-item';
    blockEditor.appendChild(blockEl);

    const manager = createEditorBuildInputManager({
      blockEditor,
      navLinks,
      serializeBlock: vi.fn(() => ({ type: 'bloglist' })),
      getPosts: vi.fn(async () => [{ slug: 'a', title: 'A', publishedAt: '2026-01-01', status: 'published', pageType: 'post' }]),
      slugInput: { value: ' my-slug ' },
      titleInput: { value: ' My title ' },
      pageTypeSelect: { value: 'page' },
      titleOverrideEnabled: { checked: true },
      titleOverrideInput: { value: ' Browser Title ' },
      navEnabled: { checked: true },
      footerEnabled: { checked: true },
      footerText: { value: ' Footer text ' },
      metaEnabled: { checked: true },
      metaDescription: { value: ' Desc ' },
      metaAuthor: { value: ' Author ' },
      cssEnabled: { checked: true },
      cssRules: { value: ' body{margin:0} ' },
      getGlobalConfig: vi.fn(() => ({ siteTitleEnabled: true, siteTitle: 'Site Name' })),
    });

    const navItems = manager.getNavigationItems();
    expect(navItems).toEqual([{ text: 'Home', href: '/index.html' }]);

    const input = await manager.buildInput(true);

    expect(input.slug).toBe('my-slug');
    expect(input.title).toBe('My title');
    expect(input.allowPagination).toBe(true);
    expect(typeof input.buildId).toBe('string');
    expect(input.buildId.length).toBeGreaterThan(0);
    expect(input.navigation).toEqual({ items: [{ text: 'Home', href: '/index.html' }] });
    expect(input.posts).toHaveLength(1);
    expect(input.content).toEqual([{ type: 'bloglist' }]);
  });

  it('falls back to placeholder paragraph on empty content', async () => {
    const manager = createEditorBuildInputManager({
      blockEditor: document.createElement('div'),
      navLinks: document.createElement('div'),
      serializeBlock: vi.fn(),
      getPosts: vi.fn(async () => []),
      slugInput: { value: '' },
      titleInput: { value: '' },
      pageTypeSelect: { value: 'post' },
      titleOverrideEnabled: { checked: false },
      titleOverrideInput: { value: '' },
      navEnabled: { checked: false },
      footerEnabled: { checked: false },
      footerText: { value: '' },
      metaEnabled: { checked: false },
      metaDescription: { value: '' },
      metaAuthor: { value: '' },
      cssEnabled: { checked: false },
      cssRules: { value: '' },
      getGlobalConfig: vi.fn(() => ({})),
    });

    const input = await manager.buildInput(false);
    expect(input.content).toEqual([{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]);
    expect(input.slug).toBe('untitled');
    expect(input.title).toBe('Untitled');
  });

  it('loads posts when bloglist is nested inside section content', async () => {
    const blockEditor = document.createElement('div');
    const blockEl = document.createElement('div');
    blockEl.className = 'block-item';
    blockEditor.appendChild(blockEl);

    const getPosts = vi.fn(async () => [
      { slug: 'nested-a', title: 'Nested A', publishedAt: '2026-01-01', status: 'published', pageType: 'post' }
    ]);

    const manager = createEditorBuildInputManager({
      blockEditor,
      navLinks: document.createElement('div'),
      serializeBlock: vi.fn(() => ({
        type: 'section',
        children: [
          { type: 'bloglist' }
        ]
      })),
      getPosts,
      slugInput: { value: 'nested' },
      titleInput: { value: 'Nested Bloglist' },
      pageTypeSelect: { value: 'page' },
      titleOverrideEnabled: { checked: false },
      titleOverrideInput: { value: '' },
      navEnabled: { checked: false },
      footerEnabled: { checked: false },
      footerText: { value: '' },
      metaEnabled: { checked: false },
      metaDescription: { value: '' },
      metaAuthor: { value: '' },
      cssEnabled: { checked: false },
      cssRules: { value: '' },
      getGlobalConfig: vi.fn(() => ({})),
    });

    const input = await manager.buildInput(false);

    expect(getPosts).toHaveBeenCalledTimes(1);
    expect(input.posts).toHaveLength(1);
  });
});

describe('editor/dom-refs', () => {
  it('returns references to known editor elements', () => {
    document.body.innerHTML = `
      <select id="page-type"></select>
      <input id="title" />
      <input id="slug" />
      <div id="block-editor"></div>
      <button id="publish-btn"></button>
    `;

    const refs = getEditorDomRefs();
    expect(refs.pageTypeSelect?.id).toBe('page-type');
    expect(refs.titleInput?.id).toBe('title');
    expect(refs.slugInput?.id).toBe('slug');
    expect(refs.blockEditor?.id).toBe('block-editor');
    expect(refs.publishBtn?.id).toBe('publish-btn');
  });
});
