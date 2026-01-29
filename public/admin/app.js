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

    // Navigation: use global if enabled and input has none
    if (!input.navigation && settings.header?.enabled && settings.header.links?.length > 0) {
      mergedInput.navigation = { items: settings.header.links };
    }

    // Footer: use global if enabled and input has none
    if (!input.footer && settings.footer?.enabled && settings.footer.content) {
      mergedInput.footer = { content: settings.footer.content };
    }

    // CSS: get preset or custom CSS, then merge with page-specific CSS
    const globalCss = await getPresetCSS(settings.cssMode || 'default', settings.globalCss);
    if (globalCss) {
      if (input.css?.rules) {
        mergedInput.css = { rules: globalCss + '\n' + input.css.rules };
      } else {
        mergedInput.css = { rules: globalCss };
      }
    }

    // Meta: use global if input has none
    if (!input.meta && settings.meta) {
      const meta = {};
      if (settings.meta.description) meta.description = settings.meta.description;
      if (settings.meta.author) meta.author = settings.meta.author;
      if (Object.keys(meta).length > 0) {
        mergedInput.meta = meta;
      }
    }

    // Favicon: always use global favicon if set
    if (settings.favicon) {
      mergedInput.favicon = settings.favicon;
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
      if (result.error?.code === 'SIZE_LIMIT_EXCEEDED' && result.partialMeasurements) {
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
    const actualCss = await getPresetCSS(settings.cssMode || 'default', settings.globalCss);

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
   * Republish post with current posts (regenerate bloglist)
   */
  async function republishPost(slug) {
    // Get sourceData from API
    const { sourceData } = await apiFetch(`/api/posts/${slug}/republish`, {
      method: 'POST',
    });

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
    return new Date(iso).toLocaleDateString('de-DE', {
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
    republishPost,
    getSettings,
    saveSettings,
    previewOverhead,
    getGlobalSettingsInfo,
    escapeHtml,
    formatDate,
    slugify,
    getAvailableIcons,
    getIconSvg,
    loadCssPresets,
    getPresetCSS,
  };
})();

// Export for use in inline scripts
window.App = App;
