/**
 * fourteenkilobytes Admin App (PHP Version)
 *
 * Vanilla JS module for admin UI.
 * Uses client-side compiler for preview and publish.
 * Auth via HttpOnly cookie (set by server).
 */

// Import compiler (browser bundle)
import * as Compiler from './compiler.browser.js';

const App = (function() {

  /**
   * API helpers
   */
  async function apiFetch(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const res = await fetch(path, {
      ...options,
      headers,
      credentials: 'same-origin', // Send cookies
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errorMsg = data.error?.message || data.error || `HTTP ${res.status}`;
      throw new Error(errorMsg);
    }

    return res.json();
  }

  /**
   * Get config (public)
   */
  async function getConfig() {
    return apiFetch('/api/config');
  }

  /**
   * Get setup status (public)
   */
  async function getSetupStatus() {
    return apiFetch('/api/setup-status');
  }

  /**
   * Perform initial setup (also logs in automatically)
   */
  async function setup(password) {
    return apiFetch('/api/setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  /**
   * Login with password
   */
  async function login(password) {
    return apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  /**
   * Logout (clears cookie)
   */
  async function logout() {
    return apiFetch('/api/logout', {
      method: 'POST',
    });
  }

  /**
   * Check if logged in
   */
  async function isLoggedIn() {
    try {
      await apiFetch('/api/auth-check');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get all posts
   */
  async function getPosts() {
    const { posts } = await apiFetch('/api/posts');
    return posts;
  }

  /**
   * Get site settings
   */
  async function getSettings() {
    return apiFetch('/api/settings');
  }

  /**
   * Save site settings
   */
  async function saveSettings(settings) {
    return apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  /**
   * CSS Presets - loaded from files
   */
  const CSS_PRESET_NAMES = ['default', 'light', 'dark'];
  let cssPresetsCache = null;

  /**
   * Load all CSS presets from files
   */
  async function loadCssPresets() {
    if (cssPresetsCache) {
      return cssPresetsCache;
    }

    const presets = {};
    await Promise.all(CSS_PRESET_NAMES.map(async (name) => {
      try {
        const res = await fetch(`/admin/presets/${name}.css`);
        if (res.ok) {
          presets[name] = await res.text();
        }
      } catch (e) {
        console.warn(`Failed to load preset ${name}:`, e);
      }
    }));

    cssPresetsCache = presets;
    return presets;
  }

  /**
   * Get CSS for a given mode
   */
  async function getPresetCSS(cssMode, customCss = '') {
    if (cssMode === 'custom') {
      return customCss;
    }
    const presets = await loadCssPresets();
    return presets[cssMode] || presets.default || '';
  }

  /**
   * Apply global settings to compiler input
   */
  async function applyGlobalSettings(input) {
    const settings = await getSettings();
    const mergedInput = { ...input };

    // Load posts if there are bloglist blocks in the content
    const hasBloglist = mergedInput.content?.some(block => block.type === 'bloglist');
    if (hasBloglist && !mergedInput.posts) {
      mergedInput.posts = await getPosts();
    }

    // Site Title: use global if enabled and input has none
    if (!input.siteTitle && settings.siteTitleEnabled !== false && settings.siteTitle) {
      mergedInput.siteTitle = settings.siteTitle;
    }

    // Navigation: use global if enabled and input has none, otherwise explicitly null
    if (!input.navigation) {
      if (settings.header?.enabled && settings.header.links?.length > 0) {
        mergedInput.navigation = { items: settings.header.links };
      } else {
        mergedInput.navigation = null;
      }
    }

    // Footer: use global if enabled and input has none, otherwise explicitly null
    if (!input.footer) {
      if (settings.footer?.enabled && settings.footer.content) {
        mergedInput.footer = { content: settings.footer.content };
      } else {
        mergedInput.footer = null;
      }
    }

    // CSS: get preset or custom CSS, then merge with page-specific CSS (if enabled)
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
      // Merge page CSS with global CSS
      const globalCss = await getPresetCSS(settings.cssMode || 'default', settings.globalCss);
      if (globalCss) {
        mergedInput.css = { rules: globalCss + '\n' + input.css.rules };
      }
    }

    // Meta: use global if input has none, otherwise explicitly null
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

    // Favicon: always use global favicon if set
    if (settings.favicon) {
      mergedInput.favicon = settings.favicon;
    }

    // Bloglist: apply global settings to all bloglist blocks in content
    if (settings.bloglist && mergedInput.content) {
      const isArchivePage = mergedInput._autoGenerated === 'archive';
      mergedInput.content = mergedInput.content.map(block => {
        if (block.type === 'bloglist') {
          const updatedBlock = { ...block };
          // Apply limit from global settings if not set on block
          if (updatedBlock.limit === undefined) {
            updatedBlock.limit = settings.bloglist.limit || 10;
          }
          // Apply archive link from global settings if enabled and not set on block
          // But NOT on the archive page itself (that would be redundant)
          if (settings.bloglist.archiveEnabled && !updatedBlock.archiveLink && !isArchivePage) {
            updatedBlock.archiveLink = {
              href: '/' + (settings.bloglist.archiveSlug || 'archive'),
              text: settings.bloglist.archiveLinkText || 'View all posts →',
            };
          }
          return updatedBlock;
        }
        return block;
      });
    }

    return mergedInput;
  }

  /**
   * Preview post (compile without saving) - CLIENT-SIDE
   */
  async function preview(input) {
    // Apply global settings if requested (default: true)
    const useGlobal = input.useGlobalSettings !== false;
    const compilerInput = useGlobal ? await applyGlobalSettings(input) : input;

    const result = await Compiler.dryRun(compilerInput);

    // Handle size limit exceeded - still return measurements for the byte counter
    if (!result.wouldSucceed) {
      const errorCode = result.error?.code;

      const sizeErrors = [
        'SIZE_LIMIT_EXCEEDED',
        'PAGINATION_DISABLED',
        'PAGINATION_BLOCK_TOO_LARGE',
        'PAGINATION_NO_CONVERGENCE'
      ];
      const isExceeded = sizeErrors.includes(errorCode);

      if (isExceeded && result.partialMeasurements) {
        const { total, overhead, content } = result.partialMeasurements.measurements;
        const breakdown = result.partialMeasurements.breakdown;

        // Check if a single block is too large (from compiler)
        let blockTooLarge = null;
        if (result.error.oversizedBlock) {
          blockTooLarge = {
            blockIndex: result.error.oversizedBlock.index,
            blockSize: result.error.oversizedBlock.size,
            availableBudget: result.error.oversizedBlock.availableBudget,
          };
        }

        return {
          html: '',
          bytes: total,
          overheadBytes: overhead,
          contentBytes: content,
          breakdown,
          measurements: null,
          exceeded: true,
          blockTooLarge,
        };
      }

      // Handle exceeded without partialMeasurements (fallback)
      if (isExceeded) {
        return {
          html: '',
          bytes: result.error?.measured || 0,
          overheadBytes: 0,
          contentBytes: 0,
          breakdown: null,
          measurements: null,
          exceeded: true,
          blockTooLarge: null,
        };
      }

      throw new Error(result.error?.code || 'Compilation failed');
    }

    const page = result.pages[0];
    const { total, overhead, content } = result.measurements[0].measurements;
    const breakdown = result.measurements[0].breakdown;

    // Replace {{bytes}} placeholder
    const finalHtml = page.html.replace(/\{\{bytes\}\}/g, String(page.bytes));

    return {
      html: finalHtml,
      bytes: page.bytes,
      overheadBytes: overhead,
      contentBytes: content,
      breakdown,
      measurements: result.measurements,
    };
  }

  /**
   * Preview overhead from settings - CLIENT-SIDE
   */
  async function previewOverhead(settings) {
    // If CSS is disabled (cssEnabled is false), don't include any CSS
    const actualCss = settings.cssEnabled === false
      ? null
      : await getPresetCSS(settings.cssMode || 'default', settings.globalCss);

    // Build meta object if any meta fields are set
    let meta = null;
    if (settings.meta?.description || settings.meta?.author) {
      meta = {};
      if (settings.meta.description) meta.description = settings.meta.description;
      if (settings.meta.author) meta.author = settings.meta.author;
    }

    const testInput = {
      slug: 'overhead-test',
      title: 'Test',
      content: [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }],
      navigation: settings.header?.enabled && settings.header.links?.length > 0
        ? { items: settings.header.links }
        : null,
      footer: settings.footer?.enabled && settings.footer.content
        ? { content: settings.footer.content }
        : null,
      css: actualCss
        ? { rules: actualCss }
        : null,
      meta: meta,
      favicon: settings.favicon || null,
      icons: [],
      allowPagination: false,
      buildId: 'overhead-test',
    };

    const result = await Compiler.dryRun(testInput);
    if (!result.wouldSucceed) {
      throw new Error(result.error?.code || 'Compilation failed');
    }

    const breakdown = result.measurements?.[0]?.breakdown || {};

    return {
      overheadBytes: result.pages[0].bytes,
      measurements: result.measurements,
      breakdown,
    };
  }

  /**
   * Get global settings info with byte breakdown for each component
   */
  async function getGlobalSettingsInfo() {
    const settings = await getSettings();

    // Calculate base overhead (minimal page with no extras)
    const baseInput = {
      slug: 'base-test',
      title: 'T',
      content: [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }],
      navigation: null,
      footer: null,
      css: null,
      meta: null,
      icons: [],
      allowPagination: false,
      buildId: 'base-test',
    };
    const baseResult = await Compiler.dryRun(baseInput);
    const baseBytes = baseResult.wouldSucceed ? baseResult.measurements[0].breakdown.base : 0;

    // Calculate header bytes
    let headerBytes = 0;
    let headerActive = false;
    if (settings.header?.enabled && settings.header.links?.length > 0) {
      headerActive = true;
      const headerInput = {
        ...baseInput,
        navigation: { items: settings.header.links },
        buildId: 'header-test',
      };
      const headerResult = await Compiler.dryRun(headerInput);
      if (headerResult.wouldSucceed) {
        headerBytes = headerResult.measurements[0].breakdown.navigation;
      }
    }

    // Calculate footer bytes
    let footerBytes = 0;
    let footerActive = false;
    if (settings.footer?.enabled && settings.footer.content) {
      footerActive = true;
      const footerInput = {
        ...baseInput,
        footer: { content: settings.footer.content },
        buildId: 'footer-test',
      };
      const footerResult = await Compiler.dryRun(footerInput);
      if (footerResult.wouldSucceed) {
        footerBytes = footerResult.measurements[0].breakdown.footer;
      }
    }

    // Calculate CSS bytes
    let cssBytes = 0;
    let cssActive = false;
    if (settings.globalCss) {
      cssActive = true;
      const cssInput = {
        ...baseInput,
        css: { rules: settings.globalCss },
        buildId: 'css-test',
      };
      const cssResult = await Compiler.dryRun(cssInput);
      if (cssResult.wouldSucceed) {
        cssBytes = cssResult.measurements[0].breakdown.css;
      }
    }

    return {
      header: {
        active: headerActive,
        bytes: headerBytes,
        links: settings.header?.links || [],
      },
      footer: {
        active: footerActive,
        bytes: footerBytes,
        content: settings.footer?.content || '',
      },
      css: {
        active: cssActive,
        bytes: cssBytes,
      },
      baseBytes,
      totalOverhead: baseBytes + headerBytes + footerBytes + cssBytes,
    };
  }

  /**
   * Publish post - CLIENT-SIDE COMPILE, then send HTML to server
   */
  async function publish(input) {
    // Apply global settings
    const useGlobal = input.useGlobalSettings !== false;
    const compilerInput = useGlobal ? await applyGlobalSettings(input) : input;

    // Compile client-side
    const result = await Compiler.compile(compilerInput);
    if (!result.success) {
      throw new Error(result.error?.code || 'Compilation failed');
    }

    // Handle pagination: multiple pages
    if (result.pages.length > 1) {
      const pages = result.pages.map(page => ({
        slug: page.slug,
        html: page.html.replace(/\{\{bytes\}\}/g, String(page.bytes)),
        bytes: page.bytes,
        hash: page.hash,
      }));

      return apiFetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          pages,
          title: input.title,
          pageType: input.pageType || 'post',
          sourceData: {
            slug: input.slug,
            title: input.title,
            content: input.content,
            navigation: input.navigation,
            footer: input.footer,
            css: input.css,
            meta: input.meta,
            icons: input.icons,
            allowPagination: input.allowPagination,
            pageType: input.pageType,
          },
        }),
      });
    }

    // Single page (legacy format)
    const page = result.pages[0];
    const finalHtml = page.html.replace(/\{\{bytes\}\}/g, String(page.bytes));

    return apiFetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({
        slug: page.slug,
        title: input.title,
        html: finalHtml,
        bytes: page.bytes,
        hash: page.hash,
        pageType: input.pageType || 'post',
        sourceData: {
          slug: input.slug,
          title: input.title,
          content: input.content,
          navigation: input.navigation,
          footer: input.footer,
          css: input.css,
          meta: input.meta,
          icons: input.icons,
          allowPagination: input.allowPagination,
          pageType: input.pageType,
        },
      }),
    });
  }

  /**
   * Delete (tombstone) post
   */
  async function deletePost(slug) {
    return apiFetch(`/api/posts/${slug}`, {
      method: 'DELETE',
    });
  }

  /**
   * Delete all posts
   */
  async function deleteAllPosts() {
    return apiFetch('/api/posts', {
      method: 'DELETE',
    });
  }

  /**
   * Export data (triggers download)
   * @param {string} type - 'all', 'articles', or 'settings'
   */
  async function exportData(type = 'all') {
    const res = await fetch(`/api/export?type=${type}`, {
      credentials: 'same-origin',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const filename = `fourteenkilobytes-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    return data;
  }

  /**
   * Import data from backup
   * @param {object} data - Parsed backup JSON
   * @param {object} options - { settings: boolean, articles: boolean }
   */
  async function importData(data, options = { settings: true, articles: true }) {
    const params = new URLSearchParams({
      settings: options.settings ? 'true' : 'false',
      articles: options.articles ? 'true' : 'false',
    });

    return apiFetch(`/api/import?${params}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Full reset - deletes all data including password
   */
  async function fullReset() {
    return apiFetch('/api/reset', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'RESET' }),
    });
  }

  /**
   * Get source data for a post (for editing)
   */
  async function getSourceData(slug) {
    const { sourceData } = await apiFetch(`/api/posts/${slug}/republish`, {
      method: 'POST',
    });
    return sourceData;
  }

  /**
   * Republish post with current posts (regenerate bloglist)
   */
  async function republishPost(slug) {
    // Get sourceData from API
    const sourceData = await getSourceData(slug);

    // Load current posts
    const posts = await getPosts();

    // Rebuild input with fresh posts
    const input = {
      ...sourceData,
      posts,
      buildId: crypto.randomUUID(),
    };

    // Compile and publish
    return publish(input);
  }

  /**
   * Utility: escape HTML
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Utility: format date
   */
  function formatDate(iso) {
    const locale = window.i18n?.getFullLocale() || 'en-US';
    return new Date(iso).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Utility: slugify string
   */
  function slugify(str) {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-z0-9]+/g, '-')     // Replace non-alphanumeric with hyphens
      .replace(/^-+|-+$/g, '')         // Trim hyphens
      .substring(0, 50);               // Limit length
  }

  /**
   * Get available icon IDs from compiler
   */
  function getAvailableIcons() {
    return Compiler.getAvailableIconIds();
  }

  /**
   * Get icon SVG from compiler
   */
  function getIconSvg(id) {
    return Compiler.getIconSvg(id);
  }

  /**
   * Get available seed templates
   */
  async function getSeeds() {
    const { seeds } = await apiFetch('/api/seeds');
    return seeds;
  }

  /**
   * Clone a page or seed
   */
  async function clonePage(sourceSlug, sourceType = 'page') {
    return apiFetch('/api/clone', {
      method: 'POST',
      body: JSON.stringify({ sourceSlug, sourceType }),
    });
  }

  /**
   * Create a default homepage with a welcome message and bloglist.
   * Returns the publish result with the slug.
   */
  async function createDefaultHomepage() {
    const homepageSlug = 'startseite';
    const homepageTitle = 'Startseite';

    const homepageInput = {
      slug: homepageSlug,
      title: homepageTitle,
      pageType: 'page',
      content: [
        {
          type: 'heading',
          level: 1,
          children: [{ type: 'text', text: 'Willkommen' }]
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Dies ist die Startseite deines Blogs. Du kannst diese Seite im Editor bearbeiten.' }]
        },
        {
          type: 'bloglist',
          // Uses global settings for limit and archive link
        }
      ],
      icons: [],
      allowPagination: true,
      _autoGenerated: 'homepage',
    };

    return publish(homepageInput);
  }

  /**
   * Generate/update the automatic archive page based on bloglist settings.
   * Returns null if archive is disabled, or the publish result if successful.
   */
  async function generateArchivePage() {
    const settings = await getSettings();

    // Skip if archive is not enabled
    if (!settings.bloglist?.archiveEnabled) {
      return null;
    }

    const archiveSlug = settings.bloglist.archiveSlug || 'archiv';
    const archiveTitle = 'Archiv'; // Could be made configurable later

    // Create archive page source data
    const archiveInput = {
      slug: archiveSlug,
      title: archiveTitle,
      pageType: 'page',
      content: [
        {
          type: 'heading',
          level: 1,
          children: [{ type: 'text', text: archiveTitle }]
        },
        {
          type: 'bloglist',
          // null means "no limit" - show all posts (compiler will paginate if needed)
          limit: null,
          // No archive link on the archive page itself
        }
      ],
      icons: [],
      allowPagination: true,
      // Mark as system-generated
      _autoGenerated: 'archive',
    };

    // Publish the archive page
    return publish(archiveInput);
  }

  // Public API
  return {
    getConfig,
    getSetupStatus,
    setup,
    login,
    logout,
    isLoggedIn,
    getPosts,
    preview,
    publish,
    deletePost,
    deleteAllPosts,
    republishPost,
    getSourceData,
    getSettings,
    saveSettings,
    previewOverhead,
    getGlobalSettingsInfo,
    exportData,
    importData,
    fullReset,
    escapeHtml,
    formatDate,
    slugify,
    getAvailableIcons,
    getIconSvg,
    loadCssPresets,
    getPresetCSS,
    getSeeds,
    clonePage,
    generateArchivePage,
    createDefaultHomepage,
  };
})();

// Export for use in inline scripts
window.App = App;
