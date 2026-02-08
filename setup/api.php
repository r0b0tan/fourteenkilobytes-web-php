<?php
/**
 * Setup Wizard API
 * 
 * Handles system checks and initial setup workflow.
 * Auto-disabled after successful setup via .setup-complete lock file.
 */

declare(strict_types=1);

// Start session for setup token validation with secure cookie settings
$secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
session_start([
    'cookie_httponly' => true,
    'cookie_samesite' => 'Strict',
    'cookie_secure' => $secure,
    'use_strict_mode' => true,
]);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

define('DATA_DIR', dirname(__DIR__) . '/data');
define('SETUP_LOCK_FILE', DATA_DIR . '/.setup-complete');
define('INSTANCE_FILE', DATA_DIR . '/instance.json');
define('SETTINGS_FILE', DATA_DIR . '/settings.json');
define('MANIFEST_FILE', DATA_DIR . '/manifest.json');

// Token derivation settings (same as main API)
define('ITERATIONS', 600000);
define('KEY_LENGTH', 32);

function sendJson(int $status, mixed $data): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readJsonBody(): array {
    $body = file_get_contents('php://input');
    if (empty($body)) {
        return [];
    }
    $data = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJson(400, ['error' => 'Invalid JSON: ' . json_last_error_msg()]);
    }
    return $data;
}

// Check if setup is already completed
function isSetupComplete(): bool {
    return file_exists(SETUP_LOCK_FILE) && file_exists(INSTANCE_FILE);
}

// Validate setup token for write operations
function validateSetupToken(): void {
    $token = $_SERVER['HTTP_X_SETUP_TOKEN'] ?? '';
    $sessionToken = $_SESSION['setup_token'] ?? '';
    
    if (empty($token) || empty($sessionToken) || !hash_equals($sessionToken, $token)) {
        sendJson(403, ['error' => 'Invalid or missing setup token']);
    }
}

// Route parsing
$method = $_SERVER['REQUEST_METHOD'];
$path = $_SERVER['PATH_INFO'] ?? '/';

// Block all routes if setup is complete (except status and webserver-config)
if (isSetupComplete() && !in_array($path, ['/status', '/webserver-config'])) {
    sendJson(403, ['error' => 'Setup already completed', 'setupComplete' => true]);
}

// Route: GET /status - Check if setup is needed
if ($method === 'GET' && $path === '/status') {
    $setupComplete = isSetupComplete();
    $hasInstanceFile = file_exists(INSTANCE_FILE);
    
    sendJson(200, [
        'setupComplete' => $setupComplete,
        'hasInstance' => $hasInstanceFile,
        'needsSetup' => !$setupComplete,
    ]);
}

