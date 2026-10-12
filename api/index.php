<?php
/**
 * fourteenkilobytes API Router
 *
 * Single entry point for all API requests.
 * Requires URL rewriting: /api/* -> /api/index.php
 */

declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
// API responses are data, never documents. The admin pages get their CSP from the webserver
// config; HSTS is a deliberate, site-wide decision and is configured there as well.
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");

require_once __DIR__ . '/core/paths.php';

define('RATE_LIMIT_FILE', DATA_DIR . '/rate-limits.json');

define('ITERATIONS', 600000);
define('KEY_LENGTH', 32);

define('RATE_LIMIT_MAX_ATTEMPTS', 5);
define('RATE_LIMIT_WINDOW_SECONDS', 300);

define('GLOBAL_RATE_LIMIT_FILE', DATA_DIR . '/global-rate-limits.json');
define('GLOBAL_RATE_LIMIT_MAX_REQUESTS', 100);
define('GLOBAL_RATE_LIMIT_WINDOW', 900);
define('GLOBAL_RATE_LIMIT_STRICT_MAX', 30);
define('GLOBAL_RATE_LIMIT_STRICT_WINDOW', 300);

define('MAX_REQUEST_SIZE', 2 * 1024 * 1024);

define('COOKIE_NAME', 'fkb_auth_v2');
define('COOKIE_LIFETIME', 86400);

define('CSRF_COOKIE_NAME', 'fkb_csrf');
define('CSRF_HEADER_NAME', 'HTTP_X_CSRF_TOKEN');

define('SESSION_FILE', DATA_DIR . '/sessions.json');
define('SESSION_ROTATION_INTERVAL', 900);
define('SESSION_MAX_LIFETIME', 86400);

define('AUDIT_LOG_FILE', DATA_DIR . '/audit.log');
define('AUDIT_LOG_MAX_SIZE', 5 * 1024 * 1024);

if (!is_dir(DATA_DIR)) {
    mkdir(DATA_DIR, 0750, true);
}
if (!is_dir(POSTS_DIR)) {
    mkdir(POSTS_DIR, 0750, true);
}
if (!is_dir(SOURCES_DIR)) {
    mkdir(SOURCES_DIR, 0750, true);
}

require_once __DIR__ . '/core/http.php';
require_once __DIR__ . '/core/json-storage.php';
require_once __DIR__ . '/core/instance.php';
require_once __DIR__ . '/core/security.php';
require_once __DIR__ . '/core/cookies.php';
require_once __DIR__ . '/core/csrf.php';
require_once __DIR__ . '/core/sessions.php';
require_once __DIR__ . '/core/auth.php';
require_once __DIR__ . '/core/manifest-storage.php';
require_once __DIR__ . '/core/settings-storage.php';
require_once __DIR__ . '/core/content-storage.php';

$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

$path = preg_replace('#^/api#', '', $path);
if (empty($path)) {
    $path = '/';
}

require_once __DIR__ . '/routes/system-routes.php';
require_once __DIR__ . '/routes/auth-routes.php';
require_once __DIR__ . '/routes/post-routes.php';

$routeHandlers = [
    'handleSystemRoutes',
    'handleAuthRoutes',
    'handlePostRoutes',
];

foreach ($routeHandlers as $routeHandler) {
    if ($routeHandler($method, $path) === true) {
        return;
    }
}

sendJson(404, ['error' => 'Not found']);
