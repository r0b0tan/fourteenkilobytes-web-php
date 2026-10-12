# 6. Homepage, archive and navigation

[← The 14 KB budget](05-byte-budget.md) · [Contents](README.md) · [Next: Settings →](07-settings.md)

fourteenkilobytes has no fixed theme with a built-in start page. Your site consists of pages you build yourself, connected by a few settings.

## The homepage

The address `/` shows the page selected in **Settings → General → Homepage**. Only published content of the type **Page** can be selected.

When you open the settings for the first time and no homepage exists, fourteenkilobytes creates a page with a heading, a welcome text and a bloglist, and selects it. Its name depends on the site language: *Home* (`/home`) in English, *Startseite* (`/startseite`) in German.

To design your own homepage:

1. Create a new page with the page type **Page**, for example with the slug `welcome`.
2. Add a welcome text and a **Bloglist** block if the homepage should list your posts.
3. Publish it.
4. Select it in **Settings → General → Homepage** and click **Save**.

**Regenerate** next to the homepage selection rebuilds the homepage with the current posts. Normally you do not need it, because pages with a bloglist are rebuilt automatically whenever a post changes.

If no homepage is selected, `/` shows a short note "Homepage not configured".

## Post lists (bloglist)

A **Bloglist** block lists your posts with title and date, newest first. You can use it on any page, as often as you like.

- It shows only content of the type **Post**, never pages.
- The maximum number of entries is set in **Settings → Blog → Post limit**.
- Dates and the "No posts yet." text follow **Settings → General → Site language**.
- If the automatic archive page is enabled, the list ends with a link to it (for example "View all posts →").
- Pages with a bloglist are rebuilt automatically after a post is published, deleted or restored.

## The archive page

The archive page lists *all* posts, without a limit. Enable it in **Settings → Blog**:

- **Enable automatic archive page**: creates the page when you save the settings.
- **Archive URL**: its address, for example `archive` for `/archive`.
- **Archive link text**: the text of the link at the end of bloglists.

The archive page is created anew each time you save the settings while it is enabled. **Recompile** in the same section rebuilds it on demand.

> The archive page is generated automatically. Changes you make to it in the editor are overwritten the next time it is generated. If you want a hand-designed archive, disable the automatic archive page and create your own page with a bloglist.

## Navigation

The navigation is a row of links at the top of every page. Set it up in **Settings → Header → Navigation**:

1. Enable **Enable navigation**.
2. Click **+ Link**, enter a **Text** (for example "About") and a **Target** (for example `/about`), then **OK**.
3. Click a link to change or delete it. Drag links to change the order.
4. Click **Save**.

A single page can use different links with the **Navigation** override in the editor (see [The editor](03-editor.md#per-page-settings-overrides)).

## When global changes reach your pages

Pages are static files. A change to a global setting (navigation, footer, CSS, site title, favicon, meta tags) only appears on a page when the page is built again.

- New and republished pages use the new settings automatically.
- To update all existing pages at once, use **Settings → Data → Rebuild all pages**.

## The RSS feed

When the feed is enabled (**Settings → RSS**), it is available at `/feed.xml`. It contains your latest posts (pages are never included) with title, link, date and a short description taken from the first paragraphs.
