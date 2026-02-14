/**
 * Settings Utility Functions
 *
 * Pure functions for extracting optimization settings.
 */

/**
 * Check if compression/minification is enabled in settings
 * @param {object} settings - Settings object
 * @returns {boolean} True if compression is enabled (default: true)
 */
export function isCompressionEnabledForSettings(settings) {
  return settings?.optimizations?.compression?.enabled !== false;
}

/**
 * Check if class mangling is enabled in settings
 * @param {object} settings - Settings object
 * @returns {boolean} True if class mangling is enabled (default: false)
 */
export function isClassManglingEnabledForSettings(settings) {
  return settings?.optimizations?.classMangling?.enabled === true;
}

/**
 * Get class mangling mode from settings
 * @param {object} settings - Settings object
 * @returns {string} 'safe' or 'aggressive' (default: 'safe')
 */
export function getClassManglingModeForSettings(settings) {
  if (!isClassManglingEnabledForSettings(settings)) return 'safe';
  return settings?.optimizations?.classMangling?.mode === 'aggressive' ? 'aggressive' : 'safe';
}
