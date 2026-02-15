/**
 * Test setup file
 * Mocks global objects needed for admin interface
 */

import { vi } from 'vitest';

// Mock window.i18nReady
global.window = global.window || {};
window.i18nReady = vi.fn(() => Promise.resolve());

// Mock window.App
window.App = {
  getSetupStatus: vi.fn(() => Promise.resolve({ setupComplete: true })),
  getConfig: vi.fn(() => Promise.resolve({ authEnabled: true })),
  isLoggedIn: vi.fn(() => Promise.resolve(true)),
  logout: vi.fn(() => Promise.resolve()),
  getSettings: vi.fn(() => Promise.resolve({})),
};

// Prevent real network calls during module side-effect initialization
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// Mock window.location
delete window.location;
window.location = {
  href: '',
  assign: vi.fn(),
  reload: vi.fn(),
};
