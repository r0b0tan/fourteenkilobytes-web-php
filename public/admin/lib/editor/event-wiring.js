/**
 * Editor event wiring helpers
 */

export function wireEditorEvents(deps) {
  const {
    elements,
    app,
    t,
    modal,
    getDebouncedPreview,
    updatePageTitleSlug,
    updateTitleBytes,
    updateByteCounter,
    updateCostRail,
    clearAutoSave,
    loadGlobalNavigation,
    loadGlobalFooter,
    loadGlobalMeta,
    loadGlobalCSS,
    createBlockElement,
    buildInput,
    isEditMode,
    resetEditorForm,
    validatePublishData,
    determinePaginationStrategy,
    executePublish
  } = deps;

  elements.pageTypeSelect.addEventListener('change', () => {
    const type = elements.pageTypeSelect.value;
    if (type === 'page') {
      elements.pageTypeHint.textContent = '(not in feed)';
    } else {
      elements.pageTypeHint.textContent = '';
    }
  });

  elements.titleInput.addEventListener('input', () => {
    if (!elements.slugInput.dataset.manual) {
      elements.slugInput.value = app.slugify(elements.titleInput.value);
      updatePageTitleSlug();
    }
    updateTitleBytes();
  });

  elements.slugInput.addEventListener('input', () => {
    elements.slugInput.dataset.manual = 'true';
    updatePageTitleSlug();
  });

  elements.addBlockBtn.addEventListener('click', () => {
    elements.addBlockDropdown.classList.toggle('hidden');
  });

  elements.addBlockDropdown.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const type = btn.dataset.type;
    const level = btn.dataset.level;
    const listType = btn.dataset.listType;
    const spacerHeight = btn.dataset.spacerHeight;
    const block = createBlockElement(type, level, '', listType, spacerHeight);
    elements.blockEditor.appendChild(block);
    const focusTarget = block.querySelector('li[contenteditable="true"]') || block.querySelector('.block-content');
    if (focusTarget) focusTarget.focus();
    elements.addBlockDropdown.classList.add('hidden');
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.block-actions-row')) {
      elements.addBlockDropdown.classList.add('hidden');
    }
    if (!e.target.closest('.nav-link-popup') && !e.target.closest('#add-nav-link') && !e.target.closest('.nav-chip')) {
      elements.navLinkPopup.classList.add('hidden');
    }
  });

  elements.publishBtn.addEventListener('click', async () => {
    const validation = validatePublishData({
      title: elements.titleInput.value,
      blockCount: elements.blockEditor.querySelectorAll('.block-item').length
    }, t);

    if (!validation.valid) {
      modal.error(t('editor.buildError', { error: validation.error }));
      return;
    }

    const confirmed = await modal.confirm(t('editor.buildConfirm'));
    if (!confirmed) return;

    elements.publishBtn.disabled = true;

    try {
      const paginationResult = await determinePaginationStrategy({
        buildInput,
        App: app,
        Modal: modal,
        t
      });

      if (paginationResult.aborted) {
        modal.error(paginationResult.error);
        elements.publishBtn.disabled = false;
        return;
      }

      const input = await buildInput(paginationResult.shouldPaginate);
      await executePublish({ input, App: app, Modal: modal, t });

      if (!isEditMode()) {
        resetEditorForm(
          {
            titleInput: elements.titleInput,
            slugInput: elements.slugInput,
            blockEditor: elements.blockEditor,
            titleOverrideEnabled: elements.titleOverrideEnabled,
            titleOverrideInput: elements.titleOverrideInput,
            navEnabled: elements.navEnabled,
            footerEnabled: elements.footerEnabled,
            footerText: elements.footerText,
            metaEnabled: elements.metaEnabled,
            metaDescription: elements.metaDescription,
            metaAuthor: elements.metaAuthor,
            cssEnabled: elements.cssEnabled,
            cssRules: elements.cssRules,
            liveCSS: elements.liveCSS,
            pageTypeSelect: elements.pageTypeSelect,
            pageTypeHint: elements.pageTypeHint
          },
          {
            createBlockElement,
            loadGlobalNavigation,
            clearAutoSave,
            updateByteCounter,
            updateCostRail,
            updateTitleBytes
          }
        );
      }

      elements.publishBtn.disabled = false;
      elements.publishBtn.textContent = isEditMode() ? t('editor.recompile') : t('editor.buildPublish');
    } catch (err) {
      modal.error(err.message);
      console.error(err);
      elements.publishBtn.disabled = false;
    }
  });

  elements.clearAllBtn.addEventListener('click', async () => {
    const confirmed = await modal.confirm(t('editor.resetConfirm'));
    if (!confirmed) return;

    elements.titleInput.value = '';
    elements.slugInput.value = '';
    elements.blockEditor.innerHTML = '';

    const emptyBlock = createBlockElement('paragraph');
    elements.blockEditor.appendChild(emptyBlock);

    elements.titleOverrideEnabled.checked = false;
    elements.titleOverrideEnabled.dispatchEvent(new Event('change'));
    elements.titleOverrideInput.value = '';

    elements.navEnabled.checked = false;
    elements.navEnabled.dispatchEvent(new Event('change'));
    loadGlobalNavigation();

    elements.footerEnabled.checked = false;
    elements.footerEnabled.dispatchEvent(new Event('change'));
    loadGlobalFooter();

    elements.metaEnabled.checked = false;
    elements.metaEnabled.dispatchEvent(new Event('change'));
    loadGlobalMeta();

    elements.cssEnabled.checked = false;
    elements.cssEnabled.dispatchEvent(new Event('change'));
    loadGlobalCSS();

    elements.pageTypeSelect.value = 'post';
    elements.pageTypeHint.textContent = '';

    clearAutoSave();

    updateByteCounter(0, 0);
    updateCostRail();
    updateTitleBytes();
  });

  elements.blockEditor.addEventListener('input', () => {
    const preview = getDebouncedPreview();
    preview();
    updateCostRail();
  });

  [
    [elements.titleInput, 'input'],
    [elements.titleOverrideInput, 'input'],
    [elements.titleOverrideEnabled, 'change'],
    [elements.footerText, 'input'],
    [elements.cssRules, 'input'],
    [elements.metaDescription, 'input'],
    [elements.metaAuthor, 'input'],
    [elements.navEnabled, 'change'],
    [elements.footerEnabled, 'change'],
    [elements.metaEnabled, 'change'],
    [elements.cssEnabled, 'change']
  ].forEach(([el, eventName]) => {
    el.addEventListener(eventName, () => {
      const preview = getDebouncedPreview();
      preview();
    });
  });

  const observer = new MutationObserver(() => {
    updateCostRail();
  });
  observer.observe(elements.blockEditor, { childList: true });

  return { observer };
}
