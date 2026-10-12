# 9. Account and security

[← Data and maintenance](08-data-and-maintenance.md) · [Contents](README.md) · [Next: Troubleshooting →](10-troubleshooting.md)

fourteenkilobytes has a single admin account, protected by a password.

## Logging in and out

- A login is valid for up to 24 hours. After that, you are asked to log in again.
- For security, the login is renewed in the background every 15 minutes. You do not notice this.
- **Logout** ends the login immediately on the server. A copied login cookie is useless afterwards.
- After five failed login attempts within five minutes, further attempts from the same address are blocked for five minutes.

## Changing the password

1. Open **Settings → General → Password**.
2. Enter the **Current password**, the **New password** (at least 8 characters) and repeat it.
3. Click **Change password**.

You stay logged in. All other logins, for example on another computer, are logged out immediately. Use this whenever you suspect that someone else knows your password.

## Resetting a lost password

There is no recovery by e-mail. If you have access to the server, you can set a new password without losing content. Both ways keep your posts, pages and settings.

### Option A: on the command line (recommended)

On the server, in the directory of your installation, run:

```bash
read -rs -p "New password: " PW; echo
printf '%s' "$PW" | php -r '$p = stream_get_contents(STDIN); $s = base64_encode(random_bytes(32)); echo json_encode(["salt" => $s, "apiToken" => bin2hex(hash_pbkdf2("sha256", $p, $s, 600000, 32, true)), "createdAt" => date("c")], JSON_PRETTY_PRINT), "\n";' > data/instance.json
unset PW
chmod 600 data/instance.json
rm -f data/sessions.json
```

If the web server runs as a different user (for example `www-data`), give the file back to it:

```bash
sudo chown www-data:www-data data/instance.json
```

Then log in with the new password. Removing `data/sessions.json` logs out all existing logins.

### Option B: run the setup wizard again

1. Delete `data/instance.json` on the server.
2. Open `/setup/` right away and go through the wizard.

The wizard notices the existing data and shows "Existing settings and content were found." It only sets the new password; site title, language, settings and content stay as they are.

> Until you have finished the wizard, anyone who opens `/setup/` could set the password. Complete it immediately after deleting the file, or use Option A, which has no such gap.

## The audit log

**Settings → Logs** lists security-relevant events with time, action, IP address and details:

- successful and failed logins, logouts
- password changes and failed attempts
- published, deleted and permanently deleted content
- setting changes, resets, imports
- blocked requests (too many attempts, invalid security tokens)

Check it if you suspect unwanted access. **Export** downloads the log, **Clear** empties it (a backup copy remains on the server).

## Protection built into the system

You do not need to configure these; they are listed so you know what protects your site:

- Passwords are stored only as a salted hash (PBKDF2 with 600,000 rounds).
- Every change in the admin area requires a security token, so other websites cannot trigger actions in your name.
- The admin pages may only load scripts from your own server.
- Uploaded backups and settings are checked before they are saved.
- Visitors only receive static HTML files. The public site has no login, no forms and no scripts that could be attacked.

## Running behind a proxy

If your site runs behind a reverse proxy, a load balancer or a CDN, every request seems to come from the proxy's address. A login block after failed attempts would then affect everybody. Tell fourteenkilobytes which addresses belong to your proxy with the setting `FKB_TRUSTED_PROXIES` (single addresses or ranges, separated by commas):

| Server | Where to set it |
|---|---|
| Apache | `.htaccess` or the virtual host: `SetEnv FKB_TRUSTED_PROXIES "172.16.0.0/12"` |
| nginx with PHP-FPM | PHP-FPM pool configuration: `env[FKB_TRUSTED_PROXIES] = 10.0.0.0/8` |
| Docker | Container environment: `FKB_TRUSTED_PROXIES=172.16.0.0/12` |

Only enter addresses you control. The real visitor address is then taken from the `X-Forwarded-For` header, but only for requests that come from these addresses.

## HTTPS

Run your site over HTTPS. The setup wizard warns if it is missing. Once HTTPS works reliably, you can additionally enable HSTS, which tells browsers to always use HTTPS for your domain. A commented example is included in `.htaccess` and `nginx.conf.example`. Enable it only when you are sure, because browsers remember it for a long time.
