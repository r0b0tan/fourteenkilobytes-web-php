<?php
/**
 * fourteenkilobytes - Main Router
 *
 * Handles:
 * - Blog index (/)
 * - Blog posts (/:slug)
 */

declare(strict_types=1);

define('DATA_DIR', __DIR__ . '/data');
define('MANIFEST_FILE', DATA_DIR . '/manifest.json');
define('SETTINGS_FILE', DATA_DIR . '/settings.json');
define('POSTS_DIR', DATA_DIR . '/posts');
define('PUBLIC_DIR', __DIR__ . '/public');

// Get requested slug
$slug = $_GET['slug'] ?? '';

// Root request - show blog index
if (empty($slug)) {
    // Load settings
    $settings = [];
    if (file_exists(SETTINGS_FILE)) {
        $settingsContent = @file_get_contents(SETTINGS_FILE);
        $settings = $settingsContent ? json_decode($settingsContent, true) : [];
        if (!is_array($settings)) {
            $settings = [];
        }
    }

    // Check if custom homepage is configured
    $homepageSlug = $settings['homepageSlug'] ?? null;

    // Serve custom homepage if configured
    if ($homepageSlug) {
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

// Validate slug format
if (!preg_match('/^[a-z0-9-]+$/', $slug)) {
    http_response_code(404);
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>404</title></head><body><h1>404 Not Found</h1></body></html>';
    exit;
}

// Check if post exists
$htmlFile = POSTS_DIR . "/{$slug}.html";

if (!file_exists($htmlFile)) {
    http_response_code(404);
    echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>404</title></head><body><h1>404 Not Found</h1></body></html>';
    exit;
}

// Check manifest for tombstone status
if (file_exists(MANIFEST_FILE)) {
    $content = @file_get_contents(MANIFEST_FILE);
    $manifest = $content ? json_decode($content, true) : null;
    if (is_array($manifest)) {
        foreach ($manifest['entries'] ?? [] as $entry) {
            if ($entry['slug'] === $slug && $entry['status'] === 'tombstone') {
                http_response_code(410);
                echo '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gone</title></head><body><h1>410 Gone</h1><p>This page has been removed.</p></body></html>';
                exit;
            }
        }
    }
}

// Serve the post
header('Content-Type: text/html; charset=utf-8');
readfile($htmlFile);
