/**
 * Integration test against the bundled compiler (public/admin/compiler.browser.js).
 */
import { describe, it, expect } from 'vitest';
import { compile } from '../../public/admin/compiler.browser.js';

function input(language) {
  return {
    slug: 'start',
    title: 'Start',
    content: [{ type: 'bloglist' }],
    navigation: null,
    footer: null,
    css: null,
    meta: null,
    icons: [],
    allowPagination: false,
    buildId: 'test',
    posts: [{ slug: 'hello', title: 'Hello', publishedAt: '2026-03-05T12:00:00+00:00', status: 'published', pageType: 'post' }],
    language,
  };
}

describe('bundled compiler: site language', () => {
  it('writes German page language and dates', async () => {
    const result = await compile(input('de'));
    expect(result.success).toBe(true);
    expect(result.pages[0].html).toContain('<html lang="de">');
    expect(result.pages[0].html).toContain('5. März 2026');
  });

  it('writes English page language and dates', async () => {
    const result = await compile(input('en'));
    expect(result.pages[0].html).toContain('<html lang="en">');
    expect(result.pages[0].html).toContain('March 5, 2026');
  });
});
