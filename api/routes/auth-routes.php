<?php

declare(strict_types=1);

function handleAuthRoutes(string $method, string $path): bool {
    if ($method === 'POST' && $path === '/login') {
        if (!isSetupComplete()) {
            sendJson(400, ['error' => 'Setup not complete', 'code' => 'SETUP_REQUIRED']);
        }

        $clientIp = getClientIp();
        if (!checkRateLimit($clientIp)) {
            sendJson(429, ['error' => 'Too many login attempts. Please try again later.', 'code' => 'RATE_LIMITED']);
        }

        $body = readJsonBody();
        $password = $body['password'] ?? '';

        if (!is_string($password) || $password === '') {
            sendJson(400, ['error' => 'Password required', 'code' => 'MISSING_FIELDS']);
        }

        $salt = getInstanceSalt();
        $token = deriveToken($password, $salt);
        $storedToken = getApiToken();

        if ($storedToken === null || !hash_equals($storedToken, $token)) {
            recordFailedAttempt($clientIp);
            auditLog('login_failed', ['ip' => $clientIp, 'attempts' => loadRateLimits()[$clientIp]['attempts'] ?? 1]);
            sendJson(401, ['error' => 'Invalid password', 'code' => 'INVALID_CREDENTIALS']);
        }

        clearRateLimit($clientIp);

        $oldSessionId = $_COOKIE['fkb_session'] ?? '';
        if (!empty($oldSessionId)) {
            destroySession($oldSessionId);
        }

        clearAuthCookie();
        $sessionId = createSession($token);
        setSessionCookie($sessionId);

        $csrfToken = generateCsrfToken();
        setCsrfCookie($csrfToken);

        auditLog('login_success', ['ip' => $clientIp, 'sessionId' => substr($sessionId, 0, 8) . '...']);

        sendJson(200, ['success' => true, 'csrfToken' => $csrfToken]);
    }

    if ($method === 'POST' && $path === '/change-password') {
        requireAuth();
        requireCsrfToken();

        $clientIp = getClientIp();
        if (!checkRateLimit($clientIp)) {
            sendJson(429, ['error' => 'Too many attempts. Please try again later.', 'code' => 'RATE_LIMITED']);
        }

        $body = readJsonBody();
        $currentPassword = $body['currentPassword'] ?? '';
        $newPassword = $body['newPassword'] ?? '';

        if (!is_string($currentPassword) || !is_string($newPassword) || $currentPassword === '' || $newPassword === '') {
            sendJson(400, ['error' => 'Current and new password required', 'code' => 'MISSING_FIELDS']);
        }

        if (strlen($newPassword) < 8 || strlen($newPassword) > 500) {
            sendJson(400, ['error' => 'Password must be 8-500 characters', 'code' => 'INVALID_PASSWORD']);
        }

        $storedToken = getApiToken();
        if ($storedToken === null || !hash_equals($storedToken, deriveToken($currentPassword, getInstanceSalt()))) {
            recordFailedAttempt($clientIp);
            auditLog('password_change_failed', ['ip' => $clientIp]);
            // 403 instead of 401: the session itself is still valid.
            sendJson(403, ['error' => 'Current password is incorrect', 'code' => 'INVALID_CREDENTIALS']);
        }

        clearRateLimit($clientIp);

        $state = readInstanceState() ?? [];
        $salt = base64_encode(random_bytes(32));
        $newToken = deriveToken($newPassword, $salt);
        $state['salt'] = $salt;
        $state['apiToken'] = $newToken;
        $state['passwordChangedAt'] = date('c');
        saveInstanceState($state);

        // Log out every other session; keep the current user logged in with a fresh session.
        destroyAllSessions();
        $sessionId = createSession($newToken);
        setSessionCookie($sessionId);

        $csrfToken = generateCsrfToken();
        setCsrfCookie($csrfToken);

        auditLog('password_changed', ['ip' => $clientIp]);

        sendJson(200, ['success' => true, 'csrfToken' => $csrfToken]);
    }

    if ($method === 'POST' && $path === '/logout') {
        $sessionId = $_COOKIE['fkb_session'] ?? '';
        if (!empty($sessionId)) {
            destroySession($sessionId);
        }

        auditLog('logout', ['ip' => getClientIp()]);
        clearAuthCookie();
        clearCsrfCookie();

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

    if ($method === 'GET' && $path === '/config') {
        sendJson(200, ['authEnabled' => getApiToken() !== null]);
    }

    if ($method === 'GET' && $path === '/auth-check') {
        requireAuth();
        sendJson(200, ['authenticated' => true, 'csrfToken' => $_COOKIE[CSRF_COOKIE_NAME] ?? null]);
    }

    if ($method === 'GET' && $path === '/csrf') {
        requireAuth();
        $csrfToken = $_COOKIE[CSRF_COOKIE_NAME] ?? null;
        if ($csrfToken === null) {
            $csrfToken = generateCsrfToken();
            setCsrfCookie($csrfToken);
        }
        sendJson(200, ['csrfToken' => $csrfToken]);
    }

    return false;
}
