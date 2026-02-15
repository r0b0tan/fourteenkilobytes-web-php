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

  function getActionMeta(action) {
    const labels = {
      'login_success': { icon: logIcons.check, label: 'Login' },
      'login_failed': { icon: logIcons.x, label: 'Login fehlgeschlagen' },
      'logout': { icon: logIcons.logout, label: 'Logout' },
      'post_create': { icon: logIcons.plus, label: 'Post erstellt' },
      'post_delete': { icon: logIcons.minus, label: 'Post gelöscht' },
      'posts_delete_all': { icon: logIcons.alert, label: 'Alle Posts gelöscht' },
      'settings_update': { icon: logIcons.settings, label: 'Einstellungen' },
      'csrf_failure': { icon: logIcons.alert, label: 'CSRF-Fehler' },
      'full_reset': { icon: logIcons.alert, label: 'Reset' },
      'setup_complete': { icon: logIcons.check, label: 'Setup' },
      'audit_log_cleared': { icon: logIcons.trash, label: 'Logs gelöscht' }
    };
    return labels[action] || { icon: '', label: action || '—' };
  }

  function getActionClass(action) {
    const actionText = String(action || '');
    if (actionText.includes('failed') || actionText.includes('failure')) return 'log-error';
    if (actionText.includes('delete') || actionText.includes('reset') || actionText.includes('clear')) return 'log-warning';
    if (actionText.includes('success') || actionText.includes('create') || actionText.includes('setup')) return 'log-success';
    return '';
  }

  function formatDetails(details) {
    if (!details || Object.keys(details).length === 0) return '—';
    const parts = [];
    for (const [key, value] of Object.entries(details)) {
      if (key === 'ip') continue;
      if (typeof value === 'object') {
        try {
          parts.push(`${key}: ${JSON.stringify(value)}`);
        } catch {
          parts.push(`${key}: [unserializable]`);
        }
      } else {
        parts.push(`${key}: ${value}`);
      }
    }
    return parts.join(', ') || '—';
  }

  function setStatusRow(text) {
    logsBody.textContent = '';
    const tr = document.createElement('tr');
    tr.className = 'logs-empty';
    const td = document.createElement('td');
    td.colSpan = 4;
    td.textContent = text;
    tr.appendChild(td);
    logsBody.appendChild(tr);
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
      setStatusRow(t('settings.logsEmpty'));
    } else {
      logsBody.textContent = '';
      filtered.forEach((entry) => {
        const tr = document.createElement('tr');
        tr.className = getActionClass(entry.action);

        const timeTd = document.createElement('td');
        timeTd.className = 'log-time';
        timeTd.title = String(entry.timestamp || '');
        timeTd.textContent = formatLogTime(entry.timestamp);
        tr.appendChild(timeTd);

        const actionTd = document.createElement('td');
        actionTd.className = 'log-action';
        const action = getActionMeta(entry.action);
        if (action.icon) {
          const iconSpan = document.createElement('span');
          iconSpan.innerHTML = action.icon;
          actionTd.appendChild(iconSpan);
          actionTd.appendChild(document.createTextNode(' '));
        }
        actionTd.appendChild(document.createTextNode(String(action.label || '—')));
        tr.appendChild(actionTd);

        const ipTd = document.createElement('td');
        ipTd.className = 'log-ip';
        ipTd.textContent = String(entry.ip || '—');
        tr.appendChild(ipTd);

        const details = formatDetails(entry.details);
        const detailsTd = document.createElement('td');
        detailsTd.className = 'log-details';
        detailsTd.title = details;
        detailsTd.textContent = details;
        tr.appendChild(detailsTd);

        logsBody.appendChild(tr);
      });
    }

    logsCount.textContent = t('settings.logsCountDisplay', { shown: filtered.length, total: allLogs.length });
  }

  async function loadLogs() {
    try {
      setStatusRow(t('settings.logsLoading'));
      const action = logsFilter.value || undefined;
      const data = await App.getAuditLogs({ limit: 200, action });
      allLogs = data.entries || [];
      logsLoaded = true;
      renderLogs();
    } catch (err) {
      setStatusRow(`${t('settings.logsError')}: ${err?.message || 'Unknown error'}`);
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
