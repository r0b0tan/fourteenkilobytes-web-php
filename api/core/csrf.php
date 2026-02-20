<?php

declare(strict_types=1);

function generateCsrfToken(): string {
    return bin2hex(random_bytes(32));
}

function setCsrfCookie(string $token): void {
    $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    setcookie(CSRF_COOKIE_NAME, $token, [
        'expires' => time() + COOKIE_LIFETIME,
        'path' => '/',
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Strict',
    ]);
}

function clearCsrfCookie(): void {
    $secure = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    setcookie(CSRF_COOKIE_NAME, '', [
        'expires' => time() - 3600,
        'path' => '/',
        'httponly' => true,
        'secure' => $secure,
        'samesite' => 'Strict',
    ]);
}

function validateCsrfToken(): bool {
    $cookieToken = $_COOKIE[CSRF_COOKIE_NAME] ?? '';
    $headerToken = $_SERVER[CSRF_HEADER_NAME] ?? '';

    if (empty($cookieToken) || empty($headerToken)) {
        return false;
    }

    return hash_equals($cookieToken, $headerToken);
}

if (!function_exists('requireCsrfToken')) {
    function requireCsrfToken(): void {
        if (!validateCsrfToken()) {
            auditLog('csrf_failure', ['ip' => getClientIp()]);
            sendJson(403, ['error' => 'Invalid or missing CSRF token']);
        }
    }
}
