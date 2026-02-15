import { describe, test, expect, vi, beforeEach } from 'vitest';
import { initEditorInteractions } from '../../public/admin/lib/settings-page/editor-interactions.js';

function createElements() {
  const make = (tag = 'div') => document.createElement(tag);

  const regenerateHomepageBtn = make('button');
  regenerateHomepageBtn.appendChild(make('span'));

  const recompileArchiveBtn = make('button');
  recompileArchiveBtn.appendChild(make('span'));

  const tabBtn = make('button');
  tabBtn.setAttribute('data-tab', 'general');
  const cssTabBtn = make('button');
  cssTabBtn.setAttribute('data-tab', 'css');
  const tabContent = make('div');
  tabContent.id = 'tab-general';
  const cssTabContent = make('div');
  cssTabContent.id = 'tab-css';

  return {
    adminLanguage: make('select'),
    homepageSelect: make('select'),
    regenerateHomepageBtn,
    headerEnabled: make('input'),
    headerEditor: make('div'),
    headerLinks: make('div'),
    addHeaderLinkBtn: make('button'),
    footerEnabled: make('input'),
    footerEditor: make('div'),
    footerContent: make('textarea'),
    cssEnabled: make('input'),
    cssEditor: make('div'),
    cssMode: make('select'),
    cssPresetPreview: make('div'),
    cssPreviewContent: make('div'),
    cssPreviewFilename: make('div'),
    cssCustomEditor: make('div'),
    globalCss: make('textarea'),
    pageWidth: make('input'),
    metaEnabled: make('input'),
    metaEditor: make('div'),
    siteTitleEnabled: make('input'),
    siteTitleEditor: make('div'),
    siteTitle: make('input'),
    metaDescription: make('textarea'),
    metaAuthor: make('input'),
    linkPopup: make('div'),
    linkText: make('input'),
    linkHref: make('input'),
    linkSave: make('button'),
    linkDelete: make('button'),
    linkCancel: make('button'),
    faviconInput: make('input'),
    faviconPreview: make('div'),
    faviconRemove: make('button'),
    faviconData: make('input'),
    rssEnabled: make('input'),
    rssEditor: make('div'),
    rssSiteUrl: make('input'),
    rssLanguage: make('input'),
    rssCopyright: make('input'),
    rssMaxItems: make('input'),
    rssTtl: make('input'),
    rssFeedUrlPreview: make('input'),
    rssUrlSection: make('div'),
    rssSettingsSection: make('div'),
    rssCopyBtn: make('button'),
    rssPreviewLink: make('a'),
    bloglistLimit: make('input'),
    archiveEnabled: make('input'),
    archiveUrlSection: make('div'),
    archiveLinkTextSection: make('div'),
    archiveSlug: make('input'),
    archiveLinkText: make('input'),
    recompileArchiveBtn,
    compressionEnabled: make('input'),
    classManglingEnabled: make('input'),
    classManglingMode: make('select'),
    tabBtns: [tabBtn, cssTabBtn],
    tabContents: [tabContent, cssTabContent],
  };
}

