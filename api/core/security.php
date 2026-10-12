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

/**
 * Client address for rate limiting and audit logs. Behind a reverse proxy, set
 * FKB_TRUSTED_PROXIES (comma-separated IPs or CIDR ranges, via SetEnv, fastcgi_param or
 * the environment); X-Forwarded-For is only honoured for requests coming from those proxies.
 */
function getClientIp(): string {
    $remote = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $trusted = getTrustedProxies();
    if ($trusted === [] || !ipMatchesAny($remote, $trusted)) {
        return $remote;
    }

    // Walk from the right: the first hop not added by a trusted proxy is the client.
    $hops = array_reverse(array_map('trim', explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''))));
    foreach ($hops as $hop) {
        if (filter_var($hop, FILTER_VALIDATE_IP) === false) {
            break;
        }
        if (!ipMatchesAny($hop, $trusted)) {
            return $hop;
        }
    }
    return $remote;
}

function getTrustedProxies(): array {
    $value = $_SERVER['FKB_TRUSTED_PROXIES'] ?? getenv('FKB_TRUSTED_PROXIES');
    if (!is_string($value) || trim($value) === '') {
        return [];
    }
    return array_values(array_filter(array_map('trim', explode(',', $value))));
}

function ipMatchesAny(string $ip, array $rules): bool {
    $ipBin = @inet_pton($ip);
    if ($ipBin === false) {
        return false;
    }
    foreach ($rules as $rule) {
        [$network, $prefix] = array_pad(explode('/', $rule, 2), 2, null);
        $networkBin = @inet_pton($network);
        if ($networkBin === false || strlen($networkBin) !== strlen($ipBin)) {
            continue;
        }
        $bits = $prefix === null ? strlen($ipBin) * 8 : (int) $prefix;
        $bytes = intdiv($bits, 8);
        if (substr($ipBin, 0, $bytes) !== substr($networkBin, 0, $bytes)) {
            continue;
        }
        $remainder = $bits % 8;
        if ($remainder === 0) {
            return true;
        }
        $mask = (0xFF << (8 - $remainder)) & 0xFF;
        if ((ord($ipBin[$bytes]) & $mask) === (ord($networkBin[$bytes]) & $mask)) {
            return true;
        }
    }
    return false;
}

function checkRateLimit(string $ip): bool {
    $entry = loadRateLimits()[$ip] ?? null;
    return $entry === null || $entry['attempts'] < RATE_LIMIT_MAX_ATTEMPTS;
}

function recordFailedAttempt(string $ip): void {
    updateJsonFileLocked(RATE_LIMIT_FILE, function (array &$data) use ($ip): void {
        $limits = normalizeRateLimits($data);
        $existing = $limits[$ip] ?? null;
        if ($existing === null) {
            $limits[$ip] = ['attempts' => 1, 'firstAttempt' => time()];
        } else {
            $limits[$ip]['attempts'] = $existing['attempts'] + 1;
        }
        $data = $limits;
    });
}

function clearRateLimit(string $ip): void {
    updateJsonFileLocked(RATE_LIMIT_FILE, function (array &$data) use ($ip): void {
        $data = normalizeRateLimits($data);
        unset($data[$ip]);
    });
}

function loadRateLimits(): array {
    return normalizeRateLimits(readJsonFileLocked(RATE_LIMIT_FILE));
}

/**
 * Drops malformed and expired entries; accepts the legacy {"attempts": {...}} wrapper.
 */
function normalizeRateLimits(array $limits): array {
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
        $firstAttempt = (int) $entry['firstAttempt'];
        if ($firstAttempt <= 0 || $now - $firstAttempt > RATE_LIMIT_WINDOW_SECONDS) {
            continue;
        }
        $normalized[$ip] = [
            'attempts' => max(0, (int) ($entry['attempts'] ?? 0)),
            'firstAttempt' => $firstAttempt,
        ];
    }

    return $normalized;
}

function loadGlobalRateLimits(): array {
    return pruneGlobalRateLimits(readJsonFileLocked(GLOBAL_RATE_LIMIT_FILE));
}

function pruneGlobalRateLimits(array $limits): array {
    $now = time();
    foreach ($limits as $key => $entry) {
        if (!is_array($entry) || !is_numeric($entry['firstRequest'] ?? null)
            || $now - (int) $entry['firstRequest'] > (int) ($entry['window'] ?? GLOBAL_RATE_LIMIT_WINDOW)) {
            unset($limits[$key]);
        }
    }
    return $limits;
}

function checkGlobalRateLimit(string $endpoint, bool $strict = false): void {
    $ip = getClientIp();
    $key = "ip:{$ip}:endpoint:{$endpoint}";
    $maxRequests = $strict ? GLOBAL_RATE_LIMIT_STRICT_MAX : GLOBAL_RATE_LIMIT_MAX_REQUESTS;
    $window = $strict ? GLOBAL_RATE_LIMIT_STRICT_WINDOW : GLOBAL_RATE_LIMIT_WINDOW;

    // Decide under the lock, respond after it is released.
    $exceeded = updateJsonFileLocked(GLOBAL_RATE_LIMIT_FILE, function (array &$data) use ($key, $maxRequests, $window): ?array {
        $data = pruneGlobalRateLimits($data);
        $now = time();
        $entry = $data[$key] ?? null;

        if ($entry === null || $now - (int) $entry['firstRequest'] > $window) {
            $data[$key] = ['requests' => 1, 'firstRequest' => $now, 'window' => $window];
            return null;
        }
        if ((int) $entry['requests'] >= $maxRequests) {
            return ['requests' => (int) $entry['requests'], 'retryAfter' => $window - ($now - (int) $entry['firstRequest'])];
        }
        $data[$key]['requests'] = (int) $entry['requests'] + 1;
        return null;
    });

    if ($exceeded !== null) {
        header("Retry-After: {$exceeded['retryAfter']}");
        auditLog('rate_limit_exceeded', [
            'ip' => $ip,
            'endpoint' => $endpoint,
            'requests' => $exceeded['requests'],
            'limit' => $maxRequests,
        ]);
        sendJson(429, [
            'error' => 'Rate limit exceeded',
            'retryAfter' => $exceeded['retryAfter'],
            'limit' => $maxRequests,
        ]);
    }
}
