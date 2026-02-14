/**
 * Unit tests for common.js utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  debounce,
  initAuthGuard,
  setupLogoutHandler,
  hideLoadingOverlay,
  initLoginPage,
} from '../../public/admin/lib/common.js';

describe('debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should delay function execution', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn();
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should cancel previous call when invoked multiple times', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn();
    vi.advanceTimersByTime(100);
    debouncedFn();
    vi.advanceTimersByTime(100);
    debouncedFn();

    vi.advanceTimersByTime(300);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should pass arguments to debounced function', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn('arg1', 'arg2', 42);
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2', 42);
  });

  it('should use custom delay', () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 500);

    debouncedFn();
    vi.advanceTimersByTime(499);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('initAuthGuard', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    window.location.href = '';
  });

  it('should redirect to /setup/ if setup is not complete', async () => {
    window.App.getSetupStatus.mockResolvedValueOnce({ setupComplete: false });

    await expect(initAuthGuard()).rejects.toThrow('Setup not complete');
    expect(window.location.href).toBe('/setup/');
  });

  it('should redirect if auth is enabled and user is not logged in', async () => {
    window.App.getSetupStatus.mockResolvedValueOnce({ setupComplete: true });
    window.App.getConfig.mockResolvedValueOnce({ authEnabled: true });
    window.App.isLoggedIn.mockResolvedValueOnce(false);

    await expect(
      initAuthGuard({ redirectIfNotAuth: 'index.html' })
    ).rejects.toThrow('Not authenticated');
    expect(window.location.href).toBe('index.html');
  });

  it('should succeed if auth is enabled and user is logged in', async () => {
    window.App.getSetupStatus.mockResolvedValueOnce({ setupComplete: true });
    window.App.getConfig.mockResolvedValueOnce({ authEnabled: true });
    window.App.isLoggedIn.mockResolvedValueOnce(true);

    const config = await initAuthGuard();
    expect(config).toEqual({ authEnabled: true });
    expect(window.location.href).toBe('');
  });

  it('should succeed if auth is disabled (requireAuth: false)', async () => {
    window.App.getSetupStatus.mockResolvedValueOnce({ setupComplete: true });
    window.App.getConfig.mockResolvedValueOnce({ authEnabled: false });

    const config = await initAuthGuard({ requireAuth: false });
    expect(config).toEqual({ authEnabled: false });
    expect(window.location.href).toBe('');
  });

  it('should use default redirectIfNotAuth value', async () => {
    window.App.getSetupStatus.mockResolvedValueOnce({ setupComplete: true });
    window.App.getConfig.mockResolvedValueOnce({ authEnabled: true });
    window.App.isLoggedIn.mockResolvedValueOnce(false);

    await expect(initAuthGuard()).rejects.toThrow('Not authenticated');
    expect(window.location.href).toBe('index.html');
  });

  it('should wait for i18n to be ready', async () => {
    window.App.getSetupStatus.mockResolvedValueOnce({ setupComplete: true });
    window.App.getConfig.mockResolvedValueOnce({ authEnabled: false });

    await initAuthGuard({ requireAuth: false });
    expect(window.i18nReady).toHaveBeenCalled();
  });
});

describe('setupLogoutHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = '';
    document.body.innerHTML = '';
  });

  it('should attach logout handler to button', async () => {
    const button = document.createElement('button');
    button.id = 'logout-btn';
    document.body.appendChild(button);

    setupLogoutHandler();

    button.click();
    await vi.waitFor(() => {
      expect(window.App.logout).toHaveBeenCalled();
    });
  });

  it('should redirect after logout', async () => {
    const button = document.createElement('button');
    button.id = 'logout-btn';
    document.body.appendChild(button);

    setupLogoutHandler('logout-btn', '/custom/logout.html');

    button.click();
    await vi.waitFor(() => {
      expect(window.location.href).toBe('/custom/logout.html');
    });
  });

  it('should handle custom button ID', async () => {
    const button = document.createElement('button');
    button.id = 'custom-logout';
    document.body.appendChild(button);

    setupLogoutHandler('custom-logout');

    button.click();
    await vi.waitFor(() => {
      expect(window.App.logout).toHaveBeenCalled();
    });
  });

  it('should do nothing if button does not exist', () => {
    expect(() => setupLogoutHandler('non-existent')).not.toThrow();
  });
});

describe('hideLoadingOverlay', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should remove loading overlay element', () => {
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    document.body.appendChild(overlay);

    expect(document.getElementById('loading-overlay')).toBeTruthy();
    hideLoadingOverlay();
    expect(document.getElementById('loading-overlay')).toBeNull();
  });

  it('should handle custom overlay ID', () => {
    const overlay = document.createElement('div');
    overlay.id = 'custom-overlay';
    document.body.appendChild(overlay);

    hideLoadingOverlay('custom-overlay');
    expect(document.getElementById('custom-overlay')).toBeNull();
  });

  it('should not throw if overlay does not exist', () => {
    expect(() => hideLoadingOverlay()).not.toThrow();
  });
});

describe('initLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.location.href = '';
  });

  it('should redirect to /setup/ if setup is not complete', async () => {
    window.App.getSetupStatus.mockResolvedValueOnce({ setupComplete: false });

    await expect(initLoginPage()).rejects.toThrow('Setup not complete');
    expect(window.location.href).toBe('/setup/');
  });

  it('should redirect to dashboard if auth is disabled', async () => {
    window.App.getSetupStatus.mockResolvedValueOnce({ setupComplete: true });
    window.App.getConfig.mockResolvedValueOnce({ authEnabled: false });

    await expect(initLoginPage()).rejects.toThrow('Auth not enabled');
    expect(window.location.href).toBe('/admin/');
  });

  it('should redirect to dashboard if already logged in', async () => {
    window.App.getSetupStatus.mockResolvedValueOnce({ setupComplete: true });
    window.App.getConfig.mockResolvedValueOnce({ authEnabled: true });
    window.App.isLoggedIn.mockResolvedValueOnce(true);

    await expect(initLoginPage()).rejects.toThrow('Already logged in');
    expect(window.location.href).toBe('/admin/');
  });

  it('should return true if login form should be shown', async () => {
    window.App.getSetupStatus.mockResolvedValueOnce({ setupComplete: true });
    window.App.getConfig.mockResolvedValueOnce({ authEnabled: true });
    window.App.isLoggedIn.mockResolvedValueOnce(false);

    const result = await initLoginPage();
    expect(result).toBe(true);
    expect(window.location.href).toBe('');
  });

  it('should use custom redirect URL', async () => {
    window.App.getSetupStatus.mockResolvedValueOnce({ setupComplete: true });
    window.App.getConfig.mockResolvedValueOnce({ authEnabled: false });

    await expect(
      initLoginPage({ redirectIfLoggedIn: '/custom/' })
    ).rejects.toThrow('Auth not enabled');
    expect(window.location.href).toBe('/custom/');
  });

  it('should wait for i18n to be ready', async () => {
    window.App.getSetupStatus.mockResolvedValueOnce({ setupComplete: true });
    window.App.getConfig.mockResolvedValueOnce({ authEnabled: true });
    window.App.isLoggedIn.mockResolvedValueOnce(false);

    await initLoginPage();
    expect(window.i18nReady).toHaveBeenCalled();
  });
});
