/**
 * Style and global-settings helpers for compile service.
 */

function contentHasBlockType(content, blockType) {
  if (!Array.isArray(content) || content.length === 0) return false;

  const hasTypeInBlock = (block) => {
    if (!block || typeof block !== 'object') return false;
    if (block.type === blockType) return true;

    if (Array.isArray(block.children) && block.children.some(hasTypeInBlock)) {
      return true;
    }

    if (Array.isArray(block.cells)) {
      for (const cell of block.cells) {
        if (Array.isArray(cell?.children) && cell.children.some(hasTypeInBlock)) {
          return true;
        }
      }
    }

    return false;
  };

  return content.some(hasTypeInBlock);
}

function applyBloglistSettingsToBlock(block, bloglistSettings, isArchivePage) {
  if (!block || typeof block !== 'object') return block;

  let updatedBlock = block;

  if (block.type === 'bloglist') {
    updatedBlock = { ...updatedBlock };
    if (updatedBlock.limit === undefined) {
      updatedBlock.limit = bloglistSettings.limit || 10;
    }
    if (bloglistSettings.archiveEnabled && !updatedBlock.archiveLink && !isArchivePage) {
      updatedBlock.archiveLink = {
        href: '/' + (bloglistSettings.archiveSlug || 'archive'),
        text: bloglistSettings.archiveLinkText || 'View all posts →',
      };
    }
  }

  if (Array.isArray(block.children)) {
    updatedBlock = {
      ...updatedBlock,
      children: block.children.map(child => applyBloglistSettingsToBlock(child, bloglistSettings, isArchivePage)),
    };
  }

  if (Array.isArray(block.cells)) {
    updatedBlock = {
      ...updatedBlock,
      cells: block.cells.map(cell => {
        if (!cell || typeof cell !== 'object' || !Array.isArray(cell.children)) return cell;
        return {
          ...cell,
          children: cell.children.map(child => applyBloglistSettingsToBlock(child, bloglistSettings, isArchivePage)),
        };
      }),
    };
  }

  return updatedBlock;
}

export function createCompileStyleService(deps) {
  const {
    getSettings,
    getPosts,
    stripCssComments,
    isClassManglingEnabledForSettings,
    getClassManglingModeForSettings,
    contentHasSections,
  } = deps;

  const CSS_PRESET_NAMES = ['default', 'light', 'dark'];
  let cssPresetsCache = null;
  let sectionCssCache = null;

  async function isCompressionEnabled() {
    const settings = await getSettings();
    return settings?.optimizations?.compression?.enabled !== false;
  }

  async function loadSectionCSS() {
    if (sectionCssCache !== null) return sectionCssCache;
    try {
      const res = await fetch('/admin/sections.css');
      if (res.ok) {
        sectionCssCache = stripCssComments(await res.text()).trim();
      } else {
        sectionCssCache = '';
      }
    } catch (e) {
      console.warn('Failed to load section CSS:', e);
      sectionCssCache = '';
    }
    return sectionCssCache;
  }

  async function loadCssPresets() {
    if (cssPresetsCache) {
      return cssPresetsCache;
    }

    const presets = {};
    await Promise.all(CSS_PRESET_NAMES.map(async (name) => {
      try {
        const res = await fetch(`/admin/presets/${name}.css`);
        if (res.ok) {
          presets[name] = stripCssComments(await res.text()).trim();
        }
      } catch (e) {
        console.warn(`Failed to load preset ${name}:`, e);
      }
    }));

    cssPresetsCache = presets;
    return presets;
  }

  async function getPresetCSS(cssMode, customCss = '') {
    if (cssMode === 'custom') {
      return customCss;
    }
    const presets = await loadCssPresets();
    return presets[cssMode] || presets.default || '';
  }

  async function applyGlobalSettings(input) {
    const settings = await getSettings();
    const mergedInput = { ...input };
    mergedInput.classMangling = isClassManglingEnabledForSettings(settings);
    mergedInput.classManglingMode = getClassManglingModeForSettings(settings);

    const hasBloglist = contentHasBlockType(mergedInput.content, 'bloglist');
    const hasAuthorBlock = contentHasBlockType(mergedInput.content, 'author');
    if ((hasBloglist || hasAuthorBlock) && !mergedInput.posts) {
      mergedInput.posts = await getPosts();
    }

    if (!input.siteTitle && settings.siteTitleEnabled !== false && settings.siteTitle) {
      mergedInput.siteTitle = settings.siteTitle;
    }

    if (!input.navigation) {
      if (settings.header?.enabled && settings.header.links?.length > 0) {
        mergedInput.navigation = { items: settings.header.links };
      } else {
        mergedInput.navigation = null;
      }
    }

    if (!input.footer) {
      if (settings.footer?.enabled && settings.footer.content) {
        mergedInput.footer = { content: settings.footer.content };
      } else {
        mergedInput.footer = null;
      }
    }

    if (!input.css) {
      if (settings.cssEnabled !== false) {
        const globalCss = await getPresetCSS(settings.cssMode || 'default', settings.globalCss);
        if (globalCss) {
          mergedInput.css = { rules: globalCss };
        } else {
          mergedInput.css = null;
        }
      } else {
        mergedInput.css = null;
      }
    } else if (settings.cssEnabled !== false) {
      const globalCss = await getPresetCSS(settings.cssMode || 'default', settings.globalCss);
      if (globalCss) {
        mergedInput.css = { rules: globalCss + '\n' + input.css.rules };
      }
    }

    if (settings.pageWidth && mergedInput.css) {
      mergedInput.css = { rules: mergedInput.css.rules + '\nbody{max-width:' + settings.pageWidth + '}' };
    }

    if (contentHasSections(mergedInput.content)) {
      const sectionCss = await loadSectionCSS();
      if (sectionCss) {
        if (mergedInput.css) {
          mergedInput.css = { rules: sectionCss + '\n' + mergedInput.css.rules };
        } else {
          mergedInput.css = { rules: sectionCss };
        }
      }
    }

    if (!input.meta) {
      if (settings.meta?.enabled && (settings.meta.description || settings.meta.author)) {
        const meta = {};
        if (settings.meta.description) meta.description = settings.meta.description;
        if (settings.meta.author) meta.author = settings.meta.author;
        mergedInput.meta = meta;
      } else {
        mergedInput.meta = null;
      }
    }

    if (settings.favicon) {
      mergedInput.favicon = settings.favicon;
    }

    if (settings.bloglist && mergedInput.content) {
      const isArchivePage = mergedInput._autoGenerated === 'archive';
      mergedInput.content = mergedInput.content.map(block =>
        applyBloglistSettingsToBlock(block, settings.bloglist, isArchivePage)
      );
    }

    return mergedInput;
  }

  return {
    isCompressionEnabled,
    loadCssPresets,
    getPresetCSS,
    applyGlobalSettings,
  };
}
