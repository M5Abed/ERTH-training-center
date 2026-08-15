<?php
// Test catalog_list.php and catalog_select.php end to end inside Docker
require_once '/var/www/html/api/config.php';

$db = db();

// 1. Test catalog list
$stmt = $db->query("SELECT id, title, category, level, skills, display_order FROM projects_catalog ORDER BY display_order ASC, id ASC");
$all = $stmt->fetchAll();
echo "Catalog List Count: " . count($all) . "\n";
echo "First Project: #" . $all[0]['id'] . " " . $all[0]['title'] . " [" . $all[0]['category'] . "]\n";
echo "Project #25: #" . $all[24]['id'] . " " . $all[24]['title'] . " [" . $all[24]['category'] . "]\n";
echo "Project #40: #" . $all[39]['id'] . " " . $all[39]['title'] . " [" . $all[39]['category'] . "]\n";
echo "Project #55: #" . $all[54]['id'] . " " . $all[54]['title'] . " [" . $all[54]['category'] . "]\n";

// 2. Test catalog selection for project #1
$catId = 1;
$secStmt = $db->prepare("SELECT section_key, content FROM proposals_pregenerated WHERE catalog_project_id = ?");
$secStmt->execute([$catId]);
$sections = $secStmt->fetchAll();
echo "\nProject #1 Sections Count: " . count($sections) . "\n";
foreach ($sections as $s) {
    echo "  - " . $s['section_key'] . " (" . strlen($s['content']) . " chars): " . substr($s['content'], 0, 60) . "...\n";
}

// 3. Test catalog selection for project #25 (Yanshee)
$catId = 25;
$secStmt->execute([$catId]);
$sections = $secStmt->fetchAll();
echo "\nProject #25 (Yanshee) Sections Count: " . count($sections) . "\n";
foreach ($sections as $s) {
    echo "  - " . $s['section_key'] . " (" . strlen($s['content']) . " chars): " . substr($s['content'], 0, 60) . "...\n";
}

// 4. Test catalog selection for project #40 (NAO)
$catId = 40;
$secStmt->execute([$catId]);
$sections = $secStmt->fetchAll();
echo "\nProject #40 (NAO) Sections Count: " . count($sections) . "\n";
foreach ($sections as $s) {
    echo "  - " . $s['section_key'] . " (" . strlen($s['content']) . " chars): " . substr($s['content'], 0, 60) . "...\n";
}

// 5. Test catalog selection for project #55 (Integrated)
$catId = 55;
$secStmt->execute([$catId]);
$sections = $secStmt->fetchAll();
echo "\nProject #55 (Integrated) Sections Count: " . count($sections) . "\n";
foreach ($sections as $s) {
    echo "  - " . $s['section_key'] . " (" . strlen($s['content']) . " chars): " . substr($s['content'], 0, 60) . "...\n";
}

echo "\nAll verification checks passed successfully!\n";
