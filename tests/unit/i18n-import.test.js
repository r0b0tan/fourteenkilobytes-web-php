import { describe, it, expect, vi } from 'vitest';

describe('i18n module import bootstrap', () => {
  it('does not attempt absolute localhost fetch on import side effect', async () => {
    vi.resetModules();

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

    await import('../../public/admin/i18n.js');

    await new Promise((resolve) => setTimeout(resolve, 0));

    const calledUrls = fetchSpy.mock.calls.map(([url]) => String(url));

    expect(calledUrls.length).toBeGreaterThan(0);
    expect(calledUrls).toContain('/lang/en.json');
    expect(calledUrls.some((url) => url.includes('localhost:3000'))).toBe(false);

    fetchSpy.mockRestore();
  });

  it('uses relative German locale path when adminLanguage is de', async () => {
    vi.resetModules();
    localStorage.setItem('adminLanguage', 'de');

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

    await import('../../public/admin/i18n.js');

    await new Promise((resolve) => setTimeout(resolve, 0));

    const calledUrls = fetchSpy.mock.calls.map(([url]) => String(url));

    expect(calledUrls.length).toBeGreaterThan(0);
    expect(calledUrls).toContain('/lang/de.json');
    expect(calledUrls.some((url) => url.includes('localhost:3000'))).toBe(false);

    fetchSpy.mockRestore();
    localStorage.removeItem('adminLanguage');
  });
});