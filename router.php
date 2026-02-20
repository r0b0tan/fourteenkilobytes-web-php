<?php
/**
 * Router for PHP Built-in Server
 * Simulates Apache .htaccess behavior
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Path traversal protection: normalize path and block suspicious patterns
$uri = str_replace('\\', '/', $uri); // Normalize backslashes
if (strpos($uri, '..') !== false || strpos($uri, "\0") !== false) {
    http_response_code(400);
    echo '400 Bad Request';
    return true;
}

// Serve language files from public/lang/
if (preg_match('/^\/lang\/(.+\.json)$/', $uri, $matches)) {
    $file = __DIR__ . '/public/lang/' . $matches[1];
    if (file_exists($file)) {
        header('Content-Type: application/json; charset=utf-8');
        readfile($file);
        return true;
    }
}

// Check if setup is complete (both lock file AND instance.json must exist)
$setupComplete = file_exists(__DIR__ . '/data/.setup-complete') 
    && file_exists(__DIR__ . '/data/instance.json');

// Redirect to setup if not complete (except for setup, api, and admin static files)
if (!$setupComplete && !preg_match('/^\/(setup|api)/', $uri)) {
    // Allow static files to load (CSS, JS, fonts, etc.)
    if (preg_match('/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|json)$/', $uri)) {
        // Let admin files be handled by admin routing below
        if (!preg_match('/^\/admin\//', $uri)) {
            return false; // Let PHP serve the static file
        }
        // Fall through for /admin/ files
    } else {
        header('Location: /setup/', true, 302);
        return true;
    }
}

// Setup wizard routes
if (preg_match('/^\/setup\/api\.php/', $uri)) {
    $_SERVER['SCRIPT_NAME'] = '/setup/api.php';
    $_SERVER['PATH_INFO'] = preg_replace('/^\/setup\/api\.php/', '', $uri);
    require __DIR__ . '/setup/api.php';
    return true;
}

if ($uri === '/setup' || $uri === '/setup/') {
    header('Content-Type: text/html; charset=utf-8');
    require __DIR__ . '/setup/index.php';
    return true;
}

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
        // Conditional caching for static assets (ETag-based revalidation)
        if (in_array($ext, ['js', 'css'])) {
            $etag = '"' . md5_file($realFile) . '"';
            header('Cache-Control: no-cache');
            header('ETag: ' . $etag);
            if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && $_SERVER['HTTP_IF_NONE_MATCH'] === $etag) {
                http_response_code(304);
                return true;
            }
        }
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
