# 1. Getting started

[← Contents](README.md) · [Next: The dashboard →](02-dashboard.md)

## Requirements

- PHP 8.3 or newer (with the `mbstring` extension, which almost every PHP installation includes)
- Apache with `mod_rewrite`, or nginx with PHP-FPM
- Write access for the web server to the `data/` directory

There is no database. All content and settings are stored as files in `data/`.

## Installation

### Option A: release package (recommended)

1. Download the latest release package from GitHub and unpack it into your web server's document root.
2. Give the web server write access to `data/`. On most Linux servers the web server user is `www-data`:

   ```bash
   sudo ./fix-permissions.sh www-data www-data
   ```

3. Configure the web server:
   - **Apache:** the included `.htaccess` file does everything. `AllowOverride All` must be enabled for the directory, and `mod_rewrite` must be active.
   - **nginx:** copy `nginx.conf.example`, adjust `server_name`, `root`, the certificate paths and the PHP-FPM socket, then reload nginx.
4. Open your domain in the browser. You are redirected to the setup wizard automatically.

### Option B: Docker

```bash
docker-compose up -d
```

The site is then available at `http://localhost:8080/`. Content is stored in the `data/` directory next to `docker-compose.yml`.

### Option C: local test without a web server

For a quick look on your own computer:

```bash
php -S localhost:8000 router.php
```

Then open `http://localhost:8000/`.

## The setup wizard

The wizard runs only once. It guides you through six steps:

1. **First-Time Setup**: a short welcome.
2. **System Requirements**: checks the PHP version, write access to `data/`, URL rewriting and HTTPS. Required checks must pass before you can continue. URL rewriting and HTTPS are only recommended; the wizard warns but lets you continue.
3. **Create Admin Account**: choose the admin password (8 to 500 characters). There is only one admin account and no user name.
4. **Site Configuration**: the site title (shown in browser tabs) and the language (English or German). It is used for the admin interface and as the language of your public pages; both can be changed later.
5. **Webserver Configuration**: shows the matching `.htaccess` or nginx configuration. You only need it if your server is not configured yet.
6. **Setup Complete**: links to the admin area at `/admin/`.

After the setup, the wizard locks itself. It cannot be opened again, even by visitors who know the address.

> **Keep your password safe.** There is no "forgot password" e-mail. If you lose it, follow [Resetting a lost password](09-account-and-security.md#resetting-a-lost-password).

## Logging in

Open `/admin/` and enter your admin password. A login stays valid for up to 24 hours. After five wrong attempts, logins from your address are blocked for five minutes.

The admin area has three main areas in the top navigation:

- **Overview**: the [dashboard](02-dashboard.md) with all posts and pages
- **New**: the [editor](03-editor.md) for a new post or page
- **Settings**: [global settings](07-settings.md) for the whole site

**Blog** opens your public site in a new tab, **Logout** ends your session.

## Your first steps

### 1. Let the homepage be created

Right after the setup, your public address shows "Homepage not configured". Open **Settings** once: if no homepage exists yet, fourteenkilobytes creates a page called *Home* (`/home`), or *Startseite* (`/startseite`) for a German site, with a welcome text and a list of your latest posts, and selects it as the homepage. You can edit or replace it later (see [Homepage, archive and navigation](06-site-structure.md)).

### 2. Check the basics

In **Settings**, have a look at:

- **General → Site language**: the language of your public pages.
- **Header → Site Title**: the name shown in browser tabs.
- **Header → Navigation**: links that appear at the top of every page.
- **Footer**: a short line at the bottom of every page, for example a copyright note.

Click **Save** when you are done. Details are in [Settings](07-settings.md).

### 3. Write your first post

1. Click **New**.
2. Enter a **Title**. The **Slug** is created from it automatically.
3. Leave the **Page Type** at **Post**.
4. Write your text in the first paragraph block. Use **+ Add Block** for headings, lists and other content.
5. Watch the byte counter in the **Build** box: it shows how much of the 14,336 bytes you are using.
6. Click **Compile & Publish**.

The success message links to your new post. The homepage list is updated automatically.
