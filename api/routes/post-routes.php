<?php

declare(strict_types=1);

function resolvePostAuthor($sourceData, array $settings): ?string {
    $sourceAuthor = '';
    if (is_array($sourceData) && isset($sourceData['meta']) && is_array($sourceData['meta']) && isset($sourceData['meta']['author'])) {
        $sourceAuthor = trim((string) $sourceData['meta']['author']);
    }
    if ($sourceAuthor !== '') {
        return $sourceAuthor;
    }

    $blogAuthor = trim((string) ($settings['blog']['author'] ?? ''));
    if ($blogAuthor !== '') {
        return $blogAuthor;
    }

    $metaAuthor = trim((string) ($settings['meta']['author'] ?? ''));
    if ($metaAuthor !== '') {
        return $metaAuthor;
    }

    return null;
}

/**
 * Returns the manifest entry a publish would replace. Tombstoned slugs are only accepted
 * when the request explicitly restores the post; the original publishedAt is kept.
 */
function findExistingEntryForPublish(array $manifest, string $slug, bool $restore): ?array {
    foreach ($manifest['entries'] as $entry) {
        if ($entry['slug'] !== $slug) {
            continue;
        }
        if ($entry['status'] === 'tombstone' && !$restore) {
            sendJson(409, ['error' => "Slug '{$slug}' was previously used and tombstoned", 'code' => 'SLUG_TOMBSTONED']);
        }
        return $entry;
    }
    return null;
}

