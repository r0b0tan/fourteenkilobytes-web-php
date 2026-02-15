import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEditorBootstrap } from '../../public/admin/lib/editor/bootstrap.js';

function createDeps() {
  const publishBtn = document.createElement('button');
  const navEditor = document.createElement('div');
  navEditor.classList.add('hidden');
  const navLinks = document.createElement('div');
  const chip = document.createElement('span');
  chip.className = 'nav-chip';
  navLinks.appendChild(chip);

  const footerEditor = document.createElement('div');
  footerEditor.classList.add('hidden');
  const footerText = document.createElement('textarea');

  const metaEditor = document.createElement('div');
  metaEditor.classList.add('hidden');
  const metaDescription = document.createElement('textarea');
  const metaAuthor = document.createElement('input');

  const cssEditor = document.createElement('div');
  cssEditor.classList.add('hidden');
  const cssRules = document.createElement('textarea');

  const titleOverrideInput = document.createElement('input');
  const addNavLinkBtn = document.createElement('button');
  const insertBytesBtn = document.createElement('button');

  const templateSelector = document.createElement('select');
  const templateSelectorContainer = document.createElement('div');

  document.body.append(
    publishBtn,
    navEditor,
    navLinks,
    footerEditor,
    footerText,
    metaEditor,
    metaDescription,
    metaAuthor,
    cssEditor,
    cssRules,
    titleOverrideInput,
    addNavLinkBtn,
    insertBytesBtn,
    templateSelector,
    templateSelectorContainer
  );

  return {
    publishBtn,
    navEditor,
    addNavLinkBtn,
    navLinks,
    footerEditor,
    footerText,
    insertBytesBtn,
    metaEditor,
    metaDescription,
    metaAuthor,
    titleOverrideInput,
    cssEditor,
    cssRules,
    templateSelector,
    templateSelectorContainer,

    t: vi.fn((key, vars) => (vars?.error ? `${key}:${vars.error}` : key)),
    loadGlobalNavigation: vi.fn(),
    loadGlobalFooter: vi.fn(),
    loadGlobalMeta: vi.fn(),
    loadGlobalCSS: vi.fn(),
    updateTitleOverrideHint: vi.fn(),

    getSeeds: vi.fn(async () => [{ name: 'landing-page', label: 'Landing Page' }]),
    clonePage: vi.fn(async () => ({ sourceData: { title: 'Seed Title', slug: 'seed-slug', content: [] } })),
    loadFromSource: vi.fn(),
    modalError: vi.fn(),

    getSourceData: vi.fn(async () => ({ title: 'Edit Title', slug: 'edited', content: [] })),
    setEditMode: vi.fn(),
    loadFromLocalStorage: vi.fn(),
  };
}

describe('editor/bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="page-title"></div>
      <div id="page-subtitle" style="display:none"></div>
    `;
    sessionStorage.clear();
    window.location.search = '';
  });

  it('initializes default new mode state and loads seed templates', async () => {
    const deps = createDeps();
    const bootstrap = createEditorBootstrap(deps);

    await bootstrap.init();

    expect(deps.loadGlobalNavigation).toHaveBeenCalled();
    expect(deps.loadGlobalFooter).toHaveBeenCalled();
    expect(deps.loadGlobalMeta).toHaveBeenCalled();
    expect(deps.loadGlobalCSS).toHaveBeenCalled();

    expect(deps.navEditor.classList.contains('hidden')).toBe(false);
    expect(deps.footerEditor.classList.contains('hidden')).toBe(false);
    expect(deps.metaEditor.classList.contains('hidden')).toBe(false);
    expect(deps.cssEditor.classList.contains('hidden')).toBe(false);

    expect(deps.addNavLinkBtn.disabled).toBe(true);
    expect(deps.footerText.disabled).toBe(true);
    expect(deps.insertBytesBtn.disabled).toBe(true);
    expect(deps.metaDescription.disabled).toBe(true);
    expect(deps.metaAuthor.disabled).toBe(true);
    expect(deps.titleOverrideInput.disabled).toBe(true);
    expect(deps.cssRules.disabled).toBe(true);

    expect(deps.templateSelector.querySelectorAll('option').length).toBe(1);
    expect(deps.loadFromLocalStorage).toHaveBeenCalled();
  });

  it('loads edit mode source and shows recompile banner', async () => {
    window.location.search = '?edit=my-post';
    const deps = createDeps();
    const bootstrap = createEditorBootstrap(deps);

    await bootstrap.init();

    expect(deps.templateSelectorContainer.style.display).toBe('none');
    expect(deps.getSourceData).toHaveBeenCalledWith('my-post');
    expect(deps.setEditMode).toHaveBeenCalledWith('my-post');
    expect(deps.loadFromSource).toHaveBeenCalled();

    const title = document.getElementById('page-title');
    const subtitle = document.getElementById('page-subtitle');
    expect(title.innerHTML).toContain('my-post');
    expect(subtitle.textContent).toContain('Editing source');
    expect(deps.publishBtn.getAttribute('data-i18n')).toBe('editor.recompile');
  });

  it('loads cloned source from session storage in clone mode', async () => {
    window.location.search = '?clone=true';
    sessionStorage.setItem('clonedSource', JSON.stringify({ title: 'Clone', slug: 'clone', content: [] }));

    const deps = createDeps();
    const bootstrap = createEditorBootstrap(deps);

    await bootstrap.init();

    expect(deps.templateSelectorContainer.style.display).toBe('none');
    expect(deps.loadFromSource).toHaveBeenCalledWith(expect.objectContaining({ title: 'Clone' }));
    expect(sessionStorage.getItem('clonedSource')).toBeNull();

    const title = document.getElementById('page-title');
    const subtitle = document.getElementById('page-subtitle');
    expect(title.textContent).toBe('New (Cloned)');
    expect(subtitle.textContent).toContain('Set title and slug');
  });
});
