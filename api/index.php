<?php
/**
 * fourteenkilobytes API Router
 *
 * Single entry point for all API requests.
 * Requires URL rewriting: /api/* -> /api/index.php
 */

declare(strict_types=1);

// Error handling
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// CORS and content type
header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'");

// Configuration
define('DATA_DIR', dirname(__DIR__) . '/data');
define('INSTANCE_FILE', DATA_DIR . '/instance.json');
define('MANIFEST_FILE', DATA_DIR . '/manifest.json');
define('SETTINGS_FILE', DATA_DIR . '/settings.json');
define('PAGE_TYPES_FILE', DATA_DIR . '/page-types.json');
define('POSTS_DIR', DATA_DIR . '/posts');
define('SOURCES_DIR', DATA_DIR . '/sources');

// Token derivation settings
define('ITERATIONS', 600000);
define('KEY_LENGTH', 32);

// Cookie settings
define('COOKIE_NAME', 'fkb_auth');
define('COOKIE_LIFETIME', 86400 * 7); // 7 days

// Ensure data directories exist
if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}
if (!is_dir(POSTS_DIR)) {
    mkdir(POSTS_DIR, 0755, true);
}
if (!is_dir(SOURCES_DIR)) {
    mkdir(SOURCES_DIR, 0755, true);
}

/**
 * Send JSON response
 */
function sendJson(int $status, mixed $data): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Read JSON body from request
 */
function readJsonBody(): array {
    $body = file_get_contents('php://input');
    if (empty($body)) {
        return [];
    }
    $data = json_decode($body, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        sendJson(400, ['error' => 'Invalid JSON body']);
    }
    return $data ?? [];
}

/**
 * Get or generate instance salt
 */
function getInstanceSalt(): string {
    $state = readInstanceState();
    if ($state && isset($state['salt'])) {
        return $state['salt'];
    }
    // Generate new random salt
    return base64_encode(random_bytes(32));
}

/**
 * Derive token from password using PBKDF2
 */
function deriveToken(string $password, string $salt): string {
    $key = hash_pbkdf2('sha256', $password, $salt, ITERATIONS, KEY_LENGTH, true);
    return base64_encode($key);
}

/**
 * Read instance state
 */
function readInstanceState(): ?array {
    if (!file_exists(INSTANCE_FILE)) {
        return null;
    }
    $content = file_get_contents(INSTANCE_FILE);
    return json_decode($content, true);
}

/**
 * Check if setup is complete
 */
function isSetupComplete(): bool {
    return readInstanceState() !== null;
}

/**
 * Get API token
 */
function getApiToken(): ?string {
    $state = readInstanceState();
    return $state['token'] ?? null;
}

/**
 * Set auth cookie
 */
function setAuthCookie(string $token): void {
    $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    setcookie(COOKIE_NAME, $token, [
        'expires' => time() + COOKIE_LIFETIME,
        'path' => '/',
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Strict',
    ]);
}

/**
 * Clear auth cookie
 */
