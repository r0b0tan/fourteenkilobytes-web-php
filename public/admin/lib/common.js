/**
 * common.js
 * Shared utilities for fourteenkilobytes admin interface
 */

/**
 * Debounce function - delays execution until after delay ms have passed
 * since the last invocation
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {Function} Debounced function
 */
export function debounce(fn, delay = 300) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Initialize authentication and setup guards
 * Checks if setup is complete and if user is authenticated
 * Redirects to appropriate page if conditions are not met
 *
 * @param {Object} options - Configuration options
 * @param {string} options.redirectIfNotAuth - Where to redirect if not authenticated (default: 'index.html')
 * @param {boolean} options.requireAuth - Whether authentication is required for this page (default: true)
 * @returns {Promise<Object>} Returns config object if successful, redirects otherwise
 */
export async function initAuthGuard(options = {}) {
  const {
    redirectIfNotAuth = 'index.html',
    requireAuth = true
  } = options;

  // Wait for i18n to be ready
  await window.i18nReady();

  // Check if setup is complete
  const status = await window.App.getSetupStatus();
  if (!status.setupComplete) {
    window.location.href = '/setup/';
    throw new Error('Setup not complete'); // Prevent further execution
  }

  // Check auth
  const config = await window.App.getConfig();

  if (requireAuth && config.authEnabled && !(await window.App.isLoggedIn())) {
    window.location.href = redirectIfNotAuth;
    throw new Error('Not authenticated'); // Prevent further execution
  }

  return config;
}

/**
 * Setup logout button handler
 * Attaches click event to logout button that calls App.logout() and redirects
 *
 * @param {string} logoutBtnId - ID of logout button (default: 'logout-btn')
 * @param {string} redirectTo - Where to redirect after logout (default: '/admin/login.html')
 */
export function setupLogoutHandler(logoutBtnId = 'logout-btn', redirectTo = '/admin/login.html') {
  const logoutBtn = document.getElementById(logoutBtnId);
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await window.App.logout();
      window.location.href = redirectTo;
    });
  }
}

/**
 * Hide loading overlay
 * Removes the loading overlay element from the page
 *
 * @param {string} overlayId - ID of loading overlay (default: 'loading-overlay')
 */
export function hideLoadingOverlay(overlayId = 'loading-overlay') {
  document.getElementById(overlayId)?.remove();
}

/**
 * Initialize login page
 * Checks setup status and authentication state
 * Redirects to dashboard if auth is disabled or user is already logged in
 *
 * @param {Object} options - Configuration options
 * @param {string} options.redirectIfLoggedIn - Where to redirect if already logged in (default: '/admin/')
 * @returns {Promise<boolean>} Returns true if login form should be shown, redirects otherwise
 */
export async function initLoginPage(options = {}) {
  const {
    redirectIfLoggedIn = '/admin/'
  } = options;

  // Wait for i18n to be ready
  await window.i18nReady();

  // Check if setup is complete
  const status = await window.App.getSetupStatus();
  if (!status.setupComplete) {
    window.location.href = '/setup/';
    throw new Error('Setup not complete');
  }

  // Check if auth is required
  const config = await window.App.getConfig();

  if (!config.authEnabled) {
    // No auth required, go directly to dashboard
    window.location.href = redirectIfLoggedIn;
    throw new Error('Auth not enabled');
  }

  // Check if already logged in
  const loggedIn = await window.App.isLoggedIn();
  if (loggedIn) {
    window.location.href = redirectIfLoggedIn;
    throw new Error('Already logged in');
  }

  return true;
}
