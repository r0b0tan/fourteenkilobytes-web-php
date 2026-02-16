import { describe, it, expect, vi } from 'vitest';

import { createCompileStyleService } from '../../public/admin/lib/app-compile-style.js';

function collectBloglists(blocks) {
  const found = [];

  const walk = (block) => {
    if (!block || typeof block !== 'object') return;
    if (block.type === 'bloglist') {
      found.push(block);
    }

    if (Array.isArray(block.children)) {
      block.children.forEach(walk);
    }

    if (Array.isArray(block.cells)) {
      block.cells.forEach(cell => {
        if (Array.isArray(cell?.children)) {
          cell.children.forEach(walk);
        }
      });
    }
  };

  (blocks || []).forEach(walk);
  return found;
}

describe('createCompileStyleService', () => {
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

    const bloglists = collectBloglists(merged.content);
    expect(bloglists).toHaveLength(2);

    for (const block of bloglists) {
      expect(block.limit).toBe(7);
      expect(block.archiveLink).toEqual({
        href: '/archiv',
        text: 'Alle Beiträge →',
      });
    }
  });
});
