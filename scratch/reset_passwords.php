<?php
require_once __DIR__ . '/../api/config.php';

$password = 'Admin123!';
$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = db()->prepare("UPDATE users SET password_hash = ? WHERE username IN ('admin', 'trainer', 'trainee', 'mohamed')");
$stmt->execute([$hash]);

echo "Passwords for admin, trainer, trainee, and mohamed have been reset to: $password\n";
