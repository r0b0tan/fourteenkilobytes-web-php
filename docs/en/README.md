# fourteenkilobytes User Guide

fourteenkilobytes is a small content management system for blogs and personal websites. Every published page must fit into **14,336 bytes** (14 KB). That is roughly the amount of data a server can send in the first round trip of a connection, so pages arrive in one go, even on slow networks.

You write content in a block editor in your browser. When you publish, the editor compiles the page into a single, self-contained HTML file and shows you exactly how many bytes each part uses. Visitors only ever receive these static files: no JavaScript, no tracking, no database.

[Deutsche Fassung](../de/README.md)

## Chapters

1. [Getting started](01-getting-started.md): installation, setup wizard, first login, your first post
2. [The dashboard](02-dashboard.md): finding, opening, duplicating and deleting content
3. [The editor](03-editor.md): title, slug, page type, per-page settings, publishing, editing
4. [Content blocks](04-blocks.md): paragraphs, headings, lists, sections, layouts and more
5. [The 14 KB budget](05-byte-budget.md): what counts, how to save bytes, long posts on several pages
6. [Homepage, archive and navigation](06-site-structure.md): how the parts of a site fit together
7. [Settings](07-settings.md): every settings tab explained
8. [Data and maintenance](08-data-and-maintenance.md): backups, import, rebuilding, deleting and restoring
9. [Account and security](09-account-and-security.md): password, sessions, audit log, reverse proxies
10. [Troubleshooting](10-troubleshooting.md): common problems and their solutions

## Words used in this guide

| Term | Meaning |
|---|---|
| **Post** | A dated article. Posts appear in post lists (bloglists), in the archive and in the RSS feed. |
| **Page** | Content without a date context, such as an imprint, an about page or the homepage. Pages never appear in post lists or the feed. |
| **Slug** | The address part of a page: the post with the slug `my-first-post` is available at `/my-first-post`. |
| **Block** | One piece of content in the editor, for example a paragraph, a heading or a list. |
| **Publish / compile** | Turning the editor content into the final HTML file that visitors see. |
| **Rebuild** | Publishing an existing page again from its stored content, for example after changing global settings. |
| **Tombstone** | A deleted page. Its address answers with "410 Gone" so that search engines and visitors learn that it was removed on purpose. |
