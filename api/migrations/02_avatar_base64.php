<?php
require_once __DIR__ . '/../config.php';

try {
    $db = db();

    // Change avatar_url from VARCHAR to LONGTEXT to support Base64 strings
    $db->exec("ALTER TABLE users MODIFY avatar_url LONGTEXT");

    echo "Migration successful: users.avatar_url is now LONGTEXT.\n";
}
catch (Exception $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
