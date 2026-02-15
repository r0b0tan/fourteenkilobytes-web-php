import { describe, test, expect, vi } from 'vitest';
import {
  validatePublishData,
  determinePaginationStrategy,
  executePublish,
  resetEditorForm
} from '../../public/admin/lib/publish-workflow.js';

describe('validatePublishData', () => {
  const t = (key) => key;

  test('rejects empty title', () => {
    const result = validatePublishData({ title: '', blockCount: 1 }, t);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('editor.titleRequired');
  });

  test('rejects whitespace-only title', () => {
    const result = validatePublishData({ title: '   ', blockCount: 1 }, t);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('editor.titleRequired');
  });

  test('rejects zero blocks', () => {
    const result = validatePublishData({ title: 'Test', blockCount: 0 }, t);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('editor.blockRequired');
  });

  test('accepts valid data', () => {
    const result = validatePublishData({ title: 'Test Post', blockCount: 3 }, t);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});

describe('determinePaginationStrategy', () => {
  const t = (key, params) => {
    if (key === 'editor.splitConfirm') {
      return `Split into ${params.pages} pages? (${params.bytes} bytes)`;
    }
    return key;
  };

  test('returns no pagination when content fits', async () => {
    const buildInput = vi.fn().mockResolvedValue({ content: 'test' });
    const App = {
      preview: vi.fn().mockResolvedValue({
        exceeded: false,
        bytes: 10000
      })
    };
    const Modal = {
      confirm: vi.fn()
    };

    const result = await determinePaginationStrategy({
      buildInput,
      App,
      Modal,
      t
    });

    expect(result.shouldPaginate).toBe(false);
    expect(result.aborted).toBe(false);
    expect(buildInput).toHaveBeenCalledWith(false);
    expect(Modal.confirm).not.toHaveBeenCalled();
  });

  test('offers pagination when content exceeds limit and user accepts', async () => {
    const buildInput = vi.fn()
      .mockResolvedValueOnce({ content: 'test1' }) // First call without pagination
      .mockResolvedValueOnce({ content: 'test2' }); // Second call with pagination

    const App = {
      preview: vi.fn()
        .mockResolvedValueOnce({ exceeded: true, bytes: 20000 }) // Preview without pagination
        .mockResolvedValueOnce({ // Preview with pagination
          exceeded: false,
          measurements: [{ bytes: 10000 }, { bytes: 10000 }]
        })
    };

    const Modal = {
      confirm: vi.fn().mockResolvedValue(true) // User accepts split
    };

    const result = await determinePaginationStrategy({
      buildInput,
      App,
      Modal,
      t
    });

    expect(result.shouldPaginate).toBe(true);
    expect(result.aborted).toBe(false);
    expect(buildInput).toHaveBeenCalledTimes(2);
    expect(buildInput).toHaveBeenNthCalledWith(1, false);
    expect(buildInput).toHaveBeenNthCalledWith(2, true);
    expect(Modal.confirm).toHaveBeenCalledWith(expect.stringContaining('2 pages'));
  });

  test('aborts when content exceeds limit and user declines', async () => {
    const buildInput = vi.fn()
      .mockResolvedValueOnce({ content: 'test1' })
      .mockResolvedValueOnce({ content: 'test2' });

    const App = {
      preview: vi.fn()
        .mockResolvedValueOnce({ exceeded: true, bytes: 20000 })
        .mockResolvedValueOnce({
          exceeded: false,
          measurements: [{ bytes: 10000 }, { bytes: 10000 }]
        })
    };

    const Modal = {
      confirm: vi.fn().mockResolvedValue(false) // User declines split
    };

    const result = await determinePaginationStrategy({
      buildInput,
      App,
      Modal,
      t
    });

    expect(result.shouldPaginate).toBe(false);
    expect(result.aborted).toBe(true);
    expect(result.error).toBe('editor.tooLarge');
  });

  test('aborts when content cannot be paginated', async () => {
    const buildInput = vi.fn()
      .mockResolvedValueOnce({ content: 'test1' })
      .mockResolvedValueOnce({ content: 'test2' });

    const App = {
      preview: vi.fn()
        .mockResolvedValueOnce({ exceeded: true, bytes: 20000 })
        .mockResolvedValueOnce({
          exceeded: true, // Still exceeded even with pagination
          measurements: []
        })
    };

    const Modal = {
      confirm: vi.fn()
    };

    const result = await determinePaginationStrategy({
      buildInput,
      App,
      Modal,
      t
    });

    expect(result.shouldPaginate).toBe(false);
    expect(result.aborted).toBe(true);
    expect(result.error).toBe('editor.cannotSplit');
    expect(Modal.confirm).not.toHaveBeenCalled();
  });

  test('offers pagination for content over 14KB even if not exceeded', async () => {
    const buildInput = vi.fn()
      .mockResolvedValueOnce({ content: 'test1' })
      .mockResolvedValueOnce({ content: 'test2' });

    const App = {
      preview: vi.fn()
        .mockResolvedValueOnce({ exceeded: false, bytes: 14500 }) // Over 14KB but not exceeded
        .mockResolvedValueOnce({
          exceeded: false,
          measurements: [{ bytes: 8000 }, { bytes: 6500 }]
        })
    };

    const Modal = {
      confirm: vi.fn().mockResolvedValue(true)
    };

    const result = await determinePaginationStrategy({
      buildInput,
      App,
      Modal,
      t
    });

    expect(result.shouldPaginate).toBe(true);
    expect(result.aborted).toBe(false);
    expect(Modal.confirm).toHaveBeenCalledWith(expect.stringContaining('14500'));
  });

  test('allows publishing without pagination when user declines split for >14KB', async () => {
    const buildInput = vi.fn()
      .mockResolvedValueOnce({ content: 'test1' })
      .mockResolvedValueOnce({ content: 'test2' });

    const App = {
      preview: vi.fn()
        .mockResolvedValueOnce({ exceeded: false, bytes: 14500 })
        .mockResolvedValueOnce({
          exceeded: false,
          measurements: [{ bytes: 8000 }, { bytes: 6500 }]
        })
    };

    const Modal = {
      confirm: vi.fn().mockResolvedValue(false) // User declines split
    };

    const result = await determinePaginationStrategy({
      buildInput,
      App,
      Modal,
      t
    });

    expect(result.shouldPaginate).toBe(false);
    expect(result.aborted).toBe(false); // Not aborted, can continue
  });
});

describe('executePublish', () => {
  const t = (key) => {
    if (key === 'editor.buildSuccess') return 'Published!';
    if (key === 'modal.ok') return 'OK';
    if (key === 'dashboard.view') return 'View';
    return key;
  };

  test('publishes and shows success modal for single page', async () => {
    const App = {
      publish: vi.fn().mockResolvedValue({
        slug: 'test-post',
        bytes: 12000
      })
    };

    const Modal = {
      success: vi.fn()
    };

    const result = await executePublish({
      input: { content: 'test' },
      App,
      Modal,
      t
    });

    expect(result.slug).toBe('test-post');
    expect(App.publish).toHaveBeenCalledWith({ content: 'test' });
    expect(Modal.success).toHaveBeenCalledWith(
      expect.stringContaining('Published!'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'OK' }),
        expect.objectContaining({ text: 'View' })
      ]),
      true
    );
    expect(Modal.success.mock.calls[0][0]).toContain('12000 bytes');
  });

  test('publishes and shows success modal for multi-page', async () => {
    const App = {
      publish: vi.fn().mockResolvedValue({
        slug: 'test-post',
        pageCount: 3,
        totalBytes: 35000
      })
    };

    const Modal = {
      success: vi.fn()
    };

    await executePublish({
      input: { content: 'test' },
      App,
      Modal,
      t
    });

    expect(Modal.success.mock.calls[0][0]).toContain('3 pages');
    expect(Modal.success.mock.calls[0][0]).toContain('35000 bytes');
  });

  test('view button opens correct URL', async () => {
    const App = {
      publish: vi.fn().mockResolvedValue({
        slug: 'my-post',
        bytes: 10000
      })
    };

    const Modal = {
      success: vi.fn()
    };

    // Mock window.open
    const originalOpen = window.open;
    window.open = vi.fn();

    await executePublish({
      input: { content: 'test' },
      App,
      Modal,
      t
    });

    // Get the view button action
    const viewButton = Modal.success.mock.calls[0][1].find(btn => btn.text === 'View');
    viewButton.action();

    expect(window.open).toHaveBeenCalledWith('/my-post', '_blank');

    // Restore
    window.open = originalOpen;
  });
});

