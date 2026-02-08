# Setup Wizard Testing Guide

## Quick Test

To test the setup wizard locally:

1. **Remove any existing setup** (if present):
   ```bash
   rm -f data/.setup-complete
   rm -f data/instance.json
   ```

2. **Start the development server**:
   ```bash
   php -S localhost:8000 router.php
   ```

3. **Open your browser**:
   ```
   http://localhost:8000
   ```
   
   You should be automatically redirected to `/setup/`

4. **Follow the wizard**:
   - Step 1: Welcome screen
   - Step 2: System requirements check
   - Step 3: Create admin password (min 8 chars)
   - Step 4: Configure site basics
   - Step 5: Webserver config (optional)
   - Step 6: Complete!

5. **After setup**:
   - You'll be redirected to `/admin/`
   - Login with your password
   - Create your first page!

## Expected Behavior

### Before Setup
- Visiting `/` → Redirects to `/setup/`
- Visiting `/admin/` → Redirects to `/setup/`
- API endpoints work (but require password not yet set)

### After Setup
- Lock file exists: `data/.setup-complete`
- Visiting `/setup/` → Redirects to `/admin/`
- All normal CMS functions work

## Testing Checklist

- [ ] System check detects PHP 8.3+
- [ ] System check validates data/ directory permissions
- [ ] Password strength indicator works
- [ ] Password confirmation validation works
- [ ] Cannot proceed with weak/mismatched password
- [ ] Site title and language selection saves correctly
- [ ] Webserver config snippets display correctly
- [ ] Copy button works for config snippets
- [ ] Apache and Nginx tabs switch correctly
- [ ] Setup lock file is created after completion
- [ ] Cannot access `/setup/` after completion (redirects to admin)
- [ ] Can login to admin panel with created password
- [ ] All initial files are created (manifest.json, settings.json, etc.)

## Common Issues

### "data/ directory not writable"
```bash
chmod 750 data/
```

### "Cannot access setup after completion"
This is correct behavior! The lock file prevents re-running setup.

To re-run (development only):
```bash
rm data/.setup-complete
```

### "500 Internal Server Error"
Check PHP error logs:
```bash
tail -f /var/log/php8.3-fpm.log
# or for dev server:
php -S localhost:8000 router.php
# (errors print to console)
```

## Architecture

```
/setup/
├── index.php       Frontend (beautiful wizard UI)
├── api.php         Backend (system checks, initialization)
└── README.md       Documentation

Flow:
1. User visits site
2. .htaccess/router.php checks for data/.setup-complete
3. If not exists → redirect to /setup/
4. Setup wizard runs
5. Creates data/.setup-complete on completion
6. User can now access admin panel
```

## API Endpoints

All setup API endpoints are prefixed with `/setup/api.php/`:

- `GET /status` - Check if setup is needed
- `GET /check` - Run system requirements check
- `POST /initialize` - Create admin account and initialize CMS
- `GET /webserver-config?type=apache|nginx` - Get config snippets

All endpoints (except `/status`) are blocked after setup completion.
