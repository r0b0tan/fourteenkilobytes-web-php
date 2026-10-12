<?php

declare(strict_types=1);

function loadSettings(): array {
    $settings = readJsonFile(SETTINGS_FILE);
    if ($settings === null) {
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
            'blog' => [
                'author' => '',
            ],
            'updateCheck' => [
                'enabled' => false,
            ],
        ];
    }
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
    if (!isset($settings['blog']) || !is_array($settings['blog'])) {
        $settings['blog'] = [];
    }
    if (!isset($settings['blog']['author']) || !is_string($settings['blog']['author'])) {
        $settings['blog']['author'] = '';
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
    if (!isset($settings['updateCheck']) || !is_array($settings['updateCheck'])) {
        $settings['updateCheck'] = ['enabled' => false];
    }
    if (!array_key_exists('enabled', $settings['updateCheck'])) {
        $settings['updateCheck']['enabled'] = false;
    }
    return $settings;
}

function saveSettings(array $settings): void {
    writeJsonFileAtomic(SETTINGS_FILE, $settings);
}

/**
 * Type and range checks for settings coming from the admin UI or a backup import.
 * Unknown keys are allowed (older versions and the setup wizard write additional keys).
 *
 * @return string[] List of problems, empty if the settings are valid.
 */
function validateSettings(mixed $settings): array {
    if (!is_array($settings) || array_is_list($settings) && $settings !== []) {
        return ['settings must be an object'];
    }

    $errors = [];
    $get = function (string $path) use ($settings): array {
        $value = $settings;
        foreach (explode('.', $path) as $key) {
            if (!is_array($value) || !array_key_exists($key, $value)) {
                return [false, null];
            }
            $value = $value[$key];
        }
        return [true, $value];
    };
    $check = function (string $path, callable $isValid, string $expected) use ($get, &$errors): void {
        [$exists, $value] = $get($path);
        if ($exists && !$isValid($value)) {
            $errors[] = "{$path} must be {$expected}";
        }
    };

    $isBool = fn($v) => is_bool($v);
    $isObject = fn($v) => is_array($v) && (!array_is_list($v) || $v === []);
    $isString = fn(int $max) => fn($v) => is_string($v) && strlen($v) <= $max;
    $isNullableString = fn(int $max) => fn($v) => $v === null || (is_string($v) && strlen($v) <= $max);
    $isIntBetween = fn(int $min, int $max) => fn($v) => is_int($v) && $v >= $min && $v <= $max;

    if (($settings['version'] ?? null) !== 1) {
        $errors[] = 'version must be 1';
    }

    foreach (['header', 'footer', 'meta', 'rss', 'bloglist', 'blog', 'optimizations', 'optimizations.compression', 'optimizations.classMangling', 'updateCheck'] as $objectPath) {
        $check($objectPath, $isObject, 'an object');
    }
    foreach (['siteTitleEnabled', 'cssEnabled', 'header.enabled', 'footer.enabled', 'meta.enabled', 'rss.enabled', 'bloglist.archiveEnabled', 'optimizations.compression.enabled', 'optimizations.classMangling.enabled', 'updateCheck.enabled'] as $boolPath) {
        $check($boolPath, $isBool, 'a boolean');
    }

    $check('siteLanguage', fn($v) => $v === 'en' || $v === 'de', "'en' or 'de'");
    $check('homepageSlug', fn($v) => $v === null || $v === '' || isValidSlug($v), 'a valid slug or null');
    $check('bloglist.archiveSlug', fn($v) => isValidSlug($v), 'a valid slug');
    $check('favicon', fn($v) => $v === null || (is_string($v) && strlen($v) <= 8192 && str_starts_with($v, 'data:image/')), 'a data:image URL (max 8 KB) or null');
    $check('siteTitle', $isNullableString(200), 'a string (max 200 characters) or null');
    $check('cssMode', $isString(50), 'a string');
    $check('globalCss', $isString(14336), 'a string (max 14336 bytes)');
    // Injected into a CSS rule, so only characters that cannot end the declaration are allowed.
    $check('pageWidth', fn($v) => $v === null || (is_string($v) && preg_match('/^[A-Za-z0-9.%(),+\-*\/ ]{1,20}$/', $v) === 1), 'a CSS length or null');
    $check('header.links', fn($v) => is_array($v) && array_is_list($v) && count($v) <= 50 && array_reduce(
        $v,
        fn($ok, $link) => $ok && is_array($link) && is_string($link['text'] ?? null) && is_string($link['href'] ?? null)
            && strlen($link['text']) <= 200 && strlen($link['href']) <= 2048,
        true
    ), 'a list of {text, href} objects');
    $check('footer.content', $isString(14336), 'a string (max 14336 bytes)');
    $check('meta.description', $isString(1000), 'a string (max 1000 characters)');
    $check('meta.author', $isString(200), 'a string (max 200 characters)');
    $check('rss.siteUrl', fn($v) => $v === '' || (is_string($v) && filter_var($v, FILTER_VALIDATE_URL) !== false && preg_match('#^https?://#i', $v) === 1), 'an http(s) URL or empty');
    $check('rss.language', $isString(35), 'a language tag');
    $check('rss.copyright', $isString(500), 'a string (max 500 characters)');
    $check('rss.maxItems', $isIntBetween(1, 500), 'an integer between 1 and 500');
    $check('rss.ttl', $isIntBetween(1, 10080), 'an integer between 1 and 10080');
    $check('bloglist.limit', $isIntBetween(1, 1000), 'an integer between 1 and 1000');
    $check('bloglist.archiveLinkText', $isString(200), 'a string (max 200 characters)');
    $check('blog.author', $isString(200), 'a string (max 200 characters)');
    $check('optimizations.classMangling.mode', fn($v) => $v === 'safe' || $v === 'aggressive', "'safe' or 'aggressive'");

    return $errors;
}
