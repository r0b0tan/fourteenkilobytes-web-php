import { debounce, initAuthGuard, setupLogoutHandler } from './lib/common.js';
import { formatBytes } from './lib/byte-utils.js';
import { createToast, createModal } from './lib/settings-page/ui-feedback.js';
import { initDataTab } from './lib/settings-page/data-tab.js';
import { initLogsTab } from './lib/settings-page/logs-tab.js';
import { initEditorCore } from './lib/settings-page/editor-core.js';

(async function () {
  await initAuthGuard({ redirectIfNotAuth: 'index.html' });
  setupLogoutHandler();

  const Toast = createToast(document);
  const Modal = createModal({ doc: document, t });

  const { loadSettings } = initEditorCore({
    document,
    App,
    t,
    i18n,
    debounce,
    formatBytes,
    showNavigationOverlay: () => globalThis.showNavigationOverlay?.(),
    Modal,
    Toast,
  });

  initDataTab({
    document,
    App,
    t,
    Toast,
    Modal,
    loadSettings,
  });

  initLogsTab({
    document,
    App,
    t,
    Toast,
    Modal,
    debounce,
    tabBtns: document.querySelectorAll('.tab-btn'),
  });

  await loadSettings();
})();
