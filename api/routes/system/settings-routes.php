<?php

declare(strict_types=1);

function handleSystemSettingsRoutes(string $method, string $path): bool {
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

    return false;
}
