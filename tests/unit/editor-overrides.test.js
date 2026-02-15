import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEditorOverridesManager } from '../../public/admin/lib/editor/overrides.js';

function el(tag = 'div') {
  return document.createElement(tag);
}

function buildDeps() {
  const navEnabled = el('input');
  navEnabled.type = 'checkbox';
  const footerEnabled = el('input');
  footerEnabled.type = 'checkbox';
  const metaEnabled = el('input');
  metaEnabled.type = 'checkbox';
  const titleOverrideEnabled = el('input');
  titleOverrideEnabled.type = 'checkbox';
  const cssEnabled = el('input');
  cssEnabled.type = 'checkbox';

  const navLinks = el('div');
  const addNavLinkBtn = el('button');
  const navLinkPopup = el('div');
  navLinkPopup.classList.add('hidden');

  const navLinkText = el('input');
  const navLinkHref = el('input');
  const navLinkSave = el('button');
  const navLinkDelete = el('button');
  navLinkDelete.classList.add('hidden');
  const navLinkCancel = el('button');

  const footerText = el('textarea');
  const insertBytesBtn = el('button');
  const cssRules = el('textarea');
  const liveCSS = el('style');

  const deps = {
    navEnabled,
    navGlobalHint: el('div'),
    navLinks,
    addNavLinkBtn,
    navLinkPopup,
    navLinkText,
    navLinkHref,
    navLinkSave,
    navLinkDelete,
    navLinkCancel,

    footerEnabled,
    footerGlobalHint: el('div'),
    footerText,

    metaEnabled,
    metaGlobalHint: el('div'),
    metaDescription: el('textarea'),
    metaAuthor: el('input'),

    titleOverrideEnabled,
    titleOverrideHint: el('div'),
    titleOverrideInput: el('input'),

    insertBytesBtn,
    cssEnabled,
    cssGlobalHint: el('div'),
    cssRules,
    liveCSS,

    updateTitleBytes: vi.fn(),
    onPreviewRequested: vi.fn(),
    t: (key) => key === 'editor.browserTabTitleHintWithSite' ? 'Uses Site Title' : key,
    getGlobalConfig: vi.fn(() => ({
      siteTitleEnabled: true,
      siteTitle: 'My Site',
      header: { links: [{ text: 'Home', href: '/index.html' }] },
      footer: { content: 'Footer global' },
      meta: { description: 'Desc', author: 'Author' },
      cssMode: 'dark'
    })),
  };

  document.body.append(
    navEnabled,
    deps.navGlobalHint,
    navLinks,
    addNavLinkBtn,
    navLinkPopup,
    navLinkText,
    navLinkHref,
    navLinkSave,
    navLinkDelete,
    navLinkCancel,
    footerEnabled,
    deps.footerGlobalHint,
    footerText,
    metaEnabled,
    deps.metaGlobalHint,
    deps.metaDescription,
    deps.metaAuthor,
    titleOverrideEnabled,
    deps.titleOverrideHint,
    deps.titleOverrideInput,
    insertBytesBtn,
    cssEnabled,
    deps.cssGlobalHint,
    cssRules,
    liveCSS
  );

  return deps;
}

