/**
 * Unit tests for settings-utils.js
 */

import { describe, it, expect } from 'vitest';
import {
  isCompressionEnabledForSettings,
  isClassManglingEnabledForSettings,
  getClassManglingModeForSettings,
} from '../../public/admin/lib/settings-utils.js';

describe('Settings Utils Module', () => {
  describe('isCompressionEnabledForSettings()', () => {
    it('should return true by default (no settings)', () => {
      expect(isCompressionEnabledForSettings({})).toBe(true);
    });

    it('should return true when compression is explicitly enabled', () => {
      const settings = {
        optimizations: {
          compression: {
            enabled: true,
          },
        },
      };
      expect(isCompressionEnabledForSettings(settings)).toBe(true);
    });

    it('should return false when compression is explicitly disabled', () => {
      const settings = {
        optimizations: {
          compression: {
            enabled: false,
          },
        },
      };
      expect(isCompressionEnabledForSettings(settings)).toBe(false);
    });

    it('should return true when optimizations object is missing', () => {
      const settings = {};
      expect(isCompressionEnabledForSettings(settings)).toBe(true);
    });

    it('should return true when compression object is missing', () => {
      const settings = {
        optimizations: {},
      };
      expect(isCompressionEnabledForSettings(settings)).toBe(true);
    });

    it('should handle null settings', () => {
      expect(isCompressionEnabledForSettings(null)).toBe(true);
    });

    it('should handle undefined settings', () => {
      expect(isCompressionEnabledForSettings(undefined)).toBe(true);
    });
  });

  describe('isClassManglingEnabledForSettings()', () => {
    it('should return false by default (no settings)', () => {
      expect(isClassManglingEnabledForSettings({})).toBe(false);
    });

    it('should return true when class mangling is explicitly enabled', () => {
      const settings = {
        optimizations: {
          classMangling: {
            enabled: true,
          },
        },
      };
      expect(isClassManglingEnabledForSettings(settings)).toBe(true);
    });

    it('should return false when class mangling is explicitly disabled', () => {
      const settings = {
        optimizations: {
          classMangling: {
            enabled: false,
          },
        },
      };
      expect(isClassManglingEnabledForSettings(settings)).toBe(false);
    });

    it('should return false when optimizations object is missing', () => {
      const settings = {};
      expect(isClassManglingEnabledForSettings(settings)).toBe(false);
    });

    it('should return false when classMangling object is missing', () => {
      const settings = {
        optimizations: {},
      };
      expect(isClassManglingEnabledForSettings(settings)).toBe(false);
    });

    it('should handle null settings', () => {
      expect(isClassManglingEnabledForSettings(null)).toBe(false);
    });

    it('should handle undefined settings', () => {
      expect(isClassManglingEnabledForSettings(undefined)).toBe(false);
    });
  });

  describe('getClassManglingModeForSettings()', () => {
    it('should return "safe" by default (no settings)', () => {
      expect(getClassManglingModeForSettings({})).toBe('safe');
    });

    it('should return "safe" when class mangling is disabled', () => {
      const settings = {
        optimizations: {
          classMangling: {
            enabled: false,
            mode: 'aggressive',
          },
        },
      };
      expect(getClassManglingModeForSettings(settings)).toBe('safe');
    });

    it('should return "safe" when mode is "safe" and mangling is enabled', () => {
      const settings = {
        optimizations: {
          classMangling: {
            enabled: true,
            mode: 'safe',
          },
        },
      };
      expect(getClassManglingModeForSettings(settings)).toBe('safe');
    });

    it('should return "aggressive" when mode is "aggressive" and mangling is enabled', () => {
      const settings = {
        optimizations: {
          classMangling: {
            enabled: true,
            mode: 'aggressive',
          },
        },
      };
      expect(getClassManglingModeForSettings(settings)).toBe('aggressive');
    });

    it('should return "safe" when mode is missing but mangling is enabled', () => {
      const settings = {
        optimizations: {
          classMangling: {
            enabled: true,
          },
        },
      };
      expect(getClassManglingModeForSettings(settings)).toBe('safe');
    });

    it('should return "safe" for invalid mode values', () => {
      const settings = {
        optimizations: {
          classMangling: {
            enabled: true,
            mode: 'invalid',
          },
        },
      };
      expect(getClassManglingModeForSettings(settings)).toBe('safe');
    });

    it('should handle null settings', () => {
      expect(getClassManglingModeForSettings(null)).toBe('safe');
    });

    it('should handle undefined settings', () => {
      expect(getClassManglingModeForSettings(undefined)).toBe('safe');
    });
  });
});
