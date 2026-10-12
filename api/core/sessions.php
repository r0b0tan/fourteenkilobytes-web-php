<?php

declare(strict_types=1);

function loadSessions(): array {
    return normalizeSessions(readJsonFileLocked(SESSION_FILE));
}

/**
 * Drops malformed entries; accepts the legacy {"sessions": {...}} wrapper.
 */
function normalizeSessions(array $sessions): array {
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


function createSession(string $authToken): string {
    $sessionId = bin2hex(random_bytes(32));

    updateJsonFileLocked(SESSION_FILE, function (array &$data) use ($sessionId, $authToken): void {
        $now = time();
        $sessions = normalizeSessions($data);
        $sessions[$sessionId] = [
            'tokenFingerprint' => tokenFingerprint($authToken),
            'createdAt' => $now,
            'lastRotation' => $now,
            'ip' => getClientIp(),
            'userAgent' => substr($_SERVER['HTTP_USER_AGENT'] ?? 'unknown', 0, 200),
        ];

        // Drop expired sessions and rotation leftovers older than the 60s grace period.
        $data = array_filter($sessions, function (array $session) use ($now): bool {
            if (isset($session['rotatedTo'])) {
                return $now - ($session['rotatedAt'] ?? 0) < 60;
            }
            return $now - $session['createdAt'] < SESSION_MAX_LIFETIME;
        });
    });

    return $sessionId;
}

/**
 * Returns ['session' => array, 'newSessionId' => ?string] or null if the session is invalid.
 * Sessions are rotated every SESSION_ROTATION_INTERVAL seconds; the old ID stays valid for
 * 60 seconds so parallel requests from the same browser do not get logged out.
 */
function validateSession(string $sessionId): ?array {
    return updateJsonFileLocked(SESSION_FILE, function (array &$data) use ($sessionId): ?array {
        $sessions = normalizeSessions($data);
        $data = $sessions;

        if (!isset($sessions[$sessionId])) {
            return null;
        }

        $session = $sessions[$sessionId];
        $now = time();

        if (isset($session['rotatedTo'])) {
            if ($now - ($session['rotatedAt'] ?? 0) < 60 && isset($sessions[$session['rotatedTo']])) {
                return ['session' => $sessions[$session['rotatedTo']], 'newSessionId' => $session['rotatedTo']];
            }
            unset($data[$sessionId]);
            return null;
        }

        if ($now - $session['createdAt'] > SESSION_MAX_LIFETIME) {
            unset($data[$sessionId]);
            return null;
        }

        if ($now - $session['lastRotation'] > SESSION_ROTATION_INTERVAL) {
            $newSessionId = bin2hex(random_bytes(32));
            $session['lastRotation'] = $now;

            $data[$newSessionId] = $session;
            $data[$sessionId]['rotatedTo'] = $newSessionId;
            $data[$sessionId]['rotatedAt'] = $now;

            return ['session' => $session, 'newSessionId' => $newSessionId];
        }

        return ['session' => $session, 'newSessionId' => null];
    });
}

function destroySession(string $sessionId): void {
    updateJsonFileLocked(SESSION_FILE, function (array &$data) use ($sessionId): void {
        $data = normalizeSessions($data);
        unset($data[$sessionId]);
    });
}

function destroyAllSessions(): void {
    updateJsonFileLocked(SESSION_FILE, function (array &$data): void {
        $data = [];
    });
}
