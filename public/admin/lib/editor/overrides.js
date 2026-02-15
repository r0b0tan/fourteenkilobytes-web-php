/**
 * Editor Overrides utilities
 */

const checkIcon = '<svg class="hint-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getThemeDisplayName(cssMode) {
  const names = {
    'default': 'CMS Default Theme',
    'light': 'CMS Light Theme',
    'dark': 'CMS Dark Theme',
    'custom': 'Custom CSS'
  };
  return names[cssMode] || cssMode || 'CMS Default Theme';
}

export function createEditorOverridesManager(deps) {
  let editingNavLink = null;

  function loadGlobalNavigation() {
    deps.navLinks.innerHTML = '';
    if (deps.getGlobalConfig()?.header?.links) {
      deps.getGlobalConfig().header.links.forEach(link => {
        deps.navLinks.appendChild(createNavChip(link.text, link.href));
      });
    }
  }

  function createNavChip(text, href) {
    const chip = document.createElement('span');
    chip.className = 'nav-chip';
    chip.dataset.href = href;
    chip.textContent = text;
    chip.draggable = true;
    chip.addEventListener('click', () => editNavLink(chip));

    chip.addEventListener('dragstart', (e) => {
      chip.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    chip.addEventListener('dragend', () => {
      chip.classList.remove('dragging');
      deps.navLinks.querySelectorAll('.nav-chip').forEach(c => c.classList.remove('drag-over'));
    });

    chip.addEventListener('dragover', (e) => {
      e.preventDefault();
      const dragging = deps.navLinks.querySelector('.dragging');
      if (dragging && dragging !== chip) {
        chip.classList.add('drag-over');
      }
    });

    chip.addEventListener('dragleave', () => {
      chip.classList.remove('drag-over');
    });

    chip.addEventListener('drop', (e) => {
      e.preventDefault();
      const dragging = deps.navLinks.querySelector('.dragging');
      if (dragging && dragging !== chip) {
        const allChips = [...deps.navLinks.querySelectorAll('.nav-chip')];
        const dragIndex = allChips.indexOf(dragging);
        const dropIndex = allChips.indexOf(chip);
        if (dragIndex < dropIndex) {
          chip.after(dragging);
        } else {
          chip.before(dragging);
        }
      }
      chip.classList.remove('drag-over');
    });

    return chip;
  }

  function editNavLink(chip) {
    editingNavLink = chip;
    deps.navLinkText.value = chip.textContent;
    deps.navLinkHref.value = chip.dataset.href;
    deps.navLinkDelete.classList.remove('hidden');
    deps.navLinkPopup.classList.remove('hidden');
    deps.navLinkText.focus();
  }

  function loadGlobalFooter() {
    if (deps.getGlobalConfig()?.footer?.content) {
      deps.footerText.value = deps.getGlobalConfig().footer.content;
    }
  }

  function loadGlobalMeta() {
    if (deps.getGlobalConfig()?.meta?.description) {
      deps.metaDescription.value = deps.getGlobalConfig().meta.description;
    }
    if (deps.getGlobalConfig()?.meta?.author) {
      deps.metaAuthor.value = deps.getGlobalConfig().meta.author;
    }
  }

  function updateTitleOverrideHint() {
    const siteTitleEnabled = deps.getGlobalConfig()?.siteTitleEnabled !== false;
    const siteTitleText = deps.getGlobalConfig()?.siteTitle;
    if (siteTitleEnabled && siteTitleText) {
      const escapedTitle = escapeHtml(siteTitleText);
      deps.titleOverrideHint.innerHTML = `${checkIcon} <span>${deps.t('editor.browserTabTitleHintWithSite').replace('Site Title', escapedTitle)}</span>`;
    } else {
      deps.titleOverrideHint.innerHTML = `${checkIcon} <span data-i18n="editor.browserTabTitleHint">${deps.t('editor.browserTabTitleHint')}</span>`;
    }
  }

  function loadGlobalCSS() {
    const themeName = getThemeDisplayName(deps.getGlobalConfig()?.cssMode);
    deps.cssGlobalHint.innerHTML = `${checkIcon} <span>${themeName} is used globally</span>`;
  }

  function applyLiveCSS() {
    const css = deps.cssRules.value.trim();
    if (!css) {
      deps.liveCSS.textContent = '';
      return;
    }

    try {
      const scopedCSS = css.replace(/([^{}]+)\{/g, (match, selector) => {
        const selectors = selector.split(',').map(s => {
          s = s.trim();
          if (s.startsWith('@') || s.startsWith('from') || s.startsWith('to') || /^\d+%$/.test(s)) {
            return s;
          }
          if (s === 'body' || s === 'html') {
            return '.block-editor';
          }
          return `.block-editor ${s}`;
        }).join(', ');
        return selectors + ' {';
      });
      deps.liveCSS.textContent = scopedCSS;
    } catch (e) {
      // Invalid CSS, ignore
    }
  }

  deps.navEnabled.addEventListener('change', () => {
    deps.navGlobalHint.classList.toggle('hidden', deps.navEnabled.checked);

    const chips = deps.navLinks.querySelectorAll('.nav-chip');
    chips.forEach(chip => {
      chip.style.pointerEvents = deps.navEnabled.checked ? 'auto' : 'none';
      chip.style.opacity = deps.navEnabled.checked ? '1' : '0.6';
    });
    deps.addNavLinkBtn.disabled = !deps.navEnabled.checked;
  });

  deps.addNavLinkBtn.addEventListener('click', () => {
    editingNavLink = null;
    deps.navLinkText.value = '';
    deps.navLinkHref.value = '';
    deps.navLinkDelete.classList.add('hidden');
    deps.navLinkPopup.classList.remove('hidden');
    deps.navLinkText.focus();
  });

  deps.navLinkSave.addEventListener('click', () => {
    const text = deps.navLinkText.value.trim();
    const href = deps.navLinkHref.value.trim();
    if (!text || !href) return;

    if (editingNavLink) {
      editingNavLink.textContent = text;
      editingNavLink.dataset.href = href;
    } else {
      deps.navLinks.appendChild(createNavChip(text, href));
    }
    deps.navLinkPopup.classList.add('hidden');
    editingNavLink = null;
  });

  deps.navLinkDelete.addEventListener('click', () => {
    if (editingNavLink) {
      editingNavLink.remove();
    }
    deps.navLinkPopup.classList.add('hidden');
    editingNavLink = null;
  });

  deps.navLinkCancel.addEventListener('click', () => {
    deps.navLinkPopup.classList.add('hidden');
    editingNavLink = null;
  });

  deps.footerEnabled.addEventListener('change', () => {
    deps.footerGlobalHint.classList.toggle('hidden', deps.footerEnabled.checked);
    deps.footerText.disabled = !deps.footerEnabled.checked;
    deps.insertBytesBtn.disabled = !deps.footerEnabled.checked;
  });

  deps.metaEnabled.addEventListener('change', () => {
    deps.metaGlobalHint.classList.toggle('hidden', deps.metaEnabled.checked);
    deps.metaDescription.disabled = !deps.metaEnabled.checked;
    deps.metaAuthor.disabled = !deps.metaEnabled.checked;
  });

  deps.titleOverrideEnabled.addEventListener('change', () => {
    deps.titleOverrideHint.classList.toggle('hidden', deps.titleOverrideEnabled.checked);
    deps.titleOverrideInput.disabled = !deps.titleOverrideEnabled.checked;
    deps.updateTitleBytes();
  });

  deps.titleOverrideInput.addEventListener('input', () => {
    deps.updateTitleBytes();
  });

  deps.insertBytesBtn.addEventListener('click', () => {
    const cursorPos = deps.footerText.selectionStart;
    const textBefore = deps.footerText.value.substring(0, cursorPos);
    const textAfter = deps.footerText.value.substring(cursorPos);
    deps.footerText.value = textBefore + '{{bytes}}' + textAfter;
    deps.footerText.focus();
    deps.footerText.setSelectionRange(cursorPos + 9, cursorPos + 9);
    deps.onPreviewRequested();
  });

  deps.cssEnabled.addEventListener('change', () => {
    deps.cssGlobalHint.classList.toggle('hidden', deps.cssEnabled.checked);
    deps.cssRules.disabled = !deps.cssEnabled.checked;
  });

  deps.cssRules.addEventListener('input', () => {
    applyLiveCSS();
  });

  return {
    loadGlobalNavigation,
    createNavChip,
    loadGlobalFooter,
    loadGlobalMeta,
    updateTitleOverrideHint,
    loadGlobalCSS,
    applyLiveCSS
  };
}