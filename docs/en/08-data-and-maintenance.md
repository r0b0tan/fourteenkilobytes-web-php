# 8. Data and maintenance

[← Settings](07-settings.md) · [Contents](README.md) · [Next: Account and security →](09-account-and-security.md)

Most of these functions are in **Settings → Data**.

## Export (backup)

**Export** downloads a backup as a JSON file. Choose what to include:

- **All (Settings + Articles)**
- **Articles only**
- **Settings only**

The backup contains the editable source of every post and page (title, blocks, per-page settings) and the global settings. Deleted content is not included. The finished HTML files are not part of the backup, because they can be rebuilt from the source at any time.

Your admin password is never part of a backup.

## Import (restore)

1. Drag a backup file onto the import area, or click **browse**.
2. In the dialog, choose:
   - **Import settings**: replaces your current settings.
   - **Import N articles**: adds or updates posts and pages.
   - **Build articles after import**: publishes the imported content right away. Leave this switched on.
3. Click **Import**. A progress bar shows the build progress.

What happens to existing content:

| Situation | Result |
|---|---|
| The slug does not exist yet | The content is added. It shows **not built yet** until it is built. |
| The slug exists | The stored source and title are replaced. The page stays online in its old version until it is built. |
| The slug belongs to deleted content | The entry is skipped. Restore or permanently delete the old content first. |

The import is checked before anything is written. A backup with invalid settings is rejected as a whole, with a message naming the problem. Entries with invalid slugs are skipped. One import may contain up to 100 articles and up to 10 MB.

> Only import backups you created yourself or trust. A backup replaces settings and content.

## Rebuild all pages

**Rebuild all pages** publishes every post and page again from its stored source. Use it after you changed something global:

- navigation, footer or site title
- CSS template, custom CSS or page width
- favicon or meta tags
- compression or class mangling

Pages with a post list are built last, so they show the current state of all posts. The button shows the progress ("Building 3/12…"). If single pages fail, they are listed at the end; the others are still rebuilt.

## Deleting, restoring, permanently deleting

These actions are in the [dashboard](02-dashboard.md):

| Action | Where | Address afterwards | Reversible |
|---|---|---|---|
| **Delete** | Posts / Pages tab | 410 Gone | Yes, with **Restore** |
| **Restore** | Archive tab | Online again | – |
| **Delete permanently** | Archive tab | 404 Not Found, slug free again | No |

## Delete all articles

**Settings → Data → Reset → Delete all articles** deletes all posts and pages after two confirmations. They all move to the archive and can still be restored one by one.

## Full reset

**Full reset** deletes all posts, pages, settings and their stored sources after two confirmations. It cannot be undone.

The admin password is kept. You are logged out and can log in again with your existing password. Export a backup first if you might need anything later.

## Automatic safety copies on the server

The server keeps a copy of the previous version whenever it saves the content index, the settings or the page type list (files ending in `.bak` in the `data/` directory). If one of these files is ever damaged, for example by a full disk, fourteenkilobytes automatically uses the copy and keeps the damaged file as `….corrupt-…` for inspection.

These copies only protect against damaged files. They do not replace backups: export regularly, or back up the whole `data/` directory on the server.

## Updates

How to install a new version is described in the main [README](../../README.md#versioned-releases-recommended-for-upgrades). The `data/` directory is kept during an update.

After an update, use **Rebuild all pages** so that all pages benefit from improvements to the compiler.
