/**
 * Editor Metrics utilities
 */

export function createEditorMetricsManager(deps) {
  function updateByteCounter(totalBytes, overheadBytes = 0, contentBytes = null, breakdown = null) {
    const limit = 14336;
    const actualContentBytes = contentBytes !== null ? contentBytes : Math.max(0, totalBytes - overheadBytes);
    const overheadPercent = Math.min((overheadBytes / limit) * 100, 100);
    const totalPercent = Math.min((totalBytes / limit) * 100, 100);

    if (breakdown) {
      deps.breakdownBase.textContent = deps.formatBytes(breakdown.base);
      deps.breakdownTitle.textContent = deps.formatBytes(breakdown.title || 0);
      deps.breakdownFavicon.textContent = deps.formatBytes(breakdown.favicon || 0);
      deps.breakdownNav.textContent = deps.formatBytes(breakdown.navigation);
      deps.breakdownMeta.textContent = deps.formatBytes(breakdown.meta || 0);
      deps.breakdownFooter.textContent = deps.formatBytes(breakdown.footer);
      deps.breakdownCss.textContent = deps.formatBytes(breakdown.css);
      deps.breakdownContent.textContent = deps.formatBytes(breakdown.content);
      deps.breakdownTotal.textContent = `${deps.formatBytes(totalBytes)} / 14.336 B`;

      deps.navBytesEl.textContent = deps.formatBytes(breakdown.navigation);
      deps.metaBytesEl.textContent = deps.formatBytes(breakdown.meta || 0);
      deps.footerBytesEl.textContent = deps.formatBytes(breakdown.footer);
      deps.cssBytesEl.textContent = deps.formatBytes(breakdown.css);
    }

    deps.costContentTotal.textContent = deps.formatBytes(actualContentBytes);

    const overheadDeg = (overheadPercent / 100) * 360;
    const totalDeg = (totalPercent / 100) * 360;

    let contentColor = 'var(--accent)';
    deps.pieContentDot.classList.remove('warning', 'danger');
    if (totalPercent >= 100) {
      contentColor = '#dc2626';
      deps.pieContentDot.classList.add('danger');
    } else if (totalPercent >= 80) {
      contentColor = '#f59e0b';
      deps.pieContentDot.classList.add('warning');
    }

    deps.pieChart.style.background = `conic-gradient(
      var(--gray-400) 0deg ${overheadDeg}deg,
      ${contentColor} ${overheadDeg}deg ${totalDeg}deg,
      var(--gray-200) ${totalDeg}deg 360deg
    )`;

    deps.piePercent.textContent = `${Math.round(totalPercent)}%`;
  }

  function updateCostRail() {
    let totalContentBytes = 0;

    function estimateBlockBytes(block) {
      const blockData = deps.serializeBlock(block);
      return deps.estimateBlockSize(blockData);
    }

    function processBlock(block) {
      const type = block.dataset.type;
      let bytes = 0;
      let label = 'Block';

      if (type === 'section') {
        label = 'Section';
        bytes = estimateBlockBytes(block);
      } else if (type === 'layout') {
        label = 'Layout';
        bytes = estimateBlockBytes(block);
      } else {
        bytes = estimateBlockBytes(block);

        const level = block.dataset.level;
        const listType = block.dataset.listType;
        if (type === 'heading') label = `H${level}`;
        else if (type === 'paragraph') label = 'Paragraph';
        else if (type === 'bloglist') label = 'Bloglist';
        else if (type === 'list' || type === 'unordered-list') {
          if (listType === 'ordered' || type === 'ordered-list') label = 'OL';
          else label = 'UL';
        }
        else if (type === 'blockquote') label = 'Quote';
        else if (type === 'codeblock') label = 'Code';
        else if (type === 'divider') label = 'HR';
        else if (type === 'spacer') label = 'Spacer';
      }

      const byteIndicator = block.querySelector(':scope > .block-byte-indicator');
      if (byteIndicator) {
        byteIndicator.innerHTML = `<span>${label}</span><span>${deps.formatBytes(bytes)}</span>`;
      }

      return bytes;
    }

    const topLevelBlocks = deps.blockEditor.querySelectorAll(':scope > .block-item');
    topLevelBlocks.forEach(block => {
      totalContentBytes += processBlock(block);
    });

    if (topLevelBlocks.length > 1) {
      totalContentBytes += topLevelBlocks.length - 1;
    }

    deps.costContentTotal.textContent = deps.formatBytes(totalContentBytes);
  }

  function updateTitleBytes() {
    const pageTitle = deps.titleInput.value.trim() || 'Untitled';
    const titleOverrideValue = deps.titleOverrideInput.value.trim();
    const globalConfig = deps.getGlobalConfig();
    const siteTitleEnabled = globalConfig?.siteTitleEnabled !== false;
    const siteTitleText = globalConfig?.siteTitle;

    const pageTitleBytes = new TextEncoder().encode(pageTitle).length;
    deps.titleBytesEl.textContent = deps.formatBytes(pageTitleBytes);

    let browserTitle;
    if (deps.titleOverrideEnabled.checked && titleOverrideValue) {
      browserTitle = titleOverrideValue;
    } else if (siteTitleEnabled && siteTitleText) {
      browserTitle = `${pageTitle} | ${siteTitleText}`;
    } else {
      browserTitle = pageTitle;
    }

    const browserTitleBytes = new TextEncoder().encode(browserTitle).length + 15;
    deps.browserTitleBytesEl.textContent = deps.formatBytes(browserTitleBytes);
  }

  return {
    updateByteCounter,
    updateCostRail,
    updateTitleBytes
  };
}