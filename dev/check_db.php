<?php
require_once __DIR__ . '/../api/config.php';
$db = db();

foreach (['users', 'training_courses', 'training_topics', 'training_ideas', 'training_documents'] as $table) {
    echo "\n=== DESCRIBE $table ===\n";
    try {
        $cols = $db->query("DESCRIBE $table")->fetchAll(PDO::FETCH_ASSOC);
        foreach ($cols as $c) {
            echo "{$c['Field']} | {$c['Type']} | {$c['Null']} | {$c['Key']}\n";
        }
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
}
