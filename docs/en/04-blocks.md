# 4. Content blocks

[← The editor](03-editor.md) · [Contents](README.md) · [Next: The 14 KB budget →](05-byte-budget.md)

Content is built from blocks. **+ Add Block** offers: **Paragraph**, **Heading**, **List**, **Divider**, **Spacer**, **Author**, **Bloglist** and **Section**. A **Layout** can be added inside a section.

## Text blocks

### Paragraph, Blockquote and Code Block

A paragraph block has a type selector on the left that switches between:

- **Paragraph**: normal running text.
- **Blockquote**: a highlighted quotation.
- **Code Block**: preformatted text in a monospace font. Spaces and line breaks are kept exactly. Text formatting is not available in code blocks.

### Heading

Choose the level **H1** to **H6** in the selector. Use one H1 per page at most (usually the page title already is the main heading) and structure the rest with H2 and below.

### List

Choose **Unordered List** (bullets) or **Ordered List** (numbers).

- **Enter** creates a new list item.
- **Backspace** in an empty item deletes it.

### Formatting text

Paragraphs, blockquotes, headings and lists have formatting buttons. Select text, then click:

| Button | Result |
|---|---|
| **B** | Bold |
| **I** | Italic |
| **U** | Underlined |
| **S** | Strikethrough |
| **<>** | Inline code |
| **🔗** | Link |

### Links

Select the text you want to link and click **🔗**. In the link box:

- The quick buttons insert the prefix for a web address (`https://`), an e-mail address (`mailto:`) or a phone number (`tel:`).
- **Internal link** opens the target in the same tab, **External link (new tab)** in a new one. Addresses starting with `https://` are treated as external automatically.

Allowed targets:

| Target | Example |
|---|---|
| A page on your site | `/about` |
| An anchor on the same page | `#contact` |
| A web address | `https://example.com` |
| An e-mail address | `mailto:name@example.com` |
| A phone number | `tel:+491234567` |

If you enter an e-mail address or phone number without the prefix, the editor tells you which prefix to add.

## Structure blocks

### Divider

A horizontal line between two parts of the content.

### Spacer

Empty vertical space. Set the **Height** with a CSS length, for example `1rem`, `2rem` or `24px`.

## Automatic blocks

These blocks are filled in when the page is published.

### Author

Shows information about the post. Choose what to show:

- **Published**: the publication date
- **Modified**: the date of the last change (only shown if the post was changed after publication)
- **Author**: the author name, taken from the page's **Meta** override, otherwise from **Settings → Blog → Author**, otherwise from the global **Meta** author
- **Tags**: up to 8 tags of up to 32 characters each

The labels ("Published", "Updated", "By") and the date format follow **Settings → General → Site language**.

> The dates are taken from the published version of the post. When you publish a new post for the first time, the author block cannot show a date yet. Click **Recompile** on the post once after the first publication to add it.

### Bloglist

Lists your posts, newest first, with title and date. Only content with the page type **Post** appears. The number of posts follows **Settings → Blog → Post limit**. If the automatic archive page is enabled, the list ends with a link to it.

Pages with a bloglist are rebuilt automatically whenever you publish, delete or restore a post.

The date format and the text shown when there are no posts yet ("No posts yet." / "Noch keine Posts.") follow **Settings → General → Site language**.

## Section

A section is a full-width area with its own colours. It can contain other blocks: click **+ Add Block** inside the section. Settings:

| Setting | Meaning |
|---|---|
| **Background** | Background colour |
| **Text Color** | Text colour |
| **Pattern** | Optional background pattern: **Dots**, **Grid**, **Stripes**, **Crosshatch** or **Hexagons**, with its own colour and opacity |
| **Width** | Width of the content area, for example `75%` or `40rem` |
| **Padding** | Inner spacing, for example `4rem` |
| **Align** | Text alignment: Default, Left, Center or Right |

Sections need some extra CSS, which is added to the page automatically when a section is used.

## Layout

A layout arranges blocks in a grid of columns and rows, for example two columns side by side. Add it inside a section.

Use **+** and **−** next to *Col* and *Row* to change the number of columns and rows.

Each cell has its own settings: alignment (left, center, right), padding, margin, width (for example `50%` or `20rem`) and a CSS class. Inside a cell you can add paragraphs, headings (H1 to H6), lists, dividers and spacers.

## Tips

- Every block shows its own byte count. Use it to find the parts that cost the most.
- Patterns, sections and layouts are convenient but cost CSS bytes. On text-heavy pages, plain paragraphs and headings go further.
- Duplicate a well-styled block (**⧉**) instead of rebuilding it.
