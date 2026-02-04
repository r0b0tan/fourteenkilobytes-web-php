/**
 * fourteenkilobytes Dashboard Module
 *
 * Handles the overview page with posts, pages, and archive lists.
 * Extracted from inline script for better maintainability.
 */

// Wait for dependencies
async function waitForDependencies() {
  await i18nReady();
  // App is loaded synchronously via module, but wait just in case
  while (!window.App) {
    await new Promise(r => setTimeout(r, 10));
  }
}

// Initialize dashboard
export async function init() {
  await waitForDependencies();

  const dashboardView = document.getElementById('dashboard-view');
  const logoutBtn = document.getElementById('logout-btn');
  const postsList = document.getElementById('posts-list');
  const pagesList = document.getElementById('pages-list');
  const archiveList = document.getElementById('archive-list');
  const postsPagination = document.getElementById('posts-pagination');
  const pagesPagination = document.getElementById('pages-pagination');
  const archivePagination = document.getElementById('archive-pagination');
  const pageSizeSelect = document.getElementById('page-size');
  const searchInput = document.getElementById('search-input');
  const dateFromInput = document.getElementById('date-from');
  const dateToInput = document.getElementById('date-to');
  const dateRangeTrigger = document.getElementById('date-range-trigger');
  const dateRangeDropdown = document.getElementById('date-range-dropdown');
  const dateRangeLabel = document.getElementById('date-range-label');
  const clearDatesBtn = document.getElementById('clear-dates');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const errorAlert = document.getElementById('error-alert');

  // Pagination & Search State
  let allPosts = [];
  let allPages = [];
  let allArchive = [];
  let pageSize = 10;
  let postsPage = 1;
  let pagesPage = 1;
  let archivePage = 1;
  let searchQuery = '';
  let dateFrom = null;
  let dateTo = null;
  let isLoading = false;

  // Debounce helper
  function debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  }

  // Set loading state on a list
  function setListLoading(listEl, loading) {
    listEl.setAttribute('aria-busy', loading ? 'true' : 'false');
    if (loading) {
      listEl.innerHTML = `<li class="loading-state">
        <span class="loading-spinner" aria-hidden="true"></span>
        <span>${t('dashboard.loading')}</span>
      </li>`;
    }
  }

  // Show error in the error alert area
  function showError(message) {
    if (errorAlert) {
      errorAlert.textContent = message;
      errorAlert.classList.remove('hidden');
      // Auto-hide after 5 seconds
      setTimeout(() => {
        errorAlert.classList.add('hidden');
      }, 5000);
    }
  }

  // Hide error alert
  function hideError() {
    if (errorAlert) {
      errorAlert.classList.add('hidden');
    }
  }

  // Check if setup is complete
  try {
    const status = await App.getSetupStatus();
    if (!status.setupComplete) {
      window.location.href = '/admin/setup';
      return;
    }
  } catch (err) {
    document.getElementById('loading-overlay')?.remove();
    dashboardView.classList.remove('hidden');
    showError(t('errors.network'));
    return;
  }

  // Check if auth is required
  try {
    const config = await App.getConfig();

    if (config.authEnabled) {
      const loggedIn = await App.isLoggedIn();
      if (!loggedIn) {
        window.location.href = '/admin/login.html';
        return;
      }
    }
  } catch (err) {
    document.getElementById('loading-overlay')?.remove();
    dashboardView.classList.remove('hidden');
    showError(t('errors.network'));
    return;
  }

  // Hide loading overlay and show dashboard
  document.getElementById('loading-overlay')?.remove();
  dashboardView.classList.remove('hidden');
  loadAllContent();

  // Date range picker dropdown
  dateRangeTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    dateRangeDropdown.classList.toggle('hidden');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!dateRangeTrigger.contains(e.target) && !dateRangeDropdown.contains(e.target)) {
      dateRangeDropdown.classList.add('hidden');
    }
  });

  // Update date range label
  function updateDateRangeLabel() {
    const locale = i18n.getFullLocale();
    if (dateFrom && dateTo) {
      const fromFormatted = new Date(dateFrom).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
      const toFormatted = new Date(dateTo).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
      dateRangeLabel.textContent = t('dashboard.dateRangeBetween', { from: fromFormatted, to: toFormatted });
      dateRangeTrigger.classList.add('active');
    } else if (dateFrom) {
      const fromFormatted = new Date(dateFrom).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
      dateRangeLabel.textContent = t('dashboard.dateRangeFrom', { date: fromFormatted });
      dateRangeTrigger.classList.add('active');
    } else if (dateTo) {
      const toFormatted = new Date(dateTo).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
      dateRangeLabel.textContent = t('dashboard.dateRangeTo', { date: toFormatted });
      dateRangeTrigger.classList.add('active');
    } else {
      dateRangeLabel.textContent = t('dashboard.date');
      dateRangeTrigger.classList.remove('active');
    }
  }

  // Clear dates button
  clearDatesBtn.addEventListener('click', () => {
    dateFromInput.value = '';
    dateToInput.value = '';
    dateFrom = null;
    dateTo = null;
    postsPage = 1;
    pagesPage = 1;
    archivePage = 1;
    updateDateRangeLabel();
    renderCurrentView();
  });

  // Page size change handler
  pageSizeSelect.addEventListener('change', () => {
    pageSize = pageSizeSelect.value === 'all' ? Infinity : parseInt(pageSizeSelect.value, 10);
    postsPage = 1;
    pagesPage = 1;
    renderCurrentView();
  });

  // Search handler with debounce
  searchInput.addEventListener('input', debounce(() => {
    searchQuery = searchInput.value.trim().toLowerCase();
    postsPage = 1;
    pagesPage = 1;
    archivePage = 1;
    renderCurrentView();
  }, 200));

  // Date range handlers
  dateFromInput.addEventListener('change', () => {
    dateFrom = dateFromInput.value;
    postsPage = 1;
    pagesPage = 1;
    archivePage = 1;
    updateDateRangeLabel();
    renderCurrentView();
  });

  dateToInput.addEventListener('change', () => {
    dateTo = dateToInput.value;
    postsPage = 1;
    pagesPage = 1;
    archivePage = 1;
    updateDateRangeLabel();
    renderCurrentView();
  });

  // Logout handler
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await App.logout();
      window.location.href = '/admin/login.html';
    } catch (err) {
      showError(t('errors.generic', { error: err.message }));
    }
  });

  // ============ MODAL SYSTEM ============

  const Modal = (() => {
    const backdrop = document.getElementById('modal-backdrop');
    const modal = document.getElementById('modal');
    const message = document.getElementById('modal-message');
    const actions = document.getElementById('modal-actions');

    function hide() {
      modal.classList.add('hidden');
      backdrop.classList.add('hidden');
      modal.className = 'modal hidden';
      actions.innerHTML = '';
    }

    function show(text, buttons, type = '') {
      message.textContent = text;
      actions.innerHTML = '';
      modal.className = 'modal' + (type ? ` modal-${type}` : '');

      buttons.forEach(btn => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = btn.text;
        button.className = btn.class || '';
        button.addEventListener('click', () => {
          hide();
          if (btn.action) btn.action();
        });
        actions.appendChild(button);
      });

      backdrop.classList.remove('hidden');
      modal.classList.remove('hidden');

      // Focus first button for accessibility
      const firstBtn = actions.querySelector('button');
      if (firstBtn) firstBtn.focus();
    }

    // Handle escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        hide();
      }
    });

    return {
      confirm(text) {
        return new Promise(resolve => {
          show(text, [
            { text: t('modal.yes'), class: 'btn-danger', action: () => resolve(true) },
            { text: t('modal.cancel'), class: 'btn-secondary', action: () => resolve(false) }
          ]);
        });
      },

      error(text) {
        show(text, [{ text: t('modal.ok'), class: 'btn-primary' }], 'error');
      },

      hide
    };
  })();

  // ============ TABS ============

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach(b => b.classList.toggle('active', b === btn));
      tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`));
      tabContents.forEach(c => c.classList.toggle('hidden', c.id !== `tab-${tab}`));
    });
  });

  async function loadAllContent() {
    isLoading = true;
    hideError();

    // Show loading state on all lists
    setListLoading(postsList, true);
    setListLoading(pagesList, true);
    setListLoading(archiveList, true);

    try {
      const allContent = await App.getPosts();

      // Split into posts, pages, and archive (tombstones), sort by date
      allPosts = allContent
        .filter(item => item.pageType !== 'page' && item.status !== 'tombstone')
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      allPages = allContent
        .filter(item => item.pageType === 'page' && item.status !== 'tombstone')
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      allArchive = allContent
        .filter(item => item.status === 'tombstone')
        .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      isLoading = false;
      renderCurrentView();
    } catch (err) {
      isLoading = false;
      showError(t('dashboard.loadError'));

      // Show error state in lists
      const errorHtml = `<li class="empty error-state">${t('dashboard.loadError')}</li>`;
      postsList.innerHTML = errorHtml;
      pagesList.innerHTML = errorHtml;
      archiveList.innerHTML = errorHtml;

      // Remove loading state
      postsList.setAttribute('aria-busy', 'false');
      pagesList.setAttribute('aria-busy', 'false');
      archiveList.setAttribute('aria-busy', 'false');

      console.error(err);
    }
  }

  function filterItems(items) {
    return items.filter(item => {
      // Text search filter (title and slug)
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesText = item.title.toLowerCase().includes(query) ||
                            item.slug.toLowerCase().includes(query);
        if (!matchesText) return false;
      }

      // Date range filter
      if (dateFrom || dateTo) {
        if (!item.publishedAt) return false;

        const itemDate = new Date(item.publishedAt);
        itemDate.setHours(0, 0, 0, 0);

        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (itemDate < fromDate) return false;
        }

        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (itemDate > toDate) return false;
        }
      }

      return true;
    });
  }

  function renderCurrentView() {
    const filteredPosts = filterItems(allPosts);
    const filteredPages = filterItems(allPages);
    const filteredArchive = filterItems(allArchive);
    renderPaginatedList(postsList, postsPagination, filteredPosts, postsPage, 'Post', t('dashboard.noPosts'), (p) => { postsPage = p; renderCurrentView(); });
    renderPaginatedList(pagesList, pagesPagination, filteredPages, pagesPage, t('tabs.pages'), t('dashboard.noPages'), (p) => { pagesPage = p; renderCurrentView(); });
    renderPaginatedList(archiveList, archivePagination, filteredArchive, archivePage, '', t('dashboard.noArchive'), (p) => { archivePage = p; renderCurrentView(); });
  }

  function renderPaginatedList(listEl, paginationEl, items, currentPage, typeName, emptyText, onPageChange) {
    // Mark as no longer loading
    listEl.setAttribute('aria-busy', 'false');

    if (items.length === 0) {
      // Empty state with call-to-action
      const hasCreateLink = typeName && typeName !== '';
      listEl.innerHTML = `<li class="empty-state">
        <div class="empty-state-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </div>
        <p class="empty-state-text">${emptyText}</p>
        ${hasCreateLink ? `<a href="editor.html" class="btn btn-primary empty-state-cta">${t('dashboard.createFirst', { type: typeName })}</a>` : ''}
      </li>`;
      paginationEl.classList.add('hidden');
      return;
    }

    const totalItems = items.length;
    const effectivePageSize = pageSize === Infinity ? totalItems : pageSize;
    const totalPages = Math.ceil(totalItems / effectivePageSize);
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * effectivePageSize;
    const endIndex = Math.min(startIndex + effectivePageSize, totalItems);
    const pageItems = items.slice(startIndex, endIndex);

    listEl.innerHTML = pageItems.map(item => `
      <li>
        <div class="post-info">
          <div class="post-title ${item.status === 'tombstone' ? 'status-tombstone' : ''}">
            ${item.status === 'tombstone'
              ? App.escapeHtml(item.title)
              : `<a href="/${item.slug}" target="_blank" rel="noopener">
                  ${App.escapeHtml(item.title)}
                  <svg class="post-title-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>`
            }
          </div>
          <div class="post-meta">
            /${item.slug} · ${App.formatDate(item.publishedAt)}
            ${item.status === 'tombstone' ? ` · <span class="text-muted">${t('dashboard.deleted')}</span>` : ''}
          </div>
        </div>
        <div class="post-actions">
          ${item.status === 'published' ? `
            <div class="actions-dropdown">
              <button type="button" class="btn btn-secondary btn-small btn-icon actions-dropdown-toggle" data-action="toggle-dropdown" aria-haspopup="true" aria-expanded="false">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                ${t('dashboard.actions')}
                <svg class="chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="actions-dropdown-menu" role="menu">
                <button type="button" data-action="recompile" data-slug="${item.slug}" role="menuitem">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
                  ${t('dashboard.recompile')}
                </button>
                <button type="button" data-action="duplicate" data-slug="${item.slug}" role="menuitem">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  ${t('dashboard.duplicate')}
                </button>
              </div>
            </div>
            <button type="button" class="btn btn-danger btn-small btn-icon" data-action="delete" data-slug="${item.slug}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              ${t('dashboard.delete')}
            </button>
          ` : ''}
        </div>
      </li>
    `).join('');

    // Render pagination
    if (totalPages <= 1) {
      paginationEl.classList.add('hidden');
      return;
    }

    paginationEl.classList.remove('hidden');
    paginationEl.innerHTML = '';

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.textContent = '‹';
    prevBtn.setAttribute('aria-label', 'Previous page');
    prevBtn.disabled = safeCurrentPage === 1;
    prevBtn.addEventListener('click', () => onPageChange(safeCurrentPage - 1));
    paginationEl.appendChild(prevBtn);

    // Page numbers
    const maxButtons = 5;
    let startPage = Math.max(1, safeCurrentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    if (startPage > 1) {
      const firstBtn = document.createElement('button');
      firstBtn.type = 'button';
      firstBtn.textContent = '1';
      firstBtn.addEventListener('click', () => onPageChange(1));
      paginationEl.appendChild(firstBtn);
      if (startPage > 2) {
        const dots = document.createElement('span');
        dots.className = 'pagination-info';
        dots.textContent = '…';
        dots.setAttribute('aria-hidden', 'true');
        paginationEl.appendChild(dots);
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = i;
      btn.className = i === safeCurrentPage ? 'active' : '';
      if (i === safeCurrentPage) {
        btn.setAttribute('aria-current', 'page');
      }
      btn.addEventListener('click', () => onPageChange(i));
      paginationEl.appendChild(btn);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dots = document.createElement('span');
        dots.className = 'pagination-info';
        dots.textContent = '…';
        dots.setAttribute('aria-hidden', 'true');
        paginationEl.appendChild(dots);
      }
      const lastBtn = document.createElement('button');
      lastBtn.type = 'button';
      lastBtn.textContent = totalPages;
      lastBtn.addEventListener('click', () => onPageChange(totalPages));
      paginationEl.appendChild(lastBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.textContent = '›';
    nextBtn.setAttribute('aria-label', 'Next page');
    nextBtn.disabled = safeCurrentPage === totalPages;
    nextBtn.addEventListener('click', () => onPageChange(safeCurrentPage + 1));
    paginationEl.appendChild(nextBtn);
  }

  // Event delegation for post actions
  document.addEventListener('click', async (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;
    const slug = target.dataset.slug;

    switch (action) {
      case 'toggle-dropdown': {
        e.stopPropagation();
        const dropdown = target.closest('.actions-dropdown');
        const wasOpen = dropdown.classList.contains('open');

        // Close all other dropdowns
        document.querySelectorAll('.actions-dropdown.open').forEach(d => {
          d.classList.remove('open');
          d.querySelector('.actions-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
        });

        // Toggle this one
        if (!wasOpen) {
          dropdown.classList.add('open');
          target.setAttribute('aria-expanded', 'true');
        }
        break;
      }

      case 'delete': {
        const confirmed = await Modal.confirm(t('dashboard.deleteConfirm', { slug }));
        if (!confirmed) return;

        try {
          await App.deletePost(slug);
          loadAllContent();
        } catch (err) {
          Modal.error(t('dashboard.deleteError', { error: err.message }));
        }
        break;
      }

      case 'recompile': {
        window.location.href = `editor.html?edit=${encodeURIComponent(slug)}`;
        break;
      }

      case 'duplicate': {
        try {
          const { sourceData } = await App.clonePage(slug, 'page');
          sessionStorage.setItem('clonedSource', JSON.stringify(sourceData));
          window.location.href = 'editor.html?clone=true';
        } catch (err) {
          Modal.error(t('dashboard.duplicateError', { error: err.message }));
        }
        break;
      }
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.actions-dropdown')) {
      document.querySelectorAll('.actions-dropdown.open').forEach(d => {
        d.classList.remove('open');
        d.querySelector('.actions-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Keyboard navigation for dropdowns
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.actions-dropdown.open').forEach(d => {
        d.classList.remove('open');
        d.querySelector('.actions-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
        d.querySelector('.actions-dropdown-toggle')?.focus();
      });
    }
  });
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
