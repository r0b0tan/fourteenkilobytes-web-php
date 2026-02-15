/**
 * Editor bootstrap utilities
 */

export function createEditorBootstrap(deps) {
  function showEditModeBanner(editingSlug) {
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    pageTitle.innerHTML = `Recompile <span style="font-weight: 400; color: var(--text-secondary);">/ ${editingSlug}</span>`;
    pageSubtitle.textContent = 'Editing source · requires rebuild';
    pageSubtitle.style.display = 'block';

    deps.publishBtn.setAttribute('data-i18n', 'editor.recompile');
    deps.publishBtn.textContent = deps.t('editor.recompile');
  }

  function applyInitialUiState() {
    deps.loadGlobalNavigation();
    deps.loadGlobalFooter();
    deps.loadGlobalMeta();
    deps.loadGlobalCSS();

    deps.navEditor.classList.remove('hidden');
    deps.addNavLinkBtn.disabled = true;

    const initialChips = deps.navLinks.querySelectorAll('.nav-chip');
    initialChips.forEach(chip => {
      chip.style.pointerEvents = 'none';
      chip.style.opacity = '0.6';
    });

    deps.footerEditor.classList.remove('hidden');
    deps.footerText.disabled = true;
    deps.insertBytesBtn.disabled = true;

    deps.metaEditor.classList.remove('hidden');
    deps.metaDescription.disabled = true;
    deps.metaAuthor.disabled = true;

    deps.titleOverrideInput.disabled = true;
    deps.updateTitleOverrideHint();

    deps.cssEditor.classList.remove('hidden');
    deps.cssRules.disabled = true;
  }

  async function loadSeedTemplates() {
    try {
      const seeds = await deps.getSeeds();

      if (seeds && seeds.length > 0) {
        seeds.forEach(seed => {
          const option = document.createElement('option');
          option.value = seed.name;
          option.textContent = seed.label;
          deps.templateSelector.appendChild(option);
        });
      }
    } catch (err) {
      console.error('Failed to load seed templates:', err);
    }
  }

  function registerSeedHandler() {
    deps.templateSelector.addEventListener('change', async function () {
      const seedName = this.value;
      if (!seedName) return;

      try {
        const { sourceData } = await deps.clonePage(seedName, 'seed');
        deps.loadFromSource(sourceData);

        const pageTitle = document.getElementById('page-title');
        const pageSubtitle = document.getElementById('page-subtitle');
        pageTitle.textContent = `New (from ${seedName.replace('-', ' ')})`;
        pageSubtitle.textContent = 'Set title and slug to create a new page';

        this.value = '';
      } catch (err) {
        deps.modalError(deps.t('editor.templatesError', { error: err.message }));
        this.value = '';
      }
    });
  }

  async function loadByMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const editSlug = urlParams.get('edit');
    const isCloning = urlParams.get('clone') === 'true';

    if (!editSlug && !isCloning) {
      await loadSeedTemplates();
    } else {
      deps.templateSelectorContainer.style.display = 'none';
    }

    if (editSlug) {
      try {
        const sourceData = await deps.getSourceData(editSlug);
        if (sourceData) {
          deps.setEditMode(editSlug);
          deps.loadFromSource(sourceData);
          showEditModeBanner(editSlug);
        }
      } catch (err) {
        console.error('Failed to load source:', err);
        deps.modalError(deps.t('editor.loadSourceError', { error: err.message }));
      }
      return;
    }

    if (isCloning) {
      try {
        const clonedData = sessionStorage.getItem('clonedSource');
        if (clonedData) {
          const sourceData = JSON.parse(clonedData);
          deps.loadFromSource(sourceData);
          sessionStorage.removeItem('clonedSource');
          const pageTitle = document.getElementById('page-title');
          const pageSubtitle = document.getElementById('page-subtitle');
          pageTitle.textContent = 'New (Cloned)';
          pageSubtitle.textContent = 'Set title and slug to create a new page';
        }
      } catch (err) {
        console.error('Failed to load cloned source:', err);
      }
      return;
    }

    deps.loadFromLocalStorage();
  }

  async function init() {
    applyInitialUiState();
    registerSeedHandler();
    await loadByMode();
  }

  return {
    init
  };
}