async function flush(times = 6) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('initEditorInteractions favicon preview', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="insert-bytes-btn" type="button"></button>';
    vi.useFakeTimers();
    localStorage.clear();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  test('homepage regenerate flow and archive recompile success/error paths', async () => {
    const elements = createElements();
    const markAsChanged = vi.fn();
    const updateOverhead = vi.fn();
    const Toast = { success: vi.fn(), error: vi.fn() };
    const Modal = { confirm: vi.fn().mockResolvedValue(true) };
    const App = {
      republishPost: vi.fn().mockResolvedValue(undefined),
      generateArchivePage: vi.fn().mockResolvedValue(undefined),
      loadCssPresets: vi.fn().mockResolvedValue({}),
    };

    const option = document.createElement('option');
    option.value = 'startseite';
    elements.homepageSelect.appendChild(option);
    elements.homepageSelect.value = 'startseite';
    elements.archiveEnabled.checked = true;
    elements.archiveSlug.value = '';

    initEditorInteractions({
      doc: document,
      App,
      t: (key) => key,
      Toast,
      Modal,
      debounce: (fn) => fn,
      formatBytes: (value) => String(value),
      state: { editingLink: null, cssPreviewLoaded: false },
      markAsChanged,
      updateOverhead,
      elements,
    });

    elements.homepageSelect.dispatchEvent(new Event('change'));
    expect(elements.regenerateHomepageBtn.style.display).toBe('block');
    expect(markAsChanged).toHaveBeenCalled();

    elements.regenerateHomepageBtn.click();
    await flush();
    expect(App.republishPost).toHaveBeenCalledWith('startseite');
    expect(Toast.success).toHaveBeenCalledWith('settings.homepageRegenerateSuccess');

    vi.advanceTimersByTime(2000);
    expect(elements.regenerateHomepageBtn.disabled).toBe(false);

    elements.recompileArchiveBtn.click();
    await flush();
    expect(App.generateArchivePage).toHaveBeenCalled();
    expect(Toast.success).toHaveBeenCalledWith('settings.archiveRecompileSuccess');
    vi.advanceTimersByTime(2000);

    App.generateArchivePage.mockRejectedValueOnce(new Error('broken'));
    elements.recompileArchiveBtn.click();
    await flush();
    expect(Toast.error).toHaveBeenCalledWith('errors.generic');
  });

  test('handles nav chip add/edit/delete and bytes insertion', () => {
    const elements = createElements();
    const markAsChanged = vi.fn();
    const updateOverhead = vi.fn();
    const Toast = { success: vi.fn(), error: vi.fn() };

    const api = initEditorInteractions({
      doc: document,
      App: {
        republishPost: vi.fn(),
        generateArchivePage: vi.fn(),
        loadCssPresets: vi.fn().mockResolvedValue({}),
      },
      t: (key) => key,
      Toast,
      Modal: { confirm: vi.fn() },
      debounce: (fn) => fn,
      formatBytes: (value) => String(value),
      state: { editingLink: null, cssPreviewLoaded: false },
      markAsChanged,
      updateOverhead,
      elements,
    });

    elements.addHeaderLinkBtn.click();
    elements.linkText.value = 'Blog';
    elements.linkHref.value = '/blog.html';
    elements.linkSave.click();

    const chip = elements.headerLinks.querySelector('.nav-chip');
    expect(chip).toBeTruthy();
    expect(markAsChanged).toHaveBeenCalled();
    expect(updateOverhead).toHaveBeenCalled();

    chip.click();
    elements.linkText.value = 'News';
    elements.linkHref.value = '/news.html';
    elements.linkSave.click();
    expect(elements.headerLinks.querySelector('.nav-chip').textContent).toBe('News');

    chip.click();
    elements.linkDelete.click();
    expect(elements.headerLinks.querySelector('.nav-chip')).toBeNull();

    elements.footerContent.value = 'abc';
    elements.footerContent.selectionStart = 1;
    elements.footerContent.selectionEnd = 2;
    document.getElementById('insert-bytes-btn').click();
    expect(elements.footerContent.value).toBe('a{{bytes}}c');

    expect(api.getHeaderLinks()).toEqual([]);
  });

  test('updates RSS preview, copies URL and toggles CSS mode UI', async () => {
    const elements = createElements();
    const markAsChanged = vi.fn();
    const updateOverhead = vi.fn();
    const Toast = { success: vi.fn(), error: vi.fn() };
    const App = {
      republishPost: vi.fn(),
      generateArchivePage: vi.fn(),
      loadCssPresets: vi.fn().mockResolvedValue({ dark: 'body{color:#fff}' }),
    };

    const dark = document.createElement('option');
    dark.value = 'dark';
    const custom = document.createElement('option');
    custom.value = 'custom';
    elements.cssMode.append(dark, custom);
    elements.cssMode.value = 'dark';
    document.body.appendChild(elements.tabContents[1]);
    elements.tabContents[1].classList.add('active');

    const api = initEditorInteractions({
      doc: document,
      App,
      t: (key) => key,
      Toast,
      Modal: { confirm: vi.fn() },
      debounce: (fn) => fn,
      formatBytes: (value) => String(value),
      state: { editingLink: null, cssPreviewLoaded: false },
      markAsChanged,
      updateOverhead,
      elements,
    });

    elements.rssEnabled.checked = true;
    elements.rssEnabled.dispatchEvent(new Event('change'));
    expect(elements.rssEditor.classList.contains('hidden')).toBe(false);

    elements.rssSiteUrl.value = 'https://example.com///';
    elements.rssSiteUrl.dispatchEvent(new Event('input'));
    expect(elements.rssFeedUrlPreview.value).toBe('https://example.com/feed.xml');
    expect(elements.rssPreviewLink.href).toContain('/feed.xml');

    elements.rssCopyBtn.click();
    await flush();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/feed.xml');
    expect(Toast.success).toHaveBeenCalledWith('settings.rssCopySuccess');

    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('nope'));
    elements.rssCopyBtn.click();
    await flush();
    expect(Toast.error).toHaveBeenCalledWith('settings.rssCopyError');

    api.updateCssModeUI();
    await flush();
    expect(App.loadCssPresets).toHaveBeenCalled();
    expect(elements.cssPreviewFilename.textContent).toBe('fourteenkilobytes-dark.css');

    elements.cssMode.value = 'custom';
    api.updateCssModeUI();
    expect(elements.cssCustomEditor.classList.contains('hidden')).toBe(false);
  });

  test('handles favicon upload limits, successful read and remove', async () => {
    const elements = createElements();
    const markAsChanged = vi.fn();
    const updateOverhead = vi.fn();
    const Toast = { success: vi.fn(), error: vi.fn() };

    const originalReader = global.FileReader;
    global.FileReader = class {
      readAsDataURL(file) {
        if (file.__fail) {
          this.onerror(new Error('fail'));
          return;
        }
        this.result = `data:image/png;base64,${file.name}`;
        this.onload();
      }
    };

    initEditorInteractions({
      doc: document,
      App: {
        republishPost: vi.fn(),
        generateArchivePage: vi.fn(),
        loadCssPresets: vi.fn().mockResolvedValue({}),
      },
      t: (key) => key,
      Toast,
      Modal: { confirm: vi.fn() },
      debounce: (fn) => fn,
      formatBytes: (value) => `${value} B`,
      state: { editingLink: null, cssPreviewLoaded: false },
      markAsChanged,
      updateOverhead,
      elements,
    });

    Object.defineProperty(elements.faviconInput, 'files', {
      configurable: true,
      value: [{ name: 'large.png', size: 5000 }],
    });
    elements.faviconInput.dispatchEvent(new Event('change'));
    expect(Toast.error).toHaveBeenCalledWith('settings.faviconTooLarge');

    Object.defineProperty(elements.faviconInput, 'files', {
      configurable: true,
      value: [{ name: 'ok.png', size: 1200 }],
    });
    elements.faviconInput.dispatchEvent(new Event('change'));
    await flush();
    expect(elements.faviconData.value).toContain('ok.png');
    expect(markAsChanged).toHaveBeenCalled();

    elements.faviconRemove.click();
    expect(elements.faviconData.value).toBe('');

    Object.defineProperty(elements.faviconInput, 'files', {
      configurable: true,
      value: [{ name: 'bad.png', size: 100, __fail: true }],
    });
    elements.faviconInput.dispatchEvent(new Event('change'));
    await flush();
    expect(Toast.error).toHaveBeenCalledWith('settings.faviconReadError');

    global.FileReader = originalReader;
  });

  test('covers early-return flows for regenerate/recompile and link cancel', async () => {
    const elements = createElements();
    const markAsChanged = vi.fn();
    const updateOverhead = vi.fn();
    const Toast = { success: vi.fn(), error: vi.fn() };
    const Modal = { confirm: vi.fn().mockResolvedValue(false) };
    const App = {
      republishPost: vi.fn(),
      generateArchivePage: vi.fn(),
      loadCssPresets: vi.fn().mockResolvedValue({}),
    };

    elements.archiveEnabled.checked = false;

    initEditorInteractions({
      doc: document,
      App,
      t: (key) => key,
      Toast,
      Modal,
      debounce: (fn) => fn,
      formatBytes: (value) => String(value),
      state: { editingLink: null, cssPreviewLoaded: false },
      markAsChanged,
      updateOverhead,
      elements,
    });

    // no homepage slug => early return
    elements.regenerateHomepageBtn.click();
    await flush();
    expect(App.republishPost).not.toHaveBeenCalled();

    // archive disabled => early return
    elements.recompileArchiveBtn.click();
    await flush();
    expect(App.generateArchivePage).not.toHaveBeenCalled();

    // confirm false => no action
    const opt = document.createElement('option');
    opt.value = 'startseite';
    elements.homepageSelect.appendChild(opt);
    elements.homepageSelect.value = 'startseite';
    elements.regenerateHomepageBtn.click();
    await flush();
    expect(Modal.confirm).toHaveBeenCalled();
    expect(App.republishPost).not.toHaveBeenCalled();

    elements.addHeaderLinkBtn.click();
    expect(elements.linkPopup.classList.contains('hidden')).toBe(false);
    elements.linkCancel.click();
    expect(elements.linkPopup.classList.contains('hidden')).toBe(true);
  });

  test('tab switching and css mode changes trigger preview logic and toggles', async () => {
    const elements = createElements();
    const markAsChanged = vi.fn();
    const updateOverhead = vi.fn();
    const App = {
      republishPost: vi.fn(),
      generateArchivePage: vi.fn(),
      loadCssPresets: vi.fn().mockResolvedValue({ dark: 'body{color:#fff}', light: 'body{color:#000}' }),
    };

    const dark = document.createElement('option');
    dark.value = 'dark';
    const custom = document.createElement('option');
    custom.value = 'custom';
    elements.cssMode.append(dark, custom);
    elements.cssMode.value = 'dark';

    document.body.append(elements.tabBtns[0], elements.tabBtns[1], elements.tabContents[0], elements.tabContents[1]);

    const state = { editingLink: null, cssPreviewLoaded: false };
    initEditorInteractions({
      doc: document,
      App,
      t: (key) => key,
      Toast: { success: vi.fn(), error: vi.fn() },
      Modal: { confirm: vi.fn() },
      debounce: (fn) => fn,
      formatBytes: (value) => String(value),
      state,
      markAsChanged,
      updateOverhead,
      elements,
    });

    elements.tabBtns[1].click(); // css tab
    await flush();
    expect(App.loadCssPresets).toHaveBeenCalledWith();
    expect(elements.tabBtns[1].classList.contains('active')).toBe(true);
    expect(elements.tabContents[1].classList.contains('active')).toBe(true);

    elements.cssMode.dispatchEvent(new Event('change'));
    expect(markAsChanged).toHaveBeenCalled();
    expect(updateOverhead).toHaveBeenCalled();

    elements.cssMode.value = 'custom';
    elements.cssMode.dispatchEvent(new Event('change'));
    expect(elements.cssCustomEditor.classList.contains('hidden')).toBe(false);
    expect(elements.cssPresetPreview.classList.contains('hidden')).toBe(true);
  });

  test('drag/drop and section toggles call change handlers', () => {
    const elements = createElements();
    const markAsChanged = vi.fn();
    const updateOverhead = vi.fn();

    const api = initEditorInteractions({
      doc: document,
      App: {
        republishPost: vi.fn(),
        generateArchivePage: vi.fn(),
        loadCssPresets: vi.fn().mockResolvedValue({}),
      },
      t: (key) => key,
      Toast: { success: vi.fn(), error: vi.fn() },
      Modal: { confirm: vi.fn() },
      debounce: (fn) => fn,
      formatBytes: (value) => String(value),
      state: { editingLink: null, cssPreviewLoaded: false },
      markAsChanged,
      updateOverhead,
      elements,
    });

    const chipA = api.createLinkChip('A', '/a');
    const chipB = api.createLinkChip('B', '/b');
    elements.headerLinks.append(chipA, chipB);

    chipA.classList.add('dragging');
    const dragEvt = new Event('dragover', { bubbles: true, cancelable: true });
    Object.defineProperty(dragEvt, 'clientX', { value: 999 });
    chipB.dispatchEvent(dragEvt);
    chipB.dispatchEvent(new Event('dragleave', { bubbles: true }));
    chipB.dispatchEvent(new Event('drop', { bubbles: true, cancelable: true }));
    chipA.dispatchEvent(new Event('dragend', { bubbles: true }));
    expect(markAsChanged).toHaveBeenCalled();

    elements.footerEnabled.checked = true;
    elements.footerEnabled.dispatchEvent(new Event('change'));
    elements.metaEnabled.checked = true;
    elements.metaEnabled.dispatchEvent(new Event('change'));
    elements.siteTitleEnabled.checked = true;
    elements.siteTitleEnabled.dispatchEvent(new Event('change'));
    elements.cssEnabled.checked = true;
    elements.cssEnabled.dispatchEvent(new Event('change'));
    elements.compressionEnabled.checked = true;
    elements.compressionEnabled.dispatchEvent(new Event('change'));
    elements.classManglingEnabled.checked = true;
    elements.classManglingEnabled.dispatchEvent(new Event('change'));
    elements.classManglingMode.dispatchEvent(new Event('change'));
    elements.rssLanguage.dispatchEvent(new Event('change'));
    elements.rssCopyright.dispatchEvent(new Event('input'));
    elements.rssMaxItems.dispatchEvent(new Event('input'));
    elements.rssTtl.dispatchEvent(new Event('input'));
    elements.bloglistLimit.dispatchEvent(new Event('input'));
    elements.archiveEnabled.checked = true;
    elements.archiveEnabled.dispatchEvent(new Event('change'));
    elements.archiveSlug.dispatchEvent(new Event('input'));
    elements.archiveLinkText.dispatchEvent(new Event('input'));

    expect(updateOverhead).toHaveBeenCalled();
    expect(markAsChanged.mock.calls.length).toBeGreaterThan(8);
  });

  test('renders favicon preview via DOM API without creating executable attributes', () => {
    const elements = createElements();

    const api = initEditorInteractions({
      doc: document,
      App: {
        republishPost: vi.fn(),
        generateArchivePage: vi.fn(),
        loadCssPresets: vi.fn().mockResolvedValue({}),
      },
      t: (key) => key,
      Toast: { success: vi.fn(), error: vi.fn() },
      Modal: { confirm: vi.fn() },
      debounce: (fn) => fn,
      formatBytes: (value) => String(value),
      state: { editingLink: null, cssPreviewLoaded: false },
      markAsChanged: vi.fn(),
      updateOverhead: vi.fn(),
      elements,
    });

    const payload = 'data:image/svg+xml," onerror="window.__faviconXss=1';
    api.setFaviconPreview(payload);

    const img = elements.faviconPreview.querySelector('img');
    expect(img).not.toBeNull();
    expect(elements.faviconPreview.querySelectorAll('img').length).toBe(1);
    expect(img?.getAttribute('onerror')).toBeNull();
    expect(img?.getAttribute('src')).toContain('data:image/svg+xml');
    expect(global.window.__faviconXss).toBeUndefined();

    api.clearFaviconPreview();

    const placeholder = elements.faviconPreview.querySelector('.favicon-placeholder');
    expect(placeholder?.textContent).toBe('settings.faviconNone');
    expect(elements.faviconPreview.querySelector('img')).toBeNull();
  });
});
