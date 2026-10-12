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

const SITE_LANGUAGES = ['en', 'de'];

/**
 * Read the admin interface language of this browser
 * @returns {string|null} 'en', 'de' or null if unavailable
 */
export function getUiLanguage() {
  try {
    return globalThis.localStorage?.getItem('adminLanguage') ?? null;
  } catch {
    return null;
  }
}

/**
 * Get the language of the public site (html lang, dates and texts in post lists).
 * Settings saved before the site language existed fall back to the language chosen in
 * the setup wizard, then to the admin interface language.
 * @param {object} settings - Settings object
 * @param {string|null} uiLanguage - Admin interface language
 * @returns {string} 'en' or 'de'
 */
export function getSiteLanguageForSettings(settings, uiLanguage = getUiLanguage()) {
  for (const candidate of [settings?.siteLanguage, settings?.language, uiLanguage]) {
    if (SITE_LANGUAGES.includes(candidate)) return candidate;
  }
  return 'en';
}

/**
 * Texts for pages the admin generates automatically (default homepage, archive page)
 * @param {string} language - 'en' or 'de'
 */
export function getGeneratedPageTexts(language) {
  return language === 'de'
    ? {
        homepageSlug: 'startseite',
        homepageTitle: 'Startseite',
        homepageHeading: 'Willkommen',
        homepageText: 'Dies ist die Startseite deines Blogs. Du kannst diese Seite im Editor bearbeiten.',
        archiveTitle: 'Archiv',
      }
    : {
        homepageSlug: 'home',
        homepageTitle: 'Home',
        homepageHeading: 'Welcome',
        homepageText: 'This is the homepage of your blog. You can edit this page in the editor.',
        archiveTitle: 'Archive',
      };
}
