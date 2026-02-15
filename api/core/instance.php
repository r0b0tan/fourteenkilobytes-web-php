<?php

declare(strict_types=1);

function getInstanceSalt(): string {
    $state = readInstanceState();
    if ($state && isset($state['salt'])) {
        return $state['salt'];
    }
    return base64_encode(random_bytes(32));
}

function deriveToken(string $password, string $salt): string {
    $key = hash_pbkdf2('sha256', $password, $salt, ITERATIONS, KEY_LENGTH, true);
    return bin2hex($key);
}

function readInstanceState(): ?array {
    if (!file_exists(INSTANCE_FILE)) {
        return null;
    }
    $content = file_get_contents(INSTANCE_FILE);
    return json_decode($content, true);
}

function isSetupComplete(): bool {
    return file_exists(DATA_DIR . '/.setup-complete') && readInstanceState() !== null;
}

function getApiToken(): ?string {
    $state = readInstanceState();
    return $state['apiToken'] ?? null;
}

function checkDataDirectorySecurity(): array {
    $warnings = [];

    if (file_exists(INSTANCE_FILE)) {
        $perms = fileperms(INSTANCE_FILE) & 0777;
        if ($perms > 0600) {
            $warnings[] = 'instance.json has too permissive permissions (' . decoct($perms) . '), should be 0600';
        }
    }

    if (file_exists(SESSION_FILE)) {
        $perms = fileperms(SESSION_FILE) & 0777;
        if ($perms > 0600) {
            $warnings[] = 'sessions.json has too permissive permissions (' . decoct($perms) . '), should be 0600';
        }
    }

    return $warnings;
}
