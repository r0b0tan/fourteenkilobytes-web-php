<?php

declare(strict_types=1);

function handleSystemBackupRoutes(string $method, string $path): bool {
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

    return false;
}
