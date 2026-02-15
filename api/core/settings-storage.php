<?php

declare(strict_types=1);

function loadSettings(): array {
    if (!file_exists(SETTINGS_FILE)) {
        return [
            'version' => 1,
            'cssMode' => 'default',
            'globalCss' => '',
            'optimizations' => [
                'compression' => ['enabled' => true],
                'classMangling' => ['enabled' => false, 'mode' => 'safe'],
            ],
            'header' => ['enabled' => false, 'links' => []],
            'footer' => ['enabled' => false, 'content' => ''],
            'bloglist' => [
                'limit' => 10,
                'archiveEnabled' => true,
                'archiveSlug' => 'archive',
                'archiveLinkText' => 'View all posts →',
            ],
        ];
    }
    $content = file_get_contents(SETTINGS_FILE);
    $settings = json_decode($content, true);

    if (!isset($settings['version'])) {
        $settings['version'] = 1;
    }
    if (!isset($settings['cssMode'])) {
        $settings['cssMode'] = 'default';
    }
    if (!isset($settings['bloglist'])) {
        $settings['bloglist'] = [
            'limit' => 10,
            'archiveEnabled' => false,
            'archiveSlug' => 'archive',
            'archiveLinkText' => 'View all posts →',
        ];
    }
    if (!isset($settings['optimizations']) || !is_array($settings['optimizations'])) {
        $settings['optimizations'] = [];
    }
    if (!isset($settings['optimizations']['compression']) || !is_array($settings['optimizations']['compression'])) {
        $settings['optimizations']['compression'] = [];
    }
    if (!array_key_exists('enabled', $settings['optimizations']['compression'])) {
        $settings['optimizations']['compression']['enabled'] = true;
    }
    if (!isset($settings['optimizations']['classMangling']) || !is_array($settings['optimizations']['classMangling'])) {
        $settings['optimizations']['classMangling'] = [];
    }
    if (!array_key_exists('enabled', $settings['optimizations']['classMangling'])) {
        $settings['optimizations']['classMangling']['enabled'] = false;
    }
    $mode = $settings['optimizations']['classMangling']['mode'] ?? 'safe';
    $settings['optimizations']['classMangling']['mode'] = ($mode === 'aggressive') ? 'aggressive' : 'safe';
    unset($settings['optimizations']['casing']);
    return $settings;
}

function saveSettings(array $settings): void {
    $tmpFile = SETTINGS_FILE . '.tmp.' . uniqid() . '.json';

    $jsonContent = json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    if ($jsonContent === false) {
        sendJson(500, ['error' => 'Failed to encode settings data']);
    }

    if (file_put_contents($tmpFile, $jsonContent, LOCK_EX) === false) {
        @unlink($tmpFile);
        sendJson(500, ['error' => 'Failed to write settings']);
    }

    if (file_exists(SETTINGS_FILE)) {
        $backup = SETTINGS_FILE . '.bak';
        @copy(SETTINGS_FILE, $backup);
    }

    if (!@rename($tmpFile, SETTINGS_FILE)) {
        @unlink($tmpFile);
        sendJson(500, ['error' => 'Failed to finalize settings']);
    }

    @chmod(SETTINGS_FILE, 0640);
}
