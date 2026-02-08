# Setup Wizard

This directory contains the initial setup wizard for fourteenkilobytes CMS.

## Features

- **System Requirements Check**: Automatically detects PHP version, file permissions, and required extensions
- **Guided Setup**: Step-by-step process for non-technical users
- **Admin Account Creation**: Secure password setup with strength indicator
- **Webserver Configuration**: Interactive config snippets for Apache and Nginx
- **Auto-Lock**: Setup can only be run once (creates `.setup-complete` lock file)

## Files

- `index.php` - Setup wizard frontend (beautiful UI with progress tracking)
- `api.php` - Backend API for system checks and initialization

## How It Works

1. When a user visits the site for the first time, `.htaccess` redirects to `/setup/`
2. The wizard checks system requirements (PHP 8.3+, permissions, extensions)
3. User creates admin account with a secure password
4. User configures basic site settings (title, language)
5. Wizard provides webserver configuration snippets (optional)
6. On completion, creates `/data/.setup-complete` lock file
7. User is redirected to admin panel

## Security

- Setup is automatically disabled after completion (lock file check)
- All API requests check for lock file existence
- Password validation enforces minimum 8 characters
- Sessions and CSRF protection are inherited from main API

## Disabling Setup After Manual Configuration

If you set up the CMS manually (without the wizard), create the lock file:

```bash
touch data/.setup-complete
```

This prevents the setup wizard from running.

## Re-running Setup

To re-run setup (e.g., after a fresh install):

```bash
rm -f data/.setup-complete
rm -f data/instance.json
```

**Warning**: This will delete your admin password. Use with caution!
