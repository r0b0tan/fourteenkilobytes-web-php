export function initDataTab({ doc = document, App, t, Toast, Modal, loadSettings }) {
  const exportBtn = doc.getElementById('export-btn');
  const importDropzone = doc.getElementById('import-dropzone');
  const importFile = doc.getElementById('import-file');
  const deleteAllBtn = doc.getElementById('delete-all-btn');
  const fullResetBtn = doc.getElementById('full-reset-btn');

  const backdrop = doc.getElementById('modal-backdrop');
  const importModal = doc.getElementById('import-modal');
  const importModalOptions = doc.getElementById('import-modal-options');
  const importModalActions = doc.getElementById('import-modal-actions');
  const importProgress = doc.getElementById('import-progress');
  const importProgressFill = doc.getElementById('import-progress-fill');
  const importProgressText = doc.getElementById('import-progress-text');

  exportBtn.addEventListener('click', async () => {
    const type = doc.querySelector('input[name="export-type"]:checked').value;
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

  function resetImportUI() {
    importFile.value = '';
  }

  function showImportModal(data) {
    const hasSettings = !!data.settings;
    const hasArticles = !!data.articles?.length;
    const articleCount = data.articles?.length || 0;

    importProgress.classList.add('hidden');
    importProgressFill.style.width = '0%';
    importModalOptions.innerHTML = '';
    importModalActions.innerHTML = '';

    if (hasSettings && hasArticles) {
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

      const articlesCheckbox = doc.getElementById('import-opt-articles');
      const buildOption = doc.getElementById('import-build-option');
      articlesCheckbox.addEventListener('change', () => {
        buildOption.style.display = articlesCheckbox.checked ? '' : 'none';
      });
    } else if (hasArticles) {
      importModalOptions.innerHTML = `
        <p>${t('settings.importArticles', { count: articleCount })}?</p>
        <label>
          <input type="checkbox" id="import-opt-build" checked>
          <span>${t('settings.importBuild')}</span>
        </label>
        <p class="import-option-note">${t('settings.importNote')}</p>
      `;
    } else if (hasSettings) {
      importModalOptions.innerHTML = `
        <p>${t('settings.importSettings')}?</p>
        <p class="import-option-note">${t('settings.importNote')}</p>
      `;
    }

    const importBtn = doc.createElement('button');
    importBtn.type = 'button';
    importBtn.className = 'btn-primary';
    importBtn.textContent = t('settings.importBtn');
    importBtn.addEventListener('click', () => executeImport(data, hasSettings, hasArticles));

    const cancelBtn = doc.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn-secondary';
    cancelBtn.textContent = t('settings.importCancel');
    cancelBtn.addEventListener('click', hideImportModal);

    importModalActions.appendChild(importBtn);
    importModalActions.appendChild(cancelBtn);

    backdrop.classList.remove('hidden');
    importModal.classList.remove('hidden');
  }

  function hideImportModal() {
    importModal.classList.add('hidden');
    backdrop.classList.add('hidden');
    resetImportUI();
  }

  async function executeImport(data, hasSettings, hasArticles) {
    const settingsCheckbox = doc.getElementById('import-opt-settings');
    const articlesCheckbox = doc.getElementById('import-opt-articles');
    const buildCheckbox = doc.getElementById('import-opt-build');

    const doSettings = hasSettings && (!settingsCheckbox || settingsCheckbox.checked);
    const doArticles = hasArticles && (!articlesCheckbox || articlesCheckbox.checked);
    const doBuild = doArticles && buildCheckbox?.checked;

    if (!doSettings && !doArticles) {
      Toast.error(t('settings.importSelectOption'));
      return;
    }

    const buttons = importModalActions.querySelectorAll('button');
    buttons.forEach(btn => btn.disabled = true);

    try {
      if (doBuild) {
        importProgress.classList.remove('hidden');
        importProgressText.textContent = t('settings.importProgress');
        importProgressFill.style.width = '5%';
      }

      const result = await App.importData(data, {
        settings: doSettings,
        articles: doArticles,
      });

      if (doSettings && result.imported.includes('settings')) {
        await loadSettings();
      }

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

  deleteAllBtn.addEventListener('click', async () => {
    const confirmed = await Modal.confirm(t('settings.deleteAllConfirm'));
    if (!confirmed) return;

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

  fullResetBtn.addEventListener('click', async () => {
    const confirmed = await Modal.confirm(t('settings.fullResetConfirm'));
    if (!confirmed) return;

    const doubleConfirmed = await Modal.confirm(t('settings.fullResetConfirm2'));
    if (!doubleConfirmed) return;

    fullResetBtn.disabled = true;
    try {
      await App.fullReset();
      Toast.success(t('settings.fullResetSuccess'));
      setTimeout(() => window.location.href = '/setup/', 1500);
    } catch (err) {
      Toast.error(t('errors.generic', { error: err.message }));
      fullResetBtn.disabled = false;
    }
  });
}
