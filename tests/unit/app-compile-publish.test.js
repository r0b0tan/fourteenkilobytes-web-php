import { describe, test, expect, vi, beforeEach } from 'vitest';
import { createCompilePublishService } from '../../public/admin/lib/app-compile-publish.js';

describe('createCompilePublishService', () => {
  let deps;

  beforeEach(() => {
    deps = {
      Compiler: {
        dryRun: vi.fn(),
        compile: vi.fn(),
      },
      apiFetch: vi.fn(),
      getSettings: vi.fn(),
      getPosts: vi.fn(),
      getSourceData: vi.fn(),
      finalizeCompiledPageHtml: vi.fn((html, bytes) => ({ html: `final:${html}`, bytes: bytes + 1 })),
      isCompressionEnabled: vi.fn().mockResolvedValue(true),
      applyGlobalSettings: vi.fn(async (input) => ({ ...input, _global: true })),
      createBuildId: vi.fn(() => 'build-id-1'),
    };
  });

  test('preview applies global settings by default and returns finalized output', async () => {
    deps.Compiler.dryRun.mockResolvedValue({
      wouldSucceed: true,
      pages: [{ html: '<p>A</p>', bytes: 100 }],
      measurements: [{
        measurements: { total: 100, overhead: 20, content: 80 },
        breakdown: { blocks: [] },
      }],
    });

    const service = createCompilePublishService(deps);
    const result = await service.preview({ slug: 'a' });

    expect(deps.applyGlobalSettings).toHaveBeenCalledWith({ slug: 'a' });
    expect(deps.Compiler.dryRun).toHaveBeenCalledWith({ slug: 'a', _global: true });
    expect(deps.finalizeCompiledPageHtml).toHaveBeenCalledWith('<p>A</p>', 100, true);
    expect(result).toMatchObject({
      html: 'final:<p>A</p>',
      bytes: 101,
      overheadBytes: 20,
      contentBytes: 80,
      breakdown: { blocks: [] },
    });
  });

  test('preview skips global settings when useGlobalSettings is false', async () => {
    deps.Compiler.dryRun.mockResolvedValue({
      wouldSucceed: true,
      pages: [{ html: '<p>A</p>', bytes: 100 }],
      measurements: [{
        measurements: { total: 100, overhead: 20, content: 80 },
        breakdown: null,
      }],
    });

    const service = createCompilePublishService(deps);
    await service.preview({ slug: 'a', useGlobalSettings: false });

    expect(deps.applyGlobalSettings).not.toHaveBeenCalled();
    expect(deps.Compiler.dryRun).toHaveBeenCalledWith({ slug: 'a', useGlobalSettings: false });
  });

  test('preview returns exceeded details for size errors with partial measurements', async () => {
    deps.Compiler.dryRun.mockResolvedValue({
      wouldSucceed: false,
      error: {
        code: 'SIZE_LIMIT_EXCEEDED',
        oversizedBlock: { index: 3, size: 9000, availableBudget: 7000 },
      },
      partialMeasurements: {
        measurements: { total: 16000, overhead: 2000, content: 14000 },
        breakdown: { sections: 2 },
      },
    });

    const service = createCompilePublishService(deps);
    const result = await service.preview({ slug: 'a' });

    expect(result).toEqual({
      html: '',
      bytes: 16000,
      overheadBytes: 2000,
      contentBytes: 14000,
      breakdown: { sections: 2 },
      measurements: null,
      exceeded: true,
      blockTooLarge: {
        blockIndex: 3,
        blockSize: 9000,
        availableBudget: 7000,
      },
    });
  });

  test('preview throws for non-size compiler errors', async () => {
    deps.Compiler.dryRun.mockResolvedValue({
      wouldSucceed: false,
      error: { code: 'INVALID_INPUT' },
    });

    const service = createCompilePublishService(deps);

    await expect(service.preview({ slug: 'a' })).rejects.toThrow('INVALID_INPUT');
  });

  test('publish sends single-page payload with sourceData and finalized content', async () => {
    deps.Compiler.compile.mockResolvedValue({
      success: true,
      pages: [{ slug: 'one', html: '<p>1</p>', bytes: 100, hash: 'h1' }],
    });
    deps.apiFetch.mockResolvedValue({ slug: 'one' });

    const service = createCompilePublishService(deps);
    await service.publish({
      slug: 'source-slug',
      title: 'Title',
      content: [{ type: 'paragraph' }],
      navigation: [],
      footer: [],
      css: {},
      meta: { a: 1 },
      icons: ['x'],
      allowPagination: true,
      pageType: 'page',
    });

    expect(deps.apiFetch).toHaveBeenCalledTimes(1);
    const [, request] = deps.apiFetch.mock.calls[0];
    const payload = JSON.parse(request.body);

    expect(payload).toMatchObject({
      slug: 'one',
      title: 'Title',
      html: 'final:<p>1</p>',
      bytes: 101,
      hash: 'h1',
      pageType: 'page',
      sourceData: {
        slug: 'source-slug',
        title: 'Title',
        content: [{ type: 'paragraph' }],
        navigation: [],
        footer: [],
        css: {},
        meta: { a: 1 },
        icons: ['x'],
        allowPagination: true,
        pageType: 'page',
      },
    });
  });

  test('publish sends multi-page payload and defaults pageType to post', async () => {
    deps.Compiler.compile.mockResolvedValue({
      success: true,
      pages: [
        { slug: 'p1', html: '<p>1</p>', bytes: 100, hash: 'h1' },
        { slug: 'p2', html: '<p>2</p>', bytes: 120, hash: 'h2' },
      ],
    });
    deps.apiFetch.mockResolvedValue({ ok: true });

    const service = createCompilePublishService(deps);
    await service.publish({ slug: 'source-slug', title: 'Title', content: [] });

    const [, request] = deps.apiFetch.mock.calls[0];
    const payload = JSON.parse(request.body);

    expect(payload.pageType).toBe('post');
    expect(payload.title).toBe('Title');
    expect(payload.sourceData).toMatchObject({ slug: 'source-slug', title: 'Title' });
    expect(payload.pages).toEqual([
      { slug: 'p1', html: 'final:<p>1</p>', bytes: 101, hash: 'h1' },
      { slug: 'p2', html: 'final:<p>2</p>', bytes: 121, hash: 'h2' },
    ]);
  });

  test('republishPost builds input from source data, posts and injected build id', async () => {
    deps.getSourceData.mockResolvedValue({
      slug: 'republish-slug',
      title: 'Republish',
      content: [],
      navigation: [],
      footer: [],
      css: {},
      meta: {},
      icons: [],
      allowPagination: false,
      pageType: 'post',
    });
    deps.getPosts.mockResolvedValue([{ slug: 'old-1' }]);
    deps.Compiler.compile.mockResolvedValue({
      success: true,
      pages: [{ slug: 'republish-slug', html: '<p>x</p>', bytes: 200, hash: 'hx' }],
    });
    deps.apiFetch.mockResolvedValue({ slug: 'republish-slug' });

    const service = createCompilePublishService(deps);
    await service.republishPost('republish-slug');

    expect(deps.createBuildId).toHaveBeenCalledTimes(1);
    expect(deps.Compiler.compile).toHaveBeenCalledWith(expect.objectContaining({
      slug: 'republish-slug',
      posts: [{ slug: 'old-1' }],
      buildId: 'build-id-1',
    }));
  });
});
