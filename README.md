# fourteenkilobytes

A lightweight, experimental CMS built with PHP that enforces a strict **14,336-byte size limit** per page. This constraint encourages minimalist design and efficient content creation.

## Features

- **14KB Size Limit**: Each published page cannot exceed 14,336 bytes, promoting efficient web design
- **No Database Required**: File-based JSON storage for simplicity and portability
- **Admin Panel**: Modern single-page application with real-time byte counter
- **Multi-Language Support**: English and German interfaces
- **RSS Feed**: Built-in RSS 2.0 feed with configurable options
- **Theme Presets**: Default, light, and dark CSS themes
- **Multi-Page Content**: Automatic pagination for larger articles
- **Template System**: Seed templates for quick content creation
- **Zero Dependencies**: Pure PHP and vanilla JavaScript

## Philosophy

In a world where the average webpage weighs 2.5MB, fourteenkilobytes is an experiment in radical minimalism.

**The premise is simple:** What if we limited every page to what can be delivered in a single TCP round trip?

The 14KB limit isn't arbitrary. It corresponds to the TCP initial congestion window—the maximum amount of data a server can send before waiting for acknowledgment. Stay under this limit, and your page arrives in one shot. No waiting. No spinners. No "content is loading" placeholders.

This constraint forces interesting design decisions:

- **No frameworks.** React, Vue, Tailwind—they don't fit. You write what you need.
- **No lazy loading.** Everything arrives at once, or it doesn't arrive at all.
- **No tracking scripts.** Google Analytics alone would blow the budget.
- **Every byte matters.** That extra `<div>` wrapper? Think twice.

The result is websites that load instantly on any connection, work without JavaScript, and respect both the user's time and bandwidth.

Is this practical for every use case? No. But for blogs, portfolios, documentation, and personal sites, the question isn't "why limit yourself?"—it's "why did we ever need more?"

## Requirements

- PHP 8.3 or higher
- Apache with mod_rewrite or Nginx
- Write access to the `data/` directory

## Installation

### Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/r0b0tan/fourteenkilobytes-web-php.git
   cd fourteenkilobytes-web-php
   ```

2. Build the distribution:
   ```bash
   ./build.sh
   ```

3. Copy `dist/` contents to your web server's document root

4. Ensure the `data/` directory is owned by the web server user (e.g., `www-data` for nginx/Apache):
   ```bash
   sudo chown -R www-data:www-data data/
   ```

5. Visit `/admin/setup` to create your admin password

### Development Server

For local development, use PHP's built-in server:

```bash
php -S localhost:8000 router.php
```

Then open http://localhost:8000/admin/ in your browser.

## Project Structure

```
fourteenkilobytes/
├── index.php              # Public blog router
├── feed.php               # RSS 2.0 feed generator
├── router.php             # Development server router
├── build.sh               # Build script for deployment
├── .htaccess              # Apache rewrite rules
├── nginx.conf.example     # Nginx configuration template
│
├── api/
│   └── index.php          # REST API entry point
│
├── public/
│   └── admin/             # Admin panel (SPA)
│       ├── index.html     # Dashboard
│       ├── editor.html    # Post/page editor
│       ├── settings.html  # Site settings
│       ├── login.html     # Login page
│       ├── setup.html     # Initial setup
│       ├── app.js         # Main application module
│       ├── i18n.js        # Internationalization
│       ├── compiler.browser.js  # 14KB compiler
│       └── lang/          # Language files (en.json, de.json)
│
├── data/                  # Content storage (auto-created)
│   ├── instance.json      # Instance configuration
│   ├── manifest.json      # Post/page metadata index
│   ├── settings.json      # Site-wide settings
│   ├── posts/             # Compiled HTML files
│   ├── sources/           # Source data for re-compilation
│   └── seeds/             # Template seeds
│
└── dist/                  # Build output (generated)
```

## Server Configuration

### Apache

The included `.htaccess` file handles URL rewriting automatically. Ensure `mod_rewrite` is enabled:

```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

Your virtual host should allow `.htaccess` overrides:

```apache
<Directory /var/www/html>
    AllowOverride All
</Directory>
```

### Nginx

Copy and adapt the provided `nginx.conf.example`:

