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
header('Content-Security-Policy: default-src \'none\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data:; font-src \'self\'; connect-src \'self\'; frame-ancestors \'none\'; base-uri \'self\'; form-action \'self\'');

// HSTS - enforce HTTPS (1 year, include subdomains, preload ready)
if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains; preload');
}

// Configuration
define('DATA_DIR', dirname(__DIR__) . '/data');
define('INSTANCE_FILE', DATA_DIR . '/instance.json');
define('MANIFEST_FILE', DATA_DIR . '/manifest.json');
define('SETTINGS_FILE', DATA_DIR . '/settings.json');
define('PAGE_TYPES_FILE', DATA_DIR . '/page-types.json');
define('POSTS_DIR', DATA_DIR . '/posts');
define('SOURCES_DIR', DATA_DIR . '/sources');
define('RATE_LIMIT_FILE', DATA_DIR . '/rate-limits.json');

// Token derivation settings
define('ITERATIONS', 600000);
define('KEY_LENGTH', 32);

// Rate limiting settings
define('RATE_LIMIT_MAX_ATTEMPTS', 5);
define('RATE_LIMIT_WINDOW_SECONDS', 300); // 5 minutes

// Global rate limiting (per IP per endpoint)
define('GLOBAL_RATE_LIMIT_FILE', DATA_DIR . '/global-rate-limits.json');
define('GLOBAL_RATE_LIMIT_MAX_REQUESTS', 100); // requests per window
define('GLOBAL_RATE_LIMIT_WINDOW', 900); // 15 minutes
define('GLOBAL_RATE_LIMIT_STRICT_MAX', 30); // for write operations
define('GLOBAL_RATE_LIMIT_STRICT_WINDOW', 300); // 5 minutes

// Request size limit (2MB - accounts for base64 encoded content)
define('MAX_REQUEST_SIZE', 2 * 1024 * 1024);

// Cookie settings
define('COOKIE_NAME', 'fkb_auth_v2');
define('COOKIE_LIFETIME', 86400); // 24 hours

// CSRF settings
define('CSRF_COOKIE_NAME', 'fkb_csrf');
define('CSRF_HEADER_NAME', 'HTTP_X_CSRF_TOKEN');

// Session settings
define('SESSION_FILE', DATA_DIR . '/sessions.json');
define('SESSION_ROTATION_INTERVAL', 900); // Rotate token every 15 minutes
define('SESSION_MAX_LIFETIME', 86400); // Max 24 hours even with rotation

// Audit logging
define('AUDIT_LOG_FILE', DATA_DIR . '/audit.log');
define('AUDIT_LOG_MAX_SIZE', 5 * 1024 * 1024); // 5MB max before rotation

// Ensure data directories exist (0750 = owner rwx, group rx, others none)
if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0750, true);
}
if (!is_dir(POSTS_DIR)) {
    mkdir(POSTS_DIR, 0750, true);
}
if (!is_dir(SOURCES_DIR)) {
    mkdir(SOURCES_DIR, 0750, true);
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
    // Check Content-Length header first
    $contentLength = $_SERVER['CONTENT_LENGTH'] ?? 0;
    if ($contentLength > MAX_REQUEST_SIZE) {
        sendJson(413, ['error' => 'Request body too large']);
    }

    $body = file_get_contents('php://input');
    if (empty($body)) {
        return [];
    }

    // Double-check actual body size
    if (strlen($body) > MAX_REQUEST_SIZE) {
        sendJson(413, ['error' => 'Request body too large']);
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
    return bin2hex($key);
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
 * Check if setup is complete (both lock file AND password must exist)
 */
function isSetupComplete(): bool {
    return file_exists(DATA_DIR . '/.setup-complete') && readInstanceState() !== null;
}

/**
 * Get API token
 */
function getApiToken(): ?string {
    $state = readInstanceState();
    return $state['apiToken'] ?? null;
}

/**
 * Check data directory security
 * Returns array of warning messages
 */
function checkDataDirectorySecurity(): array {
    $warnings = [];
    
    // Check instance.json permissions
    if (file_exists(INSTANCE_FILE)) {
        $perms = fileperms(INSTANCE_FILE) & 0777;
        if ($perms > 0600) {
            $warnings[] = 'instance.json has too permissive permissions (' . 
                         decoct($perms) . '), should be 0600';
        }
    }
    
    // Check sessions.json permissions
    if (file_exists(SESSION_FILE)) {
        $perms = fileperms(SESSION_FILE) & 0777;
        if ($perms > 0600) {
            $warnings[] = 'sessions.json has too permissive permissions (' . 
                         decoct($perms) . '), should be 0600';
        }
    }
    
    return $warnings;
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
        'samesite' => 'Lax',
    ]);
}

/**
 * Set session cookie
 */
function setSessionCookie(string $sessionId): void {
    $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    setcookie('fkb_session', $sessionId, [
        'expires' => time() + COOKIE_LIFETIME,
        'path' => '/',
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Lax',
    ]);
}

/**
 * Clear auth cookie
 */
function clearAuthCookie(): void {
    $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    setcookie(COOKIE_NAME, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Lax',
    ]);
}

// ============================================================================
// CSRF Token Management
// ============================================================================

/**
 * Generate a new CSRF token
 */
function generateCsrfToken(): string {
    return bin2hex(random_bytes(32));
}

/**
 * Set CSRF cookie (readable by JavaScript for header submission)
 */
