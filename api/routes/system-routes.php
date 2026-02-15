<?php

declare(strict_types=1);

function handleSystemRoutes(string $method, string $path): bool {
    if ($method === 'GET' && $path === '/health') {
        sendJson(200, ['status' => 'ok']);
    }

    if ($method === 'GET' && $path === '/security-status') {
        requireAuth();

        $warnings = checkDataDirectorySecurity();
        $status = empty($warnings) ? 'ok' : 'warning';

        sendJson(200, [
            'status' => $status,
            'warnings' => $warnings,
            'checks' => [
                'instanceFilePermissions' => file_exists(INSTANCE_FILE)
                    ? decoct(fileperms(INSTANCE_FILE) & 0777)
                    : 'not_found',
                'sessionFilePermissions' => file_exists(SESSION_FILE)
                    ? decoct(fileperms(SESSION_FILE) & 0777)
                    : 'not_found',
            ]
        ]);
    }

    if ($method === 'GET' && $path === '/setup-status') {
        sendJson(200, ['setupComplete' => isSetupComplete()]);
    }

    if ($method === 'GET' && $path === '/settings') {
        requireAuth();
        checkGlobalRateLimit('/settings', false);
        sendJson(200, loadSettings());
    }

    if ($method === 'PUT' && $path === '/settings') {
        requireAuth();
        requireCsrfToken();
        checkGlobalRateLimit('/settings:update', true);

        $settings = readJsonBody();

        if (($settings['version'] ?? 0) !== 1) {
            sendJson(400, ['error' => 'Invalid settings version']);
        }

        saveSettings($settings);
        auditLog('settings_update', ['keys' => array_keys($settings)]);
        sendJson(200, ['success' => true]);
    }

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

    if ($method === 'GET' && $path === '/icons') {
        sendJson(200, ['icons' => []]);
    }

    if ($method === 'GET' && $path === '/export') {
        requireAuth();
        checkGlobalRateLimit('/export', true);

        $type = $_GET['type'] ?? 'all';
        $export = [
            'version' => 1,
            'exportedAt' => date('c'),
        ];

        if ($type === 'all' || $type === 'settings') {
            $export['settings'] = loadSettings();
        }

        if ($type === 'all' || $type === 'articles') {
            $manifest = loadManifest();
            $pageTypes = loadPageTypes();
            $articles = [];

            foreach ($manifest['entries'] ?? [] as $entry) {
                if ($entry['status'] === 'tombstone') {
                    continue;
                }

                $slug = $entry['slug'];
                $sourceData = loadSourceData($slug);

                $articles[] = [
                    'slug' => $slug,
                    'title' => $entry['title'],
                    'publishedAt' => $entry['publishedAt'],
                    'pageType' => $pageTypes['types'][$slug] ?? 'post',
                    'pageCount' => $entry['pageCount'] ?? 1,
                    'sourceData' => $sourceData,
                ];
            }

            $export['articles'] = $articles;
        }

        $filename = 'fourteenkilobytes-backup-' . date('Y-m-d-His') . '.json';
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        sendJson(200, $export);
    }

    if ($method === 'POST' && $path === '/import') {
        requireAuth();
        requireCsrfToken();
        checkGlobalRateLimit('/import', true);

        $body = readJsonBody();

        if (($body['version'] ?? 0) !== 1) {
            sendJson(400, ['error' => 'Invalid or unsupported backup version']);
        }

        $articleCount = count($body['articles'] ?? []);
        if ($articleCount > 100) {
            sendJson(400, ['error' => 'Too many articles (max 100 per import)']);
        }

        $totalSize = strlen(json_encode($body));
        if ($totalSize > 10 * 1024 * 1024) {
            sendJson(400, ['error' => 'Import data too large (max 10MB)']);
        }

        $importSettings = $_GET['settings'] ?? 'true';
        $importArticles = $_GET['articles'] ?? 'true';
        $result = ['imported' => []];

        if ($importSettings === 'true' && isset($body['settings'])) {
            saveSettings($body['settings']);
            $result['imported'][] = 'settings';
        }

        if ($importArticles === 'true' && isset($body['articles'])) {
            $imported = [];
            foreach ($body['articles'] as $article) {
                if (empty($article['slug']) || empty($article['sourceData'])) {
                    continue;
                }
                saveSourceData($article['slug'], $article['sourceData']);
                $imported[] = $article['slug'];
            }
            $result['imported'][] = 'articles';
            $result['articleSlugs'] = $imported;
        }

        sendJson(200, $result);
    }

    if ($method === 'POST' && $path === '/reset') {
        requireAuth();
        requireCsrfToken();
        checkGlobalRateLimit('/reset', true);

        $body = readJsonBody();
        $confirmPhrase = $body['confirm'] ?? '';

        if ($confirmPhrase !== 'RESET') {
            sendJson(400, ['error' => 'Confirmation required. Send {"confirm": "RESET"}']);
        }

        saveManifest(['version' => 1, 'entries' => []]);

        saveSettings([
            'version' => 1,
            'cssMode' => 'default',
            'globalCss' => '',
            'optimizations' => [
                'compression' => ['enabled' => true],
                'classMangling' => ['enabled' => false],
            ],
            'header' => ['enabled' => false, 'links' => []],
            'footer' => ['enabled' => false, 'content' => ''],
            'bloglist' => [
                'limit' => 10,
                'archiveEnabled' => false,
                'archiveSlug' => 'archive',
                'archiveLinkText' => 'View all posts →',
            ],
        ]);

        savePageTypes(['version' => 1, 'types' => []]);

        $htmlFiles = glob(POSTS_DIR . '/*.html');
        foreach ($htmlFiles as $file) {
            @unlink($file);
        }

        $sourceFiles = glob(SOURCES_DIR . '/*.json');
        foreach ($sourceFiles as $file) {
            @unlink($file);
        }

        if (file_exists(INSTANCE_FILE)) {
            @unlink(INSTANCE_FILE);
        }

        $setupLockFile = DATA_DIR . '/.setup-complete';
        if (file_exists($setupLockFile)) {
            @unlink($setupLockFile);
        }

        destroyAllSessions();

        auditLog('full_reset', ['ip' => getClientIp()]);

        sendJson(200, ['reset' => true]);
    }

    if ($method === 'GET' && $path === '/check-updates') {
        $versionFile = dirname(__DIR__, 2) . '/version.json';
        if (!file_exists($versionFile)) {
            sendJson(500, ['error' => 'Version file not found']);
        }

        $versionData = json_decode(file_get_contents($versionFile), true);
        $currentVersion = $versionData['version'] ?? '0.0.0';
        $repository = $versionData['repository'] ?? 'r0b0tan/fourteenkilobytes-web-php';

        $cacheFile = DATA_DIR . '/update-check-cache.json';

        if (file_exists($cacheFile)) {
            $cache = json_decode(file_get_contents($cacheFile), true);
            $cacheAge = time() - ($cache['timestamp'] ?? 0);

            if ($cacheAge < 86400) {
                sendJson(200, [
                    'current' => $currentVersion,
                    'latest' => $cache['latest'],
                    'updateAvailable' => version_compare($cache['latest'], $currentVersion, '>'),
                    'releaseUrl' => $cache['releaseUrl'] ?? null,
                    'releaseDate' => $cache['releaseDate'] ?? null,
                    'cached' => true
                ]);
            }
        }

        $githubUrl = "https://api.github.com/repos/{$repository}/releases/latest";

        $context = stream_context_create([
            'http' => [
                'method' => 'GET',
                'header' => "User-Agent: FourteenKB/{$currentVersion}\r\n",
                'timeout' => 5,
                'max_redirects' => 3,
                'follow_location' => 1
            ]
        ]);

        $response = @file_get_contents($githubUrl, false, $context);
        if ($response !== false && strlen($response) > 1024 * 1024) {
            $response = false;
        }

        if ($response === false) {
            sendJson(200, [
                'current' => $currentVersion,
                'latest' => $currentVersion,
                'updateAvailable' => false,
                'error' => 'Could not reach GitHub API',
                'offline' => true
            ]);
        }

        $releaseData = json_decode($response, true);

        if (!isset($releaseData['tag_name'])) {
            sendJson(200, [
                'current' => $currentVersion,
                'latest' => $currentVersion,
                'updateAvailable' => false,
                'error' => 'Invalid GitHub API response'
            ]);
        }

        $latestVersion = ltrim($releaseData['tag_name'], 'v');
        $releaseUrl = $releaseData['html_url'] ?? "https://github.com/{$repository}/releases/latest";
        $releaseDate = $releaseData['published_at'] ?? null;

        $cacheData = [
            'timestamp' => time(),
            'latest' => $latestVersion,
            'releaseUrl' => $releaseUrl,
            'releaseDate' => $releaseDate
        ];
        @file_put_contents($cacheFile, json_encode($cacheData, JSON_PRETTY_PRINT));

        sendJson(200, [
            'current' => $currentVersion,
            'latest' => $latestVersion,
            'updateAvailable' => version_compare($latestVersion, $currentVersion, '>'),
            'releaseUrl' => $releaseUrl,
            'releaseDate' => $releaseDate,
            'cached' => false
        ]);
    }

    return false;
}
