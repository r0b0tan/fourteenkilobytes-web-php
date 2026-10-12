# 3. The editor

[← The dashboard](02-dashboard.md) · [Contents](README.md) · [Next: Content blocks →](04-blocks.md)

The editor is where you write posts and pages. It opens in three ways:

| How | Result |
|---|---|
| **New** in the top navigation | An empty editor for new content |
| **Recompile** in the dashboard | The existing page with its content, ready to change. The subtitle reads "Editing source · requires rebuild", and the publish button is labelled **Recompile**. |
| **Duplicate** in the dashboard | A copy of an existing page with empty title and slug |

The editor has four areas: **Head**, **Body**, **Footer** and **Build**. Next to every area, a small number shows how many bytes it adds to the page.

## Templates and reset

At the top right:

- **Select template…** loads a starting point: *Blog Post*, *Landing Page* or *Static Page*. Loading a template replaces the current content after a confirmation.
- **Reset** clears all inputs after a confirmation.

## Head

### Title, slug and page type

- **Title** is the heading of the page and the text used in post lists.
- **Slug** is the address of the page. For new content it is created from the title automatically (`My First Post` becomes `my-first-post`). Once you type in the slug field yourself, it no longer follows the title. Allowed are lowercase letters, digits and hyphens.
- **Page Type**:
  - **Post**: a dated article. It appears in post lists, on the archive page and in the RSS feed.
  - **Page**: content such as an imprint or an about page. The hint "(not in feed)" reminds you that pages never appear in post lists or the feed.

> **Changing the address of existing content.** When you open existing content, its slug is kept even if you change the title. If you change the slug field yourself, publishing creates a *new* page at the new address and the old page stays online. To move content: publish it under the new slug, then delete the old page in the dashboard.

### Per-page settings (overrides)

Some settings apply to every page globally (see [Settings](07-settings.md)). In the Head and Footer areas you can override them for a single page. Each override has a checkbox:

- **Unchecked**: the page uses the global setting. A short hint shows what that is.
- **Checked**: the fields become editable and apply to this page only. They start with the global values so you only change what differs.

| Override | Effect when checked |
|---|---|
| **Browser Tab Title** | Replaces the text in the browser tab. By default the tab shows "Title \| Site Title", or just the title if no site title is set. |
| **Meta** | Own **Description** (up to 160 characters, used by search engines) and **Author** for this page. |
| **Navigation** | Own set of links for this page. Click **+ Link** to add one, click a link to edit or delete it, and drag links to change the order. |
| **Footer** | Own footer text for this page. **{{bytes}}** inserts the byte counter. |
| **CSS** | Additional CSS rules for this page. They are added *after* the global CSS, so you can adjust single details without repeating the whole stylesheet. |

## Body

The body holds the actual content as a list of blocks. Click **+ Add Block** to add one. Every block has buttons on the right:

| Button | Function |
|---|---|
| **Selector** field | Optional CSS class or ID for the block, for example `.highlight` or `#intro`, to style it with your own CSS. Only available for top-level blocks, not for blocks inside a section. |
| **↑ / ↓** | Move the block up or down |
| **⧉** | Duplicate the block directly below |
| **×** | Delete the block |

All block types are explained in [Content blocks](04-blocks.md).

## Footer area

Contains the **Footer** and **CSS** overrides described above.

## Build

The **Build** box shows how the 14,336 bytes are used:

| Line | Meaning |
|---|---|
| **Base** | The HTML frame every page needs |
| **Title** | The page title and the browser tab title |
| **Favicon** | The site icon, if one is set |
| **Navigation** | The navigation links |
| **Meta** | Description and author tags |
| **Footer** | The footer line |
| **CSS** | The stylesheet (global and page-specific) |
| **Content** | Your blocks |
| **Total** | Everything together, compared with 14,336 B |

The pie chart shows the same as proportions: *Overhead* (everything except your content), *Content* and *Free*. When the total goes over the limit, the editor shows **Over limit!**. See [The 14 KB budget](05-byte-budget.md) for ways to save bytes.

## Publishing

Click **Compile & Publish** (or **Recompile** for existing content). The editor then:

1. Checks that there is a title and at least one block.
2. Checks the size. If the page is larger than 14,336 bytes and can be split, it asks whether to split it into several pages (see [Long posts on several pages](05-byte-budget.md#long-posts-on-several-pages)).
3. Compiles and saves the page.
4. Rebuilds every page that shows a post list (homepage, archive), so the new or changed post appears there right away.
5. Shows a confirmation with the address and the size. **View** opens the page in a new tab.

After publishing new content, the editor is cleared for the next post. After publishing existing content, it stays open.

If some pages with a post list could not be rebuilt, the confirmation names them. You can rebuild them later with **Settings → Data → Rebuild all pages**.
