<?php

declare(strict_types=1);

function loadManifest(): array {
    if (!file_exists(MANIFEST_FILE)) {
        return [
            'version' => 1,
            'entries' => [],
        ];
    }
    $content = file_get_contents(MANIFEST_FILE);
    return json_decode($content, true) ?? ['version' => 1, 'entries' => []];
}

function saveManifest(array $manifest): void {
    $tmpFile = MANIFEST_FILE . '.tmp.' . uniqid() . '.json';

    $jsonContent = json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($jsonContent === false) {
        sendJson(500, ['error' => 'Failed to encode manifest data']);
    }

    if (file_put_contents($tmpFile, $jsonContent, LOCK_EX) === false) {
        @unlink($tmpFile);
        sendJson(500, ['error' => 'Failed to write manifest']);
    }

    if (file_exists(MANIFEST_FILE)) {
        $backup = MANIFEST_FILE . '.bak';
        if (!@copy(MANIFEST_FILE, $backup)) {
            error_log('Warning: Could not create manifest backup');
        }
    }

    if (!@rename($tmpFile, MANIFEST_FILE)) {
        @unlink($tmpFile);
        sendJson(500, ['error' => 'Failed to finalize manifest']);
    }

    @chmod(MANIFEST_FILE, 0640);
}
