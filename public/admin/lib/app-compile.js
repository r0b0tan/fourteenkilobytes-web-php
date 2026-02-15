/**
 * App compile/publish service.
 */

import { createCompileStyleService } from './app-compile-style.js';
import { createCompileMetricsService } from './app-compile-metrics.js';
import { createCompilePublishService } from './app-compile-publish.js';

export function createCompileService(deps) {
  const {
    Compiler,
    apiFetch,
    getSettings,
    getPosts,
    getSourceData,
    stripCssComments,
    finalizeCompiledPageHtml,
    isCompressionEnabledForSettings,
    isClassManglingEnabledForSettings,
    getClassManglingModeForSettings,
    contentHasSections,
  } = deps;

  const styleService = createCompileStyleService({
    getSettings,
    getPosts,
    stripCssComments,
    isClassManglingEnabledForSettings,
    getClassManglingModeForSettings,
    contentHasSections,
  });

  const metricsService = createCompileMetricsService({
    Compiler,
    getSettings,
    getPresetCSS: styleService.getPresetCSS,
    finalizeCompiledPageHtml,
    isCompressionEnabledForSettings,
    isClassManglingEnabledForSettings,
    getClassManglingModeForSettings,
  });

  const publishService = createCompilePublishService({
    Compiler,
    apiFetch,
    getSettings,
    getPosts,
    getSourceData,
    finalizeCompiledPageHtml,
    isCompressionEnabled: styleService.isCompressionEnabled,
    applyGlobalSettings: styleService.applyGlobalSettings,
  });

  return {
    ...styleService,
    ...metricsService,
    ...publishService,
  };
}
