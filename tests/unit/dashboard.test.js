import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function flushPromises() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function loadDashboardModule() {
  vi.resetModules();
  return import('../../public/admin/dashboard.js');
}

function createDashboardRoot() {
  document.body.innerHTML = '<div id="dashboard-view"></div>';
}

function createDashboardInitDom() {
  document.body.innerHTML = `
    <div id="loading-overlay"></div>
    <div id="dashboard-view" class="hidden"></div>
    <button id="logout-btn"></button>
    <ul id="posts-list"></ul>
    <ul id="pages-list"></ul>
    <ul id="archive-list"></ul>
    <div id="posts-pagination"></div>
    <div id="pages-pagination"></div>
    <div id="archive-pagination"></div>
    <select id="page-size"><option value="10" selected>10</option></select>
    <input id="search-input" />
    <input id="date-from" />
    <input id="date-to" />
    <button id="date-range-trigger"></button>
    <div id="date-range-dropdown" class="hidden"></div>
    <span id="date-range-label"></span>
    <button id="clear-dates"></button>
    <button class="tab-btn" data-tab="posts"></button>
    <div class="tab-content" id="tab-posts"></div>
    <div id="error-alert" class="hidden"></div>
    <div id="modal-backdrop" class="hidden"></div>
    <div id="modal" class="hidden"></div>
    <div id="modal-message"></div>
    <div id="modal-actions"></div>
  `;
}

