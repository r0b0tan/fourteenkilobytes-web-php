# 2. The dashboard

[← Getting started](01-getting-started.md) · [Contents](README.md) · [Next: The editor →](03-editor.md)

The dashboard (**Overview**) lists everything you have published.

## Tabs

| Tab | Contents |
|---|---|
| **Posts** | All posts, newest first |
| **Pages** | All pages (homepage, imprint, archive page, …) |
| **Archive** | Deleted posts and pages that can be restored |

## Finding content

- **Search…** filters by title and slug while you type.
- **Date** opens a date range filter with **From** and **To**. **Reset** removes the filter.
- The number selector (5, 10, 20, **All**) sets how many entries are shown per page. Use the arrows below the list to page through.

Each entry shows the slug, the date (**Published** or, after later changes, **Modified**) and the author, if one is set.

## Actions for published content

| Action | What happens |
|---|---|
| Click the title | Opens the public page in a new tab. |
| **Recompile** | Opens the page in the editor so you can change and publish it again. |
| **Duplicate** | Opens the editor with a copy of the content. Title and slug are empty, so you can publish the copy as a new page. |
| **Delete** | Removes the page from your site after a confirmation. Its address then answers with "410 Gone". The page moves to the **Archive** tab and can be restored. |

After deleting a post, pages with a post list (for example the homepage) are rebuilt automatically, so the deleted post disappears from them.

## Actions in the archive

| Action | What happens |
|---|---|
| **Restore** | Publishes the page again from its stored content. The original publication date is kept. Pages with a post list are updated. |
| **Delete permanently** | Removes the page completely after a confirmation. Its address then answers with "404 Not Found", and the slug can be used for new content. This cannot be undone. |

Why the two steps? A deleted address that answers "410 Gone" tells search engines that the page was removed on purpose, so they drop it quickly. Use **Delete permanently** only when you want to reuse the slug.

## Entries marked "not built yet"

After importing a backup, new entries can show **not built yet**. They exist in the system but have no public page yet. Normally the import builds them right away. If that did not happen (for example because you unticked **Build articles after import**), use **Recompile** on the entry or **Settings → Data → Rebuild all pages**.

## Update notice

If the update check is enabled (**Settings → General → Update check**), the dashboard shows a notice when a new version is available. **View Release** opens the release notes, **Remind in 7 days** hides the notice for a week.
