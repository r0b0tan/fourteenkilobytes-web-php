# 7. Settings

[← Homepage, archive and navigation](06-site-structure.md) · [Contents](README.md) · [Next: Data and maintenance →](08-data-and-maintenance.md)

**Settings** holds everything that applies to the whole site. The settings are grouped in tabs.

## Saving

Changes take effect only after **Save**. **Discard** returns to the last saved state. If you try to leave the page with unsaved changes, the browser asks for confirmation.

Invalid values are rejected with a message that names the field, for example "rss.siteUrl must be an http(s) URL or empty". Nothing is saved until all values are valid.

Most settings change what new pages look like. Existing pages keep their look until they are built again. After changing header, footer, CSS, favicon or meta tags, use **Data → Rebuild all pages**.

The **Overhead** box on the settings page shows how many bytes your global settings add to every page, and how much space remains for content (see [The 14 KB budget](05-byte-budget.md)).

## General

| Setting | Description |
|---|---|
| **Language** | Language of the admin interface (English or German). Stored in your browser, so each browser can use its own language. Takes effect after reloading the page. |
| **Site language** | Language of your public pages (English or German). Browsers, screen readers and search engines use it, and it sets the date format and the texts the system writes into pages: "No posts yet." in post lists and "Published", "Updated", "By" in author blocks. Use **Data → Rebuild all pages** after changing it. |
| **Homepage** | The page shown at `/`. Only published pages of the type **Page** are listed. **Regenerate** rebuilds the selected page with the current posts. See [Homepage, archive and navigation](06-site-structure.md#the-homepage). |
| **Update check** | **Check for updates on startup** asks GitHub at most once a day whether a new version exists. Disabled by default; no other data is sent. |
| **Password** | Change the admin password. See [Account and security](09-account-and-security.md#changing-the-password). This form works independently of **Save**. |
| **Favicon** | The small icon in the browser tab. **Upload** accepts PNG, ICO, SVG and GIF files up to 4 KB. The icon is embedded in every page, so smaller is better. **Remove** deletes it. |

## Header

| Setting | Description |
|---|---|
| **Site Title** | The name of your site. With **Enable site title** switched on, browser tabs show "Page title \| Site title". |
| **Navigation** | Links at the top of every page. With **Enable navigation** switched on, add links with **+ Link**, click a link to edit or delete it, drag to reorder. |
| **Meta** | With **Enable meta** switched on, a **Description** (shown by search engines) and an **Author** are added to every page. Single pages can override both. |

## Footer

With **Enable footer** switched on, a line of text appears at the bottom of every page.

- Simple HTML is allowed: links (`<a href="…">`), bold, italic, line breaks, `<small>`, `<code>`, lists. Images, scripts and styles are removed.
- **{{bytes}}** inserts a placeholder that is replaced by the actual size of each page. The footer `© 2026 | {{bytes}}/14336 bytes` appears on a page as "© 2026 | 9812/14336 bytes".

## CSS

| Setting | Description |
|---|---|
| **Use global CSS** | Switches the stylesheet on or off for all pages. Without CSS, pages use the browser's default look. |
| **CSS Templates** | **Default**, **Light** and **Dark** are ready-made templates. Their CSS is shown read-only as a preview. **Custom CSS** lets you write your own stylesheet. |
| **Page Width** | Maximum width of the page content, for example `42rem`, `800px` or `90%`. Leave empty to use the template's width. |

Single pages can add rules with the **CSS** override in the editor; these are added after the global CSS.

## Blog

| Setting | Description |
|---|---|
| **Author** | Default author name for author blocks and meta tags, used when a page does not set its own. |
| **Post limit** | Maximum number of posts in bloglist blocks (1 to 100). The archive page always shows all posts. |
| **Archive page** | **Enable automatic archive page** creates a page listing all posts whenever you save the settings. |
| **Archive URL** | Address of the archive page, for example `archive`. Lowercase letters, digits and hyphens only. |
| **Archive link text** | Text of the link to the archive at the end of bloglists, for example "View all posts →". |

**Recompile** in the archive section rebuilds the archive page immediately. See [The archive page](06-site-structure.md#the-archive-page).

## RSS

| Setting | Description |
|---|---|
| **Enable RSS feed** | Publishes the feed at `/feed.xml`. **Copy** copies the feed address, **Open** shows the feed. |
| **Website URL** | The full address of your site without a trailing slash, for example `https://example.com`. Needed for the links in the feed. If it is empty, the feed uses the address it was requested from. |
| **Language** | Language of the feed, for example Deutsch (de-DE) or English (en-US). |
| **Copyright** | Optional copyright notice for the feed. |
| **Maximum items** | Number of posts in the feed (5 to 100). |
| **Cache time (minutes)** | How often feed readers should check for new posts. |

The feed contains only posts, never pages.

## Optimizations

| Setting | Description |
|---|---|
| **Enable compression** | Removes unnecessary spaces, line breaks and comments from HTML and CSS when publishing. Recommended. Spaces between words and inside code blocks are kept. |
| **Enable class mangling** | Shortens class names generated for sections, layouts and post lists. |
| **Mangling mode** | **Safe** shortens layout and section classes. **Aggressive** also shortens bloglist and pagination classes. If your custom CSS styles post lists or page links by class name, use **Safe**. |

## Data

Export, import, rebuilding and resetting are described in [Data and maintenance](08-data-and-maintenance.md).

## Logs

The audit log records security-relevant events: logins, failed logins, password changes, published and deleted content, setting changes, imports and blocked requests.

- **Search…** and the action filter narrow down the list.
- **Refresh** reloads it, **Export** downloads it as a file.
- **Clear** empties the log after a confirmation. A backup copy is kept on the server.

See [Account and security](09-account-and-security.md#the-audit-log).
