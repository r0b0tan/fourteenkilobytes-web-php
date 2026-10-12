# 10. Troubleshooting

[← Account and security](09-account-and-security.md) · [Contents](README.md)

## The site

### The homepage shows "Homepage not configured"

No homepage is selected. Open **Settings**: if no homepage exists yet, one is created automatically. Otherwise select a page under **General → Homepage** and click **Save**. Only content with the page type **Page** can be selected.

### Every page except the homepage shows "Page not found"

The web server does not rewrite addresses such as `/my-post` to fourteenkilobytes.

- **Apache:** check that `mod_rewrite` is enabled and that the virtual host allows `.htaccess` files (`AllowOverride All`).
- **nginx:** use the location rules from `nginx.conf.example`.

### Changes to navigation, footer or design do not appear

Pages are static files and keep the look they had when they were published. Use **Settings → Data → Rebuild all pages**.

### Words run together on older pages, for example "HalloWelt"

Older versions removed the space between two formatted words. The current version keeps it, but pages published before the update still contain the old output. Use **Settings → Data → Rebuild all pages** once.

### A post does not appear in the post list on the homepage

- Check the page type: only **Post** appears in post lists, **Page** never does.
- Check **Settings → Blog → Post limit**: older posts drop out of the list when the limit is reached. They remain available on the archive page.
- If the post was published while the homepage could not be rebuilt, the publish confirmation said so. Click **Regenerate** in **Settings → General** or use **Rebuild all pages**.

### The author block shows no date

When a post is published for the first time, the date is not known yet when the page is built. Click **Recompile** on the post once in the dashboard.

### The RSS feed contains wrong addresses

Enter the full address of your site under **Settings → RSS → Website URL**, for example `https://example.com`.

### Dates in post lists are always German

This is a current limitation: bloglists always use the German date format and the text "Noch keine Posts." when no posts exist yet.

## Editing and publishing

### "Over limit!" or the post cannot be published

The page is larger than 14,336 bytes. See [The 14 KB budget](05-byte-budget.md) for ways to save bytes, or let the editor split the post into several pages.

### "Post is too large and cannot be split into pages."

A single block is too large for one page on its own. Divide it into several smaller blocks, for example several paragraphs instead of one very long one.

### "Slug '…' was previously used and tombstoned"

Content with this address was deleted before. Either restore it in the dashboard's **Archive** tab, or delete it permanently there to free the address, or choose a different slug.

### I changed the title and now the post exists twice

This happened in older versions when the title of existing content was changed. Delete the copy with the unwanted address in the dashboard. In the current version, editing the title of existing content keeps its address.

### "Title required" or "At least one block required"

Enter a title and add at least one block before publishing.

### "Server busy, please try again"

Two changes were saved at exactly the same moment. Wait a second and try again.

## Settings and data

### Settings cannot be saved

The message names the field and the problem. Common causes:

| Field | Requirement |
|---|---|
| RSS **Website URL** | Must start with `https://` or `http://`, or be empty |
| **Page Width** | A CSS length such as `42rem`, `800px` or `90%` |
| **Archive URL** | Lowercase letters, digits and hyphens only |
| **Favicon** | An image of at most 4 KB |

### The import skips some articles

Articles whose slug belongs to deleted content are skipped, as are articles with invalid slugs. Restore or permanently delete the old content, then import again.

### Saving fails with "Failed to write …"

The web server cannot write to the `data/` directory. On the server, run `sudo ./fix-permissions.sh www-data www-data` (adjust the user to your web server).

## Logging in

### "Login failed" although the password is correct

After five wrong passwords within five minutes, logins from your address are blocked for five minutes, and the login page shows "Login failed" even for the correct password. Wait five minutes and try again. A wrong password shows "Invalid password" instead.

### Everybody is blocked at once after a few failed logins

Your site probably runs behind a proxy, so all visitors seem to have the same address. Set `FKB_TRUSTED_PROXIES` as described in [Running behind a proxy](09-account-and-security.md#running-behind-a-proxy).

### I am logged out unexpectedly

A login lasts at most 24 hours. You are also logged out when the password was changed from another browser, or after a full reset.

### I forgot my password

See [Resetting a lost password](09-account-and-security.md#resetting-a-lost-password). Both ways described there keep your content.
