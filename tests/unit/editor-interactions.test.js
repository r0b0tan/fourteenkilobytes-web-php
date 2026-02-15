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
  const tabContent = make('div');
  tabContent.id = 'tab-general';

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
    tabBtns: [tabBtn],
    tabContents: [tabContent],
  };
}

describe('initEditorInteractions favicon preview', () => {
  beforeEach(() => {
    document.body.innerHTML = '<button id="insert-bytes-btn" type="button"></button>';
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
