<?php

declare(strict_types=1);

function loadPageTypes(): array {
    $index = readJsonFile(PAGE_TYPES_FILE) ?? ['version' => 1, 'types' => []];
    if (!isset($index['types']) || !is_array($index['types'])) {
        $index['types'] = [];
    }
    return $index;
}

function savePageTypes(array $index): void {
    writeJsonFileAtomic(PAGE_TYPES_FILE, $index);
}

const TOMBSTONE_HTML = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Gone</title></head><body><h1>410 Gone</h1><p>This page has been removed.</p></body></html>';

/**
 * Replaces all files of a post (including pagination pages base-2, base-3, ...) with the tombstone page.
 */
function writeTombstoneFiles(array $entry): void {
    $slug = $entry['slug'];
    file_put_contents(POSTS_DIR . "/{$slug}.html", TOMBSTONE_HTML, LOCK_EX);

    $pageCount = max(1, (int) ($entry['pageCount'] ?? 1));
    for ($i = 2; $i <= $pageCount; $i++) {
        $pagePath = POSTS_DIR . "/{$slug}-{$i}.html";
        if (file_exists($pagePath)) {
            file_put_contents($pagePath, TOMBSTONE_HTML, LOCK_EX);
        }
    }
}

/**
 * Deletes pagination pages that a republished post no longer has (e.g. 3 pages -> 1 page).
 */
function removeStalePaginationFiles(string $slug, int $previousPageCount, int $newPageCount): void {
    for ($i = max(2, $newPageCount + 1); $i <= $previousPageCount; $i++) {
        @unlink(POSTS_DIR . "/{$slug}-{$i}.html");
    }
}

/**
 * Mirrors contentHasBlockType() in public/admin/lib/app-compile-style.js.
 */
function contentHasBlockType(array $blocks, string $blockType): bool {
    foreach ($blocks as $block) {
        if (!is_array($block)) {
            continue;
        }
        if (($block['type'] ?? null) === $blockType) {
            return true;
        }
        if (is_array($block['children'] ?? null) && contentHasBlockType($block['children'], $blockType)) {
            return true;
        }
        foreach (($block['cells'] ?? []) as $cell) {
            if (is_array($cell) && is_array($cell['children'] ?? null) && contentHasBlockType($cell['children'], $blockType)) {
                return true;
            }
        }
    }
    return false;
}

function isValidSlug(mixed $slug): bool {
    return is_string($slug) && preg_match('/^[a-z0-9-]+$/', $slug) === 1;
}

function saveSourceData(string $slug, array $sourceData): void {
    if (!isValidSlug($slug)) {
        sendJson(400, ['error' => 'Invalid slug format', 'code' => 'INVALID_SLUG']);
    }
    writeJsonFileAtomic(SOURCES_DIR . "/{$slug}.json", $sourceData, 0640, false);
}

function loadSourceData(string $slug): ?array {
    if (!isValidSlug($slug)) {
        return null;
    }
    $path = SOURCES_DIR . "/{$slug}.json";
    if (file_exists($path)) {
        $content = file_get_contents($path);
        $data = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("Corrupted JSON in {$path}: " . json_last_error_msg());
            return null;
        }
        return $data;
    }

    $manifest = loadManifest();
    foreach ($manifest['entries'] as $entry) {
        if ($entry['slug'] === $slug && isset($entry['sourceData'])) {
            return $entry['sourceData'];
        }
    }

    return null;
}
