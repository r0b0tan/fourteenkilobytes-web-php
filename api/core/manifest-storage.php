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
    $manifest = readJsonFile(MANIFEST_FILE) ?? ['version' => 1, 'entries' => []];
    if (!isset($manifest['entries']) || !is_array($manifest['entries'])) {
        $manifest['entries'] = [];
    }
    return $manifest;
}

function saveManifest(array $manifest): void {
    writeJsonFileAtomic(MANIFEST_FILE, $manifest);
}