function setCsrfCookie(string $token): void {
    $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    setcookie(CSRF_COOKIE_NAME, $token, [
        'expires' => time() + COOKIE_LIFETIME,
        'path' => '/',
        'httponly' => false, // Must be readable by JS
        'secure' => $secure,
        'samesite' => 'Strict',
    ]);
}

/**
 * Clear CSRF cookie
 */
function clearCsrfCookie(): void {
    $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    setcookie(CSRF_COOKIE_NAME, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => false,
        'secure' => $secure,
        'samesite' => 'Strict',
    ]);
}

/**
 * Validate CSRF token from header against cookie
 */
function validateCsrfToken(): bool {
    $cookieToken = $_COOKIE[CSRF_COOKIE_NAME] ?? '';
    $headerToken = $_SERVER[CSRF_HEADER_NAME] ?? '';

    if (empty($cookieToken) || empty($headerToken)) {
        return false;
    }

    return hash_equals($cookieToken, $headerToken);
}

/**
 * Require valid CSRF token or fail
 */
function requireCsrfToken(): void {
    if (!validateCsrfToken()) {
        auditLog('csrf_failure', ['ip' => getClientIp()]);
        sendJson(403, ['error' => 'Invalid or missing CSRF token']);
    }
}

// ============================================================================
// Session Management
// ============================================================================

/**
 * Load sessions from file
 */
function loadSessions(): array {
    if (!file_exists(SESSION_FILE)) {
        return [];
    }
    $content = @file_get_contents(SESSION_FILE);
    return $content ? json_decode($content, true) : [];
}

/**
 * Save sessions to file
 */
function saveSessions(array $sessions): void {
    file_put_contents(SESSION_FILE, json_encode($sessions), LOCK_EX);
}

/**
 * Create a new session
 */
function createSession(string $authToken): string {
    $sessions = loadSessions();
    $sessionId = bin2hex(random_bytes(32));
    $now = time();

    $sessions[$sessionId] = [
        'authToken' => $authToken,
        'createdAt' => $now,
        'lastRotation' => $now,
        'ip' => getClientIp(),
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    ];

    // Clean up expired sessions (including grace period for rotated ones)
    $sessions = array_filter($sessions, function($s) use ($now) {
        if (isset($s['rotatedTo'])) {
             // Keep rotated sessions for 60 seconds
             return ($now - ($s['rotatedAt'] ?? 0) < 60);
        }
        return ($now - $s['createdAt'] < SESSION_MAX_LIFETIME);
    });

    saveSessions($sessions);
    return $sessionId;
}

/**
 * Validate and optionally rotate session
 */
function validateSession(string $sessionId): ?array {
    $sessions = loadSessions();

    if (!isset($sessions[$sessionId])) {
        return null;
    }

    $session = $sessions[$sessionId];
    $now = time();

    // Check if this is an old session that was rotated (Grace period)
    if (isset($session['rotatedTo'])) {
         if ($now - ($session['rotatedAt'] ?? 0) < 60) {
             // Within grace period, allow it but return the NEW session ID
             return [
                 'session' => $sessions[$session['rotatedTo']] ?? $session, 
                 'newSessionId' => $session['rotatedTo']
             ];
         } else {
             // Grace period over
             unset($sessions[$sessionId]);
             saveSessions($sessions);
             return null;
         }
    }

    // Check max lifetime
    if ($now - $session['createdAt'] > SESSION_MAX_LIFETIME) {
        unset($sessions[$sessionId]);
        saveSessions($sessions);
        return null;
    }

    // Check if rotation needed
    if ($now - $session['lastRotation'] > SESSION_ROTATION_INTERVAL) {
        // Create new session ID, preserve session data
        $newSessionId = bin2hex(random_bytes(32));
        $session['lastRotation'] = $now;
        
        // New session
        $sessions[$newSessionId] = $session;
        
        // Mark old session as rotated instead of deleting immediately
        $sessions[$sessionId]['rotatedTo'] = $newSessionId;
        $sessions[$sessionId]['rotatedAt'] = $now;
        
        saveSessions($sessions);

        // Return new session ID for cookie update
        return ['session' => $session, 'newSessionId' => $newSessionId];
    }

    return ['session' => $session, 'newSessionId' => null];
}

/**
 * Destroy a session
 */
function destroySession(string $sessionId): void {
    $sessions = loadSessions();
    unset($sessions[$sessionId]);
    saveSessions($sessions);
}

/**
 * Destroy all sessions (for password change, security events)
 */
function destroyAllSessions(): void {
    saveSessions([]);
}

// ============================================================================
// Audit Logging
// ============================================================================

/**
 * Write an audit log entry
 */
function auditLog(string $action, array $details = []): void {
    // Rotate log if too large
    if (file_exists(AUDIT_LOG_FILE) && filesize(AUDIT_LOG_FILE) > AUDIT_LOG_MAX_SIZE) {
        $backupFile = AUDIT_LOG_FILE . '.' . date('Y-m-d-His') . '.bak';
        @rename(AUDIT_LOG_FILE, $backupFile);
    }

    $entry = [
        'timestamp' => date('c'),
        'action' => $action,
        'ip' => getClientIp(),
        'userAgent' => substr($_SERVER['HTTP_USER_AGENT'] ?? 'unknown', 0, 100),
        'details' => $details,
    ];

    $line = json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";
    file_put_contents(AUDIT_LOG_FILE, $line, FILE_APPEND | LOCK_EX);
}

/**
 * Get client IP address
 * SECURITY: Only use X-Forwarded-For if behind a trusted reverse proxy
 */
