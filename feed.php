<?php
/**
 * RSS 2.0 Feed Generator
 */
declare(strict_types=1);

define('DATA_DIR', __DIR__ . '/data');
define('MANIFEST_FILE', DATA_DIR . '/manifest.json');
define('SETTINGS_FILE', DATA_DIR . '/settings.json');
define('SOURCES_DIR', DATA_DIR . '/sources');

function loadSettings(): array {
    if (!file_exists(SETTINGS_FILE)) {
        return [];
    }
    return json_decode(file_get_contents(SETTINGS_FILE), true) ?? [];
}

function loadManifest(): array {
    if (!file_exists(MANIFEST_FILE)) {
        return ['entries' => []];
    }
    return json_decode(file_get_contents(MANIFEST_FILE), true) ?? ['entries' => []];
}

function extractTextFromChildren(array $children): string {
    $text = '';
    foreach ($children as $child) {
        if ($child['type'] === 'text') {
            $text .= $child['text'] ?? '';
        } elseif (isset($child['children'])) {
            $text .= extractTextFromChildren($child['children']);
        }
    }
    return $text;
}

function extractDescription(array $content, int $maxLength = 200): string {
    $text = '';
    foreach ($content as $block) {
        if ($block['type'] === 'paragraph') {
            $text .= extractTextFromChildren($block['children'] ?? []) . ' ';
        }
        if (strlen($text) > $maxLength) {
            break;
        }
    }
    $text = trim(preg_replace('/\s+/', ' ', $text));
    if (strlen($text) > $maxLength) {
        $text = substr($text, 0, $maxLength - 3) . '...';
    }
    return $text;
}

function xmlEscape(string $str): string {
    return htmlspecialchars($str, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

$settings = loadSettings();
$rssSettings = $settings['rss'] ?? [];

if (!($rssSettings['enabled'] ?? false)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'RSS feed is disabled';
    exit;
}

$manifest = loadManifest();
$entries = $manifest['entries'] ?? [];

$posts = array_filter($entries, fn($e) => ($e['status'] ?? '') === 'published');
usort($posts, fn($a, $b) => strcmp($b['publishedAt'] ?? '', $a['publishedAt'] ?? ''));

$maxItems = (int)($rssSettings['maxItems'] ?? 20);
$posts = array_slice($posts, 0, $maxItems);

$feedTitle = xmlEscape($settings['siteTitle'] ?? 'Blog');
$feedDescription = xmlEscape($settings['meta']['description'] ?? '');
$siteUrl = rtrim($rssSettings['siteUrl'] ?? '', '/');
$feedUrl = $siteUrl ? $siteUrl . '/feed.xml' : '';
$language = $rssSettings['language'] ?? 'de-DE';
$copyright = $rssSettings['copyright'] ?? '';
$ttl = (int)($rssSettings['ttl'] ?? 60);

$lastBuildDate = !empty($posts)
    ? date(DATE_RSS, strtotime($posts[0]['publishedAt']))
    : date(DATE_RSS);

header('Content-Type: application/rss+xml; charset=utf-8');
header('Cache-Control: public, max-age=' . ($ttl * 60));
if (!empty($posts)) {
    header('Last-Modified: ' . gmdate('D, d M Y H:i:s', strtotime($posts[0]['publishedAt'])) . ' GMT');
}

echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title><?= $feedTitle ?></title>
    <link><?= xmlEscape($siteUrl) ?></link>
    <description><?= $feedDescription ?></description>
    <language><?= xmlEscape($language) ?></language>
    <lastBuildDate><?= $lastBuildDate ?></lastBuildDate>
    <ttl><?= $ttl ?></ttl>
<?php if ($feedUrl): ?>
    <atom:link href="<?= xmlEscape($feedUrl) ?>" rel="self" type="application/rss+xml"/>
<?php endif; ?>
<?php if ($copyright): ?>
    <copyright><?= xmlEscape($copyright) ?></copyright>
<?php endif; ?>
<?php
foreach ($posts as $post):
    $postUrl = $siteUrl . '/' . $post['slug'];
    $pubDate = date(DATE_RSS, strtotime($post['publishedAt']));

    $description = '';
    $sourcePath = SOURCES_DIR . '/' . $post['slug'] . '.json';
    if (file_exists($sourcePath)) {
        $source = json_decode(file_get_contents($sourcePath), true);
        if ($source && isset($source['content'])) {
            $description = extractDescription($source['content']);
        }
    }
?>
    <item>
      <title><?= xmlEscape($post['title'] ?? '') ?></title>
      <link><?= xmlEscape($postUrl) ?></link>
      <guid isPermaLink="true"><?= xmlEscape($postUrl) ?></guid>
      <pubDate><?= $pubDate ?></pubDate>
<?php if ($description): ?>
      <description><?= xmlEscape($description) ?></description>
<?php endif; ?>
    </item>
<?php endforeach; ?>
  </channel>
</rss>
