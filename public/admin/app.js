/**
 * fourteenkilobytes Admin App (PHP Version)
 *
 * Vanilla JS module for admin UI.
 * Uses client-side compiler for preview and publish.
 * Auth via HttpOnly cookie (set by server).
 */

import * as Compiler from './compiler.browser.js';

import { stripCssComments, minifyCss, minifyHtmlDocument } from './lib/css-utils.js';
import { getByteLength, finalizeCompiledPageHtml } from './lib/byte-utils.js';
import {
  isCompressionEnabledForSettings,
  isClassManglingEnabledForSettings,
  getClassManglingModeForSettings,
} from './lib/settings-utils.js';
import { contentHasSections } from './lib/content-utils.js';
import { createAppApi } from './lib/app-api.js';
import { createCompileService } from './lib/app-compile.js';
import { escapeHtml, formatDate, slugify } from './lib/app-utils.js';

const App = (function() {
  const api = createAppApi();

  const compileService = createCompileService({
    Compiler,
    apiFetch: api.apiFetch,
    getSettings: api.getSettings,
    getPosts: api.getPosts,
    getSourceData: api.getSourceData,
    stripCssComments,
    finalizeCompiledPageHtml,
    isCompressionEnabledForSettings,
    isClassManglingEnabledForSettings,
    getClassManglingModeForSettings,
    contentHasSections,
  });

  function getAvailableIcons() {
    return Compiler.getAvailableIconIds();
  }

  function getIconSvg(id) {
    return Compiler.getIconSvg(id);
  }

  return {
    ...api,
    ...compileService,
    escapeHtml,
    formatDate,
    slugify,
    getAvailableIcons,
    getIconSvg,
    stripCssComments,
    minifyCss,
    minifyHtmlDocument,
    getByteLength,
    finalizeCompiledPageHtml,
    contentHasSections,
    isCompressionEnabledForSettings,
    isClassManglingEnabledForSettings,
    getClassManglingModeForSettings,
  };
})();

window.App = App;
