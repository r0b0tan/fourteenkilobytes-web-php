export function initLogsTab({ doc = document, App, t, Toast, Modal, debounce, tabBtns }) {
  const logsSearch = doc.getElementById('logs-search');
  const logsFilter = doc.getElementById('logs-filter');
  const logsBody = doc.getElementById('logs-body');
  const logsCount = doc.getElementById('logs-count');
  const logsRefreshBtn = doc.getElementById('logs-refresh-btn');
  const logsExportBtn = doc.getElementById('logs-export-btn');
  const logsClearBtn = doc.getElementById('logs-clear-btn');

  let allLogs = [];
  let logsLoaded = false;

  function formatLogTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('de-DE', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  const logIcons = {
    check: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    x: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    plus: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    minus: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    alert: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    settings: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    logout: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    trash: '<svg class="log-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
  };

  function getActionLabel(action) {
    const labels = {
      'login_success': `${logIcons.check} Login`,
      'login_failed': `${logIcons.x} Login fehlgeschlagen`,
      'logout': `${logIcons.logout} Logout`,
      'post_create': `${logIcons.plus} Post erstellt`,
      'post_delete': `${logIcons.minus} Post gelöscht`,
      'posts_delete_all': `${logIcons.alert} Alle Posts gelöscht`,
      'settings_update': `${logIcons.settings} Einstellungen`,
      'csrf_failure': `${logIcons.alert} CSRF-Fehler`,
      'full_reset': `${logIcons.alert} Reset`,
      'setup_complete': `${logIcons.check} Setup`,
      'audit_log_cleared': `${logIcons.trash} Logs gelöscht`
    };
    return labels[action] || action;
  }

  function getActionClass(action) {
    if (action.includes('failed') || action.includes('failure')) return 'log-error';
    if (action.includes('delete') || action.includes('reset') || action.includes('clear')) return 'log-warning';
    if (action.includes('success') || action.includes('create') || action.includes('setup')) return 'log-success';
    return '';
  }

  function formatDetails(details) {
    if (!details || Object.keys(details).length === 0) return '—';
    const parts = [];
    for (const [key, value] of Object.entries(details)) {
      if (key === 'ip') continue;
      if (typeof value === 'object') {
        parts.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        parts.push(`${key}: ${value}`);
      }
    }
    return parts.join(', ') || '—';
  }

  function renderLogs() {
    const search = logsSearch.value.toLowerCase();
    const filter = logsFilter.value;

    const filtered = allLogs.filter(e => {
      if (filter && e.action !== filter) return false;
      if (search) {
        const text = JSON.stringify(e).toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      logsBody.innerHTML = `<tr class="logs-empty"><td colspan="4">${t('settings.logsEmpty')}</td></tr>`;
    } else {
      logsBody.innerHTML = filtered.map(e => `
        <tr class="${getActionClass(e.action)}">
          <td class="log-time" title="${e.timestamp}">${formatLogTime(e.timestamp)}</td>
          <td class="log-action">${getActionLabel(e.action)}</td>
          <td class="log-ip">${e.ip || '—'}</td>
          <td class="log-details" title="${formatDetails(e.details)}">${formatDetails(e.details)}</td>
        </tr>
      `).join('');
    }

    logsCount.textContent = t('settings.logsCountDisplay', { shown: filtered.length, total: allLogs.length });
  }

  async function loadLogs() {
    try {
      logsBody.innerHTML = `<tr class="logs-empty"><td colspan="4">${t('settings.logsLoading')}</td></tr>`;
      const action = logsFilter.value || undefined;
      const data = await App.getAuditLogs({ limit: 200, action });
      allLogs = data.entries || [];
      logsLoaded = true;
      renderLogs();
    } catch (err) {
      logsBody.innerHTML = `<tr class="logs-empty"><td colspan="4">${t('settings.logsError')}: ${err.message}</td></tr>`;
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.tab === 'logs' && !logsLoaded) {
        loadLogs();
      }
    });
  });

  logsSearch.addEventListener('input', debounce(renderLogs, 200));
  logsFilter.addEventListener('change', () => {
    loadLogs();
  });

  logsRefreshBtn.addEventListener('click', loadLogs);

  logsExportBtn.addEventListener('click', () => {
    window.location.href = '/api/audit-log/export';
  });

  logsClearBtn.addEventListener('click', async () => {
    const confirmed = await Modal.confirm(t('settings.logsClearConfirm'));
    if (!confirmed) return;

    logsClearBtn.disabled = true;
    try {
      const csrf = document.cookie.match(/fkb_csrf=([^;]+)/)?.[1];
      const res = await fetch('/api/audit-log', {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrf },
        credentials: 'same-origin'
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed');
      }

      const result = await res.json();
      Toast.success(t('settings.logsClearSuccess', { count: result.deletedEntries }));
      await loadLogs();
    } catch (err) {
      Toast.error(t('errors.generic', { error: err.message }));
    } finally {
      logsClearBtn.disabled = false;
    }
  });
}
