# 5. The 14 KB budget

[← Content blocks](04-blocks.md) · [Contents](README.md) · [Next: Homepage, archive and navigation →](06-site-structure.md)

Every published page must be at most **14,336 bytes**. The editor refuses to publish anything larger, and the server checks the size again.

## Why 14 KB?

When a browser connects to a server, the server may send only about 14 KB before it has to wait for the browser's confirmation. A page that fits into this first round trip arrives completely in one go. Larger pages need further round trips, which adds noticeable delay on mobile and slow connections.

## What counts

The limit applies to the finished HTML file of each page. Everything a visitor needs is inside this one file:

| Part | Typical size | Note |
|---|---|---|
| HTML frame | a few hundred bytes | Always present |
| Title and browser tab title | small | Grows with long site titles |
| Favicon | up to 4 KB | Embedded in **every** page. A small icon saves a lot. |
| Navigation | small to medium | Every link costs bytes on every page |
| Meta tags | small | Description and author |
| Footer | small | Grows with long texts and links |
| CSS | 1–4 KB | Global template plus page-specific rules; sections add their own CSS |
| Content | the rest | Your blocks |

Everything except the content is called **overhead**: it is repeated on every page. **Settings** shows the current overhead in a pie chart, together with the space still **Available** for content.

Bytes are counted, not characters. Letters such as ä, ö, ü or € take two to three bytes each.

## Saving bytes

**In the settings** (they affect every page):

- Keep **Compression** enabled (**Settings → Optimizations**). It removes unnecessary spaces and comments from HTML and CSS.
- Enable **Class mangling** to shorten the class names generated for sections, layouts and post lists. **Safe** shortens layout and section classes, **Aggressive** also shortens bloglist and pagination classes. Use **Safe** if you style these elements with your own CSS.
- Use a small favicon or none at all.
- Keep navigation and footer short.
- With **Custom CSS**, write only the rules you actually need.

**In the content:**

- Plain paragraphs and headings are the cheapest blocks. Sections, patterns and layouts cost extra CSS.
- Each block shows its byte count in the editor. Start with the biggest.
- Long link addresses cost bytes. Internal links such as `/about` are shorter than full addresses.
- Avoid empty paragraphs and spacers where a divider or a heading does the job.

## Long posts on several pages

If a post is too large, the editor offers to split it, for example: "Your post exceeds the 14KB limit (18204 bytes). Do you want to split it into 2 pages?"

- **Yes** publishes the post as several pages: the first keeps the slug (`/long-post`), the others get a number (`/long-post-2`, `/long-post-3`, …). Each page contains page links to the others.
- **No** cancels publishing so you can shorten the post instead.

The split happens between blocks. A single block that is larger than a whole page on its own cannot be split; the editor then reports "Post is too large and cannot be split into pages." Divide the block into several smaller ones.

The overhead (navigation, CSS, footer, …) is repeated on every page, so each page holds a little less than 14 KB of content.

When you delete a split post, all its pages are deleted. When you republish it with fewer pages, the pages that are no longer needed are removed.
