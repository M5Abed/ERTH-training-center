<?php
if (php_sapi_name() !== 'cli') {
    require "api/config.php";
    requireRole('admin');
} else {
    require "api/config.php";
}
$db = db();
$queries = [
    "ALTER TABLE users CHANGE full_name_en full_name VARCHAR(255) NULL;",
    "ALTER TABLE users DROP COLUMN full_name_ar;",
    "ALTER TABLE training_courses CHANGE name_en name VARCHAR(255) NOT NULL, DROP COLUMN name_ar, CHANGE description_en description TEXT NULL, DROP COLUMN description_ar;",
    "ALTER TABLE training_topics CHANGE title_en title VARCHAR(255) NOT NULL, DROP COLUMN title_ar, CHANGE description_en description TEXT NULL, DROP COLUMN description_ar;",
    "ALTER TABLE topic_content CHANGE title_en title VARCHAR(255) NULL, DROP COLUMN title_ar;",
    "ALTER TABLE training_ideas CHANGE title_en title VARCHAR(255) NOT NULL, DROP COLUMN title_ar, CHANGE description_en description TEXT NULL, DROP COLUMN description_ar;",
    "ALTER TABLE training_documents CHANGE title_en title VARCHAR(255) NULL;",
    "ALTER TABLE training_documents DROP COLUMN title_ar;"
];
foreach ($queries as $q) {
    try {
        $db->exec($q);
        echo "Success: $q\n";
    } catch (Exception $e) {
        $msg = $e->getMessage();
        // Ignore errors if column doesn't exist (already dropped/renamed)
        if (strpos($msg, 'Column not found') !== false || strpos($msg, 'Can\'t DROP') !== false || strpos($msg, 'check that column/key exists') !== false) {
            echo "Skipped (already applied): $q\n";
        } else {
            echo "Error: " . $msg . "\n";
        }
    }
}
?>
