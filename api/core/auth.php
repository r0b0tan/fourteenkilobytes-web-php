<?php

declare(strict_types=1);

/**
 * The server-side session is the only credential. The password-derived token never
 * leaves the server, so logout, session expiry and password changes take effect.
 */
function checkAuth(): bool {
    $token = getApiToken();
    if ($token === null) {
        // Fail closed: without a configured password nobody is authenticated.
        return false;
    }

    $sessionId = $_COOKIE['fkb_session'] ?? '';
    if (!is_string($sessionId) || $sessionId === '') {
        return false;
    }

    $validation = validateSession($sessionId);
    if ($validation === null) {
        return false;
    }

    $fingerprint = $validation['session']['tokenFingerprint'] ?? '';
    if (!is_string($fingerprint) || !hash_equals(tokenFingerprint($token), $fingerprint)) {
        return false;
    }

    if ($validation['newSessionId'] !== null) {
        setSessionCookie($validation['newSessionId']);
    }

    return true;
}

if (!function_exists('requireAuth')) {
    function requireAuth(): void {
        if (!checkAuth()) {
            sendJson(401, ['error' => 'Unauthorized']);
        }
    }
}
