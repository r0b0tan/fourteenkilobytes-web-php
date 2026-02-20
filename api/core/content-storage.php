<?php

declare(strict_types=1);

function loadPageTypes(): array {
    if (!file_exists(PAGE_TYPES_FILE)) {
        return ['version' => 1, 'types' => []];
    }
    $content = file_get_contents(PAGE_TYPES_FILE);
    return json_decode($content, true) ?? ['version' => 1, 'types' => []];
}

function savePageTypes(array $index): void {
    file_put_contents(PAGE_TYPES_FILE, json_encode($index, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function saveSourceData(string $slug, array $sourceData): void {
    $path = SOURCES_DIR . "/{$slug}.json";
    file_put_contents($path, json_encode($sourceData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
}

function loadSourceData(string $slug): ?array {
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
