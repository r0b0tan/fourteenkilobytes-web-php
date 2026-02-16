export function createEditorRuntime({
  doc = document,
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
}) {
  const {
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
      blogAuthor,
  } = elements;

  const {
    createLinkChip,
    getHeaderLinks,
    setFaviconPreview,
    clearFaviconPreview,
    updateRssFeedUrlPreview,
    updateCssModeUI,
    updateRegenerateButton,
  } = helpers;

  let overheadCache = { hash: null, result: null };

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
      blog: {
        author: blogAuthor?.value?.trim() || '',
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

  function getOverheadRelevantSettings(settings) {
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

  function renderOverhead(res) {
    const bytes = res.overheadBytes;
    const breakdown = res.breakdown || {};
    const limit = 14336;
    const percent = Math.min((bytes / limit) * 100, 100);
    const overheadDeg = (percent / 100) * 360;

    doc.getElementById('overhead-breakdown-base').textContent = formatBytes(breakdown.base || 0);
    doc.getElementById('overhead-breakdown-title').textContent = formatBytes(breakdown.title || 0);
    doc.getElementById('overhead-breakdown-favicon').textContent = formatBytes(breakdown.favicon || 0);
    doc.getElementById('overhead-breakdown-meta').textContent = formatBytes(breakdown.meta || 0);
    doc.getElementById('overhead-breakdown-nav').textContent = formatBytes(breakdown.navigation || 0);
    doc.getElementById('overhead-breakdown-footer').textContent = formatBytes(breakdown.footer || 0);
    doc.getElementById('overhead-breakdown-css').textContent = formatBytes(breakdown.css || 0);
    doc.getElementById('overhead-breakdown-total').textContent = `${formatBytes(bytes)} / 14.336 B`;

    overheadPercent.textContent = `${Math.round(percent)}%`;

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

  async function updateOverhead() {
    try {
      const settings = buildSettings();
      const relevantSettings = getOverheadRelevantSettings(settings);
      const hash = JSON.stringify(relevantSettings);

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

  async function loadSettings() {
    try {
      let settings;
      let allPosts;
      [settings, allPosts] = await Promise.all([
        App.getSettings(),
        App.getPosts(),
      ]);

      if (!settings.homepageSlug) {
        const existingHomepage = allPosts.find(p => p.slug === 'startseite' && p.status === 'published');
        if (!existingHomepage) {
          try {
            await App.createDefaultHomepage();
            allPosts = await App.getPosts();
          } catch (err) {
            console.error('Failed to create default homepage:', err);
          }
        }

        const homepage = allPosts.find(p => p.slug === 'startseite' && p.status === 'published');
        if (homepage) {
          settings.homepageSlug = 'startseite';
          await App.saveSettings(settings);
        }
      }

      homepageSelect.innerHTML = `<option value="">${t('settings.homepageDefault')}</option>`;
      const pages = allPosts.filter(p => p.pageType === 'page' && p.status === 'published');
      for (const page of pages) {
        const option = doc.createElement('option');
        option.value = page.slug;
        option.textContent = page.title;
        homepageSelect.appendChild(option);
      }
      homepageSelect.value = settings.homepageSlug || '';
      updateRegenerateButton();

      const siteTitleDisabled = settings.siteTitleEnabled === false;
      siteTitleEnabled.checked = !siteTitleDisabled;
      siteTitleEditor.classList.toggle('hidden', siteTitleDisabled);
      siteTitle.value = settings.siteTitle || '';

      headerEnabled.checked = settings.header.enabled;
      headerEditor.classList.toggle('hidden', !settings.header.enabled);
      headerLinks.innerHTML = '';
      for (const link of settings.header.links) {
        headerLinks.appendChild(createLinkChip(link.text, link.href));
      }

      footerEnabled.checked = settings.footer.enabled;
      footerEditor.classList.toggle('hidden', !settings.footer.enabled);
      footerContent.value = settings.footer.content;

      cssEnabled.checked = settings.cssEnabled !== false;
      cssEditor.classList.toggle('hidden', !cssEnabled.checked);
      cssMode.value = settings.cssMode || 'default';
      globalCss.value = settings.globalCss || '';
      pageWidth.value = settings.pageWidth || '';
      updateCssModeUI({ skipOverhead: true });

      metaEnabled.checked = settings.meta?.enabled !== false;
      metaEditor.classList.toggle('hidden', !metaEnabled.checked);
      metaDescription.value = settings.meta?.description || '';
      metaAuthor.value = settings.meta?.author || '';

      if (settings.favicon) {
        setFaviconPreview(settings.favicon);
        faviconData.value = settings.favicon;
      } else {
        clearFaviconPreview();
        faviconData.value = '';
      }

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

      const bloglist = settings.bloglist || {};
      const blog = settings.blog || {};
      if (blogAuthor) {
        blogAuthor.value = blog.author || '';
      }
      bloglistLimit.value = bloglist.limit || 10;
      archiveEnabled.checked = bloglist.archiveEnabled !== false;
      const isArchiveEnabled = bloglist.archiveEnabled !== false;
      archiveUrlSection.style.display = isArchiveEnabled ? 'block' : 'none';
      archiveLinkTextSection.style.display = isArchiveEnabled ? 'block' : 'none';
      archiveSlug.value = bloglist.archiveSlug || 'archive';
      archiveLinkText.value = bloglist.archiveLinkText || 'View all posts →';

      const optimizations = settings.optimizations || {};
      const compression = optimizations.compression || {};
      const classMangling = optimizations.classMangling || {};
      compressionEnabled.checked = compression.enabled !== false;
      classManglingEnabled.checked = classMangling.enabled === true;
      classManglingMode.value = classMangling.mode === 'aggressive' ? 'aggressive' : 'safe';
      classManglingMode.disabled = !classManglingEnabled.checked;

      state.initialSettings = JSON.stringify(buildSettings());
      state.hasUnsavedChanges = false;
      updateSaveButton();

      doc.getElementById('loading-overlay')?.remove();
      void updateOverhead();
    } catch (e) {
      console.error('Failed to load settings:', e);
      doc.getElementById('loading-overlay')?.remove();
    }
  }

  function bindSaveDiscard() {
    discardBtn.addEventListener('click', async () => {
      const confirmed = await Modal.confirm(t('settings.discardConfirm'));
      if (!confirmed) return;

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

        const newLanguage = adminLanguage.value;
        if (newLanguage !== localStorage.getItem('adminLanguage')) {
          localStorage.setItem('adminLanguage', newLanguage);
          i18n.setLocale(newLanguage);
        }

        if (settings.bloglist?.archiveEnabled) {
          try {
            saveBtn.innerHTML = `<div class="loading-spinner" style="width:14px;height:14px;"></div> <span style="margin-left:4px;">${t('settings.archiveGenerating')}</span>`;
            await App.generateArchivePage();
            Toast.success(t('settings.archiveGenerateSuccess'));
          } catch (archiveErr) {
            console.error('Archive generation failed:', archiveErr);
            Toast.error('Archive generation failed: ' + archiveErr.message);
          }
        }

        state.initialSettings = JSON.stringify(settings);
        state.hasUnsavedChanges = false;
        updateSaveButton();
        await updateOverhead();

        Toast.success(t('settings.saved'));
      } catch (err) {
        Toast.error(err.message);
      } finally {
        saveBtn.innerHTML = originalContent;
        saveBtn.disabled = false;
      }
    });
  }

  function bindUnsavedGuard() {
    doc.querySelectorAll('a[href]:not([target="_blank"])').forEach(link => {
      link.addEventListener('click', async (e) => {
        if (state.hasUnsavedChanges && !link.id.includes('logout')) {
          e.preventDefault();
          doc.querySelector('.loading-overlay')?.remove();
          const confirmed = await Modal.confirm(t('settings.unsavedChanges'));
          if (confirmed) {
            state.hasUnsavedChanges = false;
            showNavigationOverlay();
            window.location.href = link.href;
          }
        }
      });
    });
  }

  return {
    buildSettings,
    updateOverhead,
    loadSettings,
    bindSaveDiscard,
    bindUnsavedGuard,
  };
}
