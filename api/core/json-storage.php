<?php

declare(strict_types=1);

/**
 * Reads a JSON object from disk. Returns null if the file does not exist.
 *
 * A corrupted file is never silently treated as empty, because the next save would then
 * overwrite real data: the broken file is kept as "<file>.corrupt-<hash>" and the last good
 * "<file>.bak" (written by the atomic save functions) is used instead.
 */
function readJsonFile(string $file): ?array {
    if (!file_exists($file)) {
        return null;
    }

    $content = @file_get_contents($file);
    $data = is_string($content) ? json_decode($content, true) : null;
    if (is_array($data)) {
        return $data;
    }

    error_log("Corrupted JSON in {$file}: " . json_last_error_msg());
    if (is_string($content) && $content !== '') {
        $corruptCopy = $file . '.corrupt-' . substr(hash('sha256', $content), 0, 12);
        if (!file_exists($corruptCopy)) {
            @copy($file, $corruptCopy);
        }
    }

    $backup = $file . '.bak';
    if (file_exists($backup)) {
        $backupData = json_decode((string) @file_get_contents($backup), true);
        if (is_array($backupData)) {
            error_log("Falling back to {$backup}");
            return $backupData;
        }
    }

    return null;
}

/**
 * Writes JSON via temp file + rename so readers never see a half-written file.
 * With $keepBackup the previous version is kept as "<file>.bak" for readJsonFile().
 */
function writeJsonFileAtomic(string $file, array $data, int $mode = 0640, bool $keepBackup = true): void {
    $jsonContent = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($jsonContent === false) {
        sendJson(500, ['error' => 'Failed to encode ' . basename($file)]);
    }

    $tmpFile = $file . '.tmp.' . bin2hex(random_bytes(8));
    if (file_put_contents($tmpFile, $jsonContent, LOCK_EX) === false) {
        @unlink($tmpFile);
        sendJson(500, ['error' => 'Failed to write ' . basename($file)]);
    }
    @chmod($tmpFile, $mode);

    if ($keepBackup && file_exists($file) && !@copy($file, $file . '.bak')) {
        error_log('Warning: Could not create backup of ' . basename($file));
    }

    if (!@rename($tmpFile, $file)) {
        @unlink($tmpFile);
        sendJson(500, ['error' => 'Failed to finalize ' . basename($file)]);
    }
}

/**
 * Reads a small JSON state file under a shared lock (rate limits, sessions).
 * Missing or invalid files yield [].
 */
function readJsonFileLocked(string $file): array {
    $fp = @fopen($file, 'r');
    if ($fp === false) {
        return [];
    }
    try {
        flock($fp, LOCK_SH);
        $data = json_decode((string) stream_get_contents($fp), true);
        return is_array($data) ? $data : [];
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

/**
 * Read-modify-write of a small JSON state file under an exclusive lock, so concurrent
 * requests cannot overwrite each other's updates. $update receives the decoded data by
 * reference (or [] for a missing/invalid file); its return value is passed through.
 */
function updateJsonFileLocked(string $file, callable $update, int $mode = 0600): mixed {
    $isNew = !file_exists($file);
    $fp = @fopen($file, 'c+');
    if ($fp === false) {
        sendJson(500, ['error' => 'Failed to open ' . basename($file)]);
    }
    try {
        flock($fp, LOCK_EX);
        if ($isNew) {
            @chmod($file, $mode);
        }

        $original = (string) stream_get_contents($fp);
        $data = json_decode($original, true);
        if (!is_array($data)) {
            $data = [];
        }

        $result = $update($data);

        $encoded = json_encode($data);
        if ($encoded !== $original) {
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, $encoded);
            fflush($fp);
        }

        return $result;
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}
