<?php
/**
 * Migration: Drop full_name_ar column from users table.
 * Run this ONCE after all full_name_ar references have been removed from code.
 * 
 * Usage: php drop_fullname_ar.php
 */
require_once __DIR__ . '/../config.php';

try {
    $cols = db()->query("SHOW COLUMNS FROM users LIKE 'full_name_ar'")->fetchAll();
    if (!empty($cols)) {
        db()->exec("ALTER TABLE users DROP COLUMN full_name_ar");
        echo json_encode(['ok' => true, 'message' => 'Column full_name_ar dropped successfully.']);
    } else {
        echo json_encode(['ok' => true, 'message' => 'Column full_name_ar does not exist (already dropped).']);
    }
} catch (Exception $e) {
    echo json_encode(['ok' => false, 'error' => $e->getMessage()]);
}
