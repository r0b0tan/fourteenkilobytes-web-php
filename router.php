<?php
/**
 * Router for PHP Built-in Server
 * Simulates Apache .htaccess behavior
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// API requests
if (preg_match('/^\/api\//', $uri)) {
    $_SERVER['SCRIPT_NAME'] = '/api/index.php';
    require __DIR__ . '/api/index.php';
    return true;
}

// Admin routes - redirect /admin to /admin/
if ($uri === '/admin') {
    header('Location: /admin/', true, 301);
    return true;
}

if ($uri === '/admin/') {
    $file = __DIR__ . '/public/admin/index.html';
    if (file_exists($file)) {
        header('Content-Type: text/html; charset=utf-8');
        header('X-Robots-Tag: noindex, nofollow');
        readfile($file);
        return true;
    }
}

if (preg_match('/^\/admin\/(.+)$/', $uri, $matches)) {
    $requestedPath = $matches[1];
    
    // Prevent path traversal
    if (strpos($requestedPath, '..') !== false || strpos($requestedPath, '\0') !== false) {
        http_response_code(400);
        echo '400 Bad Request';
        return true;
    }
    
    $file = __DIR__ . '/public/admin/' . $requestedPath;
    
    // Ensure resolved path is within admin directory
    $realBase = realpath(__DIR__ . '/public/admin');
    $realFile = realpath($file);
    
    // If file doesn't exist yet, try with .html extension
    if (!$realFile && !pathinfo($file, PATHINFO_EXTENSION)) {
        $file .= '.html';
        $realFile = realpath($file);
    }
    
    // Verify path is within allowed directory
    if ($realFile && strpos($realFile, $realBase) === 0 && file_exists($realFile)) {
        // Serve the file with correct content type
        $ext = pathinfo($file, PATHINFO_EXTENSION);
        $contentTypes = [
            'html' => 'text/html',
            'css' => 'text/css',
            'js' => 'application/javascript',
            'json' => 'application/json',
        ];
        if (isset($contentTypes[$ext])) {
            header('Content-Type: ' . $contentTypes[$ext] . '; charset=utf-8');
        }
        // Prevent search engine indexing of admin area
        header('X-Robots-Tag: noindex, nofollow');
        readfile($realFile);
        return true;
    }
}

// Static files
$file = __DIR__ . $uri;
if (is_file($file)) {
    return false; // Let PHP serve the file
}

// RSS Feed
if ($uri === '/feed.xml') {
    require __DIR__ . '/feed.php';
    return true;
}

// Blog routes
if ($uri === '/') {
    require __DIR__ . '/index.php';
    return true;
}

// Blog post slug (without .html)
if (preg_match('/^\/([a-z0-9-]+)\/?$/', $uri, $matches)) {
    $_GET['slug'] = $matches[1];
    require __DIR__ . '/index.php';
    return true;
}

// Blog post slug (with .html) - serve directly from data/posts/
if (preg_match('/^\/([a-z0-9-]+)\.html$/', $uri, $matches)) {
    $slug = $matches[1];
    $htmlPath = __DIR__ . '/data/posts/' . $slug . '.html';

    if (file_exists($htmlPath)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($htmlPath);
        return true;
    }
}

// 404
http_response_code(404);
echo '404 Not Found';
return true;
