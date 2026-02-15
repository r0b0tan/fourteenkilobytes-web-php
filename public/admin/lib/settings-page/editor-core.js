export function initEditorCore({ document: doc = document, App, t, i18n, debounce, formatBytes, showNavigationOverlay, Modal, Toast }) {
  const adminLanguage = doc.getElementById('admin-language');
  const homepageSelect = doc.getElementById('homepage-select');
  const regenerateHomepageBtn = doc.getElementById('regenerate-homepage-btn');
  const headerEnabled = doc.getElementById('header-enabled');
  const headerEditor = doc.getElementById('header-editor');
  const headerLinks = doc.getElementById('header-links');
  const addHeaderLinkBtn = doc.getElementById('add-header-link');
  const footerEnabled = doc.getElementById('footer-enabled');
  const footerEditor = doc.getElementById('footer-editor');
  const footerContent = doc.getElementById('footer-content');
  const cssEnabled = doc.getElementById('css-enabled');
  const cssEditor = doc.getElementById('css-editor');
  const cssMode = doc.getElementById('css-mode');
  const cssPresetPreview = doc.getElementById('css-preset-preview');
  const cssPreviewContent = doc.getElementById('css-preview-content');
  const cssPreviewFilename = doc.getElementById('css-preview-filename');
  const cssCustomEditor = doc.getElementById('css-custom-editor');
  const globalCss = doc.getElementById('global-css');
  const pageWidth = doc.getElementById('page-width');
  const metaEnabled = doc.getElementById('meta-enabled');
  const metaEditor = doc.getElementById('meta-editor');
  const siteTitleEnabled = doc.getElementById('site-title-enabled');
  const siteTitleEditor = doc.getElementById('site-title-editor');
  const siteTitle = doc.getElementById('site-title');
  const metaDescription = doc.getElementById('meta-description');
  const metaAuthor = doc.getElementById('meta-author');
  const linkPopup = doc.getElementById('link-popup');
  const linkText = doc.getElementById('link-text');
  const linkHref = doc.getElementById('link-href');
  const linkSave = doc.getElementById('link-save');
  const linkDelete = doc.getElementById('link-delete');
  const linkCancel = doc.getElementById('link-cancel');
  const faviconInput = doc.getElementById('favicon-input');
  const faviconPreview = doc.getElementById('favicon-preview');
  const faviconRemove = doc.getElementById('favicon-remove');
  const faviconData = doc.getElementById('favicon-data');
  const rssEnabled = doc.getElementById('rss-enabled');
  const rssEditor = doc.getElementById('rss-editor');
  const rssSiteUrl = doc.getElementById('rss-site-url');
  const rssLanguage = doc.getElementById('rss-language');
  const rssCopyright = doc.getElementById('rss-copyright');
  const rssMaxItems = doc.getElementById('rss-max-items');
  const rssTtl = doc.getElementById('rss-ttl');
  const rssFeedUrlPreview = doc.getElementById('rss-feed-url-preview');
  const rssUrlSection = doc.getElementById('rss-url-section');
  const rssSettingsSection = doc.getElementById('rss-settings-section');
  const rssCopyBtn = doc.getElementById('rss-copy-btn');
  const rssPreviewLink = doc.getElementById('rss-preview-link');
  const bloglistLimit = doc.getElementById('bloglist-limit');
  const archiveEnabled = doc.getElementById('archive-enabled');
  const archiveUrlSection = doc.getElementById('archive-url-section');
  const archiveLinkTextSection = doc.getElementById('archive-link-text-section');
  const archiveSlug = doc.getElementById('archive-slug');
  const archiveLinkText = doc.getElementById('archive-link-text');
  const recompileArchiveBtn = doc.getElementById('recompile-archive-btn');
  const compressionEnabled = doc.getElementById('compression-enabled');
  const classManglingEnabled = doc.getElementById('class-mangling-enabled');
  const classManglingMode = doc.getElementById('class-mangling-mode');
  const saveBtn = doc.getElementById('save-btn');
  const discardBtn = doc.getElementById('discard-btn');
  const overheadPieChart = doc.getElementById('overhead-pie-chart');
  const overheadPercent = doc.getElementById('overhead-percent');
  
  // Tab elements
  const tabBtns = doc.querySelectorAll('.tab-btn');
  const tabContents = doc.querySelectorAll('.tab-content');
  
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
    const chip = doc.createElement('span');
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
      doc.querySelectorAll('.nav-chip').forEach(c => c.classList.remove('drag-over'));
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
  
  doc.getElementById('insert-bytes-btn').addEventListener('click', () => {
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
    return doc.getElementById('tab-css')?.classList.contains('active');
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
    doc.getElementById('overhead-breakdown-base').textContent = formatBytes(breakdown.base || 0);
    doc.getElementById('overhead-breakdown-title').textContent = formatBytes(breakdown.title || 0);
    doc.getElementById('overhead-breakdown-favicon').textContent = formatBytes(breakdown.favicon || 0);
    doc.getElementById('overhead-breakdown-meta').textContent = formatBytes(breakdown.meta || 0);
    doc.getElementById('overhead-breakdown-nav').textContent = formatBytes(breakdown.navigation || 0);
    doc.getElementById('overhead-breakdown-footer').textContent = formatBytes(breakdown.footer || 0);
    doc.getElementById('overhead-breakdown-css').textContent = formatBytes(breakdown.css || 0);
    doc.getElementById('overhead-breakdown-total').textContent = `${formatBytes(bytes)} / 14.336 B`;
  
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
        const option = doc.createElement('option');
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
      doc.getElementById('loading-overlay')?.remove();
    } catch (e) {
      console.error('Failed to load settings:', e);
      doc.getElementById('loading-overlay')?.remove();
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
  doc.querySelectorAll('a[href]:not([target="_blank"])').forEach(link => {
    link.addEventListener('click', async (e) => {
      if (hasUnsavedChanges && !link.id.includes('logout')) {
        e.preventDefault();
        // Remove overlay that was added by global handler
        doc.querySelector('.loading-overlay')?.remove();
        const confirmed = await Modal.confirm(t('settings.unsavedChanges'));
        if (confirmed) {
          hasUnsavedChanges = false;
          showNavigationOverlay();
          window.location.href = link.href;
        }
      }
    });
  });
  return {
    loadSettings,
  };
}
