<?php
/**
 * fourteenkilobytes - Main Router
 *
 * Handles:
 * - Blog index (/)
 * - Blog posts (/:slug)
 */

declare(strict_types=1);

require_once __DIR__ . '/api/core/paths.php';
require_once __DIR__ . '/api/core/json-storage.php';
require_once __DIR__ . '/api/core/manifest-storage.php';
require_once __DIR__ . '/api/core/settings-storage.php';
require_once __DIR__ . '/api/core/content-storage.php';

const STATUS_TEXTS = [
    'de' => [
        404 => ['Seite nicht gefunden', 'Unter dieser Adresse gibt es keine Seite.'],
        410 => ['Seite entfernt', 'Diese Seite wurde entfernt.'],
        'setup' => ['Homepage nicht konfiguriert', 'Bitte wähle in den <a href="/admin/settings.html">Einstellungen</a> eine Seite als Homepage aus.'],
    ],
    'en' => [
        404 => ['Page not found', 'There is no page at this address.'],
        410 => ['Page removed', 'This page has been removed.'],
        'setup' => ['Homepage not configured', 'Please choose a page as homepage in the <a href="/admin/settings.html">settings</a>.'],
    ],
];

/**
 * Status pages follow the visitor's browser language (German or English).
 */
function preferredLanguage(): string {
    $header = (string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '');
    return preg_match('/^\s*de\b/i', $header) ? 'de' : 'en';
}

function sendStatusPage(int $status, string|int $textKey): never {
    $lang = preferredLanguage();
    [$title, $message] = STATUS_TEXTS[$lang][$textKey];

    http_response_code($status);
    header('Content-Type: text/html; charset=utf-8');
    header('Vary: Accept-Language');
    echo '<!DOCTYPE html><html lang="' . $lang . '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>' . htmlspecialchars($title) . '</title>';
    echo '<style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:1rem;line-height:1.6}a{color:#10a697}</style>';
    echo '</head><body><h1>' . htmlspecialchars($title) . '</h1><p>' . $message . '</p></body></html>';
    exit;
}

/**
 * Finds the manifest entry a URL slug belongs to: the post itself or one of its
 * pagination pages (base-2, base-3, ...).
 */
function findOwningEntry(array $manifest, string $slug): ?array {
    foreach ($manifest['entries'] as $entry) {
        if (($entry['slug'] ?? '') === $slug) {
            return $entry;
        }
    }
    foreach ($manifest['entries'] as $entry) {
        $entrySlug = $entry['slug'] ?? '';
        if (preg_match('/^' . preg_quote($entrySlug, '/') . '-(\d+)$/', $slug, $matches)) {
            $pageNumber = (int) $matches[1];
            if ($pageNumber >= 2 && $pageNumber <= (int) ($entry['pageCount'] ?? 1)) {
                return $entry;
            }
        }
    }
    return null;
}

// Get requested slug
$slug = $_GET['slug'] ?? '';

// Root request - show blog index
if (empty($slug)) {
    $settings = loadSettings();

    // Serve custom homepage if configured
    $homepageSlug = $settings['homepageSlug'] ?? null;
    if (isValidSlug($homepageSlug)) {
        $homepageFile = POSTS_DIR . "/{$homepageSlug}.html";
        if (file_exists($homepageFile)) {
            header('Content-Type: text/html; charset=utf-8');
            readfile($homepageFile);
            exit;
        }
    }

    // No homepage configured - show setup hint
    sendStatusPage(200, 'setup');
}

if (!isValidSlug($slug)) {
    sendStatusPage(404, 404);
}

$htmlFile = POSTS_DIR . "/{$slug}.html";
if (!file_exists($htmlFile)) {
    sendStatusPage(404, 404);
}

$entry = findOwningEntry(loadManifest(), $slug);
if ($entry !== null && ($entry['status'] ?? '') === 'tombstone') {
    sendStatusPage(410, 410);
}

// Serve the post
header('Content-Type: text/html; charset=utf-8');
readfile($htmlFile);
