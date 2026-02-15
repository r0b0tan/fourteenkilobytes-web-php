/**
 * Editor State / Auto-save utilities
 */

const AUTOSAVE_KEY = 'editor-autosave';

export function getCurrentContextFromSearch(search) {
  const params = new URLSearchParams(search || '');
  const editSlug = params.get('edit');
  return editSlug ? { mode: 'edit', slug: editSlug } : { mode: 'new', slug: null };
}

export function createEditorStateManager(deps) {
  function getCurrentContext() {
    return getCurrentContextFromSearch(window.location.search);
  }

  function saveToLocalStorage() {
    const context = getCurrentContext();
    try {
      const title = deps.titleInput.value;
      const slug = deps.slugInput.value;
      const pageType = deps.pageTypeSelect.value;
      const content = deps.getContentFromBlocks();

      const data = {
        context,
        title,
        slug,
        pageType,
        blocks: [],
        titleOverrideEnabled: deps.titleOverrideEnabled.checked,
        titleOverride: deps.titleOverrideEnabled.checked ? deps.titleOverrideInput.value : null,
        navEnabled: deps.navEnabled.checked,
        navigation: deps.navEnabled.checked ? deps.getNavigationItems() : null,
        footerEnabled: deps.footerEnabled.checked,
        footer: deps.footerEnabled.checked ? deps.footerText.value : null,
        metaEnabled: deps.metaEnabled.checked,
        metaDescription: deps.metaDescription.value,
        metaAuthor: deps.metaAuthor.value,
        cssEnabled: deps.cssEnabled.checked,
        css: deps.cssEnabled.checked ? deps.cssRules.value : null,
        source: {
          title,
          slug,
          pageType,
          content,
          titleOverride: deps.titleOverrideEnabled.checked && deps.titleOverrideInput.value.trim()
            ? { enabled: true, title: deps.titleOverrideInput.value.trim() }
            : null,
          navigation: deps.navEnabled.checked ? { items: deps.getNavigationItems() } : null,
          footer: deps.footerEnabled.checked ? { content: deps.footerText.value } : null,
          meta: deps.metaEnabled.checked ? {
            description: deps.metaDescription.value,
            author: deps.metaAuthor.value
          } : null,
          css: deps.cssEnabled.checked ? { rules: deps.cssRules.value } : null
        },
        timestamp: Date.now()
      };

      const blocks = deps.blockEditor.querySelectorAll('.block-item');
      blocks.forEach(blockItem => {
        const type = blockItem.dataset.type;
        const level = blockItem.dataset.level || null;
        const contentEl = blockItem.querySelector('.block-content');
        if (contentEl) {
          data.blocks.push({
            type,
            level,
            html: contentEl.innerHTML
          });
        }
      });

      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to auto-save:', err);
    }
  }

  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (!saved) return false;

      const data = JSON.parse(saved);
      const currentContext = getCurrentContext();

      if (data.context?.mode !== currentContext.mode ||
        data.context?.slug !== currentContext.slug) {
        return false;
      }

      const age = Date.now() - (data.timestamp || 0);
      if (age > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(AUTOSAVE_KEY);
        return false;
      }

      if (data.source && Array.isArray(data.source.content)) {
        deps.loadFromSource(data.source);
        deps.updatePageTitleSlug();
        return true;
      }

      deps.titleInput.value = data.title || '';
      deps.slugInput.value = data.slug || '';
      deps.pageTypeSelect.value = data.pageType || 'post';

      if (data.blocks && data.blocks.length > 0) {
        deps.blockEditor.innerHTML = '';
        data.blocks.forEach(block => {
          const level = block.level || null;
          const blockElement = deps.createBlockElement(block.type, level, block.html || '');
          deps.blockEditor.appendChild(blockElement);
        });
      }

      if (data.titleOverrideEnabled) {
        deps.titleOverrideEnabled.checked = true;
        deps.titleOverrideEnabled.dispatchEvent(new Event('change'));
        deps.titleOverrideInput.value = data.titleOverride || '';
      }

      if (data.navEnabled) {
        deps.navEnabled.checked = true;
        deps.navEnabled.dispatchEvent(new Event('change'));
        if (data.navigation && data.navigation.length > 0) {
          deps.navLinks.innerHTML = '';
          data.navigation.forEach(link => {
            deps.navLinks.appendChild(deps.createNavChip(link.text, link.href));
          });
        }
      }

      if (data.footerEnabled) {
        deps.footerEnabled.checked = true;
        deps.footerEnabled.dispatchEvent(new Event('change'));
        deps.footerText.value = data.footer || '';
      }

      if (data.metaEnabled) {
        deps.metaEnabled.checked = true;
        deps.metaEnabled.dispatchEvent(new Event('change'));
        deps.metaDescription.value = data.metaDescription || '';
        deps.metaAuthor.value = data.metaAuthor || '';
      }

      if (data.cssEnabled) {
        deps.cssEnabled.checked = true;
        deps.cssEnabled.dispatchEvent(new Event('change'));
        deps.cssRules.value = data.css || '';
      }

      deps.updatePageTitleSlug();
      return true;
    } catch (err) {
      console.warn('Failed to restore auto-save:', err);
      return false;
    }
  }

  function clearAutoSave() {
    try {
      localStorage.removeItem(AUTOSAVE_KEY);
    } catch (err) {
      console.warn('Failed to clear auto-save:', err);
    }
  }

  return {
    getCurrentContext,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearAutoSave
  };
}