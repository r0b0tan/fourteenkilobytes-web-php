export function initEditorInteractions({
  doc = document,
  App,
  t,
  Toast,
  Modal,
  debounce,
  formatBytes,
  state,
  markAsChanged,
  updateOverhead,
  elements,
}) {
  const {
    adminLanguage,
    homepageSelect,
    regenerateHomepageBtn,
    headerEnabled,
    headerEditor,
    headerLinks,
    addHeaderLinkBtn,
    footerEnabled,
    footerEditor,
    footerContent,
    cssEnabled,
    cssEditor,
    cssMode,
    cssPresetPreview,
    cssPreviewContent,
    cssPreviewFilename,
    cssCustomEditor,
    globalCss,
    pageWidth,
    metaEnabled,
    metaEditor,
    siteTitleEnabled,
    siteTitleEditor,
    siteTitle,
    metaDescription,
    metaAuthor,
    linkPopup,
    linkText,
    linkHref,
    linkSave,
    linkDelete,
    linkCancel,
    faviconInput,
    faviconPreview,
    faviconRemove,
    faviconData,
    rssEnabled,
    rssEditor,
    rssSiteUrl,
    rssLanguage,
    rssCopyright,
    rssMaxItems,
    rssTtl,
    rssFeedUrlPreview,
    rssUrlSection,
    rssSettingsSection,
    rssCopyBtn,
    rssPreviewLink,
    blogAuthor,
    bloglistLimit,
    archiveEnabled,
    archiveUrlSection,
    archiveLinkTextSection,
    archiveSlug,
    archiveLinkText,
    recompileArchiveBtn,
    compressionEnabled,
    classManglingEnabled,
    classManglingMode,
    tabBtns,
    tabContents,
  } = elements;

  const MAX_FAVICON_SIZE = 4096;

  const initialLanguage = localStorage.getItem('adminLanguage') || 'en';
  adminLanguage.value = initialLanguage;

  adminLanguage.addEventListener('change', () => {
    markAsChanged();
  });

  function updateRegenerateButton() {
    regenerateHomepageBtn.style.display = homepageSelect.value ? 'block' : 'none';
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

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.toggle('active', b === btn));
      tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
      tabContents.forEach(c => c.classList.toggle('hidden', c.id !== `tab-${tab}`));

      if (tab === 'css' && !state.cssPreviewLoaded && cssMode.value !== 'custom') {
        loadCssPreview(cssMode.value);
      }
    });
  });

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

    chip.addEventListener('click', () => {
      if (!chip.classList.contains('dragging')) {
        editLink(chip);
      }
    });

    chip.addEventListener('dragstart', (e) => {
      chip.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', chip.innerHTML);
    });

    chip.addEventListener('dragend', () => {
      chip.classList.remove('dragging');
      doc.querySelectorAll('.nav-chip').forEach(c => c.classList.remove('drag-over'));
    });

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

    chip.addEventListener('dragleave', () => {
      chip.classList.remove('drag-over');
    });

    chip.addEventListener('drop', (e) => {
      e.preventDefault();
      chip.classList.remove('drag-over');
      markAsChanged();
    });

    return chip;
  }

  function editLink(chip) {
    state.editingLink = chip;
    linkText.value = chip.textContent;
    linkHref.value = chip.dataset.href;
    linkDelete.classList.remove('hidden');
    linkPopup.classList.remove('hidden');
    linkText.focus();
  }

  addHeaderLinkBtn.addEventListener('click', () => {
    state.editingLink = null;
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

    if (state.editingLink) {
      state.editingLink.textContent = text;
      state.editingLink.dataset.href = href;
    } else {
      headerLinks.appendChild(createLinkChip(text, href));
    }

    linkPopup.classList.add('hidden');
    state.editingLink = null;
    markAsChanged();
    updateOverhead();
  });

  linkDelete.addEventListener('click', () => {
    if (state.editingLink) {
      state.editingLink.remove();
    }
    linkPopup.classList.add('hidden');
    state.editingLink = null;
    markAsChanged();
    updateOverhead();
  });

  linkCancel.addEventListener('click', () => {
    linkPopup.classList.add('hidden');
    state.editingLink = null;
  });

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
    const start = footerContent.selectionStart;
    const end = footerContent.selectionEnd;
    const text = '{{bytes}}';
    footerContent.value = footerContent.value.substring(0, start) + text + footerContent.value.substring(end);
    footerContent.selectionStart = footerContent.selectionEnd = start + text.length;
    footerContent.focus();
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
    faviconPreview.textContent = '';
    const image = doc.createElement('img');
    image.src = dataUrl;
    image.alt = 'Favicon';
    faviconPreview.appendChild(image);
    faviconRemove.classList.remove('hidden');
  }

  function clearFaviconPreview() {
    faviconPreview.textContent = '';
    const placeholder = doc.createElement('span');
    placeholder.className = 'favicon-placeholder';
    placeholder.textContent = t('settings.faviconNone');
    faviconPreview.appendChild(placeholder);
    faviconRemove.classList.add('hidden');
  }

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
    } catch {
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

  rssEnabled.addEventListener('change', () => {
    const isEnabled = rssEnabled.checked;
    rssEditor.classList.toggle('hidden', !isEnabled);
    rssUrlSection.style.display = isEnabled ? 'block' : 'none';
    rssSettingsSection.style.display = isEnabled ? 'block' : 'none';
    markAsChanged();
  });

  function updateRssFeedUrlPreview() {
    const siteUrl = rssSiteUrl.value.replace(/\/+$/, '');
    const feedUrl = siteUrl ? `${siteUrl}/feed.xml` : '';
    rssFeedUrlPreview.value = feedUrl;
    rssPreviewLink.href = feedUrl || '#';
  }

  rssSiteUrl.addEventListener('input', () => {
    updateRssFeedUrlPreview();
    markAsChanged();
  });

  rssLanguage.addEventListener('change', markAsChanged);
  rssCopyright.addEventListener('input', markAsChanged);
  rssMaxItems.addEventListener('input', markAsChanged);
  rssTtl.addEventListener('input', markAsChanged);

  rssCopyBtn.addEventListener('click', async () => {
    const url = rssFeedUrlPreview.value;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      Toast.success(t('settings.rssCopySuccess'));
    } catch {
      Toast.error(t('settings.rssCopyError'));
    }
  });

  if (blogAuthor) {
    blogAuthor.addEventListener('input', markAsChanged);
  }

  bloglistLimit.addEventListener('input', markAsChanged);

  archiveEnabled.addEventListener('change', () => {
    const isEnabled = archiveEnabled.checked;
    archiveUrlSection.style.display = isEnabled ? 'block' : 'none';
    archiveLinkTextSection.style.display = isEnabled ? 'block' : 'none';
    markAsChanged();
  });

  archiveSlug.addEventListener('input', markAsChanged);
  archiveLinkText.addEventListener('input', markAsChanged);

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

  function isCssTabActive() {
    return doc.getElementById('tab-css')?.classList.contains('active');
  }

  async function loadCssPreview(mode) {
    if (!mode || mode === 'custom') return;
    const presets = await App.loadCssPresets();
    cssPreviewContent.textContent = presets[mode] || '';
    state.cssPreviewLoaded = true;
  }

  function updateCssModeUI() {
    const mode = cssMode.value;
    const isCustom = mode === 'custom';

    cssPresetPreview.classList.toggle('hidden', isCustom);
    cssCustomEditor.classList.toggle('hidden', !isCustom);

    if (!isCustom) {
      cssPreviewFilename.textContent = `fourteenkilobytes-${mode}.css`;
      if (isCssTabActive()) {
        loadCssPreview(mode);
      } else {
        state.cssPreviewLoaded = false;
      }
    }
    updateOverhead();
  }

  cssEnabled.addEventListener('change', () => {
    cssEditor.classList.toggle('hidden', !cssEnabled.checked);
    markAsChanged();
    updateOverhead();
  });

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

  function getHeaderLinks() {
    const chips = headerLinks.querySelectorAll('.nav-chip');
    return Array.from(chips).map(chip => ({
      text: chip.textContent,
      href: chip.dataset.href,
    }));
  }

  return {
    createLinkChip,
    getHeaderLinks,
    setFaviconPreview,
    clearFaviconPreview,
    updateRssFeedUrlPreview,
    updateCssModeUI,
    updateRegenerateButton,
  };
}
