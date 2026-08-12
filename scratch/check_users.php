<?php
require_once __DIR__ . '/../api/config.php';

$stmt = db()->query("SELECT id, username, email, role, is_admin, approval_status, email_verified FROM users");
$users = $stmt->fetchAll();

print_r($users);
