<?php

declare(strict_types=1);

function handleSystemAuditRoutes(string $method, string $path): bool {
    if ($method === 'GET' && $path === '/audit-log') {
        requireAuth();
        checkGlobalRateLimit('/audit-log', false);

        $limit = min((int)($_GET['limit'] ?? 100), 500);
        $action = $_GET['action'] ?? null;

        if (!file_exists(AUDIT_LOG_FILE)) {
            sendJson(200, ['entries' => [], 'total' => 0]);
        }

        $lines = file(AUDIT_LOG_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        $lines = array_reverse($lines);

        $entries = [];
        $total = 0;

        foreach ($lines as $line) {
            $entry = json_decode($line, true);
            if ($entry === null) {
                continue;
            }

            if ($action !== null && $entry['action'] !== $action) {
                continue;
            }

            $total++;

            if (count($entries) < $limit) {
                $entries[] = $entry;
            }
        }

        sendJson(200, [
            'entries' => $entries,
            'total' => $total,
            'limit' => $limit,
        ]);
    }

    if ($method === 'GET' && $path === '/audit-log/export') {
        requireAuth();

        if (!file_exists(AUDIT_LOG_FILE)) {
            sendJson(404, ['error' => 'No audit log exists']);
        }

        $filename = 'audit-log-' . date('Y-m-d-His') . '.jsonl';
        header('Content-Type: application/x-ndjson');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        readfile(AUDIT_LOG_FILE);
        exit;
    }

    if ($method === 'DELETE' && $path === '/audit-log') {
        requireAuth();
        requireCsrfToken();

        if (!file_exists(AUDIT_LOG_FILE)) {
            sendJson(404, ['error' => 'No audit log exists']);
        }

        $entryCount = count(file(AUDIT_LOG_FILE, FILE_SKIP_EMPTY_LINES));

        $archivePath = AUDIT_LOG_FILE . '.' . date('Y-m-d-His') . '.deleted';
        @copy(AUDIT_LOG_FILE, $archivePath);

        file_put_contents(AUDIT_LOG_FILE, '', LOCK_EX);

        auditLog('audit_log_cleared', ['deletedEntries' => $entryCount, 'archivedTo' => basename($archivePath)]);

        sendJson(200, ['cleared' => true, 'deletedEntries' => $entryCount]);
    }

    return false;
}
