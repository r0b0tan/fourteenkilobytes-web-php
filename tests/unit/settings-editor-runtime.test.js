import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createEditorRuntime } from '../../public/admin/lib/settings-page/editor-runtime.js';

function el(tag = 'div') {
  return document.createElement(tag);
}

function setupEnv() {
  document.body.innerHTML = '';

  const ids = [
    'overhead-breakdown-base',
    'overhead-breakdown-title',
    'overhead-breakdown-favicon',
    'overhead-breakdown-meta',
    'overhead-breakdown-nav',
    'overhead-breakdown-footer',
    'overhead-breakdown-css',
    'overhead-breakdown-total',
  ];
  ids.forEach((id) => {
    const node = el('span');
    node.id = id;
    document.body.appendChild(node);
  });

  const loadingOverlay = el('div');
  loadingOverlay.id = 'loading-overlay';
  document.body.appendChild(loadingOverlay);

  const linksWrap = el('div');
  const navLink = el('a');
  navLink.href = 'https://example.com/next';
  navLink.textContent = 'Next';
  linksWrap.appendChild(navLink);
  const logoutLink = el('a');
  logoutLink.id = 'user-logout';
  logoutLink.href = 'https://example.com/logout';
  logoutLink.textContent = 'Logout';
  linksWrap.appendChild(logoutLink);
  document.body.appendChild(linksWrap);

  const adminLanguage = el('select');
  const langOption = el('option');
  langOption.value = 'en';
  const langOptionDe = el('option');
  langOptionDe.value = 'de';
  adminLanguage.appendChild(langOption);
  adminLanguage.appendChild(langOptionDe);

  const homepageSelect = el('select');
  const homepageDefault = el('option');
  homepageDefault.value = '';
  const homepageAbout = el('option');
  homepageAbout.value = 'about';
  const homepageStart = el('option');
  homepageStart.value = 'startseite';
  homepageSelect.append(homepageDefault, homepageAbout, homepageStart);
  const headerEnabled = el('input');
  headerEnabled.type = 'checkbox';
  const headerEditor = el('div');
  const headerLinks = el('div');
  const footerEnabled = el('input');
  footerEnabled.type = 'checkbox';
  const footerEditor = el('div');
  const footerContent = el('textarea');
  const cssEnabled = el('input');
  cssEnabled.type = 'checkbox';
  const cssEditor = el('div');
  const cssMode = el('select');
  const cssModeSafe = el('option');
  cssModeSafe.value = 'default';
  const cssModeDark = el('option');
  cssModeDark.value = 'dark';
  cssMode.append(cssModeSafe, cssModeDark);
  const globalCss = el('textarea');
  const pageWidth = el('input');
  const metaEnabled = el('input');
  metaEnabled.type = 'checkbox';
  const metaEditor = el('div');
  const siteTitleEnabled = el('input');
  siteTitleEnabled.type = 'checkbox';
  const siteTitleEditor = el('div');
  const siteTitle = el('input');
  const metaDescription = el('textarea');
  const metaAuthor = el('input');
  const faviconData = el('input');
  const rssEnabled = el('input');
  rssEnabled.type = 'checkbox';
  const rssEditor = el('div');
  const rssSiteUrl = el('input');
  const rssLanguage = el('input');
  const rssCopyright = el('input');
  const rssMaxItems = el('input');
  const rssTtl = el('input');
  const rssUrlSection = el('div');
  const rssSettingsSection = el('div');
  const bloglistLimit = el('input');
  const archiveEnabled = el('input');
  archiveEnabled.type = 'checkbox';
  const archiveUrlSection = el('div');
  const archiveLinkTextSection = el('div');
  const archiveSlug = el('input');
  const archiveLinkText = el('input');
  const compressionEnabled = el('input');
  compressionEnabled.type = 'checkbox';
  const classManglingEnabled = el('input');
  classManglingEnabled.type = 'checkbox';
  const classManglingMode = el('select');
  const optSafe = el('option');
  optSafe.value = 'safe';
  const optAggressive = el('option');
  optAggressive.value = 'aggressive';
  classManglingMode.append(optSafe, optAggressive);
  const saveBtn = el('button');
  saveBtn.innerHTML = 'Save';
  const discardBtn = el('button');
  const overheadPieChart = el('div');
  const overheadPercent = el('span');

  const elements = {
    adminLanguage,
    homepageSelect,
    headerEnabled,
    headerEditor,
    headerLinks,
    footerEnabled,
    footerEditor,
    footerContent,
    cssEnabled,
    cssEditor,
    cssMode,
    globalCss,
    pageWidth,
    metaEnabled,
    metaEditor,
    siteTitleEnabled,
    siteTitleEditor,
    siteTitle,
    metaDescription,
    metaAuthor,
    faviconData,
    rssEnabled,
    rssEditor,
    rssSiteUrl,
    rssLanguage,
    rssCopyright,
    rssMaxItems,
    rssTtl,
    rssUrlSection,
    rssSettingsSection,
    bloglistLimit,
    archiveEnabled,
    archiveUrlSection,
    archiveLinkTextSection,
    archiveSlug,
    archiveLinkText,
    compressionEnabled,
    classManglingEnabled,
    classManglingMode,
    saveBtn,
    discardBtn,
    overheadPieChart,
    overheadPercent,
  };

  const helpers = {
    createLinkChip: vi.fn((text, href) => {
      const chip = el('span');
      chip.className = 'nav-chip';
      chip.textContent = text;
      chip.dataset.href = href;
      return chip;
    }),
    getHeaderLinks: vi.fn(() => [{ text: 'Nav', href: '/nav' }]),
    setFaviconPreview: vi.fn(),
    clearFaviconPreview: vi.fn(),
    updateRssFeedUrlPreview: vi.fn(),
    updateCssModeUI: vi.fn(),
    updateRegenerateButton: vi.fn(),
  };

  document.body.append(
    adminLanguage,
    homepageSelect,
    headerEnabled,
    headerEditor,
    headerLinks,
    footerEnabled,
    footerEditor,
    footerContent,
    cssEnabled,
    cssEditor,
    cssMode,
    globalCss,
    pageWidth,
    metaEnabled,
    metaEditor,
    siteTitleEnabled,
    siteTitleEditor,
    siteTitle,
    metaDescription,
    metaAuthor,
    faviconData,
    rssEnabled,
    rssEditor,
    rssSiteUrl,
    rssLanguage,
    rssCopyright,
    rssMaxItems,
    rssTtl,
    rssUrlSection,
    rssSettingsSection,
    bloglistLimit,
    archiveEnabled,
    archiveUrlSection,
    archiveLinkTextSection,
    archiveSlug,
    archiveLinkText,
    compressionEnabled,
    classManglingEnabled,
    classManglingMode,
    saveBtn,
    discardBtn,
    overheadPieChart,
    overheadPercent,
  );

  const state = { initialSettings: null, hasUnsavedChanges: false };
  const updateSaveButton = vi.fn();
  const showNavigationOverlay = vi.fn();
  const formatBytes = vi.fn((n) => `${n} B`);
  const Toast = { success: vi.fn(), error: vi.fn() };
  const Modal = { confirm: vi.fn(async () => true) };
  const i18n = { setLocale: vi.fn() };
  const t = vi.fn((k) => k);

  const App = {
    previewOverhead: vi.fn(async () => ({ overheadBytes: 1200, breakdown: { base: 1200 } })),
    getSettings: vi.fn(async () => ({
      version: 1,
      homepageSlug: null,
      siteTitleEnabled: true,
      siteTitle: 'Title',
      cssEnabled: true,
      cssMode: 'dark',
      globalCss: 'body{margin:0}',
      pageWidth: '980px',
      header: { enabled: true, links: [{ text: 'Home', href: '/index.html' }] },
      footer: { enabled: true, content: 'Footer' },
      meta: { enabled: true, description: 'Desc', author: 'Author' },
      rss: { enabled: true, siteUrl: 'https://example.com/', language: 'de-DE', copyright: 'c', maxItems: 5, ttl: 30 },
      bloglist: { limit: 12, archiveEnabled: true, archiveSlug: 'archive', archiveLinkText: 'View all posts →' },
      optimizations: {
        compression: { enabled: true },
        classMangling: { enabled: true, mode: 'aggressive' },
      },
      favicon: 'data:image/png;base64,abc',
    })),
    getPosts: vi.fn(async () => ([
      { slug: 'startseite', title: 'Startseite', pageType: 'page', status: 'published' },
      { slug: 'about', title: 'About', pageType: 'page', status: 'published' },
    ])),
    createDefaultHomepage: vi.fn(async () => {}),
    saveSettings: vi.fn(async () => {}),
    generateArchivePage: vi.fn(async () => {}),
  };

  return {
    App,
    t,
    i18n,
    Toast,
    Modal,
    formatBytes,
    showNavigationOverlay,
    state,
    updateSaveButton,
    elements,
    helpers,
    navLink,
    logoutLink,
  };
}

