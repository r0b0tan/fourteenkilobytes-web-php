<?php

declare(strict_types=1);

function auditLog(string $action, array $details = []): void {
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

function getClientIp(): string {
    $trustProxy = false;

    if ($trustProxy) {
        $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
        if ($forwarded) {
            $ips = explode(',', $forwarded);
            $ip = trim($ips[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }

    return $_SERVER['REMOTE_ADDR'] ?? 'unknown';
}

function checkRateLimit(string $ip): bool {
    $limits = loadRateLimits();
    $now = time();

    if (!isset($limits[$ip])) {
        return true;
    }

    $entry = $limits[$ip];
    $firstAttempt = isset($entry['firstAttempt']) && is_numeric($entry['firstAttempt'])
        ? (int)$entry['firstAttempt']
        : 0;
    $attempts = isset($entry['attempts']) && is_numeric($entry['attempts'])
        ? (int)$entry['attempts']
        : 0;

    if ($firstAttempt <= 0) {
        return true;
    }

    if ($now - $firstAttempt > RATE_LIMIT_WINDOW_SECONDS) {
        return true;
    }

    return $attempts < RATE_LIMIT_MAX_ATTEMPTS;
}

function recordFailedAttempt(string $ip): void {
    $limits = loadRateLimits();
    $now = time();

    $existing = $limits[$ip] ?? null;
    $firstAttempt = is_array($existing) && isset($existing['firstAttempt']) && is_numeric($existing['firstAttempt'])
        ? (int)$existing['firstAttempt']
        : 0;

    if (!is_array($existing) || $firstAttempt <= 0 || $now - $firstAttempt > RATE_LIMIT_WINDOW_SECONDS) {
        $limits[$ip] = ['attempts' => 1, 'firstAttempt' => $now];
    } else {
        $limits[$ip]['attempts'] = max(0, (int)($existing['attempts'] ?? 0)) + 1;
    }

    saveRateLimits($limits);
}

function clearRateLimit(string $ip): void {
    $limits = loadRateLimits();
    unset($limits[$ip]);
    saveRateLimits($limits);
}

function loadRateLimits(): array {
    if (!file_exists(RATE_LIMIT_FILE)) {
        return [];
    }
    $content = @file_get_contents(RATE_LIMIT_FILE);
    $limits = $content ? json_decode($content, true) : [];

    if (!is_array($limits)) {
        return [];
    }

    if (isset($limits['attempts']) && is_array($limits['attempts'])) {
        $limits = $limits['attempts'];
    }

    $now = time();

    $normalized = [];
    foreach ($limits as $ip => $entry) {
        if (!is_string($ip) || !is_array($entry)) {
            continue;
        }

        if (!isset($entry['firstAttempt']) || !is_numeric($entry['firstAttempt'])) {
            continue;
        }

        $firstAttempt = (int)$entry['firstAttempt'];
        if ($now - $firstAttempt > RATE_LIMIT_WINDOW_SECONDS) {
            continue;
        }

        $normalized[$ip] = [
            'attempts' => max(0, (int)($entry['attempts'] ?? 0)),
            'firstAttempt' => $firstAttempt,
        ];
    }

    return $normalized;
}

function saveRateLimits(array $limits): void {
    file_put_contents(RATE_LIMIT_FILE, json_encode($limits), LOCK_EX);
}

function loadGlobalRateLimits(): array {
    if (!file_exists(GLOBAL_RATE_LIMIT_FILE)) {
        return [];
    }
    $content = @file_get_contents(GLOBAL_RATE_LIMIT_FILE);
    $limits = $content ? json_decode($content, true) : [];

    $now = time();
    foreach ($limits as $key => $entry) {
        $window = $entry['window'] ?? GLOBAL_RATE_LIMIT_WINDOW;
        if ($now - $entry['firstRequest'] > $window) {
            unset($limits[$key]);
        }
    }

    return $limits;
}

function saveGlobalRateLimits(array $limits): void {
    file_put_contents(GLOBAL_RATE_LIMIT_FILE, json_encode($limits), LOCK_EX);
}

function checkGlobalRateLimit(string $endpoint, bool $strict = false): void {
    $ip = getClientIp();
    $key = "ip:{$ip}:endpoint:{$endpoint}";

    $limits = loadGlobalRateLimits();
    $now = time();

    $maxRequests = $strict ? GLOBAL_RATE_LIMIT_STRICT_MAX : GLOBAL_RATE_LIMIT_MAX_REQUESTS;
    $window = $strict ? GLOBAL_RATE_LIMIT_STRICT_WINDOW : GLOBAL_RATE_LIMIT_WINDOW;

    if (!isset($limits[$key])) {
        $limits[$key] = [
            'requests' => 1,
            'firstRequest' => $now,
            'window' => $window,
        ];
        saveGlobalRateLimits($limits);
        return;
    }

    $entry = $limits[$key];

    if ($now - $entry['firstRequest'] > $window) {
        $limits[$key] = [
            'requests' => 1,
            'firstRequest' => $now,
            'window' => $window,
        ];
        saveGlobalRateLimits($limits);
        return;
    }

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

    $limits[$key]['requests']++;
    saveGlobalRateLimits($limits);
}