```bash
sudo cp nginx.conf.example /etc/nginx/sites-available/fourteenkilobytes
sudo ln -s /etc/nginx/sites-available/fourteenkilobytes /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

The config handles all routes: API (`/api/`), admin panel (`/admin`), RSS feed (`/feed.xml`), blog slugs, and static assets. Adjust `server_name`, `root`, SSL paths, and the PHP-FPM socket version to match your setup.

**Important:** 

1. Ensure that PHP-FPM's `open_basedir` (in `/etc/php/8.3/fpm/php.ini`) includes your document root:

   ```ini
   open_basedir = /var/www/fourteenkilobytes:/tmp:/var/tmp
   ```

   Then restart PHP-FPM: `sudo systemctl restart php8.3-fpm`

2. Set correct ownership for the `data/` directory so PHP-FPM can write files:

   ```bash
   sudo chown -R www-data:www-data /var/www/fourteenkilobytes/data/
   ```

   This is required for the initial setup, post creation, settings, and other write operations.

## Usage

### Admin Panel

Access the admin panel at `/admin/` to:

- **Dashboard**: View and manage all posts/pages
- **Editor**: Create and edit content with real-time byte counting
- **Settings**: Configure site title, theme, header/footer, RSS, and metadata

### Creating Content

1. Navigate to the admin panel
2. Click "New Post" or "New Page"
3. Write your content using the block-based editor
4. Monitor the byte counter to stay within the 14KB limit
5. Click "Publish" when ready

### Content Types

- **Blog Posts**: Displayed on the homepage feed
- **Static Pages**: Standalone pages accessible via their slug
- **Multi-Page Articles**: Long content is automatically paginated

### Settings

| Section | Description |
|---------|-------------|
| General | Site title, homepage selection, favicon, language |
| Header | Navigation links |
| Footer | Footer content with byte counter variable |
| CSS | Theme selection (default/light/dark) and custom CSS |
| RSS | Feed configuration (URL, language, TTL, max items) |
| Meta | Site description and author metadata |

## API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/setup` | POST | Initial password setup |
| `/api/login` | POST | Login with password |
| `/api/logout` | POST | Clear session |
| `/api/auth-check` | GET | Verify authentication |

### Posts

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/posts` | GET | List all posts |
| `/api/posts/:slug` | GET | Get specific post |
| `/api/posts` | POST | Create new post |
| `/api/posts/:slug/republish` | POST | Regenerate from source |
| `/api/posts/:slug` | DELETE | Delete (tombstone) post |

### Settings & Data

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/settings` | GET | Load settings |
| `/api/settings` | PUT | Update settings |
| `/api/export` | GET | Export data |
| `/api/import` | POST | Import backup |
| `/api/reset` | POST | Factory reset |
| `/api/seeds` | GET | List seed templates |
| `/api/clone` | POST | Clone page or template |

## The 14KB Constraint

The 14,336-byte limit is enforced per page and includes:

- HTML structure and markup
- Content text
- CSS styles (global + inline)
- Navigation elements
- Footer content
- Pagination controls
- Embedded icons

The editor provides a real-time breakdown showing how bytes are allocated, helping you optimize your content.

### Why 14KB?

14KB (14,336 bytes) represents approximately one TCP initial congestion window. A page that fits within this limit can be delivered in a single round trip, ensuring fast load times even on slow connections.

## Security

- **Password Hashing**: PBKDF2 with 600,000 iterations
- **Session Cookies**: HttpOnly, Secure, SameSite=Strict
- **Security Headers**: CSP, X-Frame-Options, X-Content-Type-Options
- **Input Validation**: Strict slug format validation
- **Timing-Safe Comparison**: Prevents timing attacks on authentication

## Data Management

### Export

Export your data via the admin panel or API:

```bash
curl -b cookies.txt "https://example.com/api/export?type=all" > backup.json
```

### Import

Restore from a backup:

```bash
curl -X POST -b cookies.txt \
  -H "Content-Type: application/json" \
  -d @backup.json \
  "https://example.com/api/import"
```

### Backup Strategy

The system automatically creates `.bak` files before modifying:
- `manifest.json.bak`
- `settings.json.bak`

## Tombstoning

When a post is deleted, it is "tombstoned" rather than permanently removed:

- The URL returns HTTP 410 (Gone)
- The slug cannot be reused
- Deletion history is preserved in the manifest

This approach maintains content integrity and proper HTTP semantics.

## Contributing

Contributions are welcome! Please ensure your changes:

1. Maintain the zero-dependency philosophy
2. Work within the 14KB constraint concept
3. Support both English and German interfaces
4. Follow existing code style

## Author

**Christoph Bauer**

## License

See [LICENSE](LICENSE) file for details.
