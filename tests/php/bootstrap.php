<?php

declare(strict_types=1);

define('PHPUNIT_RUNNING', true);

// --- Exception class for sendJson stub ---
require_once __DIR__ . '/ApiResponseException.php';

// --- Test stubs (defined BEFORE source files so function_exists guards skip them) ---

function sendJson(int $status, mixed $data): never
{
    throw new ApiResponseException($status, $data);
}

function readJsonBody(): array
{
    $raw = $GLOBALS['_TEST_REQUEST_BODY'] ?? null;
    if ($raw === null) {
        return [];
    }
    $data = json_decode((string) $raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new \RuntimeException('Invalid test JSON body');
    }
    return $data ?? [];
}

function requireAuth(): void
{
    // Always authenticated in tests
}

function requireCsrfToken(): void
{
    // Always valid in tests
}

// --- Constants (point to isolated temp directory) ---

$testDataDir = sys_get_temp_dir() . '/fkb_phpunit';

define('DATA_DIR', $testDataDir);
define('MANIFEST_FILE', DATA_DIR . '/manifest.json');
define('SETTINGS_FILE', DATA_DIR . '/settings.json');
define('PAGE_TYPES_FILE', DATA_DIR . '/page-types.json');
define('POSTS_DIR', DATA_DIR . '/posts');
define('SOURCES_DIR', DATA_DIR . '/sources');
define('RATE_LIMIT_FILE', DATA_DIR . '/rate-limits.json');
define('GLOBAL_RATE_LIMIT_FILE', DATA_DIR . '/global-rate-limits.json');
define('AUDIT_LOG_FILE', DATA_DIR . '/audit.log');
define('AUDIT_LOG_MAX_SIZE', 5 * 1024 * 1024);
define('SESSION_FILE', DATA_DIR . '/sessions.json');

define('COOKIE_NAME', 'fkb_auth_v2');
define('COOKIE_LIFETIME', 86400);
define('CSRF_COOKIE_NAME', 'fkb_csrf');
define('CSRF_HEADER_NAME', 'HTTP_X_CSRF_TOKEN');
define('SESSION_ROTATION_INTERVAL', 900);
define('SESSION_MAX_LIFETIME', 86400);

define('ITERATIONS', 600000);
define('KEY_LENGTH', 32);
define('RATE_LIMIT_MAX_ATTEMPTS', 5);
define('RATE_LIMIT_WINDOW_SECONDS', 300);
define('GLOBAL_RATE_LIMIT_MAX_REQUESTS', 100);
define('GLOBAL_RATE_LIMIT_WINDOW', 900);
define('GLOBAL_RATE_LIMIT_STRICT_MAX', 30);
define('GLOBAL_RATE_LIMIT_STRICT_WINDOW', 300);
define('MAX_REQUEST_SIZE', 2 * 1024 * 1024);

// --- Create temp directories ---

foreach ([DATA_DIR, POSTS_DIR, SOURCES_DIR] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
}

// --- Default superglobals ---

$_SERVER['REMOTE_ADDR'] = '127.0.0.1';
$_COOKIE = [];

// --- Include source files ---

require_once __DIR__ . '/../../api/core/http.php';
require_once __DIR__ . '/../../api/core/security.php';
require_once __DIR__ . '/../../api/core/csrf.php';
require_once __DIR__ . '/../../api/core/manifest-storage.php';
require_once __DIR__ . '/../../api/core/content-storage.php';
require_once __DIR__ . '/../../api/core/settings-storage.php';
require_once __DIR__ . '/../../api/routes/post-routes.php';
