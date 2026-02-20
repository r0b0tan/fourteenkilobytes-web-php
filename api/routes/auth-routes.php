<?php

declare(strict_types=1);

function handleAuthRoutes(string $method, string $path): bool {
    if ($method === 'POST' && $path === '/setup') {
        if (isSetupComplete()) {
            sendJson(403, ['error' => 'Setup already complete']);
        }

        $body = readJsonBody();
        $password = $body['password'] ?? '';

        if (strlen($password) < 8) {
            sendJson(400, ['error' => 'Password must be at least 8 characters']);
        }

        $setupLockFile = DATA_DIR . '/.setup-complete';
        $lockContent = date('c') . "\n";

        $lockFp = @fopen($setupLockFile, 'x');
        if ($lockFp === false) {
            sendJson(403, ['error' => 'Setup already complete or in progress']);
        }
        fwrite($lockFp, $lockContent);
        fclose($lockFp);

        $salt = base64_encode(random_bytes(32));
        $token = deriveToken($password, $salt);
        $state = [
            'salt' => $salt,
            'token' => $token,
            'createdAt' => date('c'),
        ];

        $stateJson = json_encode($state, JSON_PRETTY_PRINT);
        if (@file_put_contents(INSTANCE_FILE, $stateJson, LOCK_EX) === false) {
            @unlink($setupLockFile);
            sendJson(500, ['error' => 'Failed to create instance file']);
        }

        setAuthCookie($token);
        $sessionId = createSession($token);
        setSessionCookie($sessionId);
        $csrfToken = generateCsrfToken();
        setCsrfCookie($csrfToken);

        auditLog('setup_complete', ['ip' => getClientIp()]);

        sendJson(201, ['success' => true, 'csrfToken' => $csrfToken]);
    }

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

        if (empty($password)) {
            sendJson(400, ['error' => 'Password required', 'code' => 'MISSING_FIELDS']);
        }

        $salt = getInstanceSalt();
        $token = deriveToken($password, $salt);
        $storedToken = getApiToken();

        if (!hash_equals($storedToken, $token)) {
            recordFailedAttempt($clientIp);
            auditLog('login_failed', ['ip' => $clientIp, 'attempts' => loadRateLimits()[$clientIp]['attempts'] ?? 1]);
            sendJson(401, ['error' => 'Invalid password', 'code' => 'INVALID_CREDENTIALS']);
        }

        clearRateLimit($clientIp);

        $oldSessionId = $_COOKIE['fkb_session'] ?? '';
        if (!empty($oldSessionId)) {
            destroySession($oldSessionId);
        }

        setAuthCookie($token);
        $sessionId = createSession($token);
        setSessionCookie($sessionId);

        $csrfToken = generateCsrfToken();
        setCsrfCookie($csrfToken);

        auditLog('login_success', ['ip' => $clientIp, 'sessionId' => substr($sessionId, 0, 8) . '...']);

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