function getClientIp(): string {
    // SECURITY NOTE: Set this to true ONLY if behind a trusted reverse proxy
    // (nginx, Apache, CloudFlare, etc.) that you control
    $trustProxy = false; // TODO: Set to true if using reverse proxy
    
    if ($trustProxy) {
        // Check for forwarded IP (behind proxy/load balancer)
        $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        if ($forwarded) {
            // Take first IP in chain and validate format
            $ips = explode(',', $forwarded);
            $ip = trim($ips[0]);
            // Validate IP format
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }
    
    // Always fall back to REMOTE_ADDR (cannot be spoofed by client)
    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

/**
 * Check rate limit for IP
 */
function checkRateLimit(string $ip): bool {
    $limits = loadRateLimits();
    $now = time();

    if (!isset($limits[$ip])) {
        return true;
    }

    $entry = $limits[$ip];
    // Check if window has expired
    if ($now - $entry['firstAttempt'] > RATE_LIMIT_WINDOW_SECONDS) {
        return true;
    }

    return $entry['attempts'] < RATE_LIMIT_MAX_ATTEMPTS;
}

/**
 * Record failed login attempt
 */
function recordFailedAttempt(string $ip): void {
    $limits = loadRateLimits();
    $now = time();

    if (!isset($limits[$ip]) || $now - $limits[$ip]['firstAttempt'] > RATE_LIMIT_WINDOW_SECONDS) {
        $limits[$ip] = ['attempts' => 1, 'firstAttempt' => $now];
    } else {
        $limits[$ip]['attempts']++;
    }

    saveRateLimits($limits);
}

/**
 * Clear rate limit for IP (on successful login)
 */
function clearRateLimit(string $ip): void {
    $limits = loadRateLimits();
    unset($limits[$ip]);
    saveRateLimits($limits);
}

/**
 * Load rate limits from file
 */
function loadRateLimits(): array {
    if (!file_exists(RATE_LIMIT_FILE)) {
        return [];
    }
    $content = @file_get_contents(RATE_LIMIT_FILE);
    $limits = $content ? json_decode($content, true) : [];

    // Clean up expired entries
    $now = time();
    $limits = array_filter($limits, fn($entry) =>
        $now - $entry['firstAttempt'] <= RATE_LIMIT_WINDOW_SECONDS
    );

    return $limits;
}

/**
 * Save rate limits to file
 */
function saveRateLimits(array $limits): void {
    file_put_contents(RATE_LIMIT_FILE, json_encode($limits), LOCK_EX);
}

// ============================================================================
// Global Rate Limiting (per endpoint)
// ============================================================================

/**
 * Load global rate limits
 */
function loadGlobalRateLimits(): array {
    if (!file_exists(GLOBAL_RATE_LIMIT_FILE)) {
        return [];
    }
    $content = @file_get_contents(GLOBAL_RATE_LIMIT_FILE);
    $limits = $content ? json_decode($content, true) : [];
    
    // Clean up expired entries
    $now = time();
    foreach ($limits as $key => $entry) {
        $window = $entry['window'] ?? GLOBAL_RATE_LIMIT_WINDOW;
        if ($now - $entry['firstRequest'] > $window) {
            unset($limits[$key]);
        }
    }
    
    return $limits;
}

/**
 * Save global rate limits
 */
function saveGlobalRateLimits(array $limits): void {
    file_put_contents(GLOBAL_RATE_LIMIT_FILE, json_encode($limits), LOCK_EX);
}

/**
 * Check global rate limit for endpoint
 * @param string $endpoint The API endpoint path
 * @param bool $strict Use stricter limits for write operations
 */
function checkGlobalRateLimit(string $endpoint, bool $strict = false): void {
    $ip = getClientIp();
    $key = "ip:{$ip}:endpoint:{$endpoint}";
    
    $limits = loadGlobalRateLimits();
    $now = time();
    
    $maxRequests = $strict ? GLOBAL_RATE_LIMIT_STRICT_MAX : GLOBAL_RATE_LIMIT_MAX_REQUESTS;
    $window = $strict ? GLOBAL_RATE_LIMIT_STRICT_WINDOW : GLOBAL_RATE_LIMIT_WINDOW;
    
    if (!isset($limits[$key])) {
        // First request from this IP for this endpoint
        $limits[$key] = [
            'requests' => 1,
            'firstRequest' => $now,
            'window' => $window,
        ];
        saveGlobalRateLimits($limits);
        return;
    }
    
    $entry = $limits[$key];
    
    // Check if window has expired
    if ($now - $entry['firstRequest'] > $window) {
        // Reset counter
        $limits[$key] = [
            'requests' => 1,
            'firstRequest' => $now,
            'window' => $window,
        ];
        saveGlobalRateLimits($limits);
        return;
    }
    
    // Check if limit exceeded
    if ($entry['requests'] >= $maxRequests) {
        $retryAfter = $window - ($now - $entry['firstRequest']);
        header("Retry-After: {$retryAfter}");
        auditLog('rate_limit_exceeded', [
            'ip' => $ip,
            'endpoint' => $endpoint,
            'requests' => $entry['requests'],
            'limit' => $maxRequests,
        ]);
        sendJson(429, [
            'error' => 'Rate limit exceeded',
            'retryAfter' => $retryAfter,
            'limit' => $maxRequests,
        ]);
    }
    
    // Increment counter
    $limits[$key]['requests']++;
    saveGlobalRateLimits($limits);
}

/**
 * Check authorization via cookie and session
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

    // Validate against stored token
    if (!hash_equals($token, $cookieToken)) {
        return false;
    }

    // Session-based validation for additional security
    $sessionId = $_COOKIE['fkb_session'] ?? '';
    if (!empty($sessionId)) {
        $validation = validateSession($sessionId);
        if ($validation === null) {
            // Session expired or invalid
            return false;
        }

        // If session was rotated, update the session cookie
        if ($validation['newSessionId'] !== null) {
            setSessionCookie($validation['newSessionId']);
        }

        // Verify token from session matches
        $sessionToken = $validation['session']['authToken'] ?? '';
        if (!hash_equals($token, $sessionToken)) {
            return false;
        }

        // Additional security: Check IP consistency (optional, can cause issues with mobile)
        // Uncomment if needed:
        // $currentIp = getClientIp();
        // $sessionIp = $validation['session']['ip'] ?? '';
        // if (!empty($sessionIp) && $currentIp !== $sessionIp) {
        //     auditLog('session_ip_mismatch', ['current' => $currentIp, 'session' => $sessionIp]);
        //     return false;
        // }
    }

    return true;
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
 * Save manifest with atomic write operation
 */
function saveManifest(array $manifest): void {
    // Atomic write using temp file
    $tmpFile = MANIFEST_FILE . '.tmp.' . uniqid() . '.json';
    
    $jsonContent = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($jsonContent === false) {
        sendJson(500, ['error' => 'Failed to encode manifest data']);
    }
    
    // Write to temp file with exclusive lock
    if (file_put_contents($tmpFile, $jsonContent, LOCK_EX) === false) {
        @unlink($tmpFile);
        sendJson(500, ['error' => 'Failed to write manifest']);
    }
    
    // Create backup before replacing (with proper error handling)
    if (file_exists(MANIFEST_FILE)) {
        $backup = MANIFEST_FILE . '.bak';
        if (!@copy(MANIFEST_FILE, $backup)) {
            error_log('Warning: Could not create manifest backup');
        }
    }
    
    // Atomic move (rename is atomic on same filesystem)
    if (!@rename($tmpFile, MANIFEST_FILE)) {
        @unlink($tmpFile);
        sendJson(500, ['error' => 'Failed to finalize manifest']);
    }
    
    // Set secure permissions
    @chmod(MANIFEST_FILE, 0640);
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
            'bloglist' => [
                'limit' => 10,
                'archiveEnabled' => true,
                'archiveSlug' => 'archive',
                'archiveLinkText' => 'View all posts →',
            ],
        ];
    }
    $content = file_get_contents(SETTINGS_FILE);
    $settings = json_decode($content, true);
    // Ensure version is set
    if (!isset($settings['version'])) {
        $settings['version'] = 1;
    }
    // Ensure cssMode has a default for existing settings
    if (!isset($settings['cssMode'])) {
        $settings['cssMode'] = 'default';
    }
    // Ensure bloglist has default for existing settings
    if (!isset($settings['bloglist'])) {
        $settings['bloglist'] = [
            'limit' => 10,
            'archiveEnabled' => false,
            'archiveSlug' => 'archive',
            'archiveLinkText' => 'View all posts →',
        ];
    }
    return $settings;
}

