/**
 * Overhead and settings metrics for compile service.
 */

export function createCompileMetricsService(deps) {
  const {
    Compiler,
    getSettings,
    getPresetCSS,
    finalizeCompiledPageHtml,
    isCompressionEnabledForSettings,
    isClassManglingEnabledForSettings,
    getClassManglingModeForSettings,
  } = deps;

  async function previewOverhead(settings) {
    const actualCss = settings.cssEnabled === false
      ? null
      : await getPresetCSS(settings.cssMode || 'default', settings.globalCss);

    let meta = null;
    if (settings.meta?.description || settings.meta?.author) {
      meta = {};
      if (settings.meta.description) meta.description = settings.meta.description;
      if (settings.meta.author) meta.author = settings.meta.author;
    }

    const testInput = {
      slug: 'overhead-test',
      title: 'Test',
      content: [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }],
      navigation: settings.header?.enabled && settings.header.links?.length > 0
        ? { items: settings.header.links }
        : null,
      footer: settings.footer?.enabled && settings.footer.content
        ? { content: settings.footer.content }
        : null,
      css: actualCss
        ? { rules: actualCss }
        : null,
      meta,
      favicon: settings.favicon || null,
      icons: [],
      allowPagination: false,
      buildId: 'overhead-test',
      classMangling: isClassManglingEnabledForSettings(settings),
      classManglingMode: getClassManglingModeForSettings(settings),
    };

    const result = await Compiler.dryRun(testInput);
    if (!result.wouldSucceed) {
      throw new Error(result.error?.code || 'Compilation failed');
    }

    const page = result.pages[0];
    const compressionEnabled = isCompressionEnabledForSettings(settings);
    const finalized = finalizeCompiledPageHtml(page.html, page.bytes, compressionEnabled);
    const breakdown = result.measurements?.[0]?.breakdown || {};

    return {
      overheadBytes: finalized.bytes,
      measurements: result.measurements,
      breakdown,
    };
  }

  async function getGlobalSettingsInfo() {
    const settings = await getSettings();

    const baseInput = {
      slug: 'base-test',
      title: 'T',
      content: [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }],
      navigation: null,
      footer: null,
      css: null,
      meta: null,
      icons: [],
      allowPagination: false,
      buildId: 'base-test',
    };
    const baseResult = await Compiler.dryRun(baseInput);
    const baseBytes = baseResult.wouldSucceed ? baseResult.measurements[0].breakdown.base : 0;

    let headerBytes = 0;
    let headerActive = false;
    if (settings.header?.enabled && settings.header.links?.length > 0) {
      headerActive = true;
      const headerInput = {
        ...baseInput,
        navigation: { items: settings.header.links },
        buildId: 'header-test',
      };
      const headerResult = await Compiler.dryRun(headerInput);
      if (headerResult.wouldSucceed) {
        headerBytes = headerResult.measurements[0].breakdown.navigation;
      }
    }

    let footerBytes = 0;
    let footerActive = false;
    if (settings.footer?.enabled && settings.footer.content) {
      footerActive = true;
      const footerInput = {
        ...baseInput,
        footer: { content: settings.footer.content },
        buildId: 'footer-test',
      };
      const footerResult = await Compiler.dryRun(footerInput);
      if (footerResult.wouldSucceed) {
        footerBytes = footerResult.measurements[0].breakdown.footer;
      }
    }

    let cssBytes = 0;
    let cssActive = false;
    if (settings.globalCss) {
      cssActive = true;
      const cssInput = {
        ...baseInput,
        css: { rules: settings.globalCss },
        buildId: 'css-test',
      };
      const cssResult = await Compiler.dryRun(cssInput);
      if (cssResult.wouldSucceed) {
        cssBytes = cssResult.measurements[0].breakdown.css;
      }
    }

    return {
      header: {
        active: headerActive,
        bytes: headerBytes,
        links: settings.header?.links || [],
      },
      footer: {
        active: footerActive,
        bytes: footerBytes,
        content: settings.footer?.content || '',
      },
      css: {
        active: cssActive,
        bytes: cssBytes,
      },
      baseBytes,
      totalOverhead: baseBytes + headerBytes + footerBytes + cssBytes,
    };
  }

  return {
    previewOverhead,
    getGlobalSettingsInfo,
  };
}