function handlePostRoutes(string $method, string $path): bool {
    if ($method === 'GET' && $path === '/posts') {
        $manifest = loadManifest();
        $pageTypes = loadPageTypes();
        $settings = loadSettings();
        $fallbackAuthor = trim((string) ($settings['blog']['author'] ?? ''));
        if ($fallbackAuthor === '') {
            $fallbackAuthor = trim((string) ($settings['meta']['author'] ?? ''));
        }

        $posts = [];
        foreach ($manifest['entries'] ?? [] as $entry) {
            $entryAuthor = trim((string) ($entry['author'] ?? ''));
            $posts[] = [
                'slug' => $entry['slug'],
                'title' => $entry['title'],
                'publishedAt' => $entry['publishedAt'],
                'modifiedAt' => $entry['modifiedAt'] ?? null,
                'author' => $entryAuthor !== '' ? $entryAuthor : ($fallbackAuthor !== '' ? $fallbackAuthor : null),
                'status' => $entry['status'],
                'pageType' => $pageTypes['types'][$entry['slug']] ?? 'post',
            ];
        }

        usort($posts, fn($a, $b) => strcmp($b['publishedAt'], $a['publishedAt']));

        sendJson(200, ['posts' => $posts]);
    }

    if ($method === 'GET' && preg_match('#^/posts/([a-z0-9-]+)$#', $path, $matches)) {
        $slug = $matches[1];
        $manifest = loadManifest();

        $entry = null;
        foreach ($manifest['entries'] ?? [] as $candidate) {
            if ($candidate['slug'] === $slug) {
                $entry = $candidate;
                break;
            }
        }

        if (!$entry) {
            sendJson(404, ['error' => 'Post not found']);
        }

        if ($entry['status'] === 'tombstone') {
            http_response_code(410);
            header('Content-Type: text/html; charset=utf-8');
            echo TOMBSTONE_HTML;
            exit;
        }

        $htmlPath = POSTS_DIR . "/{$slug}.html";
        if (!file_exists($htmlPath)) {
            sendJson(404, ['error' => 'Post not found']);
        }

        header('Content-Type: text/html; charset=utf-8');
        readfile($htmlPath);
        exit;
    }

    if ($method === 'POST' && $path === '/posts') {
        // No global rate limit here: authenticated bulk rebuilds and imports publish many pages in a row.
        requireAuth();
        requireCsrfToken();

        $body = readJsonBody();
        $timestamp = date('c');
        $settings = loadSettings();
        $compressionEnabled = isCompressionEnabled($settings);

        if (isset($body['pages']) && is_array($body['pages'])) {
            $pages = $body['pages'];
            $title = $body['title'] ?? 'Untitled';
            $pageType = $body['pageType'] ?? 'post';
            $sourceData = $body['sourceData'] ?? null;

            if (empty($pages)) {
                sendJson(400, ['error' => 'Pages array cannot be empty', 'code' => 'EMPTY_PAGES']);
            }

            $pages = array_values($pages);
            $baseSlug = $pages[0]['slug'] ?? '';
            if (!isValidSlug($baseSlug)) {
                sendJson(400, ['error' => 'Invalid slug format', 'code' => 'INVALID_SLUG']);
            }

            $totalBytes = 0;
            $hashes = [];
            $minifiedPages = [];
            foreach ($pages as $index => $page) {
                if (!is_array($page) || empty($page['slug']) || empty($page['html']) || !is_string($page['html'])) {
                    sendJson(400, ['error' => "Page {$index} missing slug or html", 'code' => 'MISSING_FIELDS']);
                }

                // Follow pagination naming (base, base-2, base-3, ...) so a request can only write its own files.
                $expectedSlug = $index === 0 ? $baseSlug : "{$baseSlug}-" . ($index + 1);
                if ($page['slug'] !== $expectedSlug) {
                    sendJson(400, ['error' => "Page {$index} has invalid slug (expected '{$expectedSlug}')", 'code' => 'INVALID_SLUG']);
                }

                $minifiedHtml = $compressionEnabled ? minifyHtmlDocument($page['html']) : $page['html'];
                $hashes[$index] = hash('sha256', $minifiedHtml);

                $pageBytes = strlen($minifiedHtml);
                if ($pageBytes > 14336) {
                    sendJson(400, ['error' => "Page {$index} exceeds 14KB limit ({$pageBytes} bytes, max 14336)", 'code' => 'PAGE_TOO_LARGE']);
                }

                if ($pageBytes > 1048576) {
                    sendJson(400, ['error' => "Page {$index} HTML too large (max 1MB)", 'code' => 'PAGE_TOO_LARGE']);
                }

                $minifiedPages[] = [
                    'slug' => $page['slug'],
                    'html' => $minifiedHtml,
                ];
                $totalBytes += $pageBytes;
            }

            $lock = new ManifestLock();
            $manifest = loadManifest();
            $existingEntry = findExistingEntryForPublish($manifest, $baseSlug, !empty($body['restore']));

            $publishedAt = $existingEntry['publishedAt'] ?? $timestamp;
            $modifiedAt = $existingEntry !== null ? $timestamp : null;
            $resolvedAuthor = resolvePostAuthor($sourceData, $settings);

            removeStalePaginationFiles($baseSlug, (int) ($existingEntry['pageCount'] ?? 1), count($minifiedPages));

            $savedSlugs = [];
            foreach ($minifiedPages as $page) {
                $htmlPath = POSTS_DIR . "/{$page['slug']}.html";
                file_put_contents($htmlPath, $page['html'], LOCK_EX);
                $savedSlugs[] = $page['slug'];
            }

            $newEntries = array_filter($manifest['entries'] ?? [], fn($entry) => $entry['slug'] !== $baseSlug);
            $manifestEntry = [
                'slug' => $baseSlug,
                'status' => 'published',
                'hash' => $hashes[0],
                'title' => $title,
                'publishedAt' => $publishedAt,
                'pageCount' => count($pages),
            ];
            if ($modifiedAt !== null) {
                $manifestEntry['modifiedAt'] = $modifiedAt;
            }
            if ($resolvedAuthor !== null) {
                $manifestEntry['author'] = $resolvedAuthor;
            }
            $newEntries[] = $manifestEntry;

            if ($sourceData !== null) {
                saveSourceData($baseSlug, $sourceData);
            }
            $manifest['entries'] = array_values($newEntries);
            saveManifest($manifest);

            $pageTypes = loadPageTypes();
            $pageTypes['types'][$baseSlug] = $pageType;
            savePageTypes($pageTypes);

            auditLog('post_create', ['slug' => $baseSlug, 'title' => $title, 'pageCount' => count($pages), 'totalBytes' => $totalBytes, 'pageType' => $pageType]);

            sendJson(201, [
                'slug' => $baseSlug,
                'pages' => $savedSlugs,
                'pageCount' => count($pages),
                'totalBytes' => $totalBytes,
                'publishedAt' => $timestamp,
                'pageType' => $pageType,
            ]);
        }

        if (empty($body['slug']) || empty($body['html']) || !is_string($body['html']) || !isset($body['bytes'])) {
            sendJson(400, ['error' => 'Missing required fields: slug, html, bytes', 'code' => 'MISSING_FIELDS']);
        }

        $html = $compressionEnabled ? minifyHtmlDocument($body['html']) : $body['html'];

        $htmlBytes = strlen($html);
        if ($htmlBytes > 14336) {
            sendJson(400, ['error' => "Page exceeds 14KB limit ({$htmlBytes} bytes, max 14336)", 'code' => 'PAGE_TOO_LARGE']);
        }

        if ($htmlBytes > 1048576) {
            sendJson(400, ['error' => 'HTML content too large (max 1MB)', 'code' => 'PAGE_TOO_LARGE']);
        }

        $slug = $body['slug'];
        $bytes = $htmlBytes;
        $title = $body['title'] ?? $slug;
        $hash = hash('sha256', $html);
        $pageType = $body['pageType'] ?? 'post';
        $sourceData = $body['sourceData'] ?? null;

        if (!isValidSlug($slug)) {
            sendJson(400, ['error' => 'Invalid slug format', 'code' => 'INVALID_SLUG']);
        }

        $lock = new ManifestLock();
        $manifest = loadManifest();
        $existingEntry = findExistingEntryForPublish($manifest, $slug, !empty($body['restore']));

        $publishedAt = $existingEntry['publishedAt'] ?? $timestamp;
        $modifiedAt = $existingEntry !== null ? $timestamp : null;
        $resolvedAuthor = resolvePostAuthor($sourceData, $settings);

        removeStalePaginationFiles($slug, (int) ($existingEntry['pageCount'] ?? 1), 1);

        $htmlPath = POSTS_DIR . "/{$slug}.html";
        file_put_contents($htmlPath, $html, LOCK_EX);

        $newEntries = array_filter($manifest['entries'] ?? [], fn($entry) => $entry['slug'] !== $slug);
        $manifestEntry = [
            'slug' => $slug,
            'status' => 'published',
            'hash' => $hash,
            'title' => $title,
            'publishedAt' => $publishedAt,
        ];
        if ($modifiedAt !== null) {
            $manifestEntry['modifiedAt'] = $modifiedAt;
        }
        if ($resolvedAuthor !== null) {
            $manifestEntry['author'] = $resolvedAuthor;
        }
        $newEntries[] = $manifestEntry;
        $manifest['entries'] = array_values($newEntries);
        saveManifest($manifest);

        if ($sourceData !== null) {
            saveSourceData($slug, $sourceData);
        }

        $pageTypes = loadPageTypes();
        $pageTypes['types'][$slug] = $pageType;
        savePageTypes($pageTypes);

        auditLog('post_create', ['slug' => $slug, 'title' => $title, 'bytes' => $bytes, 'pageType' => $pageType]);

        sendJson(201, [
            'slug' => $slug,
            'hash' => $hash,
            'bytes' => $bytes,
            'publishedAt' => $timestamp,
            'pageType' => $pageType,
        ]);
    }

    if ($method === 'POST' && preg_match('#^/posts/([a-z0-9-]+)/republish$#', $path, $matches)) {
        requireAuth();
        requireCsrfToken();

        $slug = $matches[1];
        $manifest = loadManifest();

        $found = false;
        foreach ($manifest['entries'] as $entry) {
            if ($entry['slug'] === $slug) {
                $found = true;
                break;
            }
        }

        if (!$found) {
            sendJson(404, ['error' => "Post '{$slug}' not found"]);
        }

        $sourceData = loadSourceData($slug);

        if ($sourceData === null) {
            sendJson(400, ['error' => "Post '{$slug}' has no source data (was published before this feature)"]);
        }

        sendJson(200, [
            'slug' => $slug,
            'sourceData' => $sourceData,
        ]);
    }

    if ($method === 'DELETE' && preg_match('#^/posts/([a-z0-9-]+)$#', $path, $matches)) {
        requireAuth();
        requireCsrfToken();
        checkGlobalRateLimit('/posts:delete', true);

        $slug = $matches[1];
        $lock = new ManifestLock();
        $manifest = loadManifest();

        $found = false;
        foreach ($manifest['entries'] as &$entry) {
            if ($entry['slug'] === $slug) {
                if ($entry['status'] === 'tombstone') {
                    sendJson(400, ['error' => "Post '{$slug}' already tombstoned", 'code' => 'ALREADY_TOMBSTONED']);
                }
                $entry['status'] = 'tombstone';
                $entry['tombstonedAt'] = date('c');
                writeTombstoneFiles($entry);
                $found = true;
                break;
            }
        }
        unset($entry);

        if (!$found) {
            sendJson(404, ['error' => "Post '{$slug}' not found"]);
        }

        saveManifest($manifest);

        auditLog('post_delete', ['slug' => $slug]);

        sendJson(200, ['tombstoned' => true, 'slug' => $slug]);
    }

    if ($method === 'POST' && preg_match('#^/posts/([a-z0-9-]+)/purge$#', $path, $matches)) {
        requireAuth();
        requireCsrfToken();
        checkGlobalRateLimit('/posts:delete', true);

        // Permanently removes a deleted post: its URL returns 404 instead of 410 and the slug becomes reusable.
        $slug = $matches[1];
        $lock = new ManifestLock();
        $manifest = loadManifest();

        $purged = null;
        foreach ($manifest['entries'] as $index => $entry) {
            if ($entry['slug'] === $slug) {
                if ($entry['status'] !== 'tombstone') {
                    sendJson(400, ['error' => "Post '{$slug}' must be deleted before it can be purged", 'code' => 'NOT_TOMBSTONED']);
                }
                $purged = $entry;
                unset($manifest['entries'][$index]);
                break;
            }
        }

        if ($purged === null) {
            sendJson(404, ['error' => "Post '{$slug}' not found"]);
        }

        $manifest['entries'] = array_values($manifest['entries']);
        saveManifest($manifest);

        @unlink(POSTS_DIR . "/{$slug}.html");
        removeStalePaginationFiles($slug, max(1, (int) ($purged['pageCount'] ?? 1)), 1);
        @unlink(SOURCES_DIR . "/{$slug}.json");

        $pageTypes = loadPageTypes();
        unset($pageTypes['types'][$slug]);
        savePageTypes($pageTypes);

        auditLog('post_purge', ['slug' => $slug]);

        sendJson(200, ['purged' => true, 'slug' => $slug]);
    }

    if ($method === 'DELETE' && $path === '/posts') {
        requireAuth();
        requireCsrfToken();
        checkGlobalRateLimit('/posts:delete-all', true);

        $lock = new ManifestLock();
        $manifest = loadManifest();
        $deletedCount = 0;

        foreach ($manifest['entries'] as &$entry) {
            if ($entry['status'] !== 'tombstone') {
                $entry['status'] = 'tombstone';
                $entry['tombstonedAt'] = date('c');
                $deletedCount++;
                writeTombstoneFiles($entry);
            }
        }
        unset($entry);

        saveManifest($manifest);

        auditLog('posts_delete_all', ['count' => $deletedCount]);

        sendJson(200, ['deleted' => $deletedCount]);
    }

    if ($method === 'POST' && $path === '/clone') {
        requireAuth();
        requireCsrfToken();

        $body = readJsonBody();
        $sourceType = $body['sourceType'] ?? 'page';
        $sourceSlug = $body['sourceSlug'] ?? '';

        if (empty($sourceSlug)) {
            sendJson(400, ['error' => 'Missing sourceSlug']);
        }

        if (!preg_match('/^[a-z0-9-]+$/', $sourceSlug)) {
            sendJson(400, ['error' => 'Invalid slug format']);
        }

        $sourceData = null;

        if ($sourceType === 'seed') {
            $seedPath = dirname(__DIR__, 2) . "/data/seeds/{$sourceSlug}.json";
            if (!file_exists($seedPath)) {
                sendJson(404, ['error' => "Seed '{$sourceSlug}' not found"]);
            }
            $seedContent = file_get_contents($seedPath);
            $sourceData = json_decode($seedContent, true);
            if ($sourceData === null) {
                sendJson(500, ['error' => 'Failed to parse seed file']);
            }
        } else {
            $sourceData = loadSourceData($sourceSlug);
            if ($sourceData === null) {
                sendJson(404, ['error' => "Page '{$sourceSlug}' not found or has no source data"]);
            }
        }

        $clonedData = json_decode(json_encode($sourceData), true);
        $clonedData['slug'] = '';
        $clonedData['title'] = '';

        sendJson(200, [
            'sourceData' => $clonedData,
            'clonedFrom' => $sourceSlug,
            'sourceType' => $sourceType,
        ]);
    }

    if ($method === 'GET' && $path === '/dependent-pages') {
        requireAuth();

        // Pages showing a post list must be rebuilt whenever a post is published or deleted.
        $slugs = [];
        foreach (loadManifest()['entries'] as $entry) {
            if (($entry['status'] ?? '') === 'tombstone') {
                continue;
            }
            $source = loadSourceData((string) ($entry['slug'] ?? ''));
            if (is_array($source['content'] ?? null) && contentHasBlockType($source['content'], 'bloglist')) {
                $slugs[] = $entry['slug'];
            }
        }

        sendJson(200, ['slugs' => $slugs]);
    }

    if ($method === 'GET' && $path === '/seeds') {
        requireAuth();

        $seedsDir = dirname(__DIR__, 2) . '/data/seeds';
        $seeds = [];

        if (is_dir($seedsDir)) {
            $files = glob($seedsDir . '/*.json');
            foreach ($files as $file) {
                $name = basename($file, '.json');
                $seeds[] = [
                    'name' => $name,
                    'label' => ucwords(str_replace('-', ' ', $name)),
                ];
            }
        }

        sendJson(200, ['seeds' => $seeds]);
    }

    return false;
}
