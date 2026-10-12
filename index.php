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

function sendNotFound(): never {
    http_response_code(404);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>404</title></head><body><h1>404 Not Found</h1></body></html>';
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

    // No homepage configured - show setup message
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Setup Required</title>';
    echo '<style>body{font-family:system-ui,sans-serif;max-width:42rem;margin:2rem auto;padding:1rem;line-height:1.6}a{color:#10a697}</style>';
    echo '</head><body>';
    echo '<h1>Homepage nicht konfiguriert</h1>';
    echo '<p>Bitte wähle in den <a href="/admin/settings.html">Einstellungen</a> eine Seite als Homepage aus.</p>';
    echo '</body></html>';
    exit;
}

if (!isValidSlug($slug)) {
    sendNotFound();
}

$htmlFile = POSTS_DIR . "/{$slug}.html";
if (!file_exists($htmlFile)) {
    sendNotFound();
}

$entry = findOwningEntry(loadManifest(), $slug);
if ($entry !== null && ($entry['status'] ?? '') === 'tombstone') {
    http_response_code(410);
    header('Content-Type: text/html; charset=utf-8');
    echo TOMBSTONE_HTML;
    exit;
}

// Serve the post
header('Content-Type: text/html; charset=utf-8');
readfile($htmlFile);
