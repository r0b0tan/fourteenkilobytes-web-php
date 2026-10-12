/**
 * Password change form in the General tab.
 */
export function initPasswordSection({ doc = document, App, t, Toast }) {
  const form = doc.getElementById('password-form');
  if (!form) return;

  const currentInput = doc.getElementById('current-password');
  const newInput = doc.getElementById('new-password');
  const confirmInput = doc.getElementById('confirm-password');
  const submitBtn = doc.getElementById('change-password-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (newInput.value.length < 8) {
      Toast.error(t('settings.passwordTooShort'));
      return;
    }
    if (newInput.value !== confirmInput.value) {
      Toast.error(t('settings.passwordMismatch'));
      return;
    }

    submitBtn.disabled = true;
    try {
      await App.changePassword(currentInput.value, newInput.value);
      form.reset();
      Toast.success(t('settings.passwordChanged'));
    } catch (err) {
      Toast.error(t('errors.generic', { error: err.message }));
    } finally {
      submitBtn.disabled = false;
    }
  });
}
