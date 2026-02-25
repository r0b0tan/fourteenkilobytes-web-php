import { describe, it, expect, vi } from 'vitest';

import { createCompileStyleService } from '../../public/admin/lib/app-compile-style.js';

describe('createCompileStyleService', () => {
  it('reuses one in-flight preset load for parallel requests', async () => {
    const fetchMock = vi.fn(async (url) => ({
      ok: true,
      async text() {
        if (url.includes('default.css')) return '/*a*/body{color:black;}';
        if (url.includes('light.css')) return 'body{color:#111;}';
        if (url.includes('dark.css')) return 'body{color:#eee;}';
        return '';
      },
    }));

    vi.stubGlobal('fetch', fetchMock);

    const service = createCompileStyleService({
      getSettings: vi.fn(async () => ({ cssEnabled: true, cssMode: 'default' })),
      getPosts: vi.fn(async () => []),
      stripCssComments: (css) => css.replace(/\/\*[\s\S]*?\*\//g, ''),
      isClassManglingEnabledForSettings: () => false,
      getClassManglingModeForSettings: () => 'safe',
      contentHasSections: () => false,
    });

    const [a, b] = await Promise.all([
      service.loadCssPresets(),
      service.loadCssPresets(),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(a).toEqual(b);
    expect(a.default).toBe('body{color:black;}');

    vi.unstubAllGlobals();
  });

  it('handles nested bloglist blocks in applyGlobalSettings', async () => {
    const getPosts = vi.fn(async () => [
      { slug: 'post-a', title: 'Post A', publishedAt: '2026-01-01', status: 'published', pageType: 'post' }
    ]);

    const service = createCompileStyleService({
      getSettings: vi.fn(async () => ({
        cssEnabled: false,
        siteTitleEnabled: false,
        bloglist: {
          limit: 7,
          archiveEnabled: true,
          archiveSlug: 'archiv',
          archiveLinkText: 'Alle Beiträge →',
        },
      })),
      getPosts,
      stripCssComments: (css) => css,
      isClassManglingEnabledForSettings: () => false,
      getClassManglingModeForSettings: () => 'none',
      contentHasSections: () => false,
    });

    const input = {
      slug: 'nested-bloglist',
      title: 'Nested Bloglist',
      content: [
        {
          type: 'section',
          children: [
            { type: 'bloglist' },
          ],
        },
        {
          type: 'layout',
          columns: 1,
          cells: [
            {
              children: [
                { type: 'bloglist' },
              ],
            },
          ],
        },
      ],
    };

    const merged = await service.applyGlobalSettings(input);

    expect(getPosts).toHaveBeenCalledTimes(1);
    expect(Array.isArray(merged.posts)).toBe(true);
    expect(merged.posts).toHaveLength(1);

    // Direct structural access — confirms the production traversal reaches both locations
    const sectionBloglist = merged.content[0].children[0]; // section → bloglist
    const layoutBloglist = merged.content[1].cells[0].children[0]; // layout → cell → bloglist

    for (const block of [sectionBloglist, layoutBloglist]) {
      expect(block.type).toBe('bloglist');
      expect(block.limit).toBe(7);
      expect(block.archiveLink).toEqual({
        href: '/archiv',
        text: 'Alle Beiträge →',
      });
    }
  });
});
