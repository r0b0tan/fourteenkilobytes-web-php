<?php

declare(strict_types=1);

if (!function_exists('sendJson')) {
    function sendJson(int $status, mixed $data): never {
        http_response_code($status);
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

if (!function_exists('readJsonBody')) {
    function readJsonBody(): array {
        $contentLength = $_SERVER['CONTENT_LENGTH'] ?? 0;
        if ($contentLength > MAX_REQUEST_SIZE) {
            sendJson(413, ['error' => 'Request body too large']);
        }

        $body = file_get_contents('php://input');
        if (empty($body)) {
            return [];
        }

        if (strlen($body) > MAX_REQUEST_SIZE) {
            sendJson(413, ['error' => 'Request body too large']);
        }

        $data = json_decode($body, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            sendJson(400, ['error' => 'Invalid JSON body']);
        }
        return $data ?? [];
    }
}

/**
 * Minify CSS while preserving strings, calc() expressions and descendant combinators.
 * Must stay in sync with minifyCss() in public/admin/lib/css-utils.js: the client embeds the
 * final byte count, so the server pass has to produce the identical output.
 */
function minifyCss(string $css): string {
    // Protect quoted strings (content, attribute selectors, font names) from all rules below.
    $strings = [];
    $minified = preg_replace('~/\*[\s\S]*?\*/~', '', $css) ?? $css;
    $minified = preg_replace_callback('/"(?:[^"\\\\]|\\\\[\s\S])*"|\'(?:[^\'\\\\]|\\\\[\s\S])*\'/', function (array $matches) use (&$strings): string {
        $strings[] = $matches[0];
        return '__STR' . (count($strings) - 1) . '__';
    }, $minified) ?? $minified;

    // Protect calc() expressions; their + and - operators require surrounding whitespace.
    $calcs = [];
    $minified = preg_replace_callback('/calc\([^)]+\)/', function (array $matches) use (&$calcs): string {
        $calcs[] = $matches[0];
        return '__CALC' . (count($calcs) - 1) . '__';
    }, $minified) ?? $minified;

    $minified = str_replace(["\r", "\n", "\t"], ' ', $minified);
    $minified = preg_replace('/\s{2,}/', ' ', $minified) ?? $minified;
    $minified = preg_replace('/\s*([{};,>+~])\s*/', '$1', $minified) ?? $minified;
    $minified = preg_replace('/:\s+/', ':', $minified) ?? $minified;

    // Whitespace before ":" is a descendant combinator in selectors (".a :hover"),
    // so it is only removed inside declaration blocks or a plain declaration list (style="").
    $minified = str_contains($minified, '{')
        ? (preg_replace_callback('/\{[^{}]*\}/', fn(array $m): string => preg_replace('/\s+:/', ':', $m[0]) ?? $m[0], $minified) ?? $minified)
        : (preg_replace('/\s+:/', ':', $minified) ?? $minified);

    $minified = preg_replace('/(^|[:\s,(])0(?:px|rem|em|%|vh|vw|vmin|vmax)(?=([;,)\s}]|$))/i', '${1}0', $minified) ?? $minified;
    $minified = preg_replace('/#([\da-f])\1([\da-f])\2([\da-f])\3\b/i', '#$1$2$3', $minified) ?? $minified;
    $minified = str_ireplace('rgba(255,255,255,0)', 'transparent', $minified);
    $minified = preg_replace('/;}/', '}', $minified) ?? $minified;
    $minified = trim($minified);

    $minified = preg_replace_callback('/__CALC(\d+)__/', function (array $matches) use ($calcs): string {
        $calc = $calcs[(int) $matches[1]] ?? '';
        $calc = preg_replace('/\s+/', ' ', $calc) ?? $calc;
        $calc = preg_replace('/\s*([(),])\s*/', '$1', $calc) ?? $calc;
        $calc = preg_replace('/([^-])\s*([+])\s*/', '$1 $2 ', $calc) ?? $calc;
        $calc = preg_replace('/([^-])\s*([-])\s*([^-])/', '$1 $2 $3', $calc) ?? $calc;
        $calc = preg_replace('/\s+/', ' ', $calc) ?? $calc;
        return trim($calc);
    }, $minified) ?? $minified;

    return preg_replace_callback('/__STR(\d+)__/', fn(array $matches): string => $strings[(int) $matches[1]] ?? '', $minified) ?? $minified;
}

/**
 * Elements whose surrounding whitespace never renders. Whitespace between two inline
 * elements (e.g. "<b>a</b> <i>b</i>") is significant and is collapsed to one space instead.
 */
const HTML_BLOCK_TAGS = [
    '!doctype' => true, 'html' => true, 'head' => true, 'body' => true, 'title' => true,
    'meta' => true, 'link' => true, 'style' => true, 'script' => true, 'base' => true,
    'noscript' => true, 'template' => true, 'div' => true, 'p' => true, 'h1' => true,
    'h2' => true, 'h3' => true, 'h4' => true, 'h5' => true, 'h6' => true, 'ul' => true,
    'ol' => true, 'li' => true, 'dl' => true, 'dt' => true, 'dd' => true, 'section' => true,
    'article' => true, 'header' => true, 'footer' => true, 'nav' => true, 'main' => true,
    'aside' => true, 'figure' => true, 'figcaption' => true, 'blockquote' => true,
    'pre' => true, 'hr' => true, 'br' => true, 'table' => true, 'caption' => true,
    'colgroup' => true, 'col' => true, 'thead' => true, 'tbody' => true, 'tfoot' => true,
    'tr' => true, 'td' => true, 'th' => true, 'form' => true, 'fieldset' => true,
    'legend' => true, 'details' => true, 'summary' => true, 'address' => true,
    'hgroup' => true, 'option' => true,
];

function collapseWhitespaceBetweenTags(string $html): string {
    // Whitespace inside <pre>, <textarea> and <script> is content and stays untouched.
    $preserved = [];
    $html = preg_replace_callback('/(<(pre|textarea|script)\b[^>]*>)([\s\S]*?)(<\/\2>)/i', function (array $matches) use (&$preserved): string {
        $preserved[] = $matches[3];
        return $matches[1] . "\x00" . (count($preserved) - 1) . "\x00" . $matches[4];
    }, $html) ?? $html;

    $html = preg_replace_callback(
        '/(<\/?(!?[A-Za-z][A-Za-z0-9-]*)[^>]*>)[ \t\n\r\f]+(?=<\/?(!?[A-Za-z][A-Za-z0-9-]*))/',
        function (array $matches): string {
            $isBlock = isset(HTML_BLOCK_TAGS[strtolower($matches[2])]) || isset(HTML_BLOCK_TAGS[strtolower($matches[3])]);
            return $matches[1] . ($isBlock ? '' : ' ');
        },
        $html
    ) ?? $html;

    return preg_replace_callback('/\x00(\d+)\x00/', fn(array $matches): string => $preserved[(int) $matches[1]] ?? '', $html) ?? $html;
}

/**
 * Must stay in sync with minifyHtmlDocument() in public/admin/lib/css-utils.js.
 */
function minifyHtmlDocument(string $html): string {
    $minified = preg_replace_callback('/<style\b[^>]*>(.*?)<\/style>/is', function (array $matches): string {
        return str_replace($matches[1], minifyCss($matches[1]), $matches[0]);
    }, $html);
    $minified = $minified ?? $html;

    $minified = preg_replace_callback('/\sstyle="([^"]*)"/i', function (array $matches): string {
        $css = minifyCss($matches[1]);
        return $css !== '' ? ' style="' . $css . '"' : '';
    }, $minified) ?? $minified;

    $minified = preg_replace('/\s(class|id|rel|target|lang)="([A-Za-z0-9_-]+)"/', ' $1=$2', $minified) ?? $minified;
    $minified = preg_replace('/<!--(?!\[if)[\s\S]*?-->/', '', $minified) ?? $minified;
    $minified = collapseWhitespaceBetweenTags($minified);

    return trim($minified);
}

function isCompressionEnabled(array $settings): bool {
    return ($settings['optimizations']['compression']['enabled'] ?? true) !== false;
}
