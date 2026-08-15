<?php
if (php_sapi_name() !== 'cli') {
    require_once __DIR__ . '/config.php';
    requireRole('admin');
} else {
    require_once __DIR__ . '/config.php';
}

try {
    $db = db();
    echo "Starting Training Platform Migration...\n";

    // 1. Add approval_status column
    try {
        $cols = $db->query("SHOW COLUMNS FROM users LIKE 'approval_status'")->fetchAll();
        if (empty($cols)) {
            $db->exec("ALTER TABLE users ADD COLUMN approval_status ENUM('pending','approved','rejected') DEFAULT 'approved' AFTER department");
            $db->exec("ALTER TABLE users ADD INDEX idx_users_approval (approval_status)");
            echo "Added approval_status column.\n";
        } else {
            echo "approval_status column already exists.\n";
        }
    } catch (Exception $e) {
        echo "Failed approval_status check: " . $e->getMessage() . "\n";
    }

    // 2. Migrate User Roles
    try {
        $db->exec("UPDATE users SET role = 'trainer' WHERE role IN ('ta', 'lecturer', 'professor')");
        $db->exec("UPDATE users SET role = 'trainee' WHERE role = 'student' OR role IS NULL OR role = ''");
        $db->exec("UPDATE users SET role = 'admin' WHERE is_admin = 1");
        echo "Migrated existing user roles to admin / trainer / trainee.\n";
    } catch (Exception $e) {
        echo "Failed role migration: " . $e->getMessage() . "\n";
    }

    // 3. Drop Obsolete Legacy Matching Tables
    $legacyTables = [
        'projects', 'team_members', 'project_applications',
        'project_skills', 'user_skills', 'user_preferences',
        'reviews', 'project_tasks', 'project_messages', 'activity_log'
    ];

    foreach ($legacyTables as $tbl) {
        try {
            $db->exec("DROP TABLE IF EXISTS `$tbl`");
            echo "Dropped legacy table `$tbl` if existed.\n";
        } catch (Exception $e) {
            echo "Could not drop table `$tbl`: " . $e->getMessage() . "\n";
        }
    }

    // 4. Import New Training Tables Schema
    $trainingSchema = __DIR__ . '/../db_dump/002_training_schema.sql';
    if (file_exists($trainingSchema)) {
        $sql = file_get_contents($trainingSchema);
        if (!empty($sql)) {
            $db->exec($sql);
            echo "Successfully loaded training schema (002_training_schema.sql).\n";
        }
    }

    echo "Training Platform Migration Completed Successfully!\n";
}
catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
