import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createModalManager } from '../../public/admin/lib/modal-utils.js';

describe('createModalManager', () => {
  let elements;
  let modal;

  beforeEach(() => {
    elements = {
      backdrop: document.createElement('div'),
      modal: document.createElement('div'),
      message: document.createElement('div'),
      actions: document.createElement('div')
    };

    elements.modal.className = 'modal hidden';
    elements.backdrop.className = 'backdrop hidden';

    modal = createModalManager(elements);
  });

  test('creates modal manager with all methods', () => {
    expect(modal.confirm).toBeDefined();
    expect(modal.success).toBeDefined();
    expect(modal.error).toBeDefined();
    expect(modal.info).toBeDefined();
    expect(modal.hide).toBeDefined();
  });

  test('confirm shows modal with Yes/Cancel buttons', async () => {
    const promise = modal.confirm('Are you sure?');

    expect(elements.message.textContent).toBe('Are you sure?');
    expect(elements.modal.classList.contains('hidden')).toBe(false);
    expect(elements.backdrop.classList.contains('hidden')).toBe(false);

    const buttons = elements.actions.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('Yes');
    expect(buttons[1].textContent).toBe('Cancel');

    // Simulate Yes click
    buttons[0].click();
    const result = await promise;
    expect(result).toBe(true);
  });

  test('confirm resolves false when cancelled', async () => {
    const promise = modal.confirm('Delete?');
    const buttons = elements.actions.querySelectorAll('button');

    // Simulate Cancel click
    buttons[1].click();
    const result = await promise;
    expect(result).toBe(false);
  });

  test('success shows modal with success class', () => {
    modal.success('Operation succeeded!');

    expect(elements.message.textContent).toBe('Operation succeeded!');
    expect(elements.modal.className).toContain('modal-success');
    expect(elements.modal.classList.contains('hidden')).toBe(false);

    const buttons = elements.actions.querySelectorAll('button');
    expect(buttons.length).toBe(1);
    expect(buttons[0].textContent).toBe('OK');
  });

  test('success accepts custom buttons', () => {
    const customAction = vi.fn();
    modal.success('Done!', [
      { text: 'View', class: 'btn-primary', action: customAction },
      { text: 'Close', class: 'btn-secondary' }
    ]);

    const buttons = elements.actions.querySelectorAll('button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('View');
    expect(buttons[1].textContent).toBe('Close');

    buttons[0].click();
    expect(customAction).toHaveBeenCalled();
  });

  test('success renders HTML when html=true', () => {
    modal.success('<strong>Bold</strong> message', null, true);

    expect(elements.message.innerHTML).toBe('<strong>Bold</strong> message');
    expect(elements.message.querySelector('strong')).toBeTruthy();
  });

  test('error shows modal with error class', () => {
    modal.error('Something went wrong!');

    expect(elements.message.textContent).toBe('Something went wrong!');
    expect(elements.modal.className).toContain('modal-error');
    expect(elements.modal.classList.contains('hidden')).toBe(false);
  });

  test('info shows modal without special class', () => {
    modal.info('FYI');

    expect(elements.message.textContent).toBe('FYI');
    expect(elements.modal.className).toBe('modal');
  });

  test('hide hides modal and backdrop', () => {
    modal.info('Test');
    expect(elements.modal.classList.contains('hidden')).toBe(false);

    modal.hide();

    expect(elements.modal.classList.contains('hidden')).toBe(true);
    expect(elements.backdrop.classList.contains('hidden')).toBe(true);
    expect(elements.actions.innerHTML).toBe('');
  });

  test('button click hides modal', () => {
    modal.info('Test');
    const button = elements.actions.querySelector('button');

    button.click();

    expect(elements.modal.classList.contains('hidden')).toBe(true);
  });

  test('button action is called before hide', () => {
    const action = vi.fn();
    modal.success('Test', [{ text: 'OK', action }]);

    const button = elements.actions.querySelector('button');
    button.click();

    expect(action).toHaveBeenCalledTimes(1);
    expect(elements.modal.classList.contains('hidden')).toBe(true);
  });

  test('clears previous buttons when showing new modal', () => {
    modal.info('First');
    expect(elements.actions.querySelectorAll('button').length).toBe(1);

    modal.confirm('Second');
    expect(elements.actions.querySelectorAll('button').length).toBe(2);
  });

  test('escapes text by default', () => {
    modal.info('<script>alert("xss")</script>');

    expect(elements.message.textContent).toBe('<script>alert("xss")</script>');
    expect(elements.message.innerHTML).not.toContain('<script>');
  });
});
