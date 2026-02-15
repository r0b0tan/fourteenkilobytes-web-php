// Import common utilities
import { debounce, initAuthGuard, setupLogoutHandler } from './lib/common.js';
// Import byte utilities
import { formatBytes } from './lib/byte-utils.js';

(async function () {
  // Initialize auth guard and setup
  await initAuthGuard({ redirectIfNotAuth: 'index.html' });

  // Setup logout handler
  setupLogoutHandler();

  // Elements
  const adminLanguage = document.getElementById('admin-language');
  const homepageSelect = document.getElementById('homepage-select');
  const regenerateHomepageBtn = document.getElementById('regenerate-homepage-btn');
  const headerEnabled = document.getElementById('header-enabled');
  const headerEditor = document.getElementById('header-editor');
  const headerLinks = document.getElementById('header-links');
  const addHeaderLinkBtn = document.getElementById('add-header-link');
  const footerEnabled = document.getElementById('footer-enabled');
  const footerEditor = document.getElementById('footer-editor');
  const footerContent = document.getElementById('footer-content');
  const cssEnabled = document.getElementById('css-enabled');
  const cssEditor = document.getElementById('css-editor');
  const cssMode = document.getElementById('css-mode');
  const cssPresetPreview = document.getElementById('css-preset-preview');
  const cssPreviewContent = document.getElementById('css-preview-content');
  const cssPreviewFilename = document.getElementById('css-preview-filename');
  const cssCustomEditor = document.getElementById('css-custom-editor');
  const globalCss = document.getElementById('global-css');
  const pageWidth = document.getElementById('page-width');
  const metaEnabled = document.getElementById('meta-enabled');
  const metaEditor = document.getElementById('meta-editor');
  const siteTitleEnabled = document.getElementById('site-title-enabled');
  const siteTitleEditor = document.getElementById('site-title-editor');
  const siteTitle = document.getElementById('site-title');
  const metaDescription = document.getElementById('meta-description');
  const metaAuthor = document.getElementById('meta-author');
  const linkPopup = document.getElementById('link-popup');
  const linkText = document.getElementById('link-text');
  const linkHref = document.getElementById('link-href');
  const linkSave = document.getElementById('link-save');
  const linkDelete = document.getElementById('link-delete');
  const linkCancel = document.getElementById('link-cancel');
  const faviconInput = document.getElementById('favicon-input');
  const faviconPreview = document.getElementById('favicon-preview');
  const faviconRemove = document.getElementById('favicon-remove');
  const faviconData = document.getElementById('favicon-data');
  const rssEnabled = document.getElementById('rss-enabled');
  const rssEditor = document.getElementById('rss-editor');
  const rssSiteUrl = document.getElementById('rss-site-url');
  const rssLanguage = document.getElementById('rss-language');
  const rssCopyright = document.getElementById('rss-copyright');
  const rssMaxItems = document.getElementById('rss-max-items');
  const rssTtl = document.getElementById('rss-ttl');
  const rssFeedUrlPreview = document.getElementById('rss-feed-url-preview');
  const rssUrlSection = document.getElementById('rss-url-section');
  const rssSettingsSection = document.getElementById('rss-settings-section');
  const rssCopyBtn = document.getElementById('rss-copy-btn');
  const rssPreviewLink = document.getElementById('rss-preview-link');
  const bloglistLimit = document.getElementById('bloglist-limit');
  const archiveEnabled = document.getElementById('archive-enabled');
  const archiveUrlSection = document.getElementById('archive-url-section');
  const archiveLinkTextSection = document.getElementById('archive-link-text-section');
  const archiveSlug = document.getElementById('archive-slug');
  const archiveLinkText = document.getElementById('archive-link-text');
  const recompileArchiveBtn = document.getElementById('recompile-archive-btn');
  const compressionEnabled = document.getElementById('compression-enabled');
  const classManglingEnabled = document.getElementById('class-mangling-enabled');
  const classManglingMode = document.getElementById('class-mangling-mode');
  const saveBtn = document.getElementById('save-btn');
  const discardBtn = document.getElementById('discard-btn');
  const overheadPieChart = document.getElementById('overhead-pie-chart');
  const overheadPercent = document.getElementById('overhead-percent');

  // Tab elements
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  // State
  let editingLink = null;
  let hasUnsavedChanges = false;
  let initialSettings = null;
  let cssPreviewLoaded = false; // Track if CSS preview has been loaded (lazy-load optimization)

  // Update save button appearance based on changes
  function updateSaveButton() {
    if (hasUnsavedChanges) {
      saveBtn.disabled = false;
      discardBtn.classList.remove('hidden');
    } else {
      saveBtn.disabled = true;
      discardBtn.classList.add('hidden');
    }
  }

  // Mark as changed
  function markAsChanged() {
    hasUnsavedChanges = true;
    updateSaveButton();
  }

  // ============ LANGUAGE ============

  // Initialize language selector
  const initialLanguage = localStorage.getItem('adminLanguage') || 'en';
  adminLanguage.value = initialLanguage;

  adminLanguage.addEventListener('change', () => {
    markAsChanged();
  });

  // ============ HOMEPAGE ============

  function updateRegenerateButton() {
    const selectedSlug = homepageSelect.value;
    if (selectedSlug) {
      regenerateHomepageBtn.style.display = 'block';
    } else {
      regenerateHomepageBtn.style.display = 'none';
    }
  }

  homepageSelect.addEventListener('change', () => {
    updateRegenerateButton();
    markAsChanged();
  });

  regenerateHomepageBtn.addEventListener('click', async () => {
    const slug = homepageSelect.value;
    if (!slug) return;

    const confirmed = await Modal.confirm(t('settings.homepageRegenerateConfirm', { slug }));
    if (!confirmed) return;

    regenerateHomepageBtn.disabled = true;
    regenerateHomepageBtn.querySelector('span').textContent = t('settings.homepageRegenerating');
    try {
      await App.republishPost(slug);
      Toast.success(t('settings.homepageRegenerateSuccess'));
      regenerateHomepageBtn.querySelector('span').textContent = t('settings.homepageRegenerated');
      setTimeout(() => {
        regenerateHomepageBtn.querySelector('span').textContent = t('settings.homepageRegenerate');
        regenerateHomepageBtn.disabled = false;
      }, 2000);
    } catch (err) {
      Toast.error(t('errors.generic', { error: err.message }));
      regenerateHomepageBtn.querySelector('span').textContent = t('settings.homepageRegenerate');
      regenerateHomepageBtn.disabled = false;
    }
  });

  recompileArchiveBtn.addEventListener('click', async () => {
    if (!archiveEnabled.checked) return;

    const slug = archiveSlug.value.trim() || 'archiv';
    const confirmed = await Modal.confirm(t('settings.archiveRecompileConfirm', { slug }));
    if (!confirmed) return;

    recompileArchiveBtn.disabled = true;
    recompileArchiveBtn.querySelector('span').textContent = t('settings.archiveRecompiling');
    try {
      await App.generateArchivePage();
      Toast.success(t('settings.archiveRecompileSuccess'));
      recompileArchiveBtn.querySelector('span').textContent = t('settings.archiveRecompiled');
      setTimeout(() => {
        recompileArchiveBtn.querySelector('span').textContent = t('settings.archiveRecompile');
        recompileArchiveBtn.disabled = false;
      }, 2000);
    } catch (err) {
      Toast.error(t('errors.generic', { error: err.message }));
      recompileArchiveBtn.querySelector('span').textContent = t('settings.archiveRecompile');
      recompileArchiveBtn.disabled = false;
    }
  });

  // ============ TABS ============

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.toggle('active', b === btn));
      tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
      tabContents.forEach(c => c.classList.toggle('hidden', c.id !== `tab-${tab}`));

      // Lazy-load CSS preview when CSS tab is first opened
      if (tab === 'css' && !cssPreviewLoaded && cssMode.value !== 'custom') {
        loadCssPreview(cssMode.value);
      }
    });
  });

  // ============ HEADER EDITOR ============

  headerEnabled.addEventListener('change', () => {
    headerEditor.classList.toggle('hidden', !headerEnabled.checked);
    markAsChanged();
    updateOverhead();
  });

  function createLinkChip(text, href) {
    const chip = document.createElement('span');
    chip.className = 'nav-chip';
    chip.dataset.href = href;
    chip.textContent = text;
    chip.draggable = true;

    // Click to edit
    chip.addEventListener('click', (e) => {
      if (!chip.classList.contains('dragging')) {
        editLink(chip);
      }
    });

    // Drag start
    chip.addEventListener('dragstart', (e) => {
      chip.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', chip.innerHTML);
    });

    // Drag end
    chip.addEventListener('dragend', () => {
      chip.classList.remove('dragging');
      document.querySelectorAll('.nav-chip').forEach(c => c.classList.remove('drag-over'));
    });

    // Drag over
    chip.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = headerLinks.querySelector('.dragging');
      if (dragging && dragging !== chip) {
        chip.classList.add('drag-over');
        const rect = chip.getBoundingClientRect();
        const midpoint = rect.left + rect.width / 2;
        if (e.clientX < midpoint) {
          chip.parentNode.insertBefore(dragging, chip);
        } else {
          chip.parentNode.insertBefore(dragging, chip.nextSibling);
        }
      }
    });

    // Drag leave
    chip.addEventListener('dragleave', () => {
      chip.classList.remove('drag-over');
    });

    // Drop
    chip.addEventListener('drop', (e) => {
      e.preventDefault();
      chip.classList.remove('drag-over');
      markAsChanged();
    });

    return chip;
  }

  function editLink(chip) {
    editingLink = chip;
    linkText.value = chip.textContent;
    linkHref.value = chip.dataset.href;
    linkDelete.classList.remove('hidden');
    linkPopup.classList.remove('hidden');
    linkText.focus();
  }

  addHeaderLinkBtn.addEventListener('click', () => {
    editingLink = null;
    linkText.value = '';
    linkHref.value = '';
    linkDelete.classList.add('hidden');
    linkPopup.classList.remove('hidden');
    linkText.focus();
  });

  linkSave.addEventListener('click', () => {
    const text = linkText.value.trim();
    const href = linkHref.value.trim();
    if (!text || !href) return;

    if (editingLink) {
      editingLink.textContent = text;
      editingLink.dataset.href = href;
    } else {
      headerLinks.appendChild(createLinkChip(text, href));
    }
    linkPopup.classList.add('hidden');
    editingLink = null;
    markAsChanged();
    updateOverhead();
  });

  linkDelete.addEventListener('click', () => {
    if (editingLink) {
      editingLink.remove();
    }
    linkPopup.classList.add('hidden');
    editingLink = null;
    markAsChanged();
    updateOverhead();
  });

  linkCancel.addEventListener('click', () => {
    linkPopup.classList.add('hidden');
    editingLink = null;
  });

  // ============ FOOTER EDITOR ============

  footerEnabled.addEventListener('change', () => {
    footerEditor.classList.toggle('hidden', !footerEnabled.checked);
    markAsChanged();
    updateOverhead();
  });

  footerContent.addEventListener('input', debounce(() => {
    updateOverhead();
    markAsChanged();
  }, 300));

  document.getElementById('insert-bytes-btn').addEventListener('click', () => {
    const input = footerContent;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = '{{bytes}}';
    input.value = input.value.substring(0, start) + text + input.value.substring(end);
    input.selectionStart = input.selectionEnd = start + text.length;
    input.focus();
    updateOverhead();
  });

  // ============ FAVICON EDITOR ============

  const MAX_FAVICON_SIZE = 4096; // 4KB max

  faviconInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > MAX_FAVICON_SIZE) {
      Toast.error(t('settings.faviconTooLarge', { size: formatBytes(file.size), max: formatBytes(MAX_FAVICON_SIZE) }));
      faviconInput.value = '';
      return;
    }

    try {
      const base64 = await fileToBase64(file);
      setFaviconPreview(base64);
      faviconData.value = base64;
      markAsChanged();
      updateOverhead();
    } catch (err) {
      Toast.error(t('settings.faviconReadError'));
    }
    faviconInput.value = '';
  });

  faviconRemove.addEventListener('click', () => {
    clearFaviconPreview();
    faviconData.value = '';
    markAsChanged();
    updateOverhead();
  });

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function setFaviconPreview(dataUrl) {
    faviconPreview.innerHTML = `<img src="${dataUrl}" alt="Favicon">`;
    faviconRemove.classList.remove('hidden');
  }

  function clearFaviconPreview() {
    faviconPreview.innerHTML = `<span class="favicon-placeholder">${t('settings.faviconNone')}</span>`;
    faviconRemove.classList.add('hidden');
  }

  // ============ RSS EDITOR ============

  rssEnabled.addEventListener('change', () => {
    const isEnabled = rssEnabled.checked;
    rssEditor.classList.toggle('hidden', !isEnabled);
    rssUrlSection.style.display = isEnabled ? 'block' : 'none';
    rssSettingsSection.style.display = isEnabled ? 'block' : 'none';
    markAsChanged();
  });

  rssSiteUrl.addEventListener('input', () => {
    updateRssFeedUrlPreview();
    markAsChanged();
  });

  rssLanguage.addEventListener('change', markAsChanged);
  rssCopyright.addEventListener('input', markAsChanged);
  rssMaxItems.addEventListener('input', markAsChanged);
  rssTtl.addEventListener('input', markAsChanged);

  function updateRssFeedUrlPreview() {
    const siteUrl = rssSiteUrl.value.replace(/\/+$/, '');
    const feedUrl = siteUrl ? `${siteUrl}/feed.xml` : '';
    rssFeedUrlPreview.value = feedUrl;
    rssPreviewLink.href = feedUrl || '#';
  }

  rssCopyBtn.addEventListener('click', async () => {
    const url = rssFeedUrlPreview.value;
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        Toast.success(t('settings.rssCopySuccess'));
      } catch (err) {
        Toast.error(t('settings.rssCopyError'));
      }
    }
  });

  // ============ BLOGLIST EDITOR ============

  bloglistLimit.addEventListener('input', markAsChanged);

  archiveEnabled.addEventListener('change', () => {
    const isEnabled = archiveEnabled.checked;
    archiveUrlSection.style.display = isEnabled ? 'block' : 'none';
    archiveLinkTextSection.style.display = isEnabled ? 'block' : 'none';
    markAsChanged();
  });

  archiveSlug.addEventListener('input', markAsChanged);
  archiveLinkText.addEventListener('input', markAsChanged);

  // ============ OPTIMIZATIONS ============

  compressionEnabled.addEventListener('change', () => {
    markAsChanged();
    updateOverhead();
  });

  classManglingEnabled.addEventListener('change', () => {
    classManglingMode.disabled = !classManglingEnabled.checked;
    markAsChanged();
    updateOverhead();
  });

  classManglingMode.addEventListener('change', () => {
    markAsChanged();
    updateOverhead();
  });

  // ============ CSS EDITOR ============

  cssEnabled.addEventListener('change', () => {
    cssEditor.classList.toggle('hidden', !cssEnabled.checked);
    markAsChanged();
    updateOverhead();
  });

  function updateCssModeUI() {
    const mode = cssMode.value;
    const isCustom = mode === 'custom';

    cssPresetPreview.classList.toggle('hidden', isCustom);
    cssCustomEditor.classList.toggle('hidden', !isCustom);

    // Update filename in preview title
    if (!isCustom) {
      cssPreviewFilename.textContent = `fourteenkilobytes-${mode}.css`;
      // Only load preview content if CSS tab is visible
      if (isCssTabActive()) {
        loadCssPreview(mode);
      } else {
        cssPreviewLoaded = false; // Mark as needing reload when tab becomes visible
      }
    }
    updateOverhead();
  }

  function isCssTabActive() {
    return document.getElementById('tab-css')?.classList.contains('active');
  }

  async function loadCssPreview(mode) {
    if (!mode || mode === 'custom') return;
    const presets = await App.loadCssPresets();
    cssPreviewContent.textContent = presets[mode] || '';
    cssPreviewLoaded = true;
  }

  cssMode.addEventListener('change', () => {
    updateCssModeUI();
    markAsChanged();
  });
  globalCss.addEventListener('input', debounce(() => {
    updateOverhead();
    markAsChanged();
  }, 300));
  pageWidth.addEventListener('input', debounce(() => {
    updateOverhead();
    markAsChanged();
  }, 300));

  // ============ META EDITOR ============

  metaEnabled.addEventListener('change', () => {
    metaEditor.classList.toggle('hidden', !metaEnabled.checked);
    markAsChanged();
    updateOverhead();
  });

  siteTitleEnabled.addEventListener('change', () => {
    siteTitleEditor.classList.toggle('hidden', !siteTitleEnabled.checked);
    markAsChanged();
    updateOverhead();
  });

  siteTitle.addEventListener('input', debounce(() => {
    updateOverhead();
    markAsChanged();
  }, 300));
  metaDescription.addEventListener('input', debounce(() => {
    updateOverhead();
    markAsChanged();
  }, 300));
  metaAuthor.addEventListener('input', debounce(() => {
    updateOverhead();
    markAsChanged();
  }, 300));

  // ============ BUILD SETTINGS ============

  function getHeaderLinks() {
    const chips = headerLinks.querySelectorAll('.nav-chip');
    return Array.from(chips).map(chip => ({
      text: chip.textContent,
      href: chip.dataset.href
    }));
  }

  function buildSettings() {
    return {
      version: 1,
      homepageSlug: homepageSelect.value || null,
      favicon: faviconData.value || null,
      siteTitleEnabled: siteTitleEnabled.checked,
      siteTitle: siteTitle.value.trim() || null,
      cssEnabled: cssEnabled.checked,
      cssMode: cssMode.value,
      globalCss: globalCss.value.trim(),
      pageWidth: pageWidth.value.trim() || null,
      header: {
        enabled: headerEnabled.checked,
        links: getHeaderLinks(),
      },
      footer: {
        enabled: footerEnabled.checked,
        content: footerContent.value.trim(),
      },
      meta: {
        enabled: metaEnabled.checked,
        description: metaDescription.value.trim() || undefined,
        author: metaAuthor.value.trim() || undefined,
      },
      rss: {
        enabled: rssEnabled.checked,
        siteUrl: rssSiteUrl.value.replace(/\/+$/, ''),
        language: rssLanguage.value,
        copyright: rssCopyright.value.trim(),
        maxItems: parseInt(rssMaxItems.value) || 20,
        ttl: parseInt(rssTtl.value) || 60,
      },
      bloglist: {
        limit: parseInt(bloglistLimit.value) || 10,
        archiveEnabled: archiveEnabled.checked,
        archiveSlug: archiveSlug.value.trim() || 'archive',
        archiveLinkText: archiveLinkText.value.trim() || 'View all posts →',
      },
      optimizations: {
        compression: {
          enabled: compressionEnabled.checked,
        },
        classMangling: {
          enabled: classManglingEnabled.checked,
          mode: classManglingMode.value === 'aggressive' ? 'aggressive' : 'safe',
        },
      },
    };
  }

  // ============ OVERHEAD CALCULATION ============

  // Cache for overhead calculation (avoid redundant compiler runs)
  let overheadCache = { hash: null, result: null };

  function renderOverhead(res) {
    const bytes = res.overheadBytes;
    const breakdown = res.breakdown || {};
    const limit = 14336;
    const percent = Math.min((bytes / limit) * 100, 100);
    const overheadDeg = (percent / 100) * 360;

    // Update breakdown table
    document.getElementById('overhead-breakdown-base').textContent = formatBytes(breakdown.base || 0);
    document.getElementById('overhead-breakdown-title').textContent = formatBytes(breakdown.title || 0);
    document.getElementById('overhead-breakdown-favicon').textContent = formatBytes(breakdown.favicon || 0);
    document.getElementById('overhead-breakdown-meta').textContent = formatBytes(breakdown.meta || 0);
    document.getElementById('overhead-breakdown-nav').textContent = formatBytes(breakdown.navigation || 0);
    document.getElementById('overhead-breakdown-footer').textContent = formatBytes(breakdown.footer || 0);
    document.getElementById('overhead-breakdown-css').textContent = formatBytes(breakdown.css || 0);
    document.getElementById('overhead-breakdown-total').textContent = `${formatBytes(bytes)} / 14.336 B`;

    overheadPercent.textContent = `${Math.round(percent)}%`;

    // Determine color based on usage
    let overheadColor = 'var(--gray-400)';
    if (percent >= 75) {
      overheadColor = '#dc2626';
    } else if (percent >= 50) {
      overheadColor = '#f59e0b';
    }

    overheadPieChart.style.background = `conic-gradient(
      ${overheadColor} 0deg ${overheadDeg}deg,
      var(--gray-200) ${overheadDeg}deg 360deg
    )`;
  }

  function getOverheadRelevantSettings(settings) {
    // Only include settings that affect overhead (excludes RSS, language, etc.)
    return {
      siteTitleEnabled: settings.siteTitleEnabled,
      siteTitle: settings.siteTitle,
      cssEnabled: settings.cssEnabled,
      cssMode: settings.cssMode,
      globalCss: settings.globalCss,
      pageWidth: settings.pageWidth,
      header: settings.header,
      footer: settings.footer,
      meta: settings.meta,
      favicon: settings.favicon,
      optimizations: settings.optimizations,
    };
  }

  async function updateOverhead() {
    try {
      const settings = buildSettings();
      const relevantSettings = getOverheadRelevantSettings(settings);
      const hash = JSON.stringify(relevantSettings);

      // Return cached result if settings haven't changed
      if (hash === overheadCache.hash && overheadCache.result) {
        renderOverhead(overheadCache.result);
        return;
      }

      const res = await App.previewOverhead(settings);
      overheadCache = { hash, result: res };
      renderOverhead(res);
    } catch (e) {
      console.error('Overhead calculation failed:', e);
    }
  }

  // ============ LOAD SETTINGS ============

  async function loadSettings() {
    try {
      let settings = await App.getSettings();
      let allPosts = await App.getPosts();

      // Auto-create default homepage if none exists
      if (!settings.homepageSlug) {
        const existingHomepage = allPosts.find(p => p.slug === 'startseite' && p.status === 'published');
        if (!existingHomepage) {
          // Create default homepage silently
          try {
            await App.createDefaultHomepage();
            allPosts = await App.getPosts();
          } catch (err) {
            console.error('Failed to create default homepage:', err);
          }
        }
        // Set startseite as homepage if it now exists
        const homepage = allPosts.find(p => p.slug === 'startseite' && p.status === 'published');
        if (homepage) {
          settings.homepageSlug = 'startseite';
          await App.saveSettings(settings);
          settings = await App.getSettings();
        }
      }

      // Homepage
      homepageSelect.innerHTML = `<option value="">${t('settings.homepageDefault')}</option>`;
      const pages = allPosts.filter(p => p.pageType === 'page' && p.status === 'published');

      for (const page of pages) {
        const option = document.createElement('option');
        option.value = page.slug;
        option.textContent = page.title;
        homepageSelect.appendChild(option);
      }
      homepageSelect.value = settings.homepageSlug || '';

      // Update regenerate button visibility
      updateRegenerateButton();

      // Site Title (default: enabled)
      const siteTitleDisabled = settings.siteTitleEnabled === false;
      siteTitleEnabled.checked = !siteTitleDisabled;
      siteTitleEditor.classList.toggle('hidden', siteTitleDisabled);
      siteTitle.value = settings.siteTitle || '';

      // Header
      headerEnabled.checked = settings.header.enabled;
      headerEditor.classList.toggle('hidden', !settings.header.enabled);
      headerLinks.innerHTML = '';
      for (const link of settings.header.links) {
        headerLinks.appendChild(createLinkChip(link.text, link.href));
      }

      // Footer
      footerEnabled.checked = settings.footer.enabled;
      footerEditor.classList.toggle('hidden', !settings.footer.enabled);
      footerContent.value = settings.footer.content;

      // CSS (default: enabled)
      cssEnabled.checked = settings.cssEnabled !== false;
      cssEditor.classList.toggle('hidden', !cssEnabled.checked);
      cssMode.value = settings.cssMode || 'default';
      globalCss.value = settings.globalCss || '';
      pageWidth.value = settings.pageWidth || '';
      updateCssModeUI();

      // Meta (default: enabled)
      metaEnabled.checked = settings.meta?.enabled !== false;
      metaEditor.classList.toggle('hidden', !metaEnabled.checked);
      metaDescription.value = settings.meta?.description || '';
      metaAuthor.value = settings.meta?.author || '';

      // Favicon
      if (settings.favicon) {
        setFaviconPreview(settings.favicon);
        faviconData.value = settings.favicon;
      } else {
        clearFaviconPreview();
        faviconData.value = '';
      }

      // RSS
      const rss = settings.rss || {};
      rssEnabled.checked = rss.enabled || false;
      const isRssEnabled = rss.enabled || false;
      rssEditor.classList.toggle('hidden', !isRssEnabled);
      rssUrlSection.style.display = isRssEnabled ? 'block' : 'none';
      rssSettingsSection.style.display = isRssEnabled ? 'block' : 'none';
      rssSiteUrl.value = rss.siteUrl || '';
      rssLanguage.value = rss.language || 'de-DE';
      rssCopyright.value = rss.copyright || '';
      rssMaxItems.value = rss.maxItems || 20;
      rssTtl.value = rss.ttl || 60;
      updateRssFeedUrlPreview();

      // Bloglist
      const bloglist = settings.bloglist || {};
      bloglistLimit.value = bloglist.limit || 10;
      archiveEnabled.checked = bloglist.archiveEnabled !== false;
      const isArchiveEnabled = bloglist.archiveEnabled !== false;
      archiveUrlSection.style.display = isArchiveEnabled ? 'block' : 'none';
      archiveLinkTextSection.style.display = isArchiveEnabled ? 'block' : 'none';
      archiveSlug.value = bloglist.archiveSlug || 'archive';
      archiveLinkText.value = bloglist.archiveLinkText || 'View all posts →';

      // Optimizations
      const optimizations = settings.optimizations || {};
      const compression = optimizations.compression || {};
      const classMangling = optimizations.classMangling || {};
      compressionEnabled.checked = compression.enabled !== false;
      classManglingEnabled.checked = classMangling.enabled === true;
      classManglingMode.value = classMangling.mode === 'aggressive' ? 'aggressive' : 'safe';
      classManglingMode.disabled = !classManglingEnabled.checked;

      await updateOverhead();

      // Store initial settings for comparison
      initialSettings = JSON.stringify(buildSettings());
      hasUnsavedChanges = false;
      updateSaveButton();

      // Hide loading overlay
      document.getElementById('loading-overlay')?.remove();
    } catch (e) {
      console.error('Failed to load settings:', e);
      document.getElementById('loading-overlay')?.remove();
    }
  }

  // ============ SAVE SETTINGS ============

  discardBtn.addEventListener('click', async () => {
    const confirmed = await Modal.confirm(t('settings.discardConfirm'));
    if (!confirmed) return;

    // Reset language selector to saved value
    adminLanguage.value = localStorage.getItem('adminLanguage') || 'en';

    await loadSettings();
  });

  saveBtn.addEventListener('click', async () => {
    const originalContent = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="loading-spinner" style="width:14px;height:14px;"></div>';

    try {
      const settings = buildSettings();
      await App.saveSettings(settings);

      // Apply language change after saving
      const newLanguage = adminLanguage.value;
      if (newLanguage !== localStorage.getItem('adminLanguage')) {
        localStorage.setItem('adminLanguage', newLanguage);
        i18n.setLocale(newLanguage);
      }

      // Generate archive page if enabled
      if (settings.bloglist?.archiveEnabled) {
        try {
          saveBtn.innerHTML = `<div class="loading-spinner" style="width:14px;height:14px;"></div> <span style="margin-left:4px;">${t('settings.archiveGenerating')}</span>`;
          await App.generateArchivePage();
          Toast.success(t('settings.archiveGenerateSuccess'));
        } catch (archiveErr) {
          console.error('Archive generation failed:', archiveErr);
          // Don't fail the whole save if archive generation fails
          Toast.error('Archive generation failed: ' + archiveErr.message);
        }
      }

      // Update initial settings and reset change tracking
      initialSettings = JSON.stringify(settings);
      hasUnsavedChanges = false;
      updateSaveButton();

      // Recalculate overhead after persisted save
      await updateOverhead();

      Toast.success(t('settings.saved'));
    } catch (err) {
      Toast.error(err.message);
    } finally {
      saveBtn.innerHTML = originalContent;
      saveBtn.disabled = false;
    }
  });

  // ============ WARN BEFORE LEAVING WITH UNSAVED CHANGES ============

  // Intercept navigation links (overlay is handled globally by i18n.js)
  document.querySelectorAll('a[href]:not([target="_blank"])').forEach(link => {
    link.addEventListener('click', async (e) => {
      if (hasUnsavedChanges && !link.id.includes('logout')) {
        e.preventDefault();
        // Remove overlay that was added by global handler
        document.querySelector('.loading-overlay')?.remove();
        const confirmed = await Modal.confirm(t('settings.unsavedChanges'));
        if (confirmed) {
          hasUnsavedChanges = false;
          showNavigationOverlay();
          window.location.href = link.href;
        }
      }
    });
  });

  // ============ TOAST NOTIFICATIONS ============

  const Toast = (() => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    function show(text, type = 'success', duration = 3000) {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = text;
      container.appendChild(toast);

      setTimeout(() => {
        toast.classList.add('hiding');
        toast.addEventListener('animationend', () => toast.remove());
      }, duration);
    }

    return {
      success: (text) => show(text, 'success'),
      error: (text) => show(text, 'error')
    };
  })();

  // ============ MODAL SYSTEM ============

  const Modal = (() => {
    const backdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById('modal');
    const message = document.getElementById('modal-message');
    const actions = document.getElementById('modal-actions');

    function hide() {
      modal.classList.add('hidden');
      backdrop.classList.add('hidden');
      modal.className = 'modal hidden';
      actions.innerHTML = '';
    }

    function show(text, buttons, type = '') {
      message.textContent = text;
      actions.innerHTML = '';
      modal.className = 'modal' + (type ? ` modal-${type}` : '');

      buttons.forEach(btn => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = btn.text;
        button.className = btn.class || '';
        button.addEventListener('click', () => {
          hide();
          if (btn.action) btn.action();
        });
        actions.appendChild(button);
      });

      backdrop.classList.remove('hidden');
      modal.classList.remove('hidden');
    }

    return {
      confirm(text) {
        return new Promise(resolve => {
          show(text, [
            { text: t('modal.yes'), class: 'btn-primary', action: () => resolve(true) },
            { text: t('modal.cancel'), class: 'btn-secondary', action: () => resolve(false) }
          ]);
        });
      },

      success(text) {
        show(text, [{ text: t('modal.ok'), class: 'btn-primary' }], 'success');
      },

      error(text) {
        show(text, [{ text: t('modal.ok'), class: 'btn-primary' }], 'error');
      },

      hide
    };
  })();

  // ============ DATA TAB ============

  const exportBtn = document.getElementById('export-btn');
  const importDropzone = document.getElementById('import-dropzone');
  const importFile = document.getElementById('import-file');
  const deleteAllBtn = document.getElementById('delete-all-btn');
  const fullResetBtn = document.getElementById('full-reset-btn');

  // Shared backdrop for all modals
  const backdrop = document.getElementById('modal-backdrop');

  // Import Modal elements
  const importModal = document.getElementById('import-modal');
  const importModalOptions = document.getElementById('import-modal-options');
  const importModalActions = document.getElementById('import-modal-actions');
  const importProgress = document.getElementById('import-progress');
  const importProgressFill = document.getElementById('import-progress-fill');
  const importProgressText = document.getElementById('import-progress-text');

  // Export
  exportBtn.addEventListener('click', async () => {
    const type = document.querySelector('input[name="export-type"]:checked').value;
    exportBtn.disabled = true;
    try {
      await App.exportData(type);
      Toast.success(t('settings.exportSuccess'));
    } catch (err) {
      Toast.error(t('settings.exportError', { error: err.message }));
    } finally {
      exportBtn.disabled = false;
    }
  });

  // Import - Reset UI
  function resetImportUI() {
    importFile.value = '';
  }

  // Import - Show modal based on backup content
  function showImportModal(data) {
    const hasSettings = !!data.settings;
    const hasArticles = !!data.articles?.length;
    const articleCount = data.articles?.length || 0;

    // Reset modal state
    importProgress.classList.add('hidden');
    importProgressFill.style.width = '0%';
    importModalOptions.innerHTML = '';
    importModalActions.innerHTML = '';

    // Build options based on what's in the backup
    if (hasSettings && hasArticles) {
      // Both: show checkboxes
      importModalOptions.innerHTML = `
        <label>
          <input type="checkbox" id="import-opt-settings" checked>
          <span>${t('settings.importSettings')}</span>
        </label>
        <label>
          <input type="checkbox" id="import-opt-articles" checked>
          <span>${t('settings.importArticles', { count: articleCount })}</span>
        </label>
        <label id="import-build-option">
          <input type="checkbox" id="import-opt-build" checked>
          <span>${t('settings.importBuild')}</span>
        </label>
        <p class="import-option-note">${t('settings.importNote')}</p>
      `;

      // Toggle build option visibility based on articles checkbox
      const articlesCheckbox = document.getElementById('import-opt-articles');
      const buildOption = document.getElementById('import-build-option');
      articlesCheckbox.addEventListener('change', () => {
        buildOption.style.display = articlesCheckbox.checked ? '' : 'none';
      });
    } else if (hasArticles) {
      // Only articles
      importModalOptions.innerHTML = `
        <p>${t('settings.importArticles', { count: articleCount })}?</p>
        <label>
          <input type="checkbox" id="import-opt-build" checked>
          <span>${t('settings.importBuild')}</span>
        </label>
        <p class="import-option-note">${t('settings.importNote')}</p>
      `;
    } else if (hasSettings) {
      // Only settings
      importModalOptions.innerHTML = `
        <p>${t('settings.importSettings')}?</p>
        <p class="import-option-note">${t('settings.importNote')}</p>
      `;
    }

    // Create action buttons
    const importBtn = document.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'btn-primary';
    importBtn.textContent = t('settings.importBtn');
    importBtn.addEventListener('click', () => executeImport(data, hasSettings, hasArticles));

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = t('settings.importCancel');
    cancelBtn.addEventListener('click', hideImportModal);

    importModalActions.appendChild(importBtn);
    importModalActions.appendChild(cancelBtn);

    // Show modal
    backdrop.classList.remove('hidden');
    importModal.classList.remove('hidden');
  }

  function hideImportModal() {
    importModal.classList.add('hidden');
    backdrop.classList.add('hidden');
    resetImportUI();
  }

  async function executeImport(data, hasSettings, hasArticles) {
    const settingsCheckbox = document.getElementById('import-opt-settings');
    const articlesCheckbox = document.getElementById('import-opt-articles');
    const buildCheckbox = document.getElementById('import-opt-build');

    // Determine what to import
    const doSettings = hasSettings && (!settingsCheckbox || settingsCheckbox.checked);
    const doArticles = hasArticles && (!articlesCheckbox || articlesCheckbox.checked);
    const doBuild = doArticles && buildCheckbox?.checked;

    if (!doSettings && !doArticles) {
      Toast.error(t('settings.importSelectOption'));
      return;
    }

    // Disable buttons during import
    const buttons = importModalActions.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);

    try {
      // Show progress for article builds
      if (doBuild) {
        importProgress.classList.remove('hidden');
        importProgressText.textContent = t('settings.importProgress');
        importProgressFill.style.width = '5%';
      }

      const result = await App.importData(data, {
        settings: doSettings,
        articles: doArticles,
      });

      // Reload settings if they were imported
      if (doSettings && result.imported.includes('settings')) {
        await loadSettings();
      }

      // Build articles if requested
      if (doBuild && result.articleSlugs?.length > 0) {
        const slugs = result.articleSlugs;
        let built = 0;
        let failed = 0;

        for (const slug of slugs) {
          const progress = Math.round(5 + ((built + 1) / slugs.length) * 95);
          importProgressFill.style.width = `${progress}%`;
          importProgressText.textContent = t('settings.importBuilding', { current: built + 1, total: slugs.length });

          try {
            await App.republishPost(slug);
            built++;
          } catch (err) {
            console.error(`Failed to rebuild ${slug}:`, err);
            failed++;
          }
        }

        hideImportModal();

        if (failed > 0) {
          Toast.error(t('settings.importError', { error: `${built} built, ${failed} failed` }));
        } else {
          Toast.success(t('settings.importSuccessBuilt', { count: built }));
        }
      } else if (doArticles && result.articleSlugs?.length > 0) {
        // Articles imported but not built
        hideImportModal();
        Toast.success(t('settings.importSuccessNotBuilt', { count: result.articleSlugs.length }));
      } else if (doSettings) {
        hideImportModal();
        Toast.success(t('settings.importSuccessSettings'));
      } else {
        hideImportModal();
      }
    } catch (err) {
      Toast.error(t('settings.importError', { error: err.message }));
      buttons.forEach(btn => btn.disabled = false);
      importProgress.classList.add('hidden');
    }
  }

  // Import - File handling
  function handleImportFile(file) {
    if (!file || !file.name.endsWith('.json')) {
      Toast.error(t('settings.importSelectFile'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.version !== 1) {
          throw new Error(t('settings.importInvalidFormat'));
        }

        const hasSettings = !!data.settings;
        const hasArticles = !!data.articles?.length;

        if (!hasSettings && !hasArticles) {
          Toast.error(t('settings.importNoData'));
          resetImportUI();
          return;
        }

        // Show import modal immediately
        showImportModal(data);
      } catch (err) {
        Toast.error(t('settings.importInvalidFile', { error: err.message }));
        resetImportUI();
      }
    };
    reader.readAsText(file);
  }

  importFile.addEventListener('change', (e) => {
    handleImportFile(e.target.files[0]);
  });

  // Drag & Drop
  importDropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    importDropzone.classList.add('dragover');
  });

  importDropzone.addEventListener('dragleave', () => {
    importDropzone.classList.remove('dragover');
  });

  importDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    importDropzone.classList.remove('dragover');
    handleImportFile(e.dataTransfer.files[0]);
  });

  // Delete all posts
  deleteAllBtn.addEventListener('click', async () => {
    const confirmed = await Modal.confirm(t('settings.deleteAllConfirm'));
    if (!confirmed) return;

    // Double confirmation for safety
    const doubleConfirmed = await Modal.confirm(t('settings.deleteAllConfirm2'));
    if (!doubleConfirmed) return;

    deleteAllBtn.disabled = true;
    try {
      const result = await App.deleteAllPosts();
      Toast.success(t('settings.deleteAllSuccess', { count: result.deleted }));
    } catch (err) {
      Toast.error(t('errors.generic', { error: err.message }));
    } finally {
      deleteAllBtn.disabled = false;
    }
  });

  // Full reset
  fullResetBtn.addEventListener('click', async () => {
    const confirmed = await Modal.confirm(t('settings.fullResetConfirm'));
    if (!confirmed) return;

    const doubleConfirmed = await Modal.confirm(t('settings.fullResetConfirm2'));
    if (!doubleConfirmed) return;

    fullResetBtn.disabled = true;
    try {
      await App.fullReset();
      Toast.success(t('settings.fullResetSuccess'));
      // Redirect to setup wizard since everything was deleted
      setTimeout(() => window.location.href = '/setup/', 1500);
    } catch (err) {
      Toast.error(t('errors.generic', { error: err.message }));
      fullResetBtn.disabled = false;
    }
  });

  // ============ LOGS TAB ============

  const logsSearch = document.getElementById('logs-search');
  const logsFilter = document.getElementById('logs-filter');
  const logsBody = document.getElementById('logs-body');
  const logsCount = document.getElementById('logs-count');
  const logsRefreshBtn = document.getElementById('logs-refresh-btn');
  const logsExportBtn = document.getElementById('logs-export-btn');
  const logsClearBtn = document.getElementById('logs-clear-btn');

  let allLogs = [];
  let logsLoaded = false;

  function formatLogTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  const logIcons = {
    check: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    x: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    plus: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    minus: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    alert: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    settings: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    logout: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    trash: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
  };

  function getActionLabel(action) {
    const labels = {
      'login_success': `${logIcons.check} Login`,
      'login_failed': `${logIcons.x} Login fehlgeschlagen`,
      'logout': `${logIcons.logout} Logout`,
      'post_create': `${logIcons.plus} Post erstellt`,
      'post_delete': `${logIcons.minus} Post gelöscht`,
      'posts_delete_all': `${logIcons.alert} Alle Posts gelöscht`,
      'settings_update': `${logIcons.settings} Einstellungen`,
      'csrf_failure': `${logIcons.alert} CSRF-Fehler`,
      'full_reset': `${logIcons.alert} Reset`,
      'setup_complete': `${logIcons.check} Setup`,
      'audit_log_cleared': `${logIcons.trash} Logs gelöscht`
    };
    return labels[action] || action;
  }

  function getActionClass(action) {
    if (action.includes('failed') || action.includes('failure')) return 'log-error';
    if (action.includes('delete') || action.includes('reset') || action.includes('clear')) return 'log-warning';
    if (action.includes('success') || action.includes('create') || action.includes('setup')) return 'log-success';
    return '';
  }

  function formatDetails(details) {
    if (!details || Object.keys(details).length === 0) return '—';
    const parts = [];
    for (const [key, value] of Object.entries(details)) {
      if (key === 'ip') continue; // IP is shown in separate column
      if (typeof value === 'object') {
        parts.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        parts.push(`${key}: ${value}`);
      }
    }
    return parts.join(', ') || '—';
  }

  function renderLogs() {
    const search = logsSearch.value.toLowerCase();
    const filter = logsFilter.value;

    const filtered = allLogs.filter(e => {
      if (filter && e.action !== filter) return false;
      if (search) {
        const text = JSON.stringify(e).toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      logsBody.innerHTML = `<tr class="logs-empty"><td colspan="4">${t('settings.logsEmpty')}</td></tr>`;
    } else {
      logsBody.innerHTML = filtered.map(e => `
        <tr class="${getActionClass(e.action)}">
          <td class="log-time" title="${e.timestamp}">${formatLogTime(e.timestamp)}</td>
          <td class="log-action">${getActionLabel(e.action)}</td>
          <td class="log-ip">${e.ip || '—'}</td>
          <td class="log-details" title="${formatDetails(e.details)}">${formatDetails(e.details)}</td>
        </tr>
      `).join('');
    }

    logsCount.textContent = t('settings.logsCountDisplay', { shown: filtered.length, total: allLogs.length });
  }

  async function loadLogs() {
    try {
      logsBody.innerHTML = `<tr class="logs-empty"><td colspan="4">${t('settings.logsLoading')}</td></tr>`;
      const action = logsFilter.value || undefined;
      const data = await App.getAuditLogs({ limit: 200, action });
      allLogs = data.entries || [];
      logsLoaded = true;
      renderLogs();
    } catch (err) {
      logsBody.innerHTML = `<tr class="logs-empty"><td colspan="4">${t('settings.logsError')}: ${err.message}</td></tr>`;
    }
  }

  // Lazy load logs when tab is first opened
  tabBtns.forEach(btn => {
    const originalHandler = btn.onclick;
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'logs' && !logsLoaded) {
        loadLogs();
      }
    });
  });

  logsSearch.addEventListener('input', debounce(renderLogs, 200));
  logsFilter.addEventListener('change', () => {
    loadLogs(); // Reload with new filter
  });

  logsRefreshBtn.addEventListener('click', loadLogs);

  logsExportBtn.addEventListener('click', () => {
    window.location.href = '/api/audit-log/export';
  });

  logsClearBtn.addEventListener('click', async () => {
    const confirmed = await Modal.confirm(t('settings.logsClearConfirm'));
    if (!confirmed) return;

    logsClearBtn.disabled = true;
    try {
      const csrf = document.cookie.match(/fkb_csrf=([^;]+)/)?.[1];
      const res = await fetch('/api/audit-log', {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrf },
        credentials: 'same-origin'
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed');
      }

      const result = await res.json();
      Toast.success(t('settings.logsClearSuccess', { count: result.deletedEntries }));
      await loadLogs();
    } catch (err) {
      Toast.error(t('errors.generic', { error: err.message }));
    } finally {
      logsClearBtn.disabled = false;
    }
  });

  // ============ INIT ============

  await loadSettings();
})();
