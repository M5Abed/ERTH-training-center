<?php
// =========================================================
// NMU ERTH — UUID Migration & Column Backfilling
// =========================================================

require_once __DIR__ . '/../api/config.php';

$db = db();

echo "Starting UUID Migration across database tables...\n";

// Cryptographic UUID v4 generator
function genUuid(): string {
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40); // version 4
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80); // variant RFC 4122
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

$tables = [
    'users'               => 'id',
    'training_courses'    => 'id',
    'training_ideas'      => 'id',
    'trainee_enrollments' => 'id',
    'training_topics'     => 'id'
];

foreach ($tables as $table => $idCol) {
    echo "\nProcessing table: `$table`...\n";
    try {
        $cols = $db->query("SHOW COLUMNS FROM `$table`")->fetchAll(PDO::FETCH_COLUMN);
        if (!in_array('uuid', $cols, true)) {
            $db->exec("ALTER TABLE `$table` ADD COLUMN uuid CHAR(36) NULL AFTER `$idCol`");
            echo "  + Added `uuid` column to `$table`\n";
        }

        // Backfill rows without UUID
        $rows = $db->query("SELECT `$idCol` FROM `$table` WHERE uuid IS NULL OR uuid = ''")->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($rows)) {
            $update = $db->prepare("UPDATE `$table` SET uuid = ? WHERE `$idCol` = ?");
            foreach ($rows as $rowId) {
                $u = genUuid();
                $update->execute([$u, $rowId]);
            }
            echo "  ✓ Backfilled " . count($rows) . " rows with UUIDs in `$table`\n";
        } else {
            echo "  ✓ All rows already have UUIDs in `$table`\n";
        }

        // Ensure NOT NULL and UNIQUE index
        try {
            $db->exec("ALTER TABLE `$table` MODIFY COLUMN uuid CHAR(36) NOT NULL");
        } catch (Throwable $e) {}

        try {
            $db->exec("ALTER TABLE `$table` ADD UNIQUE INDEX idx_{$table}_uuid (uuid)");
            echo "  ✓ Added UNIQUE index on `$table`.`uuid`\n";
        } catch (Throwable $e) {
            // Index already exists
        }

    } catch (Throwable $e) {
        echo "  ✗ Error processing table `$table`: " . $e->getMessage() . "\n";
    }
}

echo "\n=== UUID Migration Complete ===\n";
