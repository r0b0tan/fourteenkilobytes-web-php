/**
 * App API service for all server communication.
 */

export function createAppApi() {
  let settingsCache = null;

  async function apiFetch(path, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      const csrfToken = document.cookie.match(/fkb_csrf=([^;]+)/)?.[1];
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
    return apiFetch('/api/setup', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async function login(password) {
    return apiFetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    });
  }

  async function logout() {
    const result = await apiFetch('/api/logout', { method: 'POST' });

    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('fkb_')) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict; Secure`;
      }
    }

    return result;
  }

  async function isLoggedIn() {
    try {
      await apiFetch('/api/auth-check');
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
    if (settingsCache && !force) {
      return settingsCache;
    }
    settingsCache = await apiFetch('/api/settings');
    return settingsCache;
  }

  async function saveSettings(settings) {
    const result = await apiFetch('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
    settingsCache = null;
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
