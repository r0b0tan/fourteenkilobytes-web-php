<?php

declare(strict_types=1);

/**
 * Exclusive file lock around the manifest read-modify-write sequence.
 * Automatically released when the instance goes out of scope or the process exits.
 */
class ManifestLock {
    private $fp = null;

    public function __construct() {
        $lockFile = MANIFEST_FILE . '.lock';
        $this->fp = @fopen($lockFile, 'c');
        if ($this->fp === false || !flock($this->fp, LOCK_EX)) {
            if ($this->fp !== false) {
                fclose($this->fp);
            }
            $this->fp = null;
            sendJson(503, ['error' => 'Server busy, please try again', 'code' => 'LOCK_UNAVAILABLE']);
        }
    }

    public function __destruct() {
        if ($this->fp !== null) {
            flock($this->fp, LOCK_UN);
            fclose($this->fp);
            $this->fp = null;
        }
    }
}

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
