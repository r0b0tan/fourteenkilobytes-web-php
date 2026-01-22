/**
 * fourteenkilobytes Admin App (PHP Version)
 *
 * Vanilla JS module for admin UI.
 * Uses client-side compiler for preview and publish.
 * Auth via HttpOnly cookie (set by server).
 */

// Import compiler (loaded as ES module)
import * as Compiler from './compiler.js';

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

    // CSS: merge global CSS with page-specific CSS
    if (settings.globalCss) {
      if (input.css?.rules) {
        mergedInput.css = { rules: settings.globalCss + '\n' + input.css.rules };
      } else {
        mergedInput.css = { rules: settings.globalCss };
      }
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

    const result = Compiler.dryRun(compilerInput);
    if (!result.wouldSucceed) {
      throw new Error(result.error?.code || 'Compilation failed');
    }

    const page = result.pages[0];

    // Calculate overhead from global settings
    let overheadBytes = 0;
    if (useGlobal) {
      const bareResult = Compiler.dryRun(input);
      if (bareResult.wouldSucceed) {
        overheadBytes = page.bytes - bareResult.pages[0].bytes;
      }
    }

    // Replace {{bytes}} placeholder
    const finalHtml = page.html.replace(/\{\{bytes\}\}/g, String(page.bytes));

    return {
      html: finalHtml,
      bytes: page.bytes,
      overheadBytes,
      measurements: result.measurements,
    };
  }

  /**
   * Preview overhead from settings - CLIENT-SIDE
   */
  async function previewOverhead(settings) {
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
      css: settings.globalCss
        ? { rules: settings.globalCss }
        : null,
      icons: [],
      allowPagination: false,
      buildId: 'overhead-test',
    };

    const result = Compiler.dryRun(testInput);
    if (!result.wouldSucceed) {
      throw new Error(result.error?.code || 'Compilation failed');
    }

    return {
      overheadBytes: result.pages[0].bytes,
      measurements: result.measurements,
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
    const result = Compiler.compile(compilerInput);
    if (!result.success) {
      throw new Error(result.error?.code || 'Compilation failed');
    }

    const page = result.pages[0];

    // Replace {{bytes}} placeholder
    const finalHtml = page.html.replace(/\{\{bytes\}\}/g, String(page.bytes));

    // Send compiled HTML to server
    return apiFetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({
        slug: page.slug,
        title: input.title,
        html: finalHtml,
        bytes: page.bytes,
        hash: page.hash,
        pageType: input.pageType || 'post',
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
    getSettings,
    saveSettings,
    previewOverhead,
    escapeHtml,
    formatDate,
    slugify,
    getAvailableIcons,
    getIconSvg,
  };
})();

// Export for use in inline scripts
window.App = App;