describe('dashboard.js update helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();

    globalThis.t = vi.fn((key) => key);
    globalThis.i18nReady = vi.fn(() => Promise.resolve());
    globalThis.App = {
      escapeHtml: vi.fn((value) => String(value)),
    };
  });

  afterEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  describe('shouldShowUpdate()', () => {
    it('returns true when no dismiss or snooze exists', async () => {
      const { shouldShowUpdate } = await loadDashboardModule();

      expect(shouldShowUpdate('2.0.0')).toBe(true);
    });

    it('returns false when the same version was dismissed', async () => {
      const { shouldShowUpdate } = await loadDashboardModule();
      localStorage.setItem('dismissedUpdateVersion', '2.0.0');

      expect(shouldShowUpdate('2.0.0')).toBe(false);
    });

    it('returns false when the same version is snoozed and not expired', async () => {
      const { shouldShowUpdate } = await loadDashboardModule();
      localStorage.setItem('snoozedUpdate', JSON.stringify({
        version: '2.0.0',
        until: Date.now() + 60_000,
      }));

      expect(shouldShowUpdate('2.0.0')).toBe(false);
    });

    it('returns true and clears invalid snooze json', async () => {
      const { shouldShowUpdate } = await loadDashboardModule();
      localStorage.setItem('snoozedUpdate', 'not-json');

      expect(shouldShowUpdate('2.0.0')).toBe(true);
      expect(localStorage.getItem('snoozedUpdate')).toBeNull();
    });
  });

  describe('showUpdateBanner()', () => {
    it('renders update banner when version should be shown', async () => {
      const { showUpdateBanner } = await loadDashboardModule();
      createDashboardRoot();

      showUpdateBanner({
        latest: '2.1.0',
        current: '2.0.0',
        releaseUrl: 'https://example.com/release',
      });

      const banner = document.querySelector('.update-banner');
      expect(banner).not.toBeNull();
      expect(document.querySelector('.update-banner a')?.getAttribute('href')).toBe('https://example.com/release');
    });

    it('stores snooze state and removes banner on snooze click', async () => {
      const { showUpdateBanner } = await loadDashboardModule();
      createDashboardRoot();

      showUpdateBanner({
        latest: '2.1.0',
        current: '2.0.0',
        releaseUrl: 'https://example.com/release',
      });

      document.querySelector('.snooze-update')?.dispatchEvent(new Event('click', { bubbles: true }));

      const snoozed = JSON.parse(localStorage.getItem('snoozedUpdate'));
      expect(snoozed.version).toBe('2.1.0');
      expect(snoozed.until).toBeGreaterThan(Date.now());
      expect(document.querySelector('.update-banner')).toBeNull();
    });

    it('stores dismissed version and removes snooze on dismiss click', async () => {
      const { showUpdateBanner } = await loadDashboardModule();
      createDashboardRoot();
      localStorage.setItem('snoozedUpdate', JSON.stringify({ version: '2.0.9', until: Date.now() + 10_000 }));

      showUpdateBanner({
        latest: '2.1.0',
        current: '2.0.0',
        releaseUrl: 'https://example.com/release',
      });

      document.querySelector('.dismiss-update')?.dispatchEvent(new Event('click', { bubbles: true }));

      expect(localStorage.getItem('dismissedUpdateVersion')).toBe('2.1.0');
      expect(localStorage.getItem('snoozedUpdate')).toBeNull();
      expect(document.querySelector('.update-banner')).toBeNull();
    });
  });

  describe('checkForUpdates()', () => {
    it('creates banner when api reports available update', async () => {
      const { checkForUpdates } = await loadDashboardModule();
      createDashboardRoot();
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          updateAvailable: true,
          latest: '2.1.0',
          current: '2.0.0',
          releaseUrl: 'https://example.com/release',
        }),
      }));

      await checkForUpdates();

      expect(fetch).toHaveBeenCalledWith('/api/check-updates');
      expect(document.querySelector('.update-banner')).not.toBeNull();
    });

    it('does not create banner when response is not ok', async () => {
      const { checkForUpdates } = await loadDashboardModule();
      createDashboardRoot();
      global.fetch = vi.fn(() => Promise.resolve({ ok: false }));

      await checkForUpdates();

      expect(document.querySelector('.update-banner')).toBeNull();
    });
  });

  describe('init() auth and setup guards', () => {
    it('redirects to setup when setup is incomplete', async () => {
      const { init } = await loadDashboardModule();
      createDashboardInitDom();

      globalThis.App = {
        ...globalThis.App,
        getSetupStatus: vi.fn(() => Promise.resolve({ setupComplete: false })),
        getConfig: vi.fn(() => Promise.resolve({ authEnabled: false })),
        getPosts: vi.fn(() => Promise.resolve([])),
      };

      await init();

      expect(window.location.href).toBe('/setup/');
      expect(App.getConfig).not.toHaveBeenCalled();
      expect(App.getPosts).not.toHaveBeenCalled();
    });

    it('redirects to login when auth is enabled and user is not logged in', async () => {
      const { init } = await loadDashboardModule();
      createDashboardInitDom();

      global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
      globalThis.App = {
        ...globalThis.App,
        getSetupStatus: vi.fn(() => Promise.resolve({ setupComplete: true })),
        getConfig: vi.fn(() => Promise.resolve({ authEnabled: true })),
        isLoggedIn: vi.fn(() => Promise.resolve(false)),
        getPosts: vi.fn(() => Promise.resolve([])),
      };

      await init();

      expect(window.location.href).toBe('/admin/login.html');
      expect(App.getPosts).not.toHaveBeenCalled();
    });

    it('shows network error when setup status request fails', async () => {
      const { init } = await loadDashboardModule();
      createDashboardInitDom();

      globalThis.App = {
        ...globalThis.App,
        getSetupStatus: vi.fn(() => Promise.reject(new Error('boom'))),
      };

      await init();

      expect(document.getElementById('loading-overlay')).toBeNull();
      expect(document.getElementById('dashboard-view')?.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('error-alert')?.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('error-alert')?.textContent).toBe('errors.network');
    });

    it('renders lists in happy path and handles page-size + search changes', async () => {
      const { init } = await loadDashboardModule();
      createDashboardInitDom();

      const posts = Array.from({ length: 12 }, (_, idx) => ({
        slug: `post-${idx + 1}`,
        title: `Post ${idx + 1}`,
        pageType: 'post',
        status: 'published',
        publishedAt: `2026-01-${String(idx + 1).padStart(2, '0')}T12:00:00Z`,
      }));

      global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
      globalThis.App = {
        ...globalThis.App,
        formatDate: vi.fn(() => 'Jan 1, 2026'),
        getSetupStatus: vi.fn(() => Promise.resolve({ setupComplete: true })),
        getConfig: vi.fn(() => Promise.resolve({ authEnabled: false })),
        getPosts: vi.fn(() => Promise.resolve([
          ...posts,
          {
            slug: 'page-a',
            title: 'Page A',
            pageType: 'page',
            status: 'published',
            publishedAt: '2026-01-13T12:00:00Z',
          },
          {
            slug: 'deleted-a',
            title: 'Deleted A',
            pageType: 'post',
            status: 'tombstone',
            publishedAt: '2026-01-14T12:00:00Z',
          },
        ])),
      };

      await init();

      const postsList = document.getElementById('posts-list');
      const postsPagination = document.getElementById('posts-pagination');
      expect(postsList?.innerHTML).toContain('post-12');
      expect(postsPagination?.classList.contains('hidden')).toBe(false);

      const pageSizeSelect = document.getElementById('page-size');
      pageSizeSelect.innerHTML = '<option value="10">10</option><option value="all">all</option>';
      pageSizeSelect.value = 'all';
      pageSizeSelect.dispatchEvent(new Event('change', { bubbles: true }));

      expect(postsPagination?.classList.contains('hidden')).toBe(true);

      const searchInput = document.getElementById('search-input');
      searchInput.value = 'post-3';
      searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 220));

      expect(postsList?.innerHTML).toContain('post-3');
      expect(postsList?.innerHTML).not.toContain('post-12');
    });

    it('handles recompile, duplicate and delete actions from rendered list', async () => {
      const { init } = await loadDashboardModule();
      createDashboardInitDom();

      global.fetch = vi.fn(() => Promise.resolve({ ok: false }));
      globalThis.App = {
        ...globalThis.App,
        formatDate: vi.fn(() => 'Jan 1, 2026'),
        getSetupStatus: vi.fn(() => Promise.resolve({ setupComplete: true })),
        getConfig: vi.fn(() => Promise.resolve({ authEnabled: false })),
        getPosts: vi.fn(() => Promise.resolve([
          {
            slug: 'my post',
            title: 'My Post',
            pageType: 'post',
            status: 'published',
            publishedAt: '2026-01-10T12:00:00Z',
          },
        ])),
        clonePage: vi.fn(() => Promise.resolve({ sourceData: { slug: 'copy' } })),
        deletePost: vi.fn(() => Promise.resolve({ success: true })),
      };

      await init();

      const recompileBtn = document.querySelector('[data-action="recompile"]');
      recompileBtn.dispatchEvent(new Event('click', { bubbles: true }));
      expect(window.location.href).toBe('editor.html?edit=my%20post');

      const duplicateBtn = document.querySelector('[data-action="duplicate"]');
      duplicateBtn.dispatchEvent(new Event('click', { bubbles: true }));
      await flushPromises();

      expect(App.clonePage).toHaveBeenCalledWith('my post', 'page');
      expect(sessionStorage.getItem('clonedSource')).toBe(JSON.stringify({ slug: 'copy' }));
      expect(window.location.href).toBe('editor.html?clone=true');

      const deleteBtn = document.querySelector('[data-action="delete"]');
      deleteBtn.dispatchEvent(new Event('click', { bubbles: true }));
      await flushPromises();

      const confirmBtn = Array.from(document.querySelectorAll('#modal-actions button'))
        .find(btn => btn.textContent === 'modal.yes');
      confirmBtn?.dispatchEvent(new Event('click', { bubbles: true }));
      await flushPromises();

      expect(App.deletePost).toHaveBeenCalledWith('my post');
    });
  });
});
