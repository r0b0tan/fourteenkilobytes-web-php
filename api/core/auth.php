<?php

declare(strict_types=1);

function checkAuth(): bool {
    $token = getApiToken();
    if ($token === null) {
        return true;
    }

    $cookieToken = $_COOKIE[COOKIE_NAME] ?? '';
    if (empty($cookieToken)) {
        return false;
    }

    if (!hash_equals($token, $cookieToken)) {
        return false;
    }

    $sessionId = $_COOKIE['fkb_session'] ?? '';
    if (!empty($sessionId)) {
        $validation = validateSession($sessionId);
        if ($validation === null) {
            return false;
        }

        if ($validation['newSessionId'] !== null) {
            setSessionCookie($validation['newSessionId']);
        }

        $sessionToken = $validation['session']['authToken'] ?? '';
        if (!hash_equals($token, $sessionToken)) {
            return false;
        }
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