describe('editor/overrides', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('toggles navigation controls and disabled state from navEnabled', () => {
    const deps = buildDeps();
    const manager = createEditorOverridesManager(deps);

    manager.loadGlobalNavigation();
    expect(deps.navLinks.querySelectorAll('.nav-chip').length).toBe(1);

    deps.navEnabled.checked = false;
    deps.navEnabled.dispatchEvent(new Event('change'));

    const chip = deps.navLinks.querySelector('.nav-chip');
    expect(chip.style.pointerEvents).toBe('none');
    expect(chip.style.opacity).toBe('0.6');
    expect(deps.addNavLinkBtn.disabled).toBe(true);

    deps.navEnabled.checked = true;
    deps.navEnabled.dispatchEvent(new Event('change'));
    expect(deps.addNavLinkBtn.disabled).toBe(false);
  });

  it('adds a new nav link via popup save flow', () => {
    const deps = buildDeps();
    createEditorOverridesManager(deps);

    deps.addNavLinkBtn.click();
    expect(deps.navLinkPopup.classList.contains('hidden')).toBe(false);

    deps.navLinkText.value = 'Blog';
    deps.navLinkHref.value = '/blog.html';
    deps.navLinkSave.click();

    const chips = deps.navLinks.querySelectorAll('.nav-chip');
    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toBe('Blog');
    expect(chips[0].dataset.href).toBe('/blog.html');
    expect(deps.navLinkPopup.classList.contains('hidden')).toBe(true);
  });

  it('inserts {{bytes}} token at cursor position and requests preview', () => {
    const deps = buildDeps();
    createEditorOverridesManager(deps);

    deps.footerEnabled.checked = true;
    deps.footerEnabled.dispatchEvent(new Event('change'));

    deps.footerText.value = 'abcDEF';
    deps.footerText.setSelectionRange(3, 3);
    deps.insertBytesBtn.click();

    expect(deps.footerText.value).toBe('abc{{bytes}}DEF');
    expect(deps.onPreviewRequested).toHaveBeenCalledTimes(1);
  });

  it('scopes live CSS deterministically on input', () => {
    const deps = buildDeps();
    const manager = createEditorOverridesManager(deps);

    deps.cssRules.value = 'body{margin:0} .card, html { color: red; }';
    deps.cssRules.dispatchEvent(new Event('input'));

    expect(deps.liveCSS.textContent).toContain('.block-editor {margin:0}');
    expect(deps.liveCSS.textContent).toContain('.block-editor .card, .block-editor { color: red; }');

    manager.updateTitleOverrideHint();
    expect(deps.titleOverrideHint.innerHTML).toContain('My Site');
  });

  it('supports editing/deleting nav links and closing popup', () => {
    const deps = buildDeps();
    const manager = createEditorOverridesManager(deps);

    manager.loadGlobalNavigation();
    const chip = deps.navLinks.querySelector('.nav-chip');
    chip.click();

    expect(deps.navLinkDelete.classList.contains('hidden')).toBe(false);
    deps.navLinkText.value = 'Start';
    deps.navLinkHref.value = '/start.html';
    deps.navLinkSave.click();

    const updatedChip = deps.navLinks.querySelector('.nav-chip');
    expect(updatedChip.textContent).toBe('Start');
    expect(updatedChip.dataset.href).toBe('/start.html');

    updatedChip.click();
    deps.navLinkDelete.click();
    expect(deps.navLinks.querySelectorAll('.nav-chip').length).toBe(0);

    deps.addNavLinkBtn.click();
    expect(deps.navLinkPopup.classList.contains('hidden')).toBe(false);
    deps.navLinkCancel.click();
    expect(deps.navLinkPopup.classList.contains('hidden')).toBe(true);
  });

  it('reorders nav chips via drag/drop and updates section toggles', () => {
    const deps = buildDeps();
    const manager = createEditorOverridesManager(deps);

    deps.getGlobalConfig.mockReturnValue({
      header: {
        links: [
          { text: 'One', href: '/one.html' },
          { text: 'Two', href: '/two.html' }
        ]
      }
    });
    manager.loadGlobalNavigation();

    const chips = deps.navLinks.querySelectorAll('.nav-chip');
    const first = chips[0];
    const second = chips[1];

    first.classList.add('dragging');
    second.dispatchEvent(new Event('dragover', { bubbles: true, cancelable: true }));
    second.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));

    const reordered = deps.navLinks.querySelectorAll('.nav-chip');
    expect(reordered[0].textContent).toBe('Two');
    expect(reordered[1].textContent).toBe('One');

    deps.footerEnabled.checked = false;
    deps.footerEnabled.dispatchEvent(new Event('change'));
    expect(deps.footerText.disabled).toBe(true);
    expect(deps.insertBytesBtn.disabled).toBe(true);

    deps.metaEnabled.checked = false;
    deps.metaEnabled.dispatchEvent(new Event('change'));
    expect(deps.metaDescription.disabled).toBe(true);
    expect(deps.metaAuthor.disabled).toBe(true);

    deps.titleOverrideEnabled.checked = false;
    deps.titleOverrideEnabled.dispatchEvent(new Event('change'));
    expect(deps.titleOverrideInput.disabled).toBe(true);

    deps.cssEnabled.checked = false;
    deps.cssEnabled.dispatchEvent(new Event('change'));
    expect(deps.cssRules.disabled).toBe(true);
  });
});
