/**
 * Login page.
 */
import { initLoginPage } from './lib/common.js';

(async function () {
  const loginForm = document.getElementById('login-form');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const loginError = document.getElementById('login-error');

  // Initialize login page (handles setup check and redirects)
  await initLoginPage();

  // Focus password input
  passwordInput.focus();

  // Login handler
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    loginError.classList.add('hidden');
    passwordInput.setCustomValidity('');

    // Validate with HTML5
    if (!loginForm.checkValidity()) {
      passwordInput.setCustomValidity(t('auth.errorEnterPassword'));
      passwordInput.reportValidity();
      return;
    }

    const password = passwordInput.value;
    if (password === '') {
      showError(t('auth.errorEnterPassword'));
      return;
    }

    loginBtn.disabled = true;

    try {
      await App.login(password);
      window.location.href = '/admin/';
    } catch (err) {
      showError(err.message === 'Invalid password' ? t('auth.errorInvalidPassword') : t('auth.errorLoginFailed'));
      console.error(err);
    } finally {
      loginBtn.disabled = false;
    }
  });

  function showError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove('hidden');
  }
})();
