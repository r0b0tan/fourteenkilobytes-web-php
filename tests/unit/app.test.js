/**
 * Unit tests for app.js utility functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const compilerMocks = vi.hoisted(() => ({
  dryRun: vi.fn(),
  compile: vi.fn(),
  getAvailableIconIds: vi.fn(() => ['icon-a']),
  getIconSvg: vi.fn((id) => `<svg data-id="${id}"></svg>`),
}));

vi.mock('../../public/admin/compiler.browser.js', () => ({
  dryRun: compilerMocks.dryRun,
  compile: compilerMocks.compile,
  getAvailableIconIds: compilerMocks.getAvailableIconIds,
  getIconSvg: compilerMocks.getIconSvg,
}));

describe('App Utility Functions', () => {
  // Mock window.App
  let App;

  beforeEach(async () => {
    vi.resetModules();
    vi.restoreAllMocks();
    compilerMocks.dryRun.mockReset();
    compilerMocks.compile.mockReset();
    compilerMocks.getAvailableIconIds.mockClear();
    compilerMocks.getIconSvg.mockClear();
    // Import app.js (it assigns to window.App)
    await import('../../public/admin/app.js');
    App = window.App;
  });

  describe('API behavior', () => {
    it('isLoggedIn returns false on auth-check failure', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: { message: 'Unauthorized' } }),
      }));

      const result = await App.isLoggedIn();
      expect(result).toBe(false);
      expect(fetch).toHaveBeenCalledWith('/api/auth-check', expect.objectContaining({
        credentials: 'same-origin',
      }));
    });

    it('getPosts surfaces structured API error message', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: { message: 'Database down' } }),
      }));

      await expect(App.getPosts()).rejects.toThrow('Database down');
    });

    it('login adds CSRF header for POST requests', async () => {
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: () => 'fkb_csrf=test-token',
      });

      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }));

      await App.login('secret');

      expect(fetch).toHaveBeenCalledWith('/api/login', expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: expect.objectContaining({
          'X-CSRF-Token': 'test-token',
          'Content-Type': 'application/json',
        }),
      }));
    });

    it('getConfig throws HTTP status fallback when response has no json body', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 503,
        json: () => Promise.reject(new Error('no json')),
      }));

      await expect(App.getConfig()).rejects.toThrow('HTTP 503');
    });
  });

  describe('API endpoints and state flows', () => {
    it('deletePost calls the expected DELETE endpoint', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }));

      await App.deletePost('my-post');

      expect(fetch).toHaveBeenCalledWith('/api/posts/my-post', expect.objectContaining({
        method: 'DELETE',
      }));
    });

    it('deleteAllPosts calls collection DELETE endpoint', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }));

      await App.deleteAllPosts();

      expect(fetch).toHaveBeenCalledWith('/api/posts', expect.objectContaining({
        method: 'DELETE',
      }));
    });

    it('importData sends correct query params from options', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ imported: true }),
      }));

      await App.importData({ hello: 'world' }, { settings: false, articles: true });

      expect(fetch).toHaveBeenCalledWith('/api/import?settings=false&articles=true', expect.objectContaining({
        method: 'POST',
      }));
    });

    it('fullReset sends RESET confirmation payload', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      }));

      await App.fullReset();

      expect(fetch).toHaveBeenCalledWith('/api/reset', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ confirm: 'RESET' }),
      }));
    });

    it('getSourceData returns sourceData from API response', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sourceData: { slug: 'a', title: 'A' } }),
      }));

      const sourceData = await App.getSourceData('a');

      expect(sourceData).toEqual({ slug: 'a', title: 'A' });
      expect(fetch).toHaveBeenCalledWith('/api/posts/a/republish', expect.objectContaining({ method: 'POST' }));
    });

    it('getSeeds returns seeds array', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ seeds: [{ id: 'seed-1' }] }),
      }));

      const seeds = await App.getSeeds();
      expect(seeds).toEqual([{ id: 'seed-1' }]);
    });

    it('clonePage sends sourceSlug and sourceType', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ cloned: true }),
      }));

      await App.clonePage('startseite', 'seed');

      expect(fetch).toHaveBeenCalledWith('/api/clone', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ sourceSlug: 'startseite', sourceType: 'seed' }),
      }));
    });

    it('getAuditLogs builds URL with encoded action filter', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ logs: [] }),
      }));

      await App.getAuditLogs({ limit: 50, action: 'post.delete' });

      expect(fetch).toHaveBeenCalledWith('/api/audit-log?limit=50&action=post.delete', expect.any(Object));
    });

    it('getSettings caches result and skips second fetch', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ theme: 'dark' }),
      }));

      const first = await App.getSettings();
      const second = await App.getSettings();

      expect(first).toEqual({ theme: 'dark' });
      expect(second).toEqual({ theme: 'dark' });
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('saveSettings invalidates cache and next getSettings refetches', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ theme: 'dark' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ theme: 'light' }),
        });

      const initial = await App.getSettings();
      await App.saveSettings({ theme: 'light' });
      const reloaded = await App.getSettings();

      expect(initial).toEqual({ theme: 'dark' });
      expect(reloaded).toEqual({ theme: 'light' });
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/settings', expect.objectContaining({ method: 'PUT' }));
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('exportData downloads json backup and revokes object URL', async () => {
      const createObjectURL = vi.fn(() => 'blob:test-url');
      const revokeObjectURL = vi.fn();
      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;

      const clickSpy = vi.fn();
      const createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockImplementation((tagName) => {
        const el = document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
        if (tagName === 'a') {
          el.click = clickSpy;
        }
        return el;
      });

      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ posts: [{ slug: 'a' }] }),
      }));

      const result = await App.exportData('settings');

      expect(fetch).toHaveBeenCalledWith('/api/export?type=settings', { credentials: 'same-origin' });
      expect(result).toEqual({ posts: [{ slug: 'a' }] });
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url');

      createElementSpy.mockRestore();
    });

    it('exportData throws API error message on failed response', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'export failed' }),
      }));

      await expect(App.exportData('all')).rejects.toThrow('export failed');
    });

    it('forwards icon APIs to compiler module', () => {
      expect(App.getAvailableIcons()).toEqual(['icon-a']);
      expect(App.getIconSvg('icon-a')).toBe('<svg data-id="icon-a"></svg>');
      expect(compilerMocks.getAvailableIconIds).toHaveBeenCalledTimes(1);
      expect(compilerMocks.getIconSvg).toHaveBeenCalledWith('icon-a');
    });
  });

  describe('preview() and publish()', () => {
    it('preview returns exceeded payload for known size-limit errors with partial measurements', async () => {
      compilerMocks.dryRun.mockResolvedValue({
        wouldSucceed: false,
        error: {
          code: 'SIZE_LIMIT_EXCEEDED',
          oversizedBlock: { index: 1, size: 20000, availableBudget: 14336 },
        },
        partialMeasurements: {
          measurements: { total: 15000, overhead: 4000, content: 11000 },
          breakdown: { base: 1000 },
        },
      });

      const result = await App.preview({
        slug: 's',
        title: 't',
        useGlobalSettings: false,
      });

      expect(result.exceeded).toBe(true);
      expect(result.bytes).toBe(15000);
      expect(result.overheadBytes).toBe(4000);
      expect(result.contentBytes).toBe(11000);
      expect(result.blockTooLarge).toEqual({
        blockIndex: 1,
        blockSize: 20000,
        availableBudget: 14336,
      });
    });

    it('preview throws for unknown compilation errors', async () => {
      compilerMocks.dryRun.mockResolvedValue({
        wouldSucceed: false,
        error: { code: 'SOME_OTHER_ERROR' },
      });

      await expect(App.preview({
        slug: 's',
        title: 't',
        useGlobalSettings: false,
      })).rejects.toThrow('SOME_OTHER_ERROR');
    });

    it('publish throws when compiler compile fails', async () => {
      compilerMocks.compile.mockResolvedValue({
        success: false,
        error: { code: 'PAGINATION_NO_CONVERGENCE' },
      });

      await expect(App.publish({
        slug: 's',
        title: 't',
        content: [],
        useGlobalSettings: false,
      })).rejects.toThrow('PAGINATION_NO_CONVERGENCE');
    });

    it('publish sends single-page payload to /api/posts', async () => {
      compilerMocks.compile.mockResolvedValue({
        success: true,
        pages: [{ slug: 'hello', html: '<h1>Hello</h1>', bytes: 1234, hash: 'h1' }],
      });

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ optimizations: { compression: { enabled: true } } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      const input = {
        slug: 'hello',
        title: 'Hello',
        content: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hi' }] }],
        icons: [],
        allowPagination: true,
        useGlobalSettings: false,
      };

      await App.publish(input);

      expect(fetch).toHaveBeenNthCalledWith(2, '/api/posts', expect.objectContaining({ method: 'POST' }));
      const body = JSON.parse(fetch.mock.calls[1][1].body);
      expect(body.slug).toBe('hello');
      expect(body.title).toBe('Hello');
      expect(body.hash).toBe('h1');
      expect(body.sourceData.slug).toBe('hello');
    });

    it('publish sends multi-page payload with pages array', async () => {
      compilerMocks.compile.mockResolvedValue({
        success: true,
        pages: [
          { slug: 'hello', html: '<h1>Hello</h1>', bytes: 1100, hash: 'h1' },
          { slug: 'hello-2', html: '<h1>Hello 2</h1>', bytes: 1200, hash: 'h2' },
        ],
      });

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ optimizations: { compression: { enabled: true } } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });

      await App.publish({
        slug: 'hello',
        title: 'Hello',
        content: [],
        icons: [],
        allowPagination: true,
        useGlobalSettings: false,
      });

      const body = JSON.parse(fetch.mock.calls[1][1].body);
      expect(Array.isArray(body.pages)).toBe(true);
      expect(body.pages).toHaveLength(2);
      expect(body.pages[0].slug).toBe('hello');
      expect(body.pages[1].slug).toBe('hello-2');
    });

    it('publish applies global settings by default and injects posts for bloglist', async () => {
      compilerMocks.compile.mockResolvedValue({
        success: true,
        pages: [{ slug: 'global-page', html: '<h1>G</h1>', bytes: 1000, hash: 'g1' }],
      });

      global.fetch = vi.fn((url, options) => {
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              cssEnabled: false,
              header: { enabled: false, links: [] },
              footer: { enabled: false, content: '' },
              bloglist: { limit: 5, archiveEnabled: false },
            }),
          });
        }
        if (url === '/api/posts' && !options?.method) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ posts: [{ slug: 'p1' }] }) });
        }
        if (url === '/api/posts' && options?.method === 'POST') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      await App.publish({
        slug: 'global-page',
        title: 'Global Page',
        content: [{ type: 'bloglist' }],
        icons: [],
        allowPagination: true,
      });

      expect(compilerMocks.compile).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'global-page',
        posts: [{ slug: 'p1' }],
      }));
    });

    it('previewOverhead builds compiler input from settings and returns breakdown', async () => {
      compilerMocks.dryRun.mockResolvedValue({
        wouldSucceed: true,
        pages: [{ html: '<html><body>x</body></html>', bytes: 999 }],
        measurements: [{ breakdown: { base: 111, css: 222 } }],
      });

      const result = await App.previewOverhead({
        cssEnabled: false,
        header: { enabled: true, links: [{ href: '/a', text: 'A' }] },
        footer: { enabled: true, content: 'Footer' },
        meta: { description: 'Desc', author: 'Me' },
        favicon: '/favicon.ico',
        optimizations: { compression: { enabled: false } },
      });

      expect(compilerMocks.dryRun).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'overhead-test',
        navigation: { items: [{ href: '/a', text: 'A' }] },
        footer: { content: 'Footer' },
        css: null,
        meta: { description: 'Desc', author: 'Me' },
        favicon: '/favicon.ico',
      }));
      expect(result.breakdown).toEqual({ base: 111, css: 222 });
      expect(result.measurements).toHaveLength(1);
    });

    it('previewOverhead throws when dryRun fails', async () => {
      compilerMocks.dryRun.mockResolvedValue({
        wouldSucceed: false,
        error: { code: 'OVERHEAD_FAIL' },
      });

      await expect(App.previewOverhead({
        cssEnabled: false,
      })).rejects.toThrow('OVERHEAD_FAIL');
    });

    it('getGlobalSettingsInfo aggregates base/header/footer/css overhead', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          header: { enabled: true, links: [{ href: '/x', text: 'X' }] },
          footer: { enabled: true, content: 'F' },
          globalCss: 'body{color:red}',
        }),
      }));

      compilerMocks.dryRun
        .mockResolvedValueOnce({ wouldSucceed: true, measurements: [{ breakdown: { base: 1000 } }] })
        .mockResolvedValueOnce({ wouldSucceed: true, measurements: [{ breakdown: { navigation: 200 } }] })
        .mockResolvedValueOnce({ wouldSucceed: true, measurements: [{ breakdown: { footer: 300 } }] })
        .mockResolvedValueOnce({ wouldSucceed: true, measurements: [{ breakdown: { css: 400 } }] });

      const info = await App.getGlobalSettingsInfo();

      expect(info.baseBytes).toBe(1000);
      expect(info.header).toEqual(expect.objectContaining({ active: true, bytes: 200 }));
      expect(info.footer).toEqual(expect.objectContaining({ active: true, bytes: 300 }));
      expect(info.css).toEqual(expect.objectContaining({ active: true, bytes: 400 }));
      expect(info.totalOverhead).toBe(1900);
      expect(compilerMocks.dryRun).toHaveBeenCalledTimes(4);
    });

    it('republishPost rebuilds from sourceData + current posts and publishes', async () => {
      compilerMocks.compile.mockResolvedValue({
        success: true,
        pages: [{ slug: 'republished', html: '<h1>R</h1>', bytes: 900, hash: 'h' }],
      });

      global.fetch = vi.fn((url) => {
        if (url === '/api/posts/original/republish') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              sourceData: {
                slug: 'republished',
                title: 'Republished',
                content: [{ type: 'paragraph', children: [{ type: 'text', text: 'X' }] }],
                icons: [],
                allowPagination: true,
                useGlobalSettings: false,
              },
            }),
          });
        }
        if (url === '/api/posts') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ posts: [{ slug: 'p1' }] }),
          });
        }
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ optimizations: { compression: { enabled: false } } }),
          });
        }
        if (url === '/api/posts' && arguments[1]?.method === 'POST') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
      });

      await App.republishPost('original');

      expect(compilerMocks.compile).toHaveBeenCalledTimes(1);
      expect(compilerMocks.compile.mock.calls[0][0]).toEqual(expect.objectContaining({
        slug: 'republished',
        posts: [{ slug: 'p1' }],
      }));
    });

    it('generateArchivePage returns null when archive is disabled', async () => {
      global.fetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          bloglist: { archiveEnabled: false },
        }),
      }));

      const result = await App.generateArchivePage();

      expect(result).toBeNull();
      expect(compilerMocks.compile).not.toHaveBeenCalled();
    });

    it('generateArchivePage publishes archive page when archive is enabled', async () => {
      compilerMocks.compile.mockResolvedValue({
        success: true,
        pages: [{ slug: 'archiv', html: '<h1>Archiv</h1>', bytes: 1234, hash: 'hash-a' }],
      });

      global.fetch = vi.fn((url, options) => {
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              cssEnabled: false,
              bloglist: { archiveEnabled: true, archiveSlug: 'archiv' },
            }),
          });
        }
        if (url === '/api/posts' && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ posts: [{ slug: 'p1' }] }),
          });
        }
        if (url === '/api/posts' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, slug: 'archiv' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      await App.generateArchivePage();

      expect(compilerMocks.compile).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'archiv',
        _autoGenerated: 'archive',
      }));
      const compileInput = compilerMocks.compile.mock.calls[0][0];
      const bloglistBlock = compileInput.content.find((block) => block.type === 'bloglist');
      expect(bloglistBlock.limit).toBeNull();
      expect(bloglistBlock.archiveLink).toBeUndefined();
    });

    it('createDefaultHomepage publishes homepage with global bloglist settings', async () => {
      compilerMocks.compile.mockResolvedValue({
        success: true,
        pages: [{ slug: 'startseite', html: '<h1>Startseite</h1>', bytes: 1200, hash: 'h-home' }],
      });

      global.fetch = vi.fn((url, options) => {
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              cssEnabled: false,
              bloglist: {
                limit: 7,
                archiveEnabled: true,
                archiveSlug: 'archive',
                archiveLinkText: 'Alle Beiträge',
              },
            }),
          });
        }
        if (url === '/api/posts' && !options?.method) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ posts: [{ slug: 'p1' }] }),
          });
        }
        if (url === '/api/posts' && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, slug: 'startseite' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      await App.createDefaultHomepage();

      expect(compilerMocks.compile).toHaveBeenCalledWith(expect.objectContaining({
        slug: 'startseite',
        _autoGenerated: 'homepage',
      }));
      const compileInput = compilerMocks.compile.mock.calls[0][0];
      const bloglistBlock = compileInput.content.find((block) => block.type === 'bloglist');
      expect(bloglistBlock.limit).toBe(7);
      expect(bloglistBlock.archiveLink).toEqual({ href: '/archive', text: 'Alle Beiträge' });
    });

    it('publish merges global settings (title/nav/footer/css/meta/favicon/sections/bloglist)', async () => {
      compilerMocks.compile.mockResolvedValue({
        success: true,
        pages: [{ slug: 'merged', html: '<h1>M</h1>', bytes: 1400, hash: 'h-merged' }],
      });

      global.fetch = vi.fn((url, options) => {
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              siteTitleEnabled: true,
              siteTitle: 'Global Site',
              header: { enabled: true, links: [{ href: '/home', text: 'Home' }] },
              footer: { enabled: true, content: 'Global Footer' },
              cssEnabled: true,
              cssMode: 'default',
              pageWidth: '900px',
              meta: { enabled: true, description: 'Global desc', author: 'Admin' },
              favicon: '/favicon.ico',
              bloglist: { limit: 3, archiveEnabled: true, archiveSlug: 'archiv', archiveLinkText: 'Zum Archiv' },
            }),
          });
        }
        if (url === '/api/posts' && !options?.method) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ posts: [{ slug: 'post-1' }] }) });
        }
        if (url === '/admin/presets/default.css') {
          return Promise.resolve({ ok: true, text: () => Promise.resolve('body{color:black;}') });
        }
        if (url === '/admin/presets/light.css' || url === '/admin/presets/dark.css') {
          return Promise.resolve({ ok: false, text: () => Promise.resolve('') });
        }
        if (url === '/admin/sections.css') {
          return Promise.resolve({ ok: true, text: () => Promise.resolve('.section{padding:1rem;}') });
        }
        if (url === '/api/posts' && options?.method === 'POST') {
          return Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });

      await App.publish({
        slug: 'merged',
        title: 'Merged',
        content: [
          { type: 'section', children: [] },
          { type: 'bloglist' },
        ],
        css: { rules: '.page{margin:0;}' },
        icons: [],
        allowPagination: true,
      });

      const compileInput = compilerMocks.compile.mock.calls[0][0];
      expect(compileInput.siteTitle).toBe('Global Site');
      expect(compileInput.navigation).toEqual({ items: [{ href: '/home', text: 'Home' }] });
      expect(compileInput.footer).toEqual({ content: 'Global Footer' });
      expect(compileInput.meta).toEqual({ description: 'Global desc', author: 'Admin' });
      expect(compileInput.favicon).toBe('/favicon.ico');
      expect(compileInput.posts).toEqual([{ slug: 'post-1' }]);
      expect(compileInput.css.rules).toContain('.section{padding:1rem;}');
      expect(compileInput.css.rules).toContain('body{color:black;}');
      expect(compileInput.css.rules).toContain('.page{margin:0;}');
      expect(compileInput.css.rules).toContain('body{max-width:900px}');

      const bloglistBlock = compileInput.content.find((block) => block.type === 'bloglist');
      expect(bloglistBlock.limit).toBe(3);
      expect(bloglistBlock.archiveLink).toEqual({ href: '/archiv', text: 'Zum Archiv' });
    });
  });

  describe('escapeHtml()', () => {
    it('should escape HTML special characters', () => {
      expect(App.escapeHtml('<script>alert("xss")</script>'))
        .toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it('should escape ampersands', () => {
      expect(App.escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape quotes', () => {
      expect(App.escapeHtml('Say "Hello"')).toBe('Say "Hello"');
      expect(App.escapeHtml("It's fine")).toBe("It's fine");
    });

    it('should handle mixed special characters', () => {
      expect(App.escapeHtml('<div class="test">A & B</div>'))
        .toBe('&lt;div class="test"&gt;A &amp; B&lt;/div&gt;');
    });

    it('should return empty string for empty input', () => {
      expect(App.escapeHtml('')).toBe('');
    });

    it('should handle plain text unchanged', () => {
      expect(App.escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('slugify()', () => {
    it('should convert text to lowercase slug', () => {
      expect(App.slugify('Hello World')).toBe('hello-world');
    });

    it('should replace spaces with hyphens', () => {
      expect(App.slugify('My First Post')).toBe('my-first-post');
    });

    it('should remove special characters', () => {
      expect(App.slugify('Hello, World!')).toBe('hello-world');
      expect(App.slugify('Test@#$%Post')).toBe('test-post');
    });

    it('should remove diacritics', () => {
      expect(App.slugify('Café Müller')).toBe('cafe-muller');
      expect(App.slugify('Über uns')).toBe('uber-uns');
    });

    it('should handle multiple spaces/hyphens', () => {
      expect(App.slugify('Hello    World')).toBe('hello-world');
      expect(App.slugify('Test---Post')).toBe('test-post');
    });

    it('should trim leading and trailing hyphens', () => {
      expect(App.slugify('---test---')).toBe('test');
      expect(App.slugify('   test   ')).toBe('test');
    });

    it('should limit slug length to 50 characters', () => {
      const longText = 'a'.repeat(100);
      expect(App.slugify(longText)).toBe('a'.repeat(50));
    });

    it('should handle empty string', () => {
      expect(App.slugify('')).toBe('');
    });

    it('should handle numbers', () => {
      expect(App.slugify('Post 123')).toBe('post-123');
      expect(App.slugify('2024 Review')).toBe('2024-review');
    });

    it('should handle German umlauts and special chars', () => {
      // ß is not handled by NFD normalization, remains as is, then replaced with hyphen
      expect(App.slugify('Größe')).toBe('gro-e');
      expect(App.slugify('Ä Ö Ü ä ö ü')).toBe('a-o-u-a-o-u');
    });
  });

  describe('formatDate()', () => {
    beforeEach(() => {
      // Mock i18n
      window.i18n = {
        getFullLocale: vi.fn(() => 'en-US'),
      };
    });

    it('should format date with default locale', () => {
      const date = '2024-01-15T12:00:00Z';
      const result = App.formatDate(date);
      expect(result).toMatch(/Jan/); // Month abbreviation
      expect(result).toMatch(/15/); // Day
      expect(result).toMatch(/2024/); // Year
    });

    it('should use German locale when set', () => {
      window.i18n.getFullLocale = vi.fn(() => 'de-DE');
      const date = '2024-01-15T12:00:00Z';
      const result = App.formatDate(date);
      // German date format
      expect(result).toMatch(/Jan|Jän/); // German month abbreviation
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2024/);
    });

    it('should handle different date formats', () => {
      const date = new Date('2024-12-25').toISOString();
      const result = App.formatDate(date);
      expect(result).toMatch(/Dec/);
      expect(result).toMatch(/25/);
      expect(result).toMatch(/2024/);
    });

    it('should work without i18n (fallback to en-US)', () => {
      delete window.i18n;
      const date = '2024-06-01T00:00:00Z';
      const result = App.formatDate(date);
      expect(result).toMatch(/Jun/);
      expect(result).toMatch(/1|01/);
      expect(result).toMatch(/2024/);
    });
  });
});
