<?php
require_once __DIR__ . '/../config.php';

if (php_sapi_name() !== 'cli') {
    $isDev = (defined('APP_ENV') && APP_ENV === 'development') || (getenv('APP_ENV') === 'development');
    if (!$isDev) {
        requireAdmin();
    }
}

header('Content-Type: application/json');
header('Cache-Control: no-store');

// Root of the project (two levels up from api/dev/)
$root = realpath(__DIR__ . '/../../');

$extensions = ['php', 'js', 'css', 'html'];
$mtimes = [];

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
    RecursiveIteratorIterator::LEAVES_ONLY
);

foreach ($iterator as $file) {
    // Skip hidden dirs (.git, .vscode, node_modules, vendor, etc.)
    $path = $file->getPathname();
    if (strpos($path, DIRECTORY_SEPARATOR . '.') !== false) continue;
    if (strpos($path, 'node_modules') !== false) continue;
    if (strpos($path, 'vendor') !== false) continue;

    $ext = strtolower($file->getExtension());
    if (!in_array($ext, $extensions, true)) continue;

    $mtimes[] = $file->getMTime() . ':' . $path;
}

sort($mtimes);
$hash = md5(implode('|', $mtimes));

echo json_encode(['hash' => $hash]);
