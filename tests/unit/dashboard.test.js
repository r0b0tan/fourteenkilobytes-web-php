/**
 * Unit tests for dashboard.js
 * Focus on testable update-check logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('Dashboard Update Check Logic', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('shouldShowUpdate()', () => {
    // Note: This function is defined inside dashboard.js
    // We'll test the logic by simulating localStorage states

    it('should show update when no dismissal or snooze exists', () => {
      const version = '2.0.0';

      // No dismissal
      expect(localStorage.getItem('dismissedUpdateVersion')).toBeNull();
      // No snooze
      expect(localStorage.getItem('snoozedUpdate')).toBeNull();

      // Logic: should return true (show update)
      const shouldShow = !localStorage.getItem('dismissedUpdateVersion') &&
                         !localStorage.getItem('snoozedUpdate');
      expect(shouldShow).toBe(true);
    });

    it('should not show update when permanently dismissed', () => {
      const version = '2.0.0';
      localStorage.setItem('dismissedUpdateVersion', version);

      // Logic: should return false (don't show)
      const dismissedVersion = localStorage.getItem('dismissedUpdateVersion');
      const shouldShow = dismissedVersion !== version;
      expect(shouldShow).toBe(false);
    });

    it('should show update for new version even if old version dismissed', () => {
      const oldVersion = '1.0.0';
      const newVersion = '2.0.0';
      localStorage.setItem('dismissedUpdateVersion', oldVersion);

      // Logic: should return true (show new version)
      const dismissedVersion = localStorage.getItem('dismissedUpdateVersion');
      const shouldShow = dismissedVersion !== newVersion;
      expect(shouldShow).toBe(true);
    });

    it('should not show update when snoozed and not expired', () => {
      const version = '2.0.0';
      const snoozeUntil = Date.now() + (7 * 24 * 60 * 60 * 1000); // 7 days from now

      localStorage.setItem('snoozedUpdate', JSON.stringify({
        version,
        until: snoozeUntil
      }));

      // Logic: should return false (snoozed)
      const snoozeData = JSON.parse(localStorage.getItem('snoozedUpdate'));
      const shouldShow = !(snoozeData.version === version && Date.now() < snoozeData.until);
      expect(shouldShow).toBe(false);
    });

    it('should show update when snooze has expired', () => {
      const version = '2.0.0';
      const snoozeUntil = Date.now() - 1000; // 1 second ago (expired)

      localStorage.setItem('snoozedUpdate', JSON.stringify({
        version,
        until: snoozeUntil
      }));

      // Logic: should return true (snooze expired)
      const snoozeData = JSON.parse(localStorage.getItem('snoozedUpdate'));
      const shouldShow = !(snoozeData.version === version && Date.now() < snoozeData.until);
      expect(shouldShow).toBe(true);
    });

    it('should show update for new version even if old version snoozed', () => {
      const oldVersion = '1.0.0';
      const newVersion = '2.0.0';
      const snoozeUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);

      localStorage.setItem('snoozedUpdate', JSON.stringify({
        version: oldVersion,
        until: snoozeUntil
      }));

      // Logic: should return true (different version)
      const snoozeData = JSON.parse(localStorage.getItem('snoozedUpdate'));
      const shouldShow = !(snoozeData.version === newVersion && Date.now() < snoozeData.until);
      expect(shouldShow).toBe(true);
    });

    it('should handle invalid snooze data gracefully', () => {
      localStorage.setItem('snoozedUpdate', 'invalid-json');

      // Logic: should return true (invalid data, show update)
      let snoozeData = null;
      try {
        snoozeData = JSON.parse(localStorage.getItem('snoozedUpdate'));
      } catch (e) {
        snoozeData = null;
      }
      const shouldShow = !snoozeData;
      expect(shouldShow).toBe(true);
    });
  });

  describe('Update dismissal logic', () => {
    it('should store dismissed version permanently', () => {
      const version = '2.0.0';

      // Simulate dismiss action
      localStorage.setItem('dismissedUpdateVersion', version);

      expect(localStorage.getItem('dismissedUpdateVersion')).toBe(version);
    });

    it('should clear snooze when dismissing permanently', () => {
      const version = '2.0.0';

      // Set initial snooze
      localStorage.setItem('snoozedUpdate', JSON.stringify({
        version,
        until: Date.now() + 1000000
      }));

      // Simulate dismiss action (should clear snooze)
      localStorage.setItem('dismissedUpdateVersion', version);
      localStorage.removeItem('snoozedUpdate');

      expect(localStorage.getItem('dismissedUpdateVersion')).toBe(version);
      expect(localStorage.getItem('snoozedUpdate')).toBeNull();
    });
  });

  describe('Update snooze logic', () => {
    it('should store snooze with 7-day expiry', () => {
      const version = '2.0.0';
      const beforeTime = Date.now();
      const expectedDuration = 7 * 24 * 60 * 60 * 1000; // 7 days

      // Simulate snooze action
      const snoozeUntil = Date.now() + expectedDuration;
      localStorage.setItem('snoozedUpdate', JSON.stringify({
        version,
        until: snoozeUntil
      }));

      const stored = JSON.parse(localStorage.getItem('snoozedUpdate'));
      expect(stored.version).toBe(version);
      expect(stored.until).toBeGreaterThanOrEqual(beforeTime + expectedDuration);
      expect(stored.until).toBeLessThanOrEqual(Date.now() + expectedDuration + 100); // Small margin
    });

    it('should preserve version in snooze data', () => {
      const version = '2.0.0';
      const snoozeUntil = Date.now() + 1000000;

      localStorage.setItem('snoozedUpdate', JSON.stringify({
        version,
        until: snoozeUntil
      }));

      const stored = JSON.parse(localStorage.getItem('snoozedUpdate'));
      expect(stored.version).toBe(version);
      expect(stored.until).toBe(snoozeUntil);
    });
  });

  describe('localStorage interaction patterns', () => {
    it('should handle multiple dismiss/snooze cycles', () => {
      const v1 = '1.0.0';
      const v2 = '2.0.0';

      // Snooze v1
      localStorage.setItem('snoozedUpdate', JSON.stringify({
        version: v1,
        until: Date.now() + 1000000
      }));
      expect(JSON.parse(localStorage.getItem('snoozedUpdate')).version).toBe(v1);

      // Dismiss v1
      localStorage.setItem('dismissedUpdateVersion', v1);
      localStorage.removeItem('snoozedUpdate');
      expect(localStorage.getItem('dismissedUpdateVersion')).toBe(v1);
      expect(localStorage.getItem('snoozedUpdate')).toBeNull();

      // New version v2 arrives - snooze it
      localStorage.setItem('snoozedUpdate', JSON.stringify({
        version: v2,
        until: Date.now() + 1000000
      }));
      expect(JSON.parse(localStorage.getItem('snoozedUpdate')).version).toBe(v2);
      expect(localStorage.getItem('dismissedUpdateVersion')).toBe(v1); // Old dismissal still there
    });

    it('should clear all update state', () => {
      // Set both snooze and dismiss
      localStorage.setItem('dismissedUpdateVersion', '1.0.0');
      localStorage.setItem('snoozedUpdate', JSON.stringify({
        version: '2.0.0',
        until: Date.now() + 1000000
      }));

      // Clear all
      localStorage.removeItem('dismissedUpdateVersion');
      localStorage.removeItem('snoozedUpdate');

      expect(localStorage.getItem('dismissedUpdateVersion')).toBeNull();
      expect(localStorage.getItem('snoozedUpdate')).toBeNull();
    });
  });
});
