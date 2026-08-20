<?php
// Deployment Diagnostic — Upload to public_html/ and visit yourdomain.com/check_deploy.php
// DELETE THIS FILE AFTER CHECKING!

header('Content-Type: text/html; charset=utf-8');
$root = __DIR__;

echo "<h2>🔍 Deployment File Check</h2>";
echo "<p><b>Document Root:</b> " . htmlspecialchars($root) . "</p>";
echo "<hr>";

// Check key files
$checks = [
    '.htaccess'              => 'Apache/LiteSpeed routing',
    '.env'                   => 'Database & SMTP credentials',
    'dist/index.html'        => 'Frontend entry (inside dist/)',
    'dist/assets'            => 'Frontend JS/CSS bundles (inside dist/)',
    'index.html'             => 'Frontend entry (root level)',
    'assets'                 => 'Frontend JS/CSS bundles (root level)',
    'api/config.php'         => 'Backend API config',
    'api/auth/login.php'     => 'Login endpoint',
    'api/auth/session.php'   => 'Session endpoint',
];

echo "<table border='1' cellpadding='8' style='border-collapse:collapse; font-family:monospace;'>";
echo "<tr style='background:#f0f0f0;'><th>Path</th><th>Exists?</th><th>Type</th><th>Size / Details</th></tr>";

foreach ($checks as $path => $desc) {
    $full = $root . '/' . $path;
    $exists = file_exists($full);
    $type = is_dir($full) ? 'DIR' : (is_file($full) ? 'FILE' : '-');
    $size = $exists && is_file($full) ? number_format(filesize($full)) . ' bytes' : '';
    if ($exists && is_dir($full)) {
        $count = count(glob($full . '/*'));
        $size = "$count items inside";
    }
    $color = $exists ? '#d4edda' : '#f8d7da';
    $icon = $exists ? '✅' : '❌';
    echo "<tr style='background:$color;'>";
    echo "<td>$path <br><small style='color:#666;'>$desc</small></td>";
    echo "<td>$icon</td><td>$type</td><td>$size</td>";
    echo "</tr>";
}
echo "</table>";

// Show which index.html is being used
echo "<hr><h3>📄 Which index.html will Apache serve?</h3>";
if (file_exists($root . '/dist/index.html')) {
    echo "<p>✅ <b>dist/index.html</b> exists — .htaccess will serve this.</p>";
    echo "<pre style='background:#f5f5f5; padding:10px; max-height:300px; overflow:auto;'>";
    echo htmlspecialchars(file_get_contents($root . '/dist/index.html'));
    echo "</pre>";
} elseif (file_exists($root . '/index.html')) {
    echo "<p>✅ <b>index.html</b> (root) exists — .htaccess will serve this.</p>";
    echo "<pre style='background:#f5f5f5; padding:10px; max-height:300px; overflow:auto;'>";
    echo htmlspecialchars(file_get_contents($root . '/index.html'));
    echo "</pre>";
} else {
    echo "<p>❌ <b>No index.html found!</b> — The site has no frontend entry point.</p>";
}

// Show JS bundle filenames
echo "<hr><h3>📦 JS Bundles in assets/</h3>";
$assetDirs = [];
if (is_dir($root . '/dist/assets')) $assetDirs['dist/assets/'] = $root . '/dist/assets';
if (is_dir($root . '/assets')) $assetDirs['assets/'] = $root . '/assets';

foreach ($assetDirs as $label => $dir) {
    echo "<h4>$label</h4>";
    $jsFiles = glob($dir . '/*.js');
    if (empty($jsFiles)) {
        echo "<p>❌ No .js files found</p>";
    } else {
        echo "<ul>";
        foreach (array_slice($jsFiles, -10) as $f) {
            $name = basename($f);
            $sz = number_format(filesize($f));
            $time = date('Y-m-d H:i:s', filemtime($f));
            echo "<li><code>$name</code> — $sz bytes — modified: $time</li>";
        }
        echo "</ul>";
    }
}

echo "<hr><p style='color:red;'><b>⚠️ DELETE this file (check_deploy.php) after checking!</b></p>";
