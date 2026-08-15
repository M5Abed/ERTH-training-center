<?php
require '/var/www/html/api/training/ideas/catalog_64_data.php';
$c = getCatalog64();
$cats = [];
foreach($c as $p) {
    $cats[$p['category']][] = $p['id'] . ': ' . $p['title'];
}
foreach($cats as $cat => $titles) {
    echo strtoupper($cat) . ' (' . count($titles) . "):\n";
    foreach($titles as $t) echo '  ' . $t . "\n";
}
echo "\nTotal: " . count($c) . " projects\n";
// Verify last project
$last = $c[count($c)-1];
echo "\nLast project: #{$last['id']} {$last['title']} [{$last['category']}]\n";
echo "Sections: " . implode(', ', array_keys($last['sections'])) . "\n";
echo "Abstract preview: " . substr($last['sections']['abstract'] ?? '', 0, 100) . "...\n";