function clearAuthCookie(): void {
    setcookie(COOKIE_NAME, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

/**
 * Check authorization via cookie
 */
function checkAuth(): bool {
    $token = getApiToken();
    if ($token === null) {
        return true; // No auth configured
    }

    $cookieToken = $_COOKIE[COOKIE_NAME] ?? '';
    if (empty($cookieToken)) {
        return false;
    }

    return hash_equals($token, $cookieToken);
}

/**
 * Require authorization or fail
 */
function requireAuth(): void {
    if (!checkAuth()) {
        sendJson(401, ['error' => 'Unauthorized']);
    }
}

/**
 * Load manifest
 */
function loadManifest(): array {
    if (!file_exists(MANIFEST_FILE)) {
        return [
            'version' => 1,
            'entries' => [],
        ];
    }
    $content = file_get_contents(MANIFEST_FILE);
    return json_decode($content, true) ?? ['version' => 1, 'entries' => []];
}

/**
 * Save manifest
 */
function saveManifest(array $manifest): void {
    // Create backup before saving
    if (file_exists(MANIFEST_FILE)) {
        $backup = MANIFEST_FILE . '.bak';
        @copy(MANIFEST_FILE, $backup);
    }
    file_put_contents(MANIFEST_FILE, json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

/**
 * Load settings
 */
function loadSettings(): array {
    if (!file_exists(SETTINGS_FILE)) {
        return [
            'version' => 1,
            'cssMode' => 'default',
            'globalCss' => '',
            'header' => ['enabled' => false, 'links' => []],
            'footer' => ['enabled' => false, 'content' => ''],
        ];
    }
    $content = file_get_contents(SETTINGS_FILE);
    $settings = json_decode($content, true);
    // Ensure cssMode has a default for existing settings
    if (!isset($settings['cssMode'])) {
        $settings['cssMode'] = 'default';
    }
    return $settings;
}

/**
 * Save settings
 */
function saveSettings(array $settings): void {
    // Create backup before saving
    if (file_exists(SETTINGS_FILE)) {
        $backup = SETTINGS_FILE . '.bak';
        @copy(SETTINGS_FILE, $backup);
    }
    file_put_contents(SETTINGS_FILE, json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

/**
 * Load page types index
 */
function loadPageTypes(): array {
    if (!file_exists(PAGE_TYPES_FILE)) {
        return ['version' => 1, 'types' => []];
    }
    $content = file_get_contents(PAGE_TYPES_FILE);
    return json_decode($content, true) ?? ['version' => 1, 'types' => []];
}

/**
 * Save page types index
 */
function savePageTypes(array $index): void {
    file_put_contents(PAGE_TYPES_FILE, json_encode($index, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

/**
 * Save source data to separate file
 */
function saveSourceData(string $slug, array $sourceData): void {
    $path = SOURCES_DIR . "/{$slug}.json";
    file_put_contents($path, json_encode($sourceData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

/**
 * Load source data from separate file (with fallback to manifest for migration)
 */
function loadSourceData(string $slug): ?array {
    $path = SOURCES_DIR . "/{$slug}.json";
    if (file_exists($path)) {
        $content = file_get_contents($path);
        return json_decode($content, true);
    }

    // Fallback: check manifest for legacy sourceData
    $manifest = loadManifest();
    foreach ($manifest['entries'] as $entry) {
        if ($entry['slug'] === $slug && isset($entry['sourceData'])) {
            return $entry['sourceData'];
        }
    }

    return null;
}

// Parse request
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Remove /api prefix
$path = preg_replace('#^/api#', '', $path);
if (empty($path)) {
    $path = '/';
}

// Route: GET /health
if ($method === 'GET' && $path === '/health') {
    sendJson(200, ['status' => 'ok']);
}

// Route: GET /setup-status
if ($method === 'GET' && $path === '/setup-status') {
    sendJson(200, ['setupComplete' => isSetupComplete()]);
}

// Route: POST /setup
if ($method === 'POST' && $path === '/setup') {
    if (isSetupComplete()) {
        sendJson(403, ['error' => 'Setup already complete']);
    }

    $body = readJsonBody();
    $password = $body['password'] ?? '';

    if (strlen($password) < 8) {
        sendJson(400, ['error' => 'Password must be at least 8 characters']);
    }

    $salt = base64_encode(random_bytes(32));
    $token = deriveToken($password, $salt);
    $state = [
        'salt' => $salt,
        'token' => $token,
        'createdAt' => date('c'),
    ];

    // Atomic write (fail if exists)
    $fp = @fopen(INSTANCE_FILE, 'x');
    if ($fp === false) {
        sendJson(403, ['error' => 'Setup already complete']);
    }
    fwrite($fp, json_encode($state, JSON_PRETTY_PRINT));
    fclose($fp);

    // Auto-login after setup
    setAuthCookie($token);

    sendJson(201, ['success' => true]);
}

// Route: POST /login
if ($method === 'POST' && $path === '/login') {
    if (!isSetupComplete()) {
        sendJson(400, ['error' => 'Setup not complete']);
    }

    $body = readJsonBody();
    $password = $body['password'] ?? '';

    if (empty($password)) {
        sendJson(400, ['error' => 'Password required']);
    }

    $salt = getInstanceSalt();
    $token = deriveToken($password, $salt);
    $storedToken = getApiToken();

    if (!hash_equals($storedToken, $token)) {
        sendJson(401, ['error' => 'Invalid password']);
    }

    setAuthCookie($token);
    sendJson(200, ['success' => true]);
}

// Route: POST /logout
if ($method === 'POST' && $path === '/logout') {
    clearAuthCookie();
    sendJson(200, ['success' => true]);
}

// Route: GET /config
if ($method === 'GET' && $path === '/config') {
    sendJson(200, ['authEnabled' => getApiToken() !== null]);
}

// Route: GET /auth-check (protected)
if ($method === 'GET' && $path === '/auth-check') {
    requireAuth();
    sendJson(200, ['authenticated' => true]);
}

// Route: GET /posts
if ($method === 'GET' && $path === '/posts') {
    $manifest = loadManifest();
    $pageTypes = loadPageTypes();

    $posts = [];
    foreach ($manifest['entries'] ?? [] as $entry) {
        $posts[] = [
            'slug' => $entry['slug'],
            'title' => $entry['title'],
            'publishedAt' => $entry['publishedAt'],
            'status' => $entry['status'],
            'pageType' => $pageTypes['types'][$entry['slug']] ?? 'post',
        ];
    }

    // Sort by publishedAt descending
    usort($posts, fn($a, $b) => strcmp($b['publishedAt'], $a['publishedAt']));

    sendJson(200, ['posts' => $posts]);
}

// Route: GET /posts/:slug
if ($method === 'GET' && preg_match('#^/posts/([a-z0-9-]+)$#', $path, $matches)) {
    $slug = $matches[1];
    $manifest = loadManifest();

    // Find entry
    $entry = null;
    foreach ($manifest['entries'] ?? [] as $e) {
        if ($e['slug'] === $slug) {
            $entry = $e;
            break;
        }
    }

    if (!$entry) {
        sendJson(404, ['error' => 'Post not found']);
    }

    if ($entry['status'] === 'tombstone') {
        header('Content-Type: text/html; charset=utf-8');
        echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gone</title></head><body><h1>410 Gone</h1><p>This page has been removed.</p></body></html>';
        exit;
    }

    $htmlPath = POSTS_DIR . "/{$slug}.html";
    if (!file_exists($htmlPath)) {
        sendJson(404, ['error' => 'Post not found']);
    }

    header('Content-Type: text/html; charset=utf-8');
    readfile($htmlPath);
    exit;
}

// Route: POST /posts (protected)
if ($method === 'POST' && $path === '/posts') {
    requireAuth();

    $body = readJsonBody();
    $timestamp = date('c');

    // Support both single-page (legacy) and multi-page (pagination) format
    if (isset($body['pages']) && is_array($body['pages'])) {
        // Multi-page format: { pages: [...], title, pageType, sourceData }
        $pages = $body['pages'];
        $title = $body['title'] ?? 'Untitled';
        $pageType = $body['pageType'] ?? 'post';
        $sourceData = $body['sourceData'] ?? null;

        if (empty($pages)) {
            sendJson(400, ['error' => 'Pages array cannot be empty']);
        }

        // Base slug is from the first page
        $baseSlug = $pages[0]['slug'] ?? '';
        if (!preg_match('/^[a-z0-9-]+$/', $baseSlug)) {
            sendJson(400, ['error' => 'Invalid slug format']);
        }

        // Validate all pages
        $totalBytes = 0;
        foreach ($pages as $i => $page) {
            if (empty($page['slug']) || empty($page['html'])) {
                sendJson(400, ['error' => "Page {$i} missing slug or html"]);
            }
            if (strlen($page['html']) > 1048576) {
                sendJson(400, ['error' => "Page {$i} HTML too large (max 1MB)"]);
            }
            $totalBytes += strlen($page['html']);
        }

        // Check for tombstone conflict on base slug
        $manifest = loadManifest();
        foreach ($manifest['entries'] ?? [] as $entry) {
            if ($entry['slug'] === $baseSlug && $entry['status'] === 'tombstone') {
                sendJson(409, ['error' => "Slug '{$baseSlug}' was previously used and tombstoned"]);
            }
        }

        // Save all HTML files
        $savedSlugs = [];
        foreach ($pages as $page) {
            $htmlPath = POSTS_DIR . "/{$page['slug']}.html";
            file_put_contents($htmlPath, $page['html']);
            $savedSlugs[] = $page['slug'];
        }

        // Update manifest with base slug only (paginated pages share one entry)
        $newEntries = array_filter($manifest['entries'] ?? [], fn($e) => $e['slug'] !== $baseSlug);
        $manifestEntry = [
            'slug' => $baseSlug,
            'status' => 'published',
            'hash' => $pages[0]['hash'] ?? hash('sha256', $pages[0]['html']),
            'title' => $title,
            'publishedAt' => $timestamp,
            'pageCount' => count($pages),
        ];
        $newEntries[] = $manifestEntry;

        // Save sourceData to separate file
        if ($sourceData !== null) {
            saveSourceData($baseSlug, $sourceData);
        }
        $manifest['entries'] = array_values($newEntries);
        saveManifest($manifest);

        // Update page types
        $pageTypes = loadPageTypes();
        $pageTypes['types'][$baseSlug] = $pageType;
        savePageTypes($pageTypes);

        sendJson(201, [
            'slug' => $baseSlug,
            'pages' => $savedSlugs,
            'pageCount' => count($pages),
            'totalBytes' => $totalBytes,
            'publishedAt' => $timestamp,
            'pageType' => $pageType,
        ]);
    } else {
        // Single-page format (legacy): { slug, html, bytes, title, hash, pageType, sourceData }
        if (empty($body['slug']) || empty($body['html']) || !isset($body['bytes'])) {
            sendJson(400, ['error' => 'Missing required fields: slug, html, bytes']);
        }

        if (strlen($body['html']) > 1048576) {
            sendJson(400, ['error' => 'HTML content too large (max 1MB)']);
        }

        $slug = $body['slug'];
        $html = $body['html'];
        $bytes = (int)$body['bytes'];
        $title = $body['title'] ?? $slug;
        $hash = $body['hash'] ?? hash('sha256', $html);
        $pageType = $body['pageType'] ?? 'post';
        $sourceData = $body['sourceData'] ?? null;

        if (!preg_match('/^[a-z0-9-]+$/', $slug)) {
            sendJson(400, ['error' => 'Invalid slug format']);
        }

        $manifest = loadManifest();
        foreach ($manifest['entries'] ?? [] as $entry) {
            if ($entry['slug'] === $slug && $entry['status'] === 'tombstone') {
                sendJson(409, ['error' => "Slug '{$slug}' was previously used and tombstoned"]);
            }
        }

        $htmlPath = POSTS_DIR . "/{$slug}.html";
        file_put_contents($htmlPath, $html);

        $newEntries = array_filter($manifest['entries'] ?? [], fn($e) => $e['slug'] !== $slug);
        $manifestEntry = [
            'slug' => $slug,
            'status' => 'published',
            'hash' => $hash,
            'title' => $title,
            'publishedAt' => $timestamp,
        ];
        $newEntries[] = $manifestEntry;
        $manifest['entries'] = array_values($newEntries);
        saveManifest($manifest);

        // Save sourceData to separate file
        if ($sourceData !== null) {
            saveSourceData($slug, $sourceData);
        }

        $pageTypes = loadPageTypes();
        $pageTypes['types'][$slug] = $pageType;
        savePageTypes($pageTypes);

        sendJson(201, [
            'slug' => $slug,
            'hash' => $hash,
            'bytes' => $bytes,
            'publishedAt' => $timestamp,
            'pageType' => $pageType,
        ]);
    }
}

// Route: POST /posts/:slug/republish (protected) - Regenerate page with current posts
if ($method === 'POST' && preg_match('#^/posts/([a-z0-9-]+)/republish$#', $path, $matches)) {
    requireAuth();

    $slug = $matches[1];
    $manifest = loadManifest();

    // Check if post exists
    $found = false;
    foreach ($manifest['entries'] as $entry) {
        if ($entry['slug'] === $slug) {
            $found = true;
            break;
        }
    }

    if (!$found) {
        sendJson(404, ['error' => "Post '{$slug}' not found"]);
    }

    // Load sourceData from separate file (with fallback to manifest)
    $sourceData = loadSourceData($slug);

    if ($sourceData === null) {
        sendJson(400, ['error' => "Post '{$slug}' has no source data (was published before this feature)"]);
    }

    // Return sourceData - client will compile and republish
    sendJson(200, [
        'slug' => $slug,
        'sourceData' => $sourceData,
    ]);
}

// Route: DELETE /posts/:slug (protected)
if ($method === 'DELETE' && preg_match('#^/posts/([a-z0-9-]+)$#', $path, $matches)) {
    requireAuth();

    $slug = $matches[1];
    $manifest = loadManifest();

    // Find and update entry
    $found = false;
    foreach ($manifest['entries'] as &$entry) {
        if ($entry['slug'] === $slug) {
            if ($entry['status'] === 'tombstone') {
                sendJson(400, ['error' => "Post '{$slug}' already tombstoned"]);
            }
            $entry['status'] = 'tombstone';
            $entry['tombstonedAt'] = date('c');
            $found = true;
            break;
        }
    }

    if (!$found) {
        sendJson(404, ['error' => "Post '{$slug}' not found"]);
    }

    // Replace HTML with tombstone
    $tombstoneHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gone</title></head><body><h1>410 Gone</h1><p>This page has been removed.</p></body></html>';
    file_put_contents(POSTS_DIR . "/{$slug}.html", $tombstoneHtml);

    saveManifest($manifest);

    sendJson(200, ['tombstoned' => true, 'slug' => $slug]);
}

// Route: GET /settings (protected)
if ($method === 'GET' && $path === '/settings') {
    requireAuth();
    sendJson(200, loadSettings());
}

// Route: PUT /settings (protected)
if ($method === 'PUT' && $path === '/settings') {
    requireAuth();

    $settings = readJsonBody();

    if (($settings['version'] ?? 0) !== 1) {
        sendJson(400, ['error' => 'Invalid settings version']);
    }

    saveSettings($settings);
    sendJson(200, ['success' => true]);
}

// Route: GET /icons
if ($method === 'GET' && $path === '/icons') {
    // Icons are now handled client-side via the compiler bundle
    // Return empty list - the frontend will use the bundled icons
    sendJson(200, ['icons' => []]);
}

// 404 for unknown routes
sendJson(404, ['error' => 'Not found']);