async function flush(times = 6) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('settings-page/editor-runtime', () => {
  let env;
  let originalHref;

  beforeEach(() => {
    env = setupEnv();
    vi.useFakeTimers();
    localStorage.clear();
    originalHref = window.location.href;
  });

  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState({}, '', originalHref);
  });

  it('buildSettings maps form values and applies defaults', () => {
    const runtime = createEditorRuntime(env);
    env.elements.homepageSelect.value = 'about';
    env.elements.siteTitleEnabled.checked = true;
    env.elements.siteTitle.value = '  Site  ';
    env.elements.cssEnabled.checked = true;
    env.elements.cssMode.value = 'dark';
    env.elements.globalCss.value = ' body{margin:0} ';
    env.elements.pageWidth.value = ' 1200px ';
    env.elements.headerEnabled.checked = true;
    env.elements.footerEnabled.checked = true;
    env.elements.footerContent.value = '  Footer  ';
    env.elements.metaEnabled.checked = true;
    env.elements.metaDescription.value = '  Desc  ';
    env.elements.metaAuthor.value = '  Author  ';
    env.elements.rssEnabled.checked = true;
    env.elements.rssSiteUrl.value = 'https://example.com///';
    env.elements.rssLanguage.value = 'de-DE';
    env.elements.rssCopyright.value = '  ©  ';
    env.elements.rssMaxItems.value = '7';
    env.elements.rssTtl.value = '90';
    env.elements.bloglistLimit.value = '11';
    env.elements.archiveEnabled.checked = true;
    env.elements.archiveSlug.value = '  arch  ';
    env.elements.archiveLinkText.value = '  All posts  ';
    env.elements.compressionEnabled.checked = true;
    env.elements.classManglingEnabled.checked = true;
    env.elements.classManglingMode.value = 'aggressive';

    const settings = runtime.buildSettings();
    expect(settings.homepageSlug).toBe('about');
    expect(settings.siteTitle).toBe('Site');
    expect(settings.rss.siteUrl).toBe('https://example.com');
    expect(settings.bloglist.archiveSlug).toBe('arch');
    expect(settings.optimizations.classMangling.mode).toBe('aggressive');
    expect(settings.header.links).toEqual([{ text: 'Nav', href: '/nav' }]);
  });

  it('updateOverhead caches by relevant settings hash', async () => {
    const runtime = createEditorRuntime(env);

    await runtime.updateOverhead();
    await runtime.updateOverhead();

    expect(env.App.previewOverhead).toHaveBeenCalledTimes(1);
    expect(env.elements.overheadPercent.textContent).toBe('8%');
    expect(env.elements.overheadPieChart.style.background).toContain('conic-gradient');
  });

  it('loadSettings populates UI, creates homepage slug and removes loading overlay', async () => {
    env.App.getSettings
      .mockResolvedValueOnce({
        version: 1,
        homepageSlug: null,
        siteTitleEnabled: true,
        siteTitle: 'Title',
        cssEnabled: true,
        cssMode: 'dark',
        globalCss: 'body{margin:0}',
        pageWidth: '980px',
        header: { enabled: true, links: [{ text: 'Home', href: '/index.html' }] },
        footer: { enabled: true, content: 'Footer' },
        meta: { enabled: true, description: 'Desc', author: 'Author' },
        rss: { enabled: true, siteUrl: 'https://example.com/', language: 'de-DE', copyright: 'c', maxItems: 5, ttl: 30 },
        bloglist: { limit: 12, archiveEnabled: true, archiveSlug: 'archive', archiveLinkText: 'View all posts →' },
        optimizations: {
          compression: { enabled: true },
          classMangling: { enabled: true, mode: 'aggressive' },
        },
        favicon: 'data:image/png;base64,abc',
      })
      .mockResolvedValueOnce({
        version: 1,
        homepageSlug: 'startseite',
        siteTitleEnabled: true,
        siteTitle: 'Title',
        cssEnabled: true,
        cssMode: 'dark',
        globalCss: 'body{margin:0}',
        pageWidth: '980px',
        header: { enabled: true, links: [{ text: 'Home', href: '/index.html' }] },
        footer: { enabled: true, content: 'Footer' },
        meta: { enabled: true, description: 'Desc', author: 'Author' },
        rss: { enabled: true, siteUrl: 'https://example.com/', language: 'de-DE', copyright: 'c', maxItems: 5, ttl: 30 },
        bloglist: { limit: 12, archiveEnabled: true, archiveSlug: 'archive', archiveLinkText: 'View all posts →' },
        optimizations: {
          compression: { enabled: true },
          classMangling: { enabled: true, mode: 'aggressive' },
        },
        favicon: 'data:image/png;base64,abc',
      });

    env.App.getPosts
      .mockResolvedValueOnce([{ slug: 'about', title: 'About', pageType: 'page', status: 'published' }])
      .mockResolvedValueOnce([
        { slug: 'startseite', title: 'Startseite', pageType: 'page', status: 'published' },
        { slug: 'about', title: 'About', pageType: 'page', status: 'published' },
      ]);

    const runtime = createEditorRuntime(env);
    await runtime.loadSettings();

    expect(env.App.createDefaultHomepage).toHaveBeenCalled();
    expect(env.App.saveSettings).toHaveBeenCalled();
    expect(env.elements.homepageSelect.value).toBe('startseite');
    expect(env.helpers.createLinkChip).toHaveBeenCalled();
    expect(env.helpers.setFaviconPreview).toHaveBeenCalled();
    expect(env.helpers.updateCssModeUI).toHaveBeenCalledWith({ skipOverhead: true });
    expect(env.helpers.updateRssFeedUrlPreview).toHaveBeenCalled();
    expect(document.getElementById('loading-overlay')).toBeNull();
    expect(env.state.initialSettings).toBeTruthy();
    expect(env.updateSaveButton).toHaveBeenCalled();
  });

  it('bindSaveDiscard handles discard confirm and save success with archive generation', async () => {
    localStorage.setItem('adminLanguage', 'en');
    const runtime = createEditorRuntime(env);

    runtime.bindSaveDiscard();

    env.Modal.confirm.mockResolvedValueOnce(true);
    env.elements.adminLanguage.value = 'de';
    const settingsCallsBefore = env.App.getSettings.mock.calls.length;
    env.elements.discardBtn.click();
    await flush();
    expect(env.elements.adminLanguage.value).toBe('en');
    expect(env.App.getSettings.mock.calls.length).toBeGreaterThan(settingsCallsBefore);

    env.elements.archiveEnabled.checked = true;
    env.elements.adminLanguage.value = 'de';
    env.elements.saveBtn.click();
    await flush(8);

    expect(env.App.saveSettings).toHaveBeenCalled();
    expect(env.i18n.setLocale).toHaveBeenCalledWith('de');
    expect(env.App.generateArchivePage).toHaveBeenCalled();
    expect(env.Toast.success).toHaveBeenCalledWith('settings.saved');
    expect(env.state.hasUnsavedChanges).toBe(false);
  });

  it('bindUnsavedGuard intercepts normal links with unsaved changes', async () => {
    const runtime = createEditorRuntime(env);
    runtime.bindUnsavedGuard();

    env.state.hasUnsavedChanges = true;
    env.Modal.confirm.mockResolvedValueOnce(true);

    const evt = new MouseEvent('click', { bubbles: true, cancelable: true });
    env.navLink.dispatchEvent(evt);
    await flush();

    expect(env.Modal.confirm).toHaveBeenCalledWith('settings.unsavedChanges');
    expect(env.showNavigationOverlay).toHaveBeenCalled();
    expect(env.state.hasUnsavedChanges).toBe(false);

    const logoutEvt = new MouseEvent('click', { bubbles: true, cancelable: true });
    env.logoutLink.dispatchEvent(logoutEvt);
    expect(env.Modal.confirm).toHaveBeenCalledTimes(1);
  });
});
