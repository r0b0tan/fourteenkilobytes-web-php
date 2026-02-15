import { describe, test, expect, vi } from 'vitest';
import { initLogsTab } from '../../public/admin/lib/settings-page/logs-tab.js';

async function flush(times = 6) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

function setupDom() {
  document.body.innerHTML = `
    <input id="logs-search" value="" />
    <select id="logs-filter"><option value="">All</option></select>
    <table><tbody id="logs-body"></tbody></table>
    <div id="logs-count"></div>
    <button id="logs-refresh-btn" type="button"></button>
    <button id="logs-export-btn" type="button"></button>
    <button id="logs-clear-btn" type="button"></button>
    <button data-tab="logs" type="button"></button>
  `;

  return {
    tabBtns: Array.from(document.querySelectorAll('[data-tab]')),
    logsBody: document.getElementById('logs-body'),
    logsCount: document.getElementById('logs-count'),
  };
}

describe('initLogsTab', () => {
  test('renders untrusted log values as text, not executable HTML', async () => {
    const { tabBtns, logsBody, logsCount } = setupDom();
    const App = {
      getAuditLogs: vi.fn().mockResolvedValue({
        entries: [{
          timestamp: '2026-02-15T10:00:00.000Z',
          action: '<img src=x onerror=window.__xssAction=1>',
          ip: '<img src=x onerror=window.__xssIp=1>',
          details: { message: '<script>window.__xssDetails=1</script>' },
        }],
      }),
    };

    initLogsTab({
      doc: document,
      App,
      t: (key, params) => key === 'settings.logsCountDisplay'
        ? `${params.shown}/${params.total}`
        : key,
      Toast: { success: vi.fn(), error: vi.fn() },
      Modal: { confirm: vi.fn() },
      debounce: (fn) => fn,
      tabBtns,
    });

    tabBtns[0].click();
    await Promise.resolve();
    await Promise.resolve();

    expect(logsBody.querySelector('script')).toBeNull();
    expect(logsBody.querySelectorAll('img').length).toBe(0);
    expect(logsBody.textContent).toContain('<img src=x onerror=window.__xssAction=1>');
    expect(logsBody.textContent).toContain('<img src=x onerror=window.__xssIp=1>');
    expect(logsBody.textContent).toContain('<script>window.__xssDetails=1</script>');
    expect(logsCount.textContent).toBe('1/1');
    expect(global.window.__xssAction).toBeUndefined();
    expect(global.window.__xssIp).toBeUndefined();
    expect(global.window.__xssDetails).toBeUndefined();
  });

  test('renders API error message safely as plain text', async () => {
    const { tabBtns, logsBody } = setupDom();
    const App = {
      getAuditLogs: vi.fn().mockRejectedValue(new Error('<img src=x onerror=window.__xssErr=1>')),
    };

    initLogsTab({
      doc: document,
      App,
      t: (key) => key,
      Toast: { success: vi.fn(), error: vi.fn() },
      Modal: { confirm: vi.fn() },
      debounce: (fn) => fn,
      tabBtns,
    });

    tabBtns[0].click();
    await Promise.resolve();
    await Promise.resolve();

    expect(logsBody.querySelector('img')).toBeNull();
    expect(logsBody.textContent).toContain('settings.logsError: <img src=x onerror=window.__xssErr=1>');
    expect(global.window.__xssErr).toBeUndefined();
  });

  test('loads via refresh/filter, applies search and action classes', async () => {
    const { tabBtns, logsBody, logsCount } = setupDom();
    const search = document.getElementById('logs-search');
    const filter = document.getElementById('logs-filter');
    filter.innerHTML = '<option value="">All</option><option value="post_delete">Delete</option>';

    const entries = [
      {
        timestamp: '2026-02-15T10:00:00.000Z',
        action: 'post_delete',
        ip: '127.0.0.1',
        details: { title: 'A', nested: { k: 'v' } },
      },
      {
        timestamp: '2026-02-15T10:01:00.000Z',
        action: 'setup_complete',
        ip: '127.0.0.2',
        details: { title: 'B' },
      },
    ];

    const App = {
      getAuditLogs: vi.fn().mockResolvedValue({ entries }),
    };

    initLogsTab({
      doc: document,
      App,
      t: (key, params) => key === 'settings.logsCountDisplay' ? `${params.shown}/${params.total}` : key,
      Toast: { success: vi.fn(), error: vi.fn() },
      Modal: { confirm: vi.fn() },
      debounce: (fn) => fn,
      tabBtns,
    });

    tabBtns[0].click();
    await Promise.resolve();
    await Promise.resolve();

    expect(App.getAuditLogs).toHaveBeenCalledWith({ limit: 200, action: undefined });
    expect(logsBody.querySelectorAll('tr').length).toBe(2);
    expect(logsBody.querySelector('tr').className).toContain('log-warning');
    expect(logsCount.textContent).toBe('2/2');

    search.value = 'setup';
    search.dispatchEvent(new Event('input'));
    expect(logsBody.querySelectorAll('tr').length).toBe(1);
    expect(logsBody.textContent).toContain('Setup');

    filter.value = 'post_delete';
    filter.dispatchEvent(new Event('change'));
    await Promise.resolve();
    await Promise.resolve();
    expect(App.getAuditLogs).toHaveBeenLastCalledWith({ limit: 200, action: 'post_delete' });
  });

  test('exports logs by setting window location', () => {
    const { tabBtns } = setupDom();
    const exportBtn = document.getElementById('logs-export-btn');
    const App = { getAuditLogs: vi.fn().mockResolvedValue({ entries: [] }) };

    initLogsTab({
      doc: document,
      App,
      t: (key) => key,
      Toast: { success: vi.fn(), error: vi.fn() },
      Modal: { confirm: vi.fn() },
      debounce: (fn) => fn,
      tabBtns,
    });

    exportBtn.click();
    expect(window.location.href).toContain('/api/audit-log/export');
  });

  test('clear logs handles cancel, success and error responses', async () => {
    const { tabBtns } = setupDom();
    const clearBtn = document.getElementById('logs-clear-btn');
    const App = { getAuditLogs: vi.fn().mockResolvedValue({ entries: [] }) };
    const Toast = { success: vi.fn(), error: vi.fn() };
    const Modal = { confirm: vi.fn() };

    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: () => 'fkb_csrf=csrf-token',
    });

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ deletedEntries: 5 }) })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Nope' }) })
      .mockResolvedValueOnce({ ok: false, json: async () => { throw new Error('bad json'); } });

    initLogsTab({
      doc: document,
      App,
      t: (key, params) => key === 'settings.logsClearSuccess' ? `cleared ${params.count}` : key,
      Toast,
      Modal,
      debounce: (fn) => fn,
      tabBtns,
    });

    Modal.confirm.mockResolvedValueOnce(false);
    clearBtn.click();
    await flush();
    expect(fetch).not.toHaveBeenCalled();

    Modal.confirm.mockResolvedValueOnce(true);
    clearBtn.click();
    await flush();
    expect(fetch).toHaveBeenCalledWith('/api/audit-log', expect.objectContaining({
      method: 'DELETE',
      credentials: 'same-origin',
      headers: { 'X-CSRF-Token': 'csrf-token' }
    }));
    expect(Toast.success).toHaveBeenCalledWith('cleared 5');
    expect(clearBtn.disabled).toBe(false);

    Modal.confirm.mockResolvedValueOnce(true);
    clearBtn.click();
    await flush();
    expect(Toast.error).toHaveBeenCalledWith('errors.generic');

    Modal.confirm.mockResolvedValueOnce(true);
    clearBtn.click();
    await flush();
    expect(Toast.error).toHaveBeenCalledWith('errors.generic');
    expect(clearBtn.disabled).toBe(false);
  });
});
