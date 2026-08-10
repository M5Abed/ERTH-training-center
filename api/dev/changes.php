<?php
/**
 * api/dev/changes.php — File-watcher endpoint for dev-reload.js
 * Returns a hash of all recent file modification times so the
 * browser client can detect changes and auto-reload.
 *
 * DEVELOPMENT ONLY — not exposed in production (no auth needed;
 * it reveals no sensitive data, just a hash).
 */
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
