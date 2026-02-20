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

function minifyCss(string $css): string {
    $minified = preg_replace('~/\*[\s\S]*?\*/~', '', $css);
    $minified = $minified ?? $css;

    $minified = str_replace(["\r", "\n", "\t"], '', $minified);

    $minified = preg_replace('/\s{2,}/', ' ', $minified) ?? $minified;
    $minified = preg_replace('/\s*([{}:;,>+~])\s*/', '$1', $minified) ?? $minified;
    $minified = preg_replace('/(^|[:\s,(])0(?:px|rem|em|%|vh|vw|vmin|vmax)(?=([;,)\s}]|$))/i', '${1}0', $minified) ?? $minified;
    $minified = preg_replace('/#([\da-f])\1([\da-f])\2([\da-f])\3\b/i', '#$1$2$3', $minified) ?? $minified;
    $minified = str_ireplace('rgba(255,255,255,0)', 'transparent', $minified);
    $minified = preg_replace('/;}/', '}', $minified) ?? $minified;

    return trim($minified);
}

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
    $minified = preg_replace('/>\s+</', '><', $minified) ?? $minified;

    return trim($minified);
}

function isCompressionEnabled(array $settings): bool {
    return ($settings['optimizations']['compression']['enabled'] ?? true) !== false;
}
