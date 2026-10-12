<?php
/**
 * RSS 2.0 Feed Generator
 */
declare(strict_types=1);

require_once __DIR__ . '/api/core/paths.php';
require_once __DIR__ . '/api/core/json-storage.php';
require_once __DIR__ . '/api/core/manifest-storage.php';
require_once __DIR__ . '/api/core/settings-storage.php';
require_once __DIR__ . '/api/core/content-storage.php';

function extractTextFromChildren(array $children): string {
    $text = '';
    foreach ($children as $child) {
        if (!is_array($child)) {
            continue;
        }
        if (($child['type'] ?? '') === 'text') {
            $text .= $child['text'] ?? '';
        } elseif (isset($child['children']) && is_array($child['children'])) {
            $text .= extractTextFromChildren($child['children']);
        }
    }
    return $text;
}

/**
 * Collects paragraph text in document order, including paragraphs nested in sections and layout cells.
 */
function collectParagraphText(array $blocks, string &$text, int $maxLength): void {
    foreach ($blocks as $block) {
        if (!is_array($block) || mb_strlen($text) > $maxLength) {
            return;
        }
        if (($block['type'] ?? '') === 'paragraph') {
            $paragraph = is_array($block['children'] ?? null)
                ? extractTextFromChildren($block['children'])
                : (string) ($block['text'] ?? '');
            $text .= $paragraph . ' ';
            continue;
        }
        if (isset($block['children']) && is_array($block['children'])) {
            collectParagraphText($block['children'], $text, $maxLength);
        }
        foreach (($block['cells'] ?? []) as $cell) {
            if (is_array($cell) && is_array($cell['children'] ?? null)) {
                collectParagraphText($cell['children'], $text, $maxLength);
            }
        }
    }
}

function extractDescription(array $content, int $maxLength = 200): string {
    $text = '';
    collectParagraphText($content, $text, $maxLength);
    $text = trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    if (mb_strlen($text) > $maxLength) {
        $text = rtrim(mb_substr($text, 0, $maxLength - 1)) . '…';
    }
    return $text;
}

function xmlEscape(string $str): string {
    return htmlspecialchars($str, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

/**
 * RSS requires absolute links. Without a configured site URL, fall back to the requesting host.
 */
function requestBaseUrl(): string {
    $isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    if (!preg_match('/^[A-Za-z0-9.-]+(:\d+)?$/', $host)) {
        $host = 'localhost';
    }
    return ($isHttps ? 'https' : 'http') . '://' . $host;
}

$settings = loadSettings();
$rssSettings = is_array($settings['rss'] ?? null) ? $settings['rss'] : [];

if (!($rssSettings['enabled'] ?? false)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'RSS feed is disabled';
    exit;
}

$pageTypes = loadPageTypes()['types'];
$posts = array_filter(
    loadManifest()['entries'],
    fn($e) => ($e['status'] ?? '') === 'published' && ($pageTypes[$e['slug'] ?? ''] ?? 'post') === 'post'
);
usort($posts, fn($a, $b) => strcmp($b['publishedAt'] ?? '', $a['publishedAt'] ?? ''));

$maxItems = max(1, (int) ($rssSettings['maxItems'] ?? 20));
$posts = array_slice($posts, 0, $maxItems);

$feedTitle = xmlEscape((string) ($settings['siteTitle'] ?? 'Blog'));
$feedDescription = xmlEscape((string) ($settings['meta']['description'] ?? ''));
$configuredSiteUrl = rtrim((string) ($rssSettings['siteUrl'] ?? ''), '/');
$siteUrl = $configuredSiteUrl !== '' ? $configuredSiteUrl : requestBaseUrl();
$feedUrl = $siteUrl . '/feed.xml';
$language = (string) ($rssSettings['language'] ?? 'de-DE');
$copyright = (string) ($rssSettings['copyright'] ?? '');
$ttl = max(1, (int) ($rssSettings['ttl'] ?? 60));

$lastBuildDate = !empty($posts)
    ? date(DATE_RSS, strtotime($posts[0]['publishedAt']))
    : date(DATE_RSS);

header('Content-Type: application/rss+xml; charset=utf-8');
// A URL derived from the Host header must not end up in shared caches.
header($configuredSiteUrl !== '' ? 'Cache-Control: public, max-age=' . ($ttl * 60) : 'Cache-Control: private, no-cache');
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
    <atom:link href="<?= xmlEscape($feedUrl) ?>" rel="self" type="application/rss+xml"/>
<?php if ($copyright): ?>
    <copyright><?= xmlEscape($copyright) ?></copyright>
<?php endif; ?>
<?php
foreach ($posts as $post):
    $postUrl = $siteUrl . '/' . $post['slug'];
    $pubDate = date(DATE_RSS, strtotime($post['publishedAt']));

    $description = '';
    $source = loadSourceData($post['slug']);
    if (is_array($source['content'] ?? null)) {
        $description = extractDescription($source['content']);
    }
?>
    <item>
      <title><?= xmlEscape((string) ($post['title'] ?? '')) ?></title>
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
