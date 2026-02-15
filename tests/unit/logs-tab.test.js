import { describe, test, expect, vi } from 'vitest';
import { initLogsTab } from '../../public/admin/lib/settings-page/logs-tab.js';

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
});
