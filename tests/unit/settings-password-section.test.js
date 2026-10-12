import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initPasswordSection } from '../../public/admin/lib/settings-page/password-section.js';

function setupDom() {
  document.body.innerHTML = `
    <form id="password-form">
      <input type="password" id="current-password" />
      <input type="password" id="new-password" />
      <input type="password" id="confirm-password" />
      <button type="submit" id="change-password-btn"></button>
    </form>
  `;
}

const t = (key) => key;
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

function fillAndSubmit(current, next, confirm) {
  document.getElementById('current-password').value = current;
  document.getElementById('new-password').value = next;
  document.getElementById('confirm-password').value = confirm;
  document.getElementById('password-form').dispatchEvent(new Event('submit', { cancelable: true }));
}

describe('initPasswordSection', () => {
  let App;
  let Toast;

  beforeEach(() => {
    setupDom();
    App = { changePassword: vi.fn().mockResolvedValue({ success: true }) };
    Toast = { success: vi.fn(), error: vi.fn() };
    initPasswordSection({ doc: document, App, t, Toast });
  });

  it('rejects mismatching passwords without calling the API', async () => {
    fillAndSubmit('old-password', 'new-password-1', 'new-password-2');
    await flush();

    expect(App.changePassword).not.toHaveBeenCalled();
    expect(Toast.error).toHaveBeenCalledWith('settings.passwordMismatch');
  });

  it('rejects passwords shorter than 8 characters', async () => {
    fillAndSubmit('old-password', 'short', 'short');
    await flush();

    expect(App.changePassword).not.toHaveBeenCalled();
    expect(Toast.error).toHaveBeenCalledWith('settings.passwordTooShort');
  });

  it('changes the password and clears the form', async () => {
    fillAndSubmit('old-password', 'new-password-1', 'new-password-1');
    await flush();

    expect(App.changePassword).toHaveBeenCalledWith('old-password', 'new-password-1');
    expect(Toast.success).toHaveBeenCalledWith('settings.passwordChanged');
    expect(document.getElementById('new-password').value).toBe('');
    expect(document.getElementById('change-password-btn').disabled).toBe(false);
  });

  it('shows the server error when the change fails', async () => {
    App.changePassword.mockRejectedValue(new Error('Current password is incorrect'));
    fillAndSubmit('wrong', 'new-password-1', 'new-password-1');
    await flush();

    expect(Toast.error).toHaveBeenCalledWith('errors.generic');
  });
});
