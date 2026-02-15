<?php

declare(strict_types=1);

function handleSystemMetaRoutes(string $method, string $path): bool {
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

    if ($method === 'GET' && $path === '/icons') {
        sendJson(200, ['icons' => []]);
    }

    if ($method === 'GET' && $path === '/check-updates') {
        $versionFile = dirname(__DIR__, 3) . '/version.json';
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
