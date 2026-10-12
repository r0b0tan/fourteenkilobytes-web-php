<?php

declare(strict_types=1);

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
 * Removes the legacy fkb_auth_v2 cookie, which used to carry the password-derived token.
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
