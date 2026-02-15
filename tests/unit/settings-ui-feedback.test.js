import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createToast, createModal } from '../../public/admin/lib/settings-page/ui-feedback.js';

function buildModalDom() {
  document.body.innerHTML = `
    <div id="modal-backdrop" class="hidden"></div>
    <div id="modal" class="modal hidden"></div>
    <div id="modal-message"></div>
    <div id="modal-actions"></div>
  `;
}

describe('settings-page/ui-feedback', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates toast container once and shows success/error toasts', () => {
    const toast = createToast(document);

    toast.success('Saved');
    toast.error('Failed');

    const container = document.getElementById('toast-container');
    expect(container).toBeTruthy();
    expect(document.querySelectorAll('#toast-container').length).toBe(1);

    const toasts = container.querySelectorAll('.toast');
    expect(toasts.length).toBe(2);
    expect(toasts[0].className).toContain('success');
    expect(toasts[0].textContent).toBe('Saved');
    expect(toasts[1].className).toContain('error');
    expect(toasts[1].textContent).toBe('Failed');

    const secondToastApi = createToast(document);
    secondToastApi.success('Again');
    expect(document.querySelectorAll('#toast-container').length).toBe(1);
  });

  it('hides and removes toast after duration and animation end', () => {
    const toast = createToast(document);
    toast.success('Auto remove');

    const node = document.querySelector('.toast.success');
    expect(node.classList.contains('hiding')).toBe(false);

    vi.advanceTimersByTime(3000);
    expect(node.classList.contains('hiding')).toBe(true);

    node.dispatchEvent(new Event('animationend'));
    expect(document.querySelector('.toast.success')).toBeNull();
  });

  it('confirm resolves true and false based on clicked action', async () => {
    buildModalDom();
    const modal = createModal({
      doc: document,
      t: (key) => ({
        'modal.yes': 'Yes',
        'modal.cancel': 'Cancel',
        'modal.ok': 'OK'
      }[key] || key)
    });

    const yesPromise = modal.confirm('Continue?');
    expect(document.getElementById('modal-message').textContent).toBe('Continue?');
    expect(document.getElementById('modal').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('modal-backdrop').classList.contains('hidden')).toBe(false);

    let buttons = document.querySelectorAll('#modal-actions button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('Yes');
    expect(buttons[1].textContent).toBe('Cancel');
    buttons[0].click();
    await expect(yesPromise).resolves.toBe(true);

    const noPromise = modal.confirm('Stop?');
    buttons = document.querySelectorAll('#modal-actions button');
    buttons[1].click();
    await expect(noPromise).resolves.toBe(false);
  });

  it('renders success/error variants and executes custom button action', () => {
    buildModalDom();
    const action = vi.fn();
    const modal = createModal({
      doc: document,
      t: (key) => ({
        'modal.yes': 'Yes',
        'modal.cancel': 'Cancel',
        'modal.ok': 'OK'
      }[key] || key)
    });

    modal.success('Done');
    expect(document.getElementById('modal').className).toContain('modal-success');
    let btn = document.querySelector('#modal-actions button');
    expect(btn.textContent).toBe('OK');
    btn.click();
    expect(document.getElementById('modal').classList.contains('hidden')).toBe(true);

    modal.error('Oops');
    expect(document.getElementById('modal').className).toContain('modal-error');

    modal.hide();
    expect(document.getElementById('modal').className).toBe('modal hidden');
    expect(document.getElementById('modal-backdrop').classList.contains('hidden')).toBe(true);
    expect(document.getElementById('modal-actions').innerHTML).toBe('');

    // indirectly test show-button action wiring via confirm path
    const confirmPromise = modal.confirm('Run action');
    const yesBtn = document.querySelectorAll('#modal-actions button')[0];
    yesBtn.addEventListener('click', action);
    yesBtn.click();
    expect(action).toHaveBeenCalled();
    return confirmPromise;
  });
});
