/**
 * Editor richtext and link tools
 */

export function createEditorRichtextTools(deps) {
  let savedSelection = null;
  let linkTargetMode = 'internal';

  function getTargetButtons() {
    return {
      internal: deps.linkPopup.querySelector('[data-link-target="internal"]'),
      external: deps.linkPopup.querySelector('[data-link-target="external"]')
    };
  }

  function setLinkTargetMode(mode) {
    linkTargetMode = mode === 'external' ? 'external' : 'internal';
    const { internal, external } = getTargetButtons();
    if (internal) internal.classList.toggle('active', linkTargetMode === 'internal');
    if (external) external.classList.toggle('active', linkTargetMode === 'external');
  }

  function applyLinkTargetMode(range) {
    if (!range) return;

    const links = new Set();

    function addClosestLink(node) {
      if (!node) return;
      const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
      const link = element?.closest?.('a');
      if (link) links.add(link);
    }

    addClosestLink(range.startContainer);
    addClosestLink(range.endContainer);

    const container = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;

    if (container?.querySelectorAll) {
      container.querySelectorAll('a').forEach(link => {
        let intersects = false;
        if (typeof range.intersectsNode === 'function') {
          intersects = range.intersectsNode(link);
        } else {
          const nodeRange = document.createRange();
          nodeRange.selectNodeContents(link);
          intersects =
            range.compareBoundaryPoints(Range.END_TO_START, nodeRange) > 0
            && range.compareBoundaryPoints(Range.START_TO_END, nodeRange) < 0;
        }
        if (intersects) links.add(link);
      });
    }

    links.forEach(link => {
      if (linkTargetMode === 'external') {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      } else {
        link.removeAttribute('target');
        link.removeAttribute('rel');
      }
    });
  }

  function normalizeHrefAndInferMode(rawHref) {
    const trimmedHref = rawHref.trim();
    if (!trimmedHref) {
      return { href: '', inferredMode: null };
    }

    if (/^https?:\/\//i.test(trimmedHref)) {
      return { href: trimmedHref, inferredMode: null };
    }

    if (/^www\./i.test(trimmedHref)) {
      return { href: `https://${trimmedHref}`, inferredMode: 'external' };
    }

    const bareDomainPattern = /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#][^\s]*)?$/i;
    if (bareDomainPattern.test(trimmedHref)) {
      return { href: `https://${trimmedHref}`, inferredMode: 'external' };
    }

    return { href: trimmedHref, inferredMode: null };
  }

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
    const existingTarget = parentLink ? parentLink.getAttribute('target') : '';
    setLinkTargetMode(existingTarget === '_blank' ? 'external' : 'internal');

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
    const normalized = normalizeHrefAndInferMode(deps.linkHrefInput.value);
    const href = normalized.href;
    if (href && href !== deps.linkHrefInput.value.trim()) {
      deps.linkHrefInput.value = href;
    }
    if (normalized.inferredMode === 'external') {
      setLinkTargetMode('external');
    }

    if (!href) {
      deps.linkPopup.classList.add('hidden');
      return;
    }

    if (!hrefPattern.test(href)) {
      let hint;
      if (/@/.test(href) && !href.startsWith('mailto:')) {
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
      const postSel = window.getSelection();
      const postRange = postSel && postSel.rangeCount > 0 ? postSel.getRangeAt(0).cloneRange() : null;
      applyLinkTargetMode(postRange || savedSelection);
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
  const { internal: internalTargetBtn, external: externalTargetBtn } = getTargetButtons();
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

  if (internalTargetBtn) {
    internalTargetBtn.addEventListener('click', () => {
      setLinkTargetMode('internal');
      deps.linkHrefInput.focus();
    });
  }

  if (externalTargetBtn) {
    externalTargetBtn.addEventListener('click', () => {
      setLinkTargetMode('external');
      deps.linkHrefInput.focus();
    });
  }

  setLinkTargetMode('internal');

  return {
    handleFormatClick,
    wrapSelectionWithTag,
    showLinkPopup
  };
}