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

// Block all routes if setup is complete (except status)
if (isSetupComplete() && $path !== '/status') {
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
    
    // Auto-fix attempt: Try to set standard permissions if not writable
    if (!$dataWritable && is_dir(DATA_DIR)) {
        @chmod(DATA_DIR, 0755); // Try standard 755 first
        clearstatcache();
        $dataWritable = is_writable(DATA_DIR);
        
        if (!$dataWritable) {
            @chmod(DATA_DIR, 0775); // Try group write
            clearstatcache();
            $dataWritable = is_writable(DATA_DIR);
        }
    }

    $checks['dataDir'] = [
        'label' => 'Data Directory',
        'status' => $dataWritable ? 'ok' : 'error',
        'message' => $dataWritable ? 'Writable' : 'Not writable',
        'fix' => !$dataWritable ? 
            'FTP: Set permissions to 755 (or 777 as last resort) for /data folder.<br>SSH: <code>chmod 775 data/</code><br><span style="color:var(--text-secondary)">Note: 777 is less secure on shared hosting. Ensure .htaccess works!</span>' 
            : null,
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

// Route: POST /install - Perform full installation atomically
if ($method === 'POST' && $path === '/install') {
    // Validate setup token
    validateSetupToken();
    
    // Check if setup is already complete (Double check)
    if (isSetupComplete()) {
        sendJson(409, ['error' => 'Setup already completed']);
    }

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
    $allowedLanguages = ['en', 'de', 'de', 'es', 'fr', 'it', 'pt', 'ja', 'zh'];
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
    
    // Create instance.json
    // We use 'w' (write/truncate) to recover from partial/failed setups if lock file is missing.
    // The security is guaranteed by isSetupComplete() check above.
    $fp = @fopen(INSTANCE_FILE, 'w');
    if ($fp === false) {
        sendJson(500, ['error' => 'Failed to write instance file. Check permissions.']);
    }
    $instance = [
        'salt' => $salt,
        'apiToken' => $apiToken,
        'createdAt' => date('c'),
    ];
    $jsonData = json_encode($instance, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if (fwrite($fp, $jsonData) === false) {
        fclose($fp);
        sendJson(500, ['error' => 'Failed to write instance data']);
    }
    fclose($fp);
    
    // SECURITY: Most restrictive permissions - owner read/write only
    if (!@chmod(INSTANCE_FILE, 0600)) {
        error_log('Warning: Could not set secure permissions on instance.json');
    }
    
    // Create settings.json with initial values
    $settings = [
        'siteTitle' => $siteTitle,
        'siteTitleEnabled' => true,
        'language' => $language,
        'siteLanguage' => $language === 'de' ? 'de' : 'en',
        'cssMode' => 'default',
        'cssEnabled' => true,
        'optimizations' => [
            'compression' => ['enabled' => true],
            'classMangling' => ['enabled' => false, 'mode' => 'safe'],
        ],
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
    // Running the wizard again (e.g. after instance.json was deleted to reset a lost password)
    // only replaces the password. Existing settings, content index and page types are kept.
    $preserved = [];
    $pageTypesFile = DATA_DIR . '/page-types.json';
    $initialFiles = [
        'settings' => [SETTINGS_FILE, $settings],
        'manifest' => [MANIFEST_FILE, ['version' => 1, 'entries' => []]],
        'pageTypes' => [$pageTypesFile, ['version' => 1, 'types' => []]],
    ];
    foreach ($initialFiles as $name => [$file, $initialData]) {
        if (file_exists($file)) {
            $preserved[] = $name;
            continue;
        }
        file_put_contents($file, json_encode($initialData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
    }
    
    // Reset sessions (logs out any old login) and rate limits; both are owner-only.
    $sessionsFile = DATA_DIR . '/sessions.json';
    file_put_contents($sessionsFile, json_encode([]), LOCK_EX);
    @chmod($sessionsFile, 0600);
    
    $rateLimitsFile = DATA_DIR . '/rate-limits.json';
    file_put_contents($rateLimitsFile, json_encode([]), LOCK_EX);
    @chmod($rateLimitsFile, 0600);
    
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
    
    // Create setup lock file
    // This is the FINAL step that marks installation as complete
    if (file_put_contents(SETUP_LOCK_FILE, date('c')) === false) {
         // Try to cleanup if lockfile fails to avoid zombie state?
         // No, if we came this far, instance.json is valid.
         sendJson(500, ['error' => 'Failed to finalize setup (lock file)']);
    }

    // Cleanup session
    unset($_SESSION['setup_token']);
    session_destroy();
    
    sendJson(200, [
        'success' => true,
        'message' => 'Installation successful',
        'adminUrl' => '/admin/',
        'preservedData' => $preserved,
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
    
    // Serve the configuration files shipped with the release, so the wizard never drifts from them.
    $configs = [
        'apache' => ['name' => 'Apache (.htaccess)', 'file' => '.htaccess', 'source' => dirname(__DIR__) . '/.htaccess'],
        'nginx' => ['name' => 'Nginx', 'file' => '/etc/nginx/sites-available/yoursite', 'source' => dirname(__DIR__) . '/nginx.conf.example'],
    ];

    $config = $configs[$webserver];
    $content = @file_get_contents($config['source']);
    if ($content === false) {
        sendJson(500, ['error' => 'Configuration template not found']);
    }

    sendJson(200, ['name' => $config['name'], 'file' => $config['file'], 'content' => $content]);
}

// 404 for unknown routes
sendJson(404, ['error' => 'Not found']);

