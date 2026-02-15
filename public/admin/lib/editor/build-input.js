/**
 * Editor build-input utilities
 */

import { buildInputFromData } from '../editor-core.js';

export function createEditorBuildInputManager(deps) {
  function getContentFromBlocks() {
    const blocks = deps.blockEditor.querySelectorAll(':scope > .block-item');
    const content = [];
    for (const block of blocks) {
      content.push(deps.serializeBlock(block));
    }
    return content;
  }

  function getNavigationItems() {
    const chips = deps.navLinks.querySelectorAll('.nav-chip');
    return Array.from(chips).map(chip => ({
      text: chip.textContent,
      href: chip.dataset.href
    }));
  }

  async function buildInput(allowPagination = false) {
    const content = getContentFromBlocks();

    let posts = [];
    const finalContent = content.length > 0
      ? content
      : [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }];

    const hasBloglist = finalContent.some(block => block.type === 'bloglist');
    if (hasBloglist) {
      try {
        posts = await deps.getPosts();
      } catch (err) {
        console.warn('Failed to load posts for bloglist:', err);
      }
    }

    return buildInputFromData({
      content,
      fields: {
        slug: deps.slugInput.value,
        title: deps.titleInput.value,
        pageType: deps.pageTypeSelect.value,
        titleOverrideEnabled: deps.titleOverrideEnabled.checked,
        titleOverride: deps.titleOverrideInput.value,
        navEnabled: deps.navEnabled.checked,
        navItems: getNavigationItems(),
        footerEnabled: deps.footerEnabled.checked,
        footerText: deps.footerText.value,
        metaEnabled: deps.metaEnabled.checked,
        metaDescription: deps.metaDescription.value,
        metaAuthor: deps.metaAuthor.value,
        cssEnabled: deps.cssEnabled.checked,
        cssRules: deps.cssRules.value,
        buildId: crypto.randomUUID()
      },
      globalConfig: deps.getGlobalConfig(),
      posts
    }, allowPagination);
  }

  return {
    getContentFromBlocks,
    getNavigationItems,
    buildInput
  };
}