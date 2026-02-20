/**
 * App API service for all server communication.
 */

export function createAppApi() {
  let settingsCache = null;
  let settingsCacheTime = 0;
  const SETTINGS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  let csrfTokenCache = null;

  function getCsrfToken() {
    return csrfTokenCache;
  }

  async function apiFetch(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    }

    const res = await fetch(path, {
      ...options,
      headers,
      credentials: 'same-origin',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const errorMsg = data.error?.message || data.error || `HTTP ${res.status}`;
      throw new Error(errorMsg);
    }

    return res.json();
  }

  async function getConfig() {
    return apiFetch('/api/config');
  }

  async function getSetupStatus() {
    return apiFetch('/api/setup-status');
  }

  async function setup(password) {
    const result = await apiFetch('/api/setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (result.csrfToken) csrfTokenCache = result.csrfToken;
    return result;
  }

  async function login(password) {
    const result = await apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
    if (result.csrfToken) csrfTokenCache = result.csrfToken;
    return result;
  }

  async function logout() {
    const result = await apiFetch('/api/logout', { method: 'POST' });
    csrfTokenCache = null;
    settingsCache = null;
    settingsCacheTime = 0;
    return result;
  }

  async function isLoggedIn() {
    try {
      const data = await apiFetch('/api/auth-check');
      if (data.csrfToken) csrfTokenCache = data.csrfToken;
      return true;
    } catch {
      return false;
    }
  }

  async function getPosts() {
    const { posts } = await apiFetch('/api/posts');
    return posts;
  }

  async function getSettings(force = false) {
    const now = Date.now();
    if (settingsCache && !force && (now - settingsCacheTime) < SETTINGS_CACHE_TTL) {
      return settingsCache;
    }
    settingsCache = await apiFetch('/api/settings');
    settingsCacheTime = Date.now();
    return settingsCache;
  }

  async function saveSettings(settings) {
    const result = await apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    settingsCache = null;
    settingsCacheTime = 0;
    return result;
  }

  async function deletePost(slug) {
    return apiFetch(`/api/posts/${slug}`, {
      method: 'DELETE',
    });
  }

  async function deleteAllPosts() {
    return apiFetch('/api/posts', {
      method: 'DELETE',
    });
  }

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

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);

    return data;
  }

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

  async function fullReset() {
    return apiFetch('/api/reset', {
      method: 'POST',
      body: JSON.stringify({ confirm: 'RESET' }),
    });
  }

  async function getSourceData(slug) {
    const { sourceData } = await apiFetch(`/api/posts/${slug}/republish`, {
      method: 'POST',
    });
    return sourceData;
  }

  async function getSeeds() {
    const { seeds } = await apiFetch('/api/seeds');
    return seeds;
  }

  async function clonePage(sourceSlug, sourceType = 'page') {
    return apiFetch('/api/clone', {
      method: 'POST',
      body: JSON.stringify({ sourceSlug, sourceType }),
    });
  }

  async function getAuditLogs({ limit = 100, action = null } = {}) {
    let url = `/api/audit-log?limit=${limit}`;
    if (action) {
      url += `&action=${encodeURIComponent(action)}`;
    }
    return apiFetch(url);
  }

  return {
    apiFetch,
    getCsrfToken,
    getConfig,
    getSetupStatus,
    setup,
    login,
    logout,
    isLoggedIn,
    getPosts,
    getSettings,
    saveSettings,
    deletePost,
    deleteAllPosts,
    exportData,
    importData,
    fullReset,
    getSourceData,
    getSeeds,
    clonePage,
    getAuditLogs,
  };
}
