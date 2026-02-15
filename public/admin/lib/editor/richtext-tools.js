/**
 * Editor richtext and link tools
 */

export function createEditorRichtextTools(deps) {
  let savedSelection = null;

  function wrapSelectionWithTag(tagName) {
    deps.toggleSelectionWrap(tagName, {
      onChange: () => deps.onPreviewRequested()
    });
  }

  function showLinkPopup() {
    if (!savedSelection) return;

    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedSelection);
    const parentLink = sel.anchorNode?.parentElement?.closest('a');
    const existingHref = parentLink ? parentLink.getAttribute('href') : '';
    deps.linkHrefInput.value = existingHref;

    deps.linkPopup.querySelectorAll('.link-prefix-btn').forEach(btn => {
      const prefix = btn.dataset.prefix;
      if (existingHref.startsWith(prefix)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (existingHref.startsWith('https://') || existingHref.startsWith('http://')) {
      deps.linkHrefInput.placeholder = 'www.example.com';
    } else if (existingHref.startsWith('mailto:')) {
      deps.linkHrefInput.placeholder = 'name@example.com';
    } else if (existingHref.startsWith('tel:')) {
      deps.linkHrefInput.placeholder = '+49 123 456789';
    } else {
      deps.linkHrefInput.placeholder = '/path or #anchor';
    }

    const rect = savedSelection.getBoundingClientRect();
    deps.linkPopup.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    deps.linkPopup.style.left = (rect.left + window.scrollX) + 'px';
    deps.linkPopup.classList.remove('hidden');
    deps.linkHrefInput.focus();
  }

  function handleFormatClick(cmd, block) {
    const sel = window.getSelection();
    const hasSelection = sel.rangeCount > 0 && !sel.isCollapsed;
    const currentRange = hasSelection ? sel.getRangeAt(0).cloneRange() : null;

    if (cmd === 'link') {
      if (!hasSelection) {
        alert('Bitte erst Text markieren');
        return;
      }
      savedSelection = currentRange;
      showLinkPopup();
      return;
    }

    const content = block.querySelector('.block-content');
    const listItem = block.querySelector('li[contenteditable="true"]');
    const editableEl = listItem || content;

    if (currentRange) {
      sel.removeAllRanges();
      sel.addRange(currentRange);
    } else if (!editableEl.contains(document.activeElement) && editableEl !== document.activeElement) {
      editableEl.focus();
    }

    if (cmd === 'bold') {
      document.execCommand('bold', false, null);
    } else if (cmd === 'italic') {
      document.execCommand('italic', false, null);
    } else if (cmd === 'underline') {
      document.execCommand('underline', false, null);
    } else if (cmd === 'strikethrough') {
      document.execCommand('strikeThrough', false, null);
    } else if (cmd === 'code') {
      wrapSelectionWithTag('code');
    }
    deps.onPreviewRequested();
  }

  const hrefPattern = /^(\/[a-z0-9._/-]*|#[a-z0-9-]*|[a-z0-9-]+\.html|https?:\/\/[^\s]+|mailto:[^\s]+|tel:[^\s]+)$/i;

  deps.linkApplyBtn.addEventListener('click', () => {
    const href = deps.linkHrefInput.value.trim();
    if (!href) {
      deps.linkPopup.classList.add('hidden');
      return;
    }

    if (!hrefPattern.test(href)) {
      let hint;
      if (/^www\./i.test(href) || /\.(com|de|org|net|io|dev|at|ch)$/i.test(href)) {
        hint = `URLs müssen mit https:// beginnen: https://${href}`;
      } else if (/@/.test(href) && !href.startsWith('mailto:')) {
        hint = `E-Mail-Links müssen mit mailto: beginnen: mailto:${href}`;
      } else if (/^[\d\s+()-]+$/.test(href)) {
        hint = `Telefon-Links müssen mit tel: beginnen: tel:${href.replace(/\s/g, '')}`;
      } else {
        hint = 'Ungültiges Link-Format';
      }
      deps.modalInfo(hint);
      return;
    }

    if (savedSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelection);
      document.execCommand('createLink', false, href);
    }
    deps.linkPopup.classList.add('hidden');
    savedSelection = null;
    deps.onPreviewRequested();
  });

  deps.linkCancelBtn.addEventListener('click', () => {
    deps.linkPopup.classList.add('hidden');
    savedSelection = null;
  });

  const linkPrefixBtns = deps.linkPopup.querySelectorAll('.link-prefix-btn');
  const prefixPlaceholders = {
    'https://': 'www.example.com',
    'mailto:': 'name@example.com',
    'tel:': '+49 123 456789'
  };

  linkPrefixBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const prefix = btn.dataset.prefix;
      const currentValue = deps.linkHrefInput.value;

      const cleanValue = currentValue
        .replace(/^https?:\/\//, '')
        .replace(/^mailto:/, '')
        .replace(/^tel:/, '');

      if (currentValue.startsWith(prefix)) {
        deps.linkHrefInput.value = cleanValue;
        deps.linkHrefInput.placeholder = '/path or #anchor';
        linkPrefixBtns.forEach(b => b.classList.remove('active'));
      } else {
        deps.linkHrefInput.value = prefix + cleanValue;
        deps.linkHrefInput.placeholder = prefixPlaceholders[prefix];
        linkPrefixBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }

      deps.linkHrefInput.focus();
    });
  });

  return {
    handleFormatClick,
    wrapSelectionWithTag,
    showLinkPopup
  };
}