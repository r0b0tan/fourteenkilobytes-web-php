import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initDataTab } from '../../public/admin/lib/settings-page/data-tab.js';

function setupDom() {
  document.body.innerHTML = `
    <button id="export-btn"></button>
    <label><input type="radio" name="export-type" value="all" checked /></label>

    <div id="import-dropzone"></div>
    <input id="import-file" type="file" />

    <button id="delete-all-btn"></button>
    <button id="full-reset-btn"></button>

    <div id="modal-backdrop" class="hidden"></div>
    <div id="import-modal" class="hidden"></div>
    <div id="import-modal-options"></div>
    <div id="import-modal-actions"></div>
    <div id="import-progress" class="hidden"></div>
    <div id="import-progress-fill"></div>
    <div id="import-progress-text"></div>
  `;
}

function t(key, params = {}) {
  if (key === 'settings.importArticles') {
    return `Import articles (${params.count})`;
  }
  if (key === 'settings.importBuilding') {
    return `Building ${params.current}/${params.total}`;
  }
  if (key === 'settings.importSuccessBuilt') {
    return `Built ${params.count}`;
  }
  if (key === 'settings.importError') {
    return `Import error: ${params.error}`;
  }
  return key;
}

async function flush(times = 6) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('settings-page/data-tab', () => {
  let App;
  let Toast;
  let Modal;
  let loadSettings;
  let originalFileReader;

  beforeEach(() => {
    setupDom();
    vi.useFakeTimers();

    App = {
      exportData: vi.fn(async () => {}),
      importData: vi.fn(async () => ({ imported: ['settings'], articleSlugs: ['a', 'b'] })),
      republishPost: vi.fn(async () => {}),
      deleteAllPosts: vi.fn(async () => ({ deleted: 3 })),
      fullReset: vi.fn(async () => {})
    };

    Toast = {
      success: vi.fn(),
      error: vi.fn()
    };

    Modal = {
      confirm: vi.fn(async () => true)
    };

    loadSettings = vi.fn(async () => {});

    originalFileReader = global.FileReader;
    global.FileReader = class {
      readAsText(file) {
        this.onload({ target: { result: file.__content } });
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    global.FileReader = originalFileReader;
  });

  it('handles export success and export error', async () => {
    initDataTab({ doc: document, App, t, Toast, Modal, loadSettings });

    const exportBtn = document.getElementById('export-btn');
    exportBtn.click();
    await Promise.resolve();

    expect(App.exportData).toHaveBeenCalledWith('all');
    expect(Toast.success).toHaveBeenCalledWith('settings.exportSuccess');
    expect(exportBtn.disabled).toBe(false);

    App.exportData.mockRejectedValueOnce(new Error('disk'));
    exportBtn.click();
    await Promise.resolve();

    expect(Toast.error).toHaveBeenCalledWith('settings.exportError');
    expect(exportBtn.disabled).toBe(false);
  });

  it('rejects non-json import files', () => {
    initDataTab({ doc: document, App, t, Toast, Modal, loadSettings });

    const importInput = document.getElementById('import-file');
    Object.defineProperty(importInput, 'files', {
      value: [{ name: 'backup.txt', __content: 'x' }],
      configurable: true
    });

    importInput.dispatchEvent(new Event('change'));
    expect(Toast.error).toHaveBeenCalledWith('settings.importSelectFile');
  });

  it('shows import modal, validates selected options and can cancel', async () => {
    initDataTab({ doc: document, App, t, Toast, Modal, loadSettings });

    const importInput = document.getElementById('import-file');
    const payload = {
      version: 1,
      settings: { siteTitle: 'Demo' },
      articles: [{ slug: 'a' }]
    };
    Object.defineProperty(importInput, 'files', {
      value: [{ name: 'backup.json', __content: JSON.stringify(payload) }],
      configurable: true
    });
    importInput.dispatchEvent(new Event('change'));

    expect(document.getElementById('import-modal').classList.contains('hidden')).toBe(false);

    const settingsCb = document.getElementById('import-opt-settings');
    const articlesCb = document.getElementById('import-opt-articles');
    settingsCb.checked = false;
    articlesCb.checked = false;

    const importBtn = document.querySelector('#import-modal-actions .btn-primary');
    importBtn.click();
    expect(Toast.error).toHaveBeenCalledWith('settings.importSelectOption');

    const cancelBtn = document.querySelector('#import-modal-actions .btn-secondary');
    cancelBtn.click();
    expect(document.getElementById('import-modal').classList.contains('hidden')).toBe(true);
  });

  it('imports with build, rebuilds posts and reports partial failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    App.republishPost
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('boom'));

    initDataTab({ doc: document, App, t, Toast, Modal, loadSettings });

    const importInput = document.getElementById('import-file');
    const payload = {
      version: 1,
      settings: { theme: 'dark' },
      articles: [{ slug: 'a' }, { slug: 'b' }]
    };
    Object.defineProperty(importInput, 'files', {
      value: [{ name: 'backup.json', __content: JSON.stringify(payload) }],
      configurable: true
    });
    importInput.dispatchEvent(new Event('change'));

    const importBtn = document.querySelector('#import-modal-actions .btn-primary');
    importBtn.click();
    await flush();

    expect(App.importData).toHaveBeenCalledWith(payload, { settings: true, articles: true });
    expect(loadSettings).toHaveBeenCalled();
    expect(App.republishPost).toHaveBeenCalledTimes(2);
    expect(Toast.error).toHaveBeenCalledWith('Import error: 1 built, 1 failed');
    expect(document.getElementById('import-progress-fill').style.width).not.toBe('0%');

    errorSpy.mockRestore();
  });

  it('runs delete-all and full-reset confirmation chains', async () => {
    initDataTab({ doc: document, App, t, Toast, Modal, loadSettings });

    const deleteBtn = document.getElementById('delete-all-btn');
    deleteBtn.click();
    await flush();
    expect(App.deleteAllPosts).toHaveBeenCalled();
    expect(Toast.success).toHaveBeenCalledWith('settings.deleteAllSuccess');

    const resetBtn = document.getElementById('full-reset-btn');
    resetBtn.click();
    await flush();

    expect(App.fullReset).toHaveBeenCalled();
    expect(Toast.success).toHaveBeenCalledWith('settings.fullResetSuccess');

    vi.advanceTimersByTime(1500);
    expect(window.location.href.endsWith('/setup/')).toBe(true);
  });
});
