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
        readfile($file);
        return true;
    }
}

if (preg_match('/^\/admin\/(.+)$/', $uri, $matches)) {
    $file = __DIR__ . '/public/admin/' . $matches[1];
    
    // If no extension, try .html
    if (!file_exists($file) && !pathinfo($file, PATHINFO_EXTENSION)) {
        $file .= '.html';
    }
    
    if (file_exists($file)) {
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
        readfile($file);
        return true;
    }
}

// Static files
$file = __DIR__ . $uri;
if (is_file($file)) {
    return false; // Let PHP serve the file
}

// Blog routes
if ($uri === '/') {
    require __DIR__ . '/index.php';
    return true;
}

// Blog post slug
if (preg_match('/^\/([a-z0-9-]+)\/?$/', $uri, $matches)) {
    $_GET['slug'] = $matches[1];
    require __DIR__ . '/index.php';
    return true;
}

// 404
http_response_code(404);
echo '404 Not Found';
return true;
