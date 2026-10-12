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

        $errors = validateSettings($settings);
        if ($errors !== []) {
            sendJson(400, ['error' => 'Invalid settings: ' . implode('; ', $errors), 'code' => 'INVALID_SETTINGS', 'details' => $errors]);
        }

        saveSettings($settings);
        auditLog('settings_update', ['keys' => array_keys($settings)]);
        sendJson(200, ['success' => true]);
    }

    return false;
}
