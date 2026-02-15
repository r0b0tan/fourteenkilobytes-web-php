<?php

declare(strict_types=1);

require_once __DIR__ . '/system/meta-routes.php';
require_once __DIR__ . '/system/settings-routes.php';
require_once __DIR__ . '/system/audit-routes.php';
require_once __DIR__ . '/system/backup-routes.php';

function handleSystemRoutes(string $method, string $path): bool {
    $handlers = [
        'handleSystemMetaRoutes',
        'handleSystemSettingsRoutes',
        'handleSystemAuditRoutes',
        'handleSystemBackupRoutes',
    ];

    foreach ($handlers as $handler) {
        if ($handler($method, $path) === true) {
            return true;
        }
    }

    return false;
}