describe('resetEditorForm', () => {
  test('resets all form elements', () => {
    const elements = {
      titleInput: { value: 'Test' },
      slugInput: { value: 'test' },
      blockEditor: { innerHTML: '<div>content</div>', appendChild: vi.fn() },
      titleOverrideEnabled: { checked: true, dispatchEvent: vi.fn() },
      titleOverrideInput: { value: 'Override' },
      navEnabled: { checked: true, dispatchEvent: vi.fn() },
      footerEnabled: { checked: true, dispatchEvent: vi.fn() },
      footerText: { value: 'Footer' },
      metaEnabled: { checked: true, dispatchEvent: vi.fn() },
      metaDescription: { value: 'Desc' },
      metaAuthor: { value: 'Author' },
      cssEnabled: { checked: true, dispatchEvent: vi.fn() },
      cssRules: { value: '.class {}' },
      liveCSS: { textContent: 'style' },
      pageTypeSelect: { value: 'page' },
      pageTypeHint: { textContent: 'hint' }
    };

    const callbacks = {
      createBlockElement: vi.fn().mockReturnValue(document.createElement('div')),
      loadGlobalNavigation: vi.fn(),
      clearAutoSave: vi.fn(),
      updateByteCounter: vi.fn(),
      updateCostRail: vi.fn(),
      updateTitleBytes: vi.fn()
    };

    resetEditorForm(elements, callbacks);

    // Check all values are reset
    expect(elements.titleInput.value).toBe('');
    expect(elements.slugInput.value).toBe('');
    expect(elements.blockEditor.innerHTML).toBe('');
    expect(elements.titleOverrideEnabled.checked).toBe(false);
    expect(elements.titleOverrideInput.value).toBe('');
    expect(elements.navEnabled.checked).toBe(false);
    expect(elements.footerEnabled.checked).toBe(false);
    expect(elements.footerText.value).toBe('');
    expect(elements.metaEnabled.checked).toBe(false);
    expect(elements.metaDescription.value).toBe('');
    expect(elements.metaAuthor.value).toBe('');
    expect(elements.cssEnabled.checked).toBe(false);
    expect(elements.cssRules.value).toBe('');
    expect(elements.liveCSS.textContent).toBe('');
    expect(elements.pageTypeSelect.value).toBe('post');
    expect(elements.pageTypeHint.textContent).toBe('');

    // Check callbacks were called
    expect(callbacks.createBlockElement).toHaveBeenCalledWith('paragraph');
    expect(elements.blockEditor.appendChild).toHaveBeenCalled();
    expect(callbacks.loadGlobalNavigation).toHaveBeenCalled();
    expect(callbacks.clearAutoSave).toHaveBeenCalled();
    expect(callbacks.updateByteCounter).toHaveBeenCalledWith(0, 0);
    expect(callbacks.updateCostRail).toHaveBeenCalled();
    expect(callbacks.updateTitleBytes).toHaveBeenCalled();

    // Check change events were dispatched
    expect(elements.titleOverrideEnabled.dispatchEvent).toHaveBeenCalled();
    expect(elements.navEnabled.dispatchEvent).toHaveBeenCalled();
    expect(elements.footerEnabled.dispatchEvent).toHaveBeenCalled();
    expect(elements.metaEnabled.dispatchEvent).toHaveBeenCalled();
    expect(elements.cssEnabled.dispatchEvent).toHaveBeenCalled();
  });
});
