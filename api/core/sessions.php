<?php

declare(strict_types=1);

function loadSessions(): array {
    if (!file_exists(SESSION_FILE)) {
        return [];
    }
    $content = @file_get_contents(SESSION_FILE);
    $sessions = $content ? json_decode($content, true) : [];

    if (!is_array($sessions)) {
        return [];
    }

    if (isset($sessions['sessions']) && is_array($sessions['sessions'])) {
        $sessions = $sessions['sessions'];
    }

    $normalized = [];
    foreach ($sessions as $sessionId => $session) {
        if (!is_string($sessionId) || !is_array($session)) {
            continue;
        }

        $createdAt = $session['createdAt'] ?? null;
        $lastRotation = $session['lastRotation'] ?? null;

        if (!is_numeric($createdAt)) {
            if (is_numeric($lastRotation)) {
                $createdAt = (int)$lastRotation;
            } else {
                continue;
            }
        }

        if (!is_numeric($lastRotation)) {
            $lastRotation = (int)$createdAt;
        }

        $session['createdAt'] = (int)$createdAt;
        $session['lastRotation'] = (int)$lastRotation;

        if (isset($session['rotatedAt']) && is_numeric($session['rotatedAt'])) {
            $session['rotatedAt'] = (int)$session['rotatedAt'];
        }

        $normalized[$sessionId] = $session;
    }

    return $normalized;
}

function saveSessions(array $sessions): void {
    file_put_contents(SESSION_FILE, json_encode($sessions), LOCK_EX);
}

function createSession(string $authToken): string {
    $sessions = loadSessions();
    $sessionId = bin2hex(random_bytes(32));
    $now = time();

    $sessions[$sessionId] = [
        'authToken' => $authToken,
        'createdAt' => $now,
        'lastRotation' => $now,
        'ip' => getClientIp(),
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
    ];

    $sessions = array_filter($sessions, function ($session) use ($now) {
        if (!is_array($session)) {
            return false;
        }

        if (isset($session['rotatedTo'])) {
            return ($now - ($session['rotatedAt'] ?? 0) < 60);
        }

        if (!isset($session['createdAt']) || !is_numeric($session['createdAt'])) {
            return false;
        }

        return ($now - (int)$session['createdAt'] < SESSION_MAX_LIFETIME);
    });

    saveSessions($sessions);
    return $sessionId;
}

function validateSession(string $sessionId): ?array {
    $sessions = loadSessions();

    if (!isset($sessions[$sessionId])) {
        return null;
    }

    $session = $sessions[$sessionId];
    $now = time();

    if (isset($session['rotatedTo'])) {
        if ($now - ($session['rotatedAt'] ?? 0) < 60) {
            return [
                'session' => $sessions[$session['rotatedTo']] ?? $session,
                'newSessionId' => $session['rotatedTo']
            ];
        }

        unset($sessions[$sessionId]);
        saveSessions($sessions);
        return null;
    }

    if (!isset($session['createdAt']) || !is_numeric($session['createdAt'])) {
        unset($sessions[$sessionId]);
        saveSessions($sessions);
        return null;
    }

    if ($now - (int)$session['createdAt'] > SESSION_MAX_LIFETIME) {
        unset($sessions[$sessionId]);
        saveSessions($sessions);
        return null;
    }

    if (!isset($session['lastRotation']) || !is_numeric($session['lastRotation'])) {
        $session['lastRotation'] = (int)$session['createdAt'];
    }

    if ($now - (int)$session['lastRotation'] > SESSION_ROTATION_INTERVAL) {
        $newSessionId = bin2hex(random_bytes(32));
        $session['lastRotation'] = $now;

        $sessions[$newSessionId] = $session;
        $sessions[$sessionId]['rotatedTo'] = $newSessionId;
        $sessions[$sessionId]['rotatedAt'] = $now;

        saveSessions($sessions);

        return ['session' => $session, 'newSessionId' => $newSessionId];
    }

    return ['session' => $session, 'newSessionId' => null];
}

function destroySession(string $sessionId): void {
    $sessions = loadSessions();
    unset($sessions[$sessionId]);
    saveSessions($sessions);
}

function destroyAllSessions(): void {
    saveSessions([]);
}
