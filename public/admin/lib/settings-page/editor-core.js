import { initEditorInteractions } from './editor-interactions.js';
import { createEditorRuntime } from './editor-runtime.js';

export function initEditorCore({ document: doc = document, App, t, i18n, debounce, formatBytes, showNavigationOverlay, Modal, Toast }) {
  const elements = {
    adminLanguage: doc.getElementById('admin-language'),
    homepageSelect: doc.getElementById('homepage-select'),
    regenerateHomepageBtn: doc.getElementById('regenerate-homepage-btn'),
    headerEnabled: doc.getElementById('header-enabled'),
    headerEditor: doc.getElementById('header-editor'),
    headerLinks: doc.getElementById('header-links'),
    addHeaderLinkBtn: doc.getElementById('add-header-link'),
    footerEnabled: doc.getElementById('footer-enabled'),
    footerEditor: doc.getElementById('footer-editor'),
    footerContent: doc.getElementById('footer-content'),
    cssEnabled: doc.getElementById('css-enabled'),
    cssEditor: doc.getElementById('css-editor'),
    cssMode: doc.getElementById('css-mode'),
    cssPresetPreview: doc.getElementById('css-preset-preview'),
    cssPreviewContent: doc.getElementById('css-preview-content'),
    cssPreviewFilename: doc.getElementById('css-preview-filename'),
    cssCustomEditor: doc.getElementById('css-custom-editor'),
    globalCss: doc.getElementById('global-css'),
    pageWidth: doc.getElementById('page-width'),
    metaEnabled: doc.getElementById('meta-enabled'),
    metaEditor: doc.getElementById('meta-editor'),
    siteTitleEnabled: doc.getElementById('site-title-enabled'),
    siteTitleEditor: doc.getElementById('site-title-editor'),
    siteTitle: doc.getElementById('site-title'),
    metaDescription: doc.getElementById('meta-description'),
    metaAuthor: doc.getElementById('meta-author'),
    linkPopup: doc.getElementById('link-popup'),
    linkText: doc.getElementById('link-text'),
    linkHref: doc.getElementById('link-href'),
    linkSave: doc.getElementById('link-save'),
    linkDelete: doc.getElementById('link-delete'),
    linkCancel: doc.getElementById('link-cancel'),
    faviconInput: doc.getElementById('favicon-input'),
    faviconPreview: doc.getElementById('favicon-preview'),
    faviconRemove: doc.getElementById('favicon-remove'),
    faviconData: doc.getElementById('favicon-data'),
    rssEnabled: doc.getElementById('rss-enabled'),
    rssEditor: doc.getElementById('rss-editor'),
    rssSiteUrl: doc.getElementById('rss-site-url'),
    rssLanguage: doc.getElementById('rss-language'),
    rssCopyright: doc.getElementById('rss-copyright'),
    rssMaxItems: doc.getElementById('rss-max-items'),
    rssTtl: doc.getElementById('rss-ttl'),
    rssFeedUrlPreview: doc.getElementById('rss-feed-url-preview'),
    rssUrlSection: doc.getElementById('rss-url-section'),
    rssSettingsSection: doc.getElementById('rss-settings-section'),
    rssCopyBtn: doc.getElementById('rss-copy-btn'),
    rssPreviewLink: doc.getElementById('rss-preview-link'),
    bloglistLimit: doc.getElementById('bloglist-limit'),
    archiveEnabled: doc.getElementById('archive-enabled'),
    archiveUrlSection: doc.getElementById('archive-url-section'),
    archiveLinkTextSection: doc.getElementById('archive-link-text-section'),
    archiveSlug: doc.getElementById('archive-slug'),
    archiveLinkText: doc.getElementById('archive-link-text'),
    recompileArchiveBtn: doc.getElementById('recompile-archive-btn'),
    compressionEnabled: doc.getElementById('compression-enabled'),
    classManglingEnabled: doc.getElementById('class-mangling-enabled'),
    classManglingMode: doc.getElementById('class-mangling-mode'),
    saveBtn: doc.getElementById('save-btn'),
    discardBtn: doc.getElementById('discard-btn'),
    overheadPieChart: doc.getElementById('overhead-pie-chart'),
    overheadPercent: doc.getElementById('overhead-percent'),
    tabBtns: doc.querySelectorAll('.tab-btn'),
    tabContents: doc.querySelectorAll('.tab-content'),
  };

  const state = {
    editingLink: null,
    hasUnsavedChanges: false,
    initialSettings: null,
    cssPreviewLoaded: false,
  };

  function updateSaveButton() {
    if (state.hasUnsavedChanges) {
      elements.saveBtn.disabled = false;
      elements.discardBtn.classList.remove('hidden');
    } else {
      elements.saveBtn.disabled = true;
      elements.discardBtn.classList.add('hidden');
    }
  }

  let runtime = null;
  const runOverhead = () => runtime?.updateOverhead();

  function markAsChanged() {
    state.hasUnsavedChanges = true;
    updateSaveButton();
  }

  const helpers = initEditorInteractions({
    doc,
    App,
    t,
    Toast,
    Modal,
    debounce,
    formatBytes,
    state,
    markAsChanged,
    updateOverhead: runOverhead,
    elements,
  });

  runtime = createEditorRuntime({
    doc,
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
  });

  runtime.bindSaveDiscard();
  runtime.bindUnsavedGuard();

  return {
    loadSettings: runtime.loadSettings,
  };
}