// Route: GET /check - System requirements check
if ($method === 'GET' && $path === '/check') {
    $checks = [];
    
    // PHP Version
    $phpVersion = PHP_VERSION;
    $phpOk = version_compare($phpVersion, '8.3.0', '>=');
    $checks['php'] = [
        'label' => 'PHP Version',
        'status' => $phpOk ? 'ok' : 'error',
        'message' => $phpOk ? "PHP $phpVersion" : "PHP $phpVersion (requires 8.3+)",
        'required' => true,
    ];
    
    // Data directory writable
    $dataWritable = is_dir(DATA_DIR) && is_writable(DATA_DIR);
    $checks['dataDir'] = [
        'label' => 'Data Directory',
        'status' => $dataWritable ? 'ok' : 'error',
        'message' => $dataWritable ? 'Writable' : 'Not writable',
        'fix' => !$dataWritable ? "chmod 750 " . DATA_DIR : null,
        'required' => true,
    ];
    
    // Can create subdirectories
    $canCreateDirs = $dataWritable;
    if ($canCreateDirs && !is_dir(DATA_DIR . '/posts')) {
        $canCreateDirs = @mkdir(DATA_DIR . '/posts', 0750, true);
        if ($canCreateDirs) {
            @rmdir(DATA_DIR . '/posts');
        }
    }
    $checks['createDirs'] = [
        'label' => 'Create Directories',
        'status' => $canCreateDirs ? 'ok' : 'warning',
        'message' => $canCreateDirs ? 'OK' : 'Cannot create subdirectories',
        'required' => true,
    ];
    
    // file_get_contents
    $fgcEnabled = function_exists('file_get_contents');
    $checks['fileGetContents'] = [
        'label' => 'file_get_contents',
        'status' => $fgcEnabled ? 'ok' : 'error',
        'message' => $fgcEnabled ? 'Available' : 'Disabled',
        'required' => true,
    ];
    
    // json_encode/decode
    $jsonEnabled = function_exists('json_encode') && function_exists('json_decode');
    $checks['json'] = [
        'label' => 'JSON Functions',
        'status' => $jsonEnabled ? 'ok' : 'error',
        'message' => $jsonEnabled ? 'Available' : 'Not available',
        'required' => true,
    ];
    
    // hash functions (for password hashing)
    $hashEnabled = function_exists('hash') && in_array('sha256', hash_algos());
    $checks['hash'] = [
        'label' => 'Hash Functions',
        'status' => $hashEnabled ? 'ok' : 'error',
        'message' => $hashEnabled ? 'Available' : 'Not available',
        'required' => true,
    ];
    
    // URL rewriting detection
    $rewriteDetected = isset($_SERVER['PATH_INFO']) || 
                       (isset($_SERVER['REQUEST_URI']) && strpos($_SERVER['REQUEST_URI'], '/setup/api.php') === false);
    $checks['rewrite'] = [
        'label' => 'URL Rewriting',
        'status' => $rewriteDetected ? 'ok' : 'warning',
        'message' => $rewriteDetected ? 'Detected' : 'Not detected - configure .htaccess or nginx',
        'required' => false,
    ];
    
    // HTTPS
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || 
               $_SERVER['SERVER_PORT'] == 443 ||
               (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    $checks['https'] = [
        'label' => 'HTTPS',
        'status' => $isHttps ? 'ok' : 'warning',
        'message' => $isHttps ? 'Enabled' : 'Recommended for production',
        'required' => false,
    ];
    
    // Detect webserver
    $webserver = 'unknown';
    if (stripos($_SERVER['SERVER_SOFTWARE'] ?? '', 'apache') !== false) {
        $webserver = 'apache';
    } elseif (stripos($_SERVER['SERVER_SOFTWARE'] ?? '', 'nginx') !== false) {
        $webserver = 'nginx';
    }
    
    $allRequired = true;
    foreach ($checks as $check) {
        if ($check['required'] && $check['status'] === 'error') {
            $allRequired = false;
            break;
        }
    }
    
    sendJson(200, [
        'checks' => $checks,
        'canProceed' => $allRequired,
        'webserver' => $webserver,
    ]);
}

// Route: POST /initialize - Create initial files and admin account
if ($method === 'POST' && $path === '/initialize') {
    // Validate setup token
    validateSetupToken();
    
    // Rotate setup token for additional security
    $_SESSION['setup_token'] = bin2hex(random_bytes(32));
    $newToken = $_SESSION['setup_token'];
    
    $body = readJsonBody();
    
    $password = $body['password'] ?? '';
    $siteTitle = $body['siteTitle'] ?? 'My 14KB Site';
    $language = $body['language'] ?? 'en';
    
    // Validate password
    if (strlen($password) < 8 || strlen($password) > 500) {
        sendJson(400, ['error' => 'Password must be 8-500 characters']);
    }
    
    // Validate and sanitize site title
    $siteTitle = trim($siteTitle);
    if (strlen($siteTitle) === 0) {
        $siteTitle = 'My 14KB Site';
    }
    if (strlen($siteTitle) > 100) {
        sendJson(400, ['error' => 'Site title must be 100 characters or less']);
    }
    
    // Validate language (whitelist)
    $allowedLanguages = ['en', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'zh'];
    if (!in_array($language, $allowedLanguages, true)) {
        $language = 'en';
    }
    
    // Ensure data directories exist
    if (!is_dir(DATA_DIR)) {
        @mkdir(DATA_DIR, 0750, true);
    }
    if (!is_dir(DATA_DIR . '/posts')) {
        @mkdir(DATA_DIR . '/posts', 0750, true);
    }
    if (!is_dir(DATA_DIR . '/sources')) {
        @mkdir(DATA_DIR . '/sources', 0750, true);
    }
    if (!is_dir(DATA_DIR . '/seeds')) {
        @mkdir(DATA_DIR . '/seeds', 0750, true);
    }
    
    // Generate salt and derive token
    $salt = bin2hex(random_bytes(16));
    $apiToken = bin2hex(hash_pbkdf2('sha256', $password, $salt, ITERATIONS, KEY_LENGTH, true));
    
    // Create instance.json atomically (fail if exists - prevent race condition)
    $fp = @fopen(INSTANCE_FILE, 'x');
    if ($fp === false) {
        sendJson(409, ['error' => 'Setup already initialized']);
    }
    $instance = [
        'salt' => $salt,
        'apiToken' => $apiToken,
        'createdAt' => date('c'),
    ];
    $jsonData = json_encode($instance, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if (fwrite($fp, $jsonData) === false) {
        fclose($fp);
        @unlink(INSTANCE_FILE);
        sendJson(500, ['error' => 'Failed to write instance file']);
    }
    fclose($fp);
    @chmod(INSTANCE_FILE, 0600); // More restrictive: owner read-write only
    
    // Create settings.json with initial values
    $settings = [
        'siteTitle' => $siteTitle,
        'siteTitleEnabled' => true,
        'language' => $language,
        'cssMode' => 'default',
        'cssEnabled' => true,
        'header' => [
            'enabled' => false,
            'links' => [],
        ],
        'footer' => [
            'enabled' => true,
            'content' => '© ' . date('Y') . ' | {{bytes}}/14336 bytes',
        ],
        'meta' => [
            'enabled' => false,
            'description' => '',
            'author' => '',
        ],
        'bloglist' => [
            'limit' => 10,
            'archiveEnabled' => false,
            'archiveSlug' => 'archive',
            'archiveLinkText' => 'View all posts →',
        ],
        'rss' => [
            'enabled' => false,
            'title' => $siteTitle,
            'description' => '',
            'link' => '',
        ],
    ];
    file_put_contents(SETTINGS_FILE, json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    
    // Create empty manifest.json
    $manifest = [
        'entries' => [],
    ];
    file_put_contents(MANIFEST_FILE, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    
    // Create page-types.json
    $pageTypesFile = DATA_DIR . '/page-types.json';
    $pageTypes = ['types' => []];
    file_put_contents($pageTypesFile, json_encode($pageTypes, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    
    // Create sessions.json
    $sessionsFile = DATA_DIR . '/sessions.json';
    $sessions = ['sessions' => []];
    file_put_contents($sessionsFile, json_encode($sessions, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    
    // Create rate-limits.json
    $rateLimitsFile = DATA_DIR . '/rate-limits.json';
    $rateLimits = ['attempts' => []];
    file_put_contents($rateLimitsFile, json_encode($rateLimits, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    
    // Copy seed templates if they don't exist
    $seedsDir = DATA_DIR . '/seeds';
    $seedTemplates = [
        'blog-post.json' => [
            'title' => 'Blog Post',
            'content' => [
                ['type' => 'heading', 'text' => 'New Blog Post', 'level' => 1],
                ['type' => 'paragraph', 'text' => 'Write your content here...'],
            ],
        ],
        'landing-page.json' => [
            'title' => 'Landing Page',
            'content' => [
                ['type' => 'heading', 'text' => 'Welcome', 'level' => 1],
                ['type' => 'paragraph', 'text' => 'Your landing page content.'],
            ],
        ],
        'static-page.json' => [
            'title' => 'Static Page',
            'content' => [
                ['type' => 'heading', 'text' => 'Page Title', 'level' => 1],
                ['type' => 'paragraph', 'text' => 'Static page content.'],
            ],
        ],
    ];
    
    foreach ($seedTemplates as $filename => $template) {
        $seedPath = $seedsDir . '/' . $filename;
        if (!file_exists($seedPath)) {
            file_put_contents($seedPath, json_encode($template, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
        }
    }
    
    // Don't create setup lock file yet - user needs to see webserver config first
    // Lock file will be created when user clicks "Finish Setup"
    
    sendJson(200, [
        'success' => true,
        'message' => 'Setup completed successfully',
        'adminUrl' => '/admin/',
        'newSetupToken' => $newToken, // Return rotated token
    ]);
}

// Route: GET /webserver-config - Get configuration snippets
if ($method === 'GET' && $path === '/webserver-config') {
    $webserver = $_GET['type'] ?? 'apache';
    
    // Whitelist validation
    $allowedTypes = ['apache', 'nginx', 'unknown'];
    if (!in_array($webserver, $allowedTypes, true)) {
        sendJson(400, ['error' => 'Invalid webserver type']);
    }
    
    // Default to apache if unknown
    if ($webserver === 'unknown') {
        $webserver = 'apache';
    }
    
    $configs = [
        'apache' => [
            'name' => 'Apache (.htaccess)',
            'file' => '.htaccess',
            'content' => <<<'HTACCESS'
# fourteenkilobytes - Apache Configuration
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteBase /

    # Redirect to setup if not completed
    RewriteCond %{REQUEST_URI} !^/setup
    RewriteCond %{DOCUMENT_ROOT}/data/.setup-complete !-f
    RewriteRule ^.*$ /setup/ [R=302,L]

    # API routing
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_URI} ^/api/
    RewriteRule ^api/(.*)$ /api/index.php/$1 [L,QSA]

    # Admin routing
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_URI} ^/admin/
    RewriteRule ^admin/$ /admin/index.html [L]

    # Frontend routing
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_URI} !^/admin/
    RewriteCond %{REQUEST_URI} !^/api/
    RewriteCond %{REQUEST_URI} !^/setup/
    RewriteRule ^(.*)$ /index.php [L,QSA]
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "DENY"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Protect sensitive files
<FilesMatch "^\.">
    Order allow,deny
    Deny from all
</FilesMatch>

<Files "*.json">
    <IfModule !mod_authz_core.c>
        Order allow,deny
    </IfModule>
    <IfModule mod_authz_core.c>
        Require all denied
    </IfModule>
</Files>
HTACCESS
        ],
        'nginx' => [
            'name' => 'Nginx',
            'file' => '/etc/nginx/sites-available/yoursite',
            'content' => <<<'NGINX'
# nginx configuration for fourteenkilobytes

server {
    listen 80;
    server_name example.com;
    root /var/www/fourteenkilobytes;
    index index.php index.html;

    # Charset
    charset utf-8;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Redirect to setup if not completed
    location / {
        if (!-f $document_root/data/.setup-complete) {
            return 302 /setup/;
        }
        try_files $uri $uri/ /index.php?$query_string;
    }

    # API routing
    location /api {
        try_files $uri /api/index.php$is_args$args;
    }

    # Admin routing
    location /admin {
        try_files $uri $uri/ /admin/index.html;
    }

    # Setup routing
    location /setup {
        try_files $uri $uri/ /setup/index.php;
    }

    # PHP handling
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.3-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Protect sensitive files
    location ~ /\.(?!well-known) {
        deny all;
    }

    location ~* \.json$ {
        deny all;
    }

    location ~ ^/data/ {
        deny all;
    }
}
NGINX
        ],
    ];
    
    if (!isset($configs[$webserver])) {
        sendJson(404, ['error' => 'Unknown webserver type']);
    }
    
    sendJson(200, $configs[$webserver]);
}

// Route: POST /complete - Finalize setup (create lock file)
if ($method === 'POST' && $path === '/complete') {
    // Validate setup token
    validateSetupToken();
    
    // Check if already completed (idempotent)
    if (file_exists(SETUP_LOCK_FILE)) {
        sendJson(200, [
            'success' => true,
            'message' => 'Setup already completed',
            'redirectUrl' => '/admin/',
        ]);
    }
    
    // Verify instance.json exists (user completed initialization)
    if (!file_exists(INSTANCE_FILE)) {
        sendJson(400, ['error' => 'Setup not initialized']);
    }
    
    // Create setup lock file atomically
    $fp = @fopen(SETUP_LOCK_FILE, 'x');
    if ($fp === false) {
        // Race condition - another request completed it
        sendJson(200, [
            'success' => true,
            'message' => 'Setup already completed',
            'redirectUrl' => '/admin/',
        ]);
    }
    if (fwrite($fp, date('c')) === false) {
        fclose($fp);
        @unlink(SETUP_LOCK_FILE);
        sendJson(500, ['error' => 'Failed to write setup lock file']);
    }
    fclose($fp);
    
    // Invalidate setup token after successful completion
    unset($_SESSION['setup_token']);
    session_destroy();
    
    sendJson(200, [
        'success' => true,
        'message' => 'Setup completed successfully',
        'redirectUrl' => '/admin/',
    ]);
}

// 404 for unknown routes
sendJson(404, ['error' => 'Not found']);