/**
 * Save settings with atomic write operation
 */
function saveSettings(array $settings): void {
    // Atomic write using temp file
    $tmpFile = SETTINGS_FILE . '.tmp.' . uniqid() . '.json';
    
    $jsonContent = json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($jsonContent === false) {
        sendJson(500, ['error' => 'Failed to encode settings data']);
    }
    
    // Write to temp file
    if (file_put_contents($tmpFile, $jsonContent, LOCK_EX) === false) {
        @unlink($tmpFile);
        sendJson(500, ['error' => 'Failed to write settings']);
    }
    
    // Create backup before replacing
    if (file_exists(SETTINGS_FILE)) {
        $backup = SETTINGS_FILE . '.bak';
        @copy(SETTINGS_FILE, $backup);
    }
    
    // Atomic move
    if (!@rename($tmpFile, SETTINGS_FILE)) {
        @unlink($tmpFile);
        sendJson(500, ['error' => 'Failed to finalize settings']);
    }
    
    @chmod(SETTINGS_FILE, 0640);
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
    file_put_contents(PAGE_TYPES_FILE, json_encode($index, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

/**
 * Save source data to separate file
 */
function saveSourceData(string $slug, array $sourceData): void {
    $path = SOURCES_DIR . "/{$slug}.json";
    file_put_contents($path, json_encode($sourceData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
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

// Route: GET /security-status (protected)
if ($method === 'GET' && $path === '/security-status') {
    requireAuth();
    
    $warnings = checkDataDirectorySecurity();
    $status = empty($warnings) ? 'ok' : 'warning';
    
    sendJson(200, [
        'status' => $status,
        'warnings' => $warnings,
        'checks' => [
            'instanceFilePermissions' => file_exists(INSTANCE_FILE) ? 
                decoct(fileperms(INSTANCE_FILE) & 0777) : 'not_found',
            'sessionFilePermissions' => file_exists(SESSION_FILE) ? 
                decoct(fileperms(SESSION_FILE) & 0777) : 'not_found',
        ]
    ]);
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

    // Create lock file FIRST to prevent race conditions
    $setupLockFile = DATA_DIR . '/.setup-complete';
    $lockContent = date('c') . "\n";
    
    // Atomic lock file creation
    $lockFp = @fopen($setupLockFile, 'x');
    if ($lockFp === false) {
        // Lock file already exists, setup is in progress or complete
        sendJson(403, ['error' => 'Setup already complete or in progress']);
    }
    fwrite($lockFp, $lockContent);
    fclose($lockFp);

    // Now create instance file
    $salt = base64_encode(random_bytes(32));
    $token = deriveToken($password, $salt);
    $state = [
        'salt' => $salt,
        'token' => $token,
        'createdAt' => date('c'),
    ];

    // Write instance file with lock
    $stateJson = json_encode($state, JSON_PRETTY_PRINT);
    if (@file_put_contents(INSTANCE_FILE, $stateJson, LOCK_EX) === false) {
        // Rollback: Remove lock file if instance creation fails
        @unlink($setupLockFile);
        sendJson(500, ['error' => 'Failed to create instance file']);
    }

    // Auto-login after setup
    setAuthCookie($token);
    $sessionId = createSession($token);
    setSessionCookie($sessionId);
    $csrfToken = generateCsrfToken();
    setCsrfCookie($csrfToken);

    auditLog('setup_complete', ['ip' => getClientIp()]);

    sendJson(201, ['success' => true, 'csrfToken' => $csrfToken]);
}

// Route: POST /login
if ($method === 'POST' && $path === '/login') {
    if (!isSetupComplete()) {
        sendJson(400, ['error' => 'Setup not complete']);
    }

    // Rate limiting check
    $clientIp = getClientIp();
    if (!checkRateLimit($clientIp)) {
        sendJson(429, ['error' => 'Too many login attempts. Please try again later.']);
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
        recordFailedAttempt($clientIp);
        auditLog('login_failed', ['ip' => $clientIp, 'attempts' => loadRateLimits()[$clientIp]['attempts'] ?? 1]);
        sendJson(401, ['error' => 'Invalid password']);
    }

    // Clear rate limit on successful login
    clearRateLimit($clientIp);
    
    // SECURITY: Invalidate any existing sessions before creating new one
    // This prevents session fixation attacks
    $oldSessionId = $_COOKIE['fkb_session'] ?? '';
    if (!empty($oldSessionId)) {
        destroySession($oldSessionId);
    }

    // Set auth cookie and create new session
    setAuthCookie($token);
    $sessionId = createSession($token);
    setSessionCookie($sessionId);

    // Generate and set CSRF token
    $csrfToken = generateCsrfToken();
    setCsrfCookie($csrfToken);

    auditLog('login_success', ['ip' => $clientIp, 'sessionId' => substr($sessionId, 0, 8) . '...']);

    sendJson(200, ['success' => true, 'csrfToken' => $csrfToken]);
}

// Route: POST /logout
if ($method === 'POST' && $path === '/logout') {
    $sessionId = $_COOKIE['fkb_session'] ?? '';
    if (!empty($sessionId)) {
        destroySession($sessionId);
    }
    
    auditLog('logout', ['ip' => getClientIp()]);
    clearAuthCookie();
    clearCsrfCookie();
    
    // Clear session cookie
    $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    setcookie('fkb_session', '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Strict',
    ]);
    
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
    checkGlobalRateLimit('/posts', false);
    
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
    requireCsrfToken();
    checkGlobalRateLimit('/posts:create', true); // Strict rate limit for writes

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
        $hashes = [];
        foreach ($pages as $i => $page) {
            if (empty($page['slug']) || empty($page['html'])) {
                sendJson(400, ['error' => "Page {$i} missing slug or html"]);
            }
            
            // SECURITY: Calculate hash server-side
            $hashes[$i] = hash('sha256', $page['html']);
            
            // Enforce 14KB (14336 bytes) limit per page
            $pageBytes = strlen($page['html']);
            if ($pageBytes > 14336) {
                sendJson(400, ['error' => "Page {$i} exceeds 14KB limit ({$pageBytes} bytes, max 14336)"]);
            }
            
            // Fallback check for extremely large content
            if ($pageBytes > 1048576) {
                sendJson(400, ['error' => "Page {$i} HTML too large (max 1MB)"]);
            }
            $totalBytes += $pageBytes;
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
            file_put_contents($htmlPath, $page['html'], LOCK_EX);
            $savedSlugs[] = $page['slug'];
        }

        // Update manifest with base slug only (paginated pages share one entry)
        $newEntries = array_filter($manifest['entries'] ?? [], fn($e) => $e['slug'] !== $baseSlug);
        $manifestEntry = [
            'slug' => $baseSlug,
            'status' => 'published',
            'hash' => $hashes[0],
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

        auditLog('post_create', ['slug' => $baseSlug, 'title' => $title, 'pageCount' => count($pages), 'totalBytes' => $totalBytes, 'pageType' => $pageType]);

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

        // Enforce 14KB (14336 bytes) limit
        $htmlBytes = strlen($body['html']);
        if ($htmlBytes > 14336) {
            sendJson(400, ['error' => "Page exceeds 14KB limit ({$htmlBytes} bytes, max 14336)"]);
        }

        // Fallback check for extremely large content
        if ($htmlBytes > 1048576) {
            sendJson(400, ['error' => 'HTML content too large (max 1MB)']);
        }

        $slug = $body['slug'];
        $html = $body['html'];
        $bytes = (int)$body['bytes'];
        $title = $body['title'] ?? $slug;
        // SECURITY: Always calculate hash server-side
        $hash = hash('sha256', $html);
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
        file_put_contents($htmlPath, $html, LOCK_EX);

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

        auditLog('post_create', ['slug' => $slug, 'title' => $title, 'bytes' => $bytes, 'pageType' => $pageType]);

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
    requireCsrfToken();

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
    requireCsrfToken();
    checkGlobalRateLimit('/posts:delete', true);

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
    file_put_contents(POSTS_DIR . "/{$slug}.html", $tombstoneHtml, LOCK_EX);

    saveManifest($manifest);

    auditLog('post_delete', ['slug' => $slug]);

    sendJson(200, ['tombstoned' => true, 'slug' => $slug]);
}

// Route: GET /settings (protected)
if ($method === 'GET' && $path === '/settings') {
    requireAuth();
    checkGlobalRateLimit('/settings', false);
    sendJson(200, loadSettings());
}

// Route: PUT /settings (protected)
if ($method === 'PUT' && $path === '/settings') {
    requireAuth();
    requireCsrfToken();
    checkGlobalRateLimit('/settings:update', true);

    $settings = readJsonBody();

    if (($settings['version'] ?? 0) !== 1) {
        sendJson(400, ['error' => 'Invalid settings version']);
    }

    saveSettings($settings);
    auditLog('settings_update', ['keys' => array_keys($settings)]);
    sendJson(200, ['success' => true]);
}

// Route: GET /audit-log (protected)
if ($method === 'GET' && $path === '/audit-log') {
    requireAuth();
    checkGlobalRateLimit('/audit-log', false);

    $limit = min((int)($_GET['limit'] ?? 100), 500); // Max 500 entries
    $action = $_GET['action'] ?? null;

    if (!file_exists(AUDIT_LOG_FILE)) {
        sendJson(200, ['entries' => [], 'total' => 0]);
    }

    // Read file in reverse (newest first)
    $lines = file(AUDIT_LOG_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    $lines = array_reverse($lines);

    $entries = [];
    $total = 0;

    foreach ($lines as $line) {
        $entry = json_decode($line, true);
        if ($entry === null) {
            continue;
        }

        // Filter by action if specified
        if ($action !== null && $entry['action'] !== $action) {
            continue;
        }

        $total++;

        if (count($entries) < $limit) {
            $entries[] = $entry;
        }
    }

    sendJson(200, [
        'entries' => $entries,
        'total' => $total,
        'limit' => $limit,
    ]);
}

// Route: GET /audit-log/export (protected) - Download as file
if ($method === 'GET' && $path === '/audit-log/export') {
    requireAuth();

    if (!file_exists(AUDIT_LOG_FILE)) {
        sendJson(404, ['error' => 'No audit log exists']);
    }

    $filename = 'audit-log-' . date('Y-m-d-His') . '.jsonl';
    header('Content-Type: application/x-ndjson');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    readfile(AUDIT_LOG_FILE);
    exit;
}

// Route: DELETE /audit-log (protected) - Clear audit log
if ($method === 'DELETE' && $path === '/audit-log') {
    requireAuth();
    requireCsrfToken();

    if (!file_exists(AUDIT_LOG_FILE)) {
        sendJson(404, ['error' => 'No audit log exists']);
    }

    // Log the deletion before deleting (will be the only entry after)
    $entryCount = count(file(AUDIT_LOG_FILE, FILE_SKIP_EMPTY_LINES));

    // Archive old log before deletion
    $archivePath = AUDIT_LOG_FILE . '.' . date('Y-m-d-His') . '.deleted';
    @copy(AUDIT_LOG_FILE, $archivePath);

    // Clear the log file
    file_put_contents(AUDIT_LOG_FILE, '', LOCK_EX);

    // Log the clear action
    auditLog('audit_log_cleared', ['deletedEntries' => $entryCount, 'archivedTo' => basename($archivePath)]);

    sendJson(200, ['cleared' => true, 'deletedEntries' => $entryCount]);
}

// Route: GET /icons
if ($method === 'GET' && $path === '/icons') {
    // Icons are now handled client-side via the compiler bundle
    // Return empty list - the frontend will use the bundled icons
    sendJson(200, ['icons' => []]);
}

// Route: GET /export (protected)
if ($method === 'GET' && $path === '/export') {
    requireAuth();
    checkGlobalRateLimit('/export', true); // Strict limit - resource intensive

    $type = $_GET['type'] ?? 'all';
    $export = [
        'version' => 1,
        'exportedAt' => date('c'),
    ];

    // Export settings
    if ($type === 'all' || $type === 'settings') {
        $export['settings'] = loadSettings();
    }

    // Export articles with sourceData
    if ($type === 'all' || $type === 'articles') {
        $manifest = loadManifest();
        $pageTypes = loadPageTypes();
        $articles = [];

        foreach ($manifest['entries'] ?? [] as $entry) {
            if ($entry['status'] === 'tombstone') {
                continue; // Skip deleted posts
            }

            $slug = $entry['slug'];
            $sourceData = loadSourceData($slug);

            $articles[] = [
                'slug' => $slug,
                'title' => $entry['title'],
                'publishedAt' => $entry['publishedAt'],
                'pageType' => $pageTypes['types'][$slug] ?? 'post',
                'pageCount' => $entry['pageCount'] ?? 1,
                'sourceData' => $sourceData,
            ];
        }

        $export['articles'] = $articles;
    }

    // Set download headers
    $filename = 'fourteenkilobytes-backup-' . date('Y-m-d-His') . '.json';
    header('Content-Disposition: attachment; filename="' . $filename . '"');

    sendJson(200, $export);
}

// Route: POST /import (protected)
if ($method === 'POST' && $path === '/import') {
    requireAuth();
    requireCsrfToken();
    checkGlobalRateLimit('/import', true);

    $body = readJsonBody();

    if (($body['version'] ?? 0) !== 1) {
        sendJson(400, ['error' => 'Invalid or unsupported backup version']);
    }
    
    // SECURITY: Validate import size limits
    $articleCount = count($body['articles'] ?? []);
    if ($articleCount > 100) {
        sendJson(400, ['error' => 'Too many articles (max 100 per import)']);
    }
    
    // Validate total import size (max 10MB)
    $totalSize = strlen(json_encode($body));
    if ($totalSize > 10 * 1024 * 1024) {
        sendJson(400, ['error' => 'Import data too large (max 10MB)']);
    }

    $importSettings = $_GET['settings'] ?? 'true';
    $importArticles = $_GET['articles'] ?? 'true';
    $result = ['imported' => []];

    // Import settings
    if ($importSettings === 'true' && isset($body['settings'])) {
        saveSettings($body['settings']);
        $result['imported'][] = 'settings';
    }

    // Import articles (sourceData only - client will republish)
    if ($importArticles === 'true' && isset($body['articles'])) {
        $imported = [];
        foreach ($body['articles'] as $article) {
            if (empty($article['slug']) || empty($article['sourceData'])) {
                continue;
            }
            saveSourceData($article['slug'], $article['sourceData']);
            $imported[] = $article['slug'];
        }
        $result['imported'][] = 'articles';
        $result['articleSlugs'] = $imported;
    }

    sendJson(200, $result);
}

// Route: DELETE /posts (protected) - Delete all posts
if ($method === 'DELETE' && $path === '/posts') {
    requireAuth();
    requireCsrfToken();
    checkGlobalRateLimit('/posts:delete-all', true);

    $manifest = loadManifest();
    $deletedCount = 0;

    // Tombstone all entries and delete HTML files
    foreach ($manifest['entries'] as &$entry) {
        if ($entry['status'] !== 'tombstone') {
            $entry['status'] = 'tombstone';
            $entry['tombstonedAt'] = date('c');
            $deletedCount++;

            // Replace HTML with tombstone
            $tombstoneHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gone</title></head><body><h1>410 Gone</h1><p>This page has been removed.</p></body></html>';
            $htmlPath = POSTS_DIR . "/{$entry['slug']}.html";
            if (file_exists($htmlPath)) {
                file_put_contents($htmlPath, $tombstoneHtml, LOCK_EX);
            }

            // Handle paginated posts
            if (isset($entry['pageCount']) && $entry['pageCount'] > 1) {
                for ($i = 2; $i <= $entry['pageCount']; $i++) {
                    $pagePath = POSTS_DIR . "/{$entry['slug']}-{$i}.html";
                    if (file_exists($pagePath)) {
                        file_put_contents($pagePath, $tombstoneHtml, LOCK_EX);
                    }
                }
            }
        }
    }

    saveManifest($manifest);

    auditLog('posts_delete_all', ['count' => $deletedCount]);

    sendJson(200, ['deleted' => $deletedCount]);
}

// Route: POST /reset (protected) - Full reset (deletes everything including password)
if ($method === 'POST' && $path === '/reset') {
    requireAuth();
    requireCsrfToken();
    checkGlobalRateLimit('/reset', true);

    $body = readJsonBody();
    $confirmPhrase = $body['confirm'] ?? '';

    // Require confirmation phrase for safety
    if ($confirmPhrase !== 'RESET') {
        sendJson(400, ['error' => 'Confirmation required. Send {"confirm": "RESET"}']);
    }

    // Clear manifest (keep structure)
    saveManifest(['version' => 1, 'entries' => []]);

    // Reset settings to defaults
    saveSettings([
        'version' => 1,
        'cssMode' => 'default',
        'globalCss' => '',
        'header' => ['enabled' => false, 'links' => []],
        'footer' => ['enabled' => false, 'content' => ''],
        'bloglist' => [
            'limit' => 10,
            'archiveEnabled' => false,
            'archiveSlug' => 'archive',
            'archiveLinkText' => 'View all posts →',
        ],
    ]);

    // Clear page types
    savePageTypes(['version' => 1, 'types' => []]);

    // Delete all HTML files
    $htmlFiles = glob(POSTS_DIR . '/*.html');
    foreach ($htmlFiles as $file) {
        @unlink($file);
    }

    // Delete all source files
    $sourceFiles = glob(SOURCES_DIR . '/*.json');
    foreach ($sourceFiles as $file) {
        @unlink($file);
    }

    // Delete instance.json (password) - this forces re-setup
    if (file_exists(INSTANCE_FILE)) {
        @unlink(INSTANCE_FILE);
    }

    // Delete setup lock file - force full setup wizard
    $setupLockFile = DATA_DIR . '/.setup-complete';
    if (file_exists($setupLockFile)) {
        @unlink($setupLockFile);
    }

    // Destroy all sessions
    destroyAllSessions();

    auditLog('full_reset', ['ip' => getClientIp()]);

    sendJson(200, ['reset' => true]);
}

// Route: POST /clone (protected) - Clone a page or seed
if ($method === 'POST' && $path === '/clone') {
    requireAuth();
    requireCsrfToken();

    $body = readJsonBody();
    $sourceType = $body['sourceType'] ?? 'page'; // 'page' or 'seed'
    $sourceSlug = $body['sourceSlug'] ?? '';

    if (empty($sourceSlug)) {
        sendJson(400, ['error' => 'Missing sourceSlug']);
    }

    // Validate slug format to prevent path traversal
    if (!preg_match('/^[a-z0-9-]+$/', $sourceSlug)) {
        sendJson(400, ['error' => 'Invalid slug format']);
    }

    $sourceData = null;

    if ($sourceType === 'seed') {
        // Load from seed file
        $seedPath = dirname(__DIR__) . "/data/seeds/{$sourceSlug}.json";
        if (!file_exists($seedPath)) {
            sendJson(404, ['error' => "Seed '{$sourceSlug}' not found"]);
        }
        $seedContent = file_get_contents($seedPath);
        $sourceData = json_decode($seedContent, true);
        if ($sourceData === null) {
            sendJson(500, ['error' => 'Failed to parse seed file']);
        }
    } else {
        // Load from existing page
        $sourceData = loadSourceData($sourceSlug);
        if ($sourceData === null) {
            sendJson(404, ['error' => "Page '{$sourceSlug}' not found or has no source data"]);
        }
    }

    // Deep copy and reset identifying fields
    $clonedData = json_decode(json_encode($sourceData), true);
    $clonedData['slug'] = '';
    $clonedData['title'] = '';

    // Return the cloned source data
    sendJson(200, [
        'sourceData' => $clonedData,
        'clonedFrom' => $sourceSlug,
        'sourceType' => $sourceType,
    ]);
}

// Route: GET /seeds (protected) - List available seed templates
if ($method === 'GET' && $path === '/seeds') {
    requireAuth();

    $seedsDir = dirname(__DIR__) . '/data/seeds';
    $seeds = [];

    if (is_dir($seedsDir)) {
        $files = glob($seedsDir . '/*.json');
        foreach ($files as $file) {
            $name = basename($file, '.json');
            $seeds[] = [
                'name' => $name,
                'label' => ucwords(str_replace('-', ' ', $name)),
            ];
        }
    }

    sendJson(200, ['seeds' => $seeds]);
}

// Route: GET /check-updates - Check for available updates from GitHub
if ($method === 'GET' && $path === '/check-updates') {
    // Load current version
    $versionFile = dirname(__DIR__) . '/version.json';
    if (!file_exists($versionFile)) {
        sendJson(500, ['error' => 'Version file not found']);
    }
    
    $versionData = json_decode(file_get_contents($versionFile), true);
    $currentVersion = $versionData['version'] ?? '0.0.0';
    $repository = $versionData['repository'] ?? 'r0b0tan/fourteenkilobytes-web-php';
    
    // Check cache (cache for 24 hours)
    $cacheFile = DATA_DIR . '/update-check-cache.json';
    $cacheValid = false;
    
    if (file_exists($cacheFile)) {
        $cache = json_decode(file_get_contents($cacheFile), true);
        $cacheAge = time() - ($cache['timestamp'] ?? 0);
        
        if ($cacheAge < 86400) { // 24 hours
            $cacheValid = true;
            sendJson(200, [
                'current' => $currentVersion,
                'latest' => $cache['latest'],
                'updateAvailable' => version_compare($cache['latest'], $currentVersion, '>'),
                'releaseUrl' => $cache['releaseUrl'] ?? null,
                'releaseDate' => $cache['releaseDate'] ?? null,
                'cached' => true
            ]);
        }
    }
    
    // Fetch from GitHub API
    $githubUrl = "https://api.github.com/repos/{$repository}/releases/latest";
    
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => "User-Agent: FourteenKB/{$currentVersion}\r\n",
            'timeout' => 5,
            'max_redirects' => 3,
            'follow_location' => 1
        ]
    ]);
    
    // SECURITY: Validate response size
    $response = @file_get_contents($githubUrl, false, $context);
    if ($response !== false && strlen($response) > 1024 * 1024) {
        // Response too large (max 1MB)
        $response = false;
    }
    
    if ($response === false) {
        // GitHub unreachable, return current version only
        sendJson(200, [
            'current' => $currentVersion,
            'latest' => $currentVersion,
            'updateAvailable' => false,
            'error' => 'Could not reach GitHub API',
            'offline' => true
        ]);
    }
    
    $releaseData = json_decode($response, true);
    
    if (!isset($releaseData['tag_name'])) {
        sendJson(200, [
            'current' => $currentVersion,
            'latest' => $currentVersion,
            'updateAvailable' => false,
            'error' => 'Invalid GitHub API response'
        ]);
    }
    
    // Parse version (remove 'v' prefix if present)
    $latestVersion = ltrim($releaseData['tag_name'], 'v');
    $releaseUrl = $releaseData['html_url'] ?? "https://github.com/{$repository}/releases/latest";
    $releaseDate = $releaseData['published_at'] ?? null;
    
    // Cache the result
    $cacheData = [
        'timestamp' => time(),
        'latest' => $latestVersion,
        'releaseUrl' => $releaseUrl,
        'releaseDate' => $releaseDate
    ];
    @file_put_contents($cacheFile, json_encode($cacheData, JSON_PRETTY_PRINT));
    
    sendJson(200, [
        'current' => $currentVersion,
        'latest' => $latestVersion,
        'updateAvailable' => version_compare($latestVersion, $currentVersion, '>'),
        'releaseUrl' => $releaseUrl,
        'releaseDate' => $releaseDate,
        'cached' => false
    ]);
}

// 404 for unknown routes
sendJson(404, ['error' => 'Not found']);
