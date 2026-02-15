/**
 * Preview and publish workflows for compile service.
 */

export function createCompilePublishService(deps) {
  const {
    Compiler,
    apiFetch,
    getSettings,
    getPosts,
    getSourceData,
    finalizeCompiledPageHtml,
    isCompressionEnabled,
    applyGlobalSettings,
    createBuildId,
  } = deps;

  const makeBuildId = typeof createBuildId === 'function'
    ? createBuildId
    : () => crypto.randomUUID();

  function buildSourceData(input) {
    return {
      slug: input.slug,
      title: input.title,
      content: input.content,
      navigation: input.navigation,
      footer: input.footer,
      css: input.css,
      meta: input.meta,
      icons: input.icons,
      allowPagination: input.allowPagination,
      pageType: input.pageType,
    };
  }

  async function preview(input) {
    const useGlobal = input.useGlobalSettings !== false;
    const compilerInput = useGlobal ? await applyGlobalSettings(input) : input;

    const result = await Compiler.dryRun(compilerInput);

    if (!result.wouldSucceed) {
      const errorCode = result.error?.code;

      const sizeErrors = [
        'SIZE_LIMIT_EXCEEDED',
        'PAGINATION_DISABLED',
        'PAGINATION_BLOCK_TOO_LARGE',
        'PAGINATION_NO_CONVERGENCE'
      ];
      const isExceeded = sizeErrors.includes(errorCode);

      if (isExceeded && result.partialMeasurements) {
        const { total, overhead, content } = result.partialMeasurements.measurements;
        const breakdown = result.partialMeasurements.breakdown;

        let blockTooLarge = null;
        if (result.error.oversizedBlock) {
          blockTooLarge = {
            blockIndex: result.error.oversizedBlock.index,
            blockSize: result.error.oversizedBlock.size,
            availableBudget: result.error.oversizedBlock.availableBudget,
          };
        }

        return {
          html: '',
          bytes: total,
          overheadBytes: overhead,
          contentBytes: content,
          breakdown,
          measurements: null,
          exceeded: true,
          blockTooLarge,
        };
      }

      if (isExceeded) {
        return {
          html: '',
          bytes: result.error?.measured || 0,
          overheadBytes: 0,
          contentBytes: 0,
          breakdown: null,
          measurements: null,
          exceeded: true,
          blockTooLarge: null,
        };
      }

      throw new Error(result.error?.code || 'Compilation failed');
    }

    const page = result.pages[0];
    const { total, overhead, content } = result.measurements[0].measurements;
    const breakdown = result.measurements[0].breakdown;

    const compressionEnabled = await isCompressionEnabled();
    const finalized = finalizeCompiledPageHtml(page.html, page.bytes, compressionEnabled);

    return {
      html: finalized.html,
      bytes: finalized.bytes,
      overheadBytes: overhead,
      contentBytes: content,
      breakdown,
      measurements: result.measurements,
    };
  }

  async function publish(input) {
    const useGlobal = input.useGlobalSettings !== false;
    const compilerInput = useGlobal ? await applyGlobalSettings(input) : input;

    const result = await Compiler.compile(compilerInput);
    if (!result.success) {
      throw new Error(result.error?.code || 'Compilation failed');
    }

    if (result.pages.length > 1) {
      const compressionEnabled = await isCompressionEnabled();
      const pages = result.pages.map(page => {
        const finalized = finalizeCompiledPageHtml(page.html, page.bytes, compressionEnabled);
        return {
          slug: page.slug,
          html: finalized.html,
          bytes: finalized.bytes,
          hash: page.hash,
        };
      });

      return apiFetch('/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          pages,
          title: input.title,
          pageType: input.pageType || 'post',
          sourceData: buildSourceData(input),
        }),
      });
    }

    const page = result.pages[0];
    const compressionEnabled = await isCompressionEnabled();
    const finalized = finalizeCompiledPageHtml(page.html, page.bytes, compressionEnabled);

    return apiFetch('/api/posts', {
      method: 'POST',
      body: JSON.stringify({
        slug: page.slug,
        title: input.title,
        html: finalized.html,
        bytes: finalized.bytes,
        hash: page.hash,
        pageType: input.pageType || 'post',
        sourceData: buildSourceData(input),
      }),
    });
  }

  async function republishPost(slug) {
    const sourceData = await getSourceData(slug);
    const posts = await getPosts();

    const input = {
      ...sourceData,
      posts,
      buildId: makeBuildId(),
    };

    return publish(input);
  }

  async function createDefaultHomepage() {
    const homepageInput = {
      slug: 'startseite',
      title: 'Startseite',
      pageType: 'page',
      content: [
        {
          type: 'heading',
          level: 1,
          children: [{ type: 'text', text: 'Willkommen' }]
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Dies ist die Startseite deines Blogs. Du kannst diese Seite im Editor bearbeiten.' }]
        },
        {
          type: 'bloglist',
        }
      ],
      icons: [],
      allowPagination: true,
      _autoGenerated: 'homepage',
    };

    return publish(homepageInput);
  }

  async function generateArchivePage() {
    const settings = await getSettings();

    if (!settings.bloglist?.archiveEnabled) {
      return null;
    }

    const archiveSlug = settings.bloglist.archiveSlug || 'archiv';
    const archiveTitle = 'Archiv';

    const archiveInput = {
      slug: archiveSlug,
      title: archiveTitle,
      pageType: 'page',
      content: [
        {
          type: 'heading',
          level: 1,
          children: [{ type: 'text', text: archiveTitle }]
        },
        {
          type: 'bloglist',
          limit: null,
        }
      ],
      icons: [],
      allowPagination: true,
      _autoGenerated: 'archive',
    };

    return publish(archiveInput);
  }

  return {
    preview,
    publish,
    republishPost,
    createDefaultHomepage,
    generateArchivePage,
  };
}
