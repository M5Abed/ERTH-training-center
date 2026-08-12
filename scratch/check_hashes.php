<?php
require_once __DIR__ . '/../api/config.php';

$stmt = db()->query("SELECT id, username, email, password_hash FROM users");
$users = $stmt->fetchAll();

foreach ($users as $u) {
    echo $u['email'] . " | " . (password_verify('Admin123!', $u['password_hash']) ? "MATCH" : "MISMATCH") . "\n";
}
