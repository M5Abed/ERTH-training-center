<?php
/**
 * router.php — Local dev server router
 * Run: php -S localhost:8000 router.php
 * Handles SPA routing + API calls for local development.
 */
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = __DIR__ . $uri;

// Serve API files directly
if (strpos($uri, '/api/') === 0 && file_exists($file)) {
    return false;
}

// Serve actual files (CSS, JS, images, PHP) directly
if ($uri !== '/' && file_exists($file) && !is_dir($file)) {
    return false;
}

// Serve from dist/ if file exists there
$distFile = __DIR__ . '/dist' . $uri;
if (file_exists($distFile) && !is_dir($distFile)) {
    $ext = pathinfo($distFile, PATHINFO_EXTENSION);
    $mimeTypes = [
        'html' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'svg' => 'image/svg+xml',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
    ];
    if (isset($mimeTypes[$ext])) {
        header('Content-Type: ' . $mimeTypes[$ext]);
    }
    readfile($distFile);
    exit;
}

// SPA fallback — serve dist/index.html
$spaIndex = __DIR__ . '/dist/index.html';
if (file_exists($spaIndex)) {
    readfile($spaIndex);
    exit;
}

// 404
http_response_code(404);
echo '<h1>404 - Page Not Found</h1>';
