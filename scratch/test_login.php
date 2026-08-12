<?php
require_once __DIR__ . '/../api/config.php';

$identifier = 'admin@nmu.edu.eg';
$pass = 'Admin123!';

$stmt = db()->prepare("SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?");
$stmt->execute([$identifier, $identifier]);
$user = $stmt->fetch();

if (!$user) {
    echo "User not found\n";
} else {
    echo "User found: " . $user['email'] . "\n";
    if (password_verify($pass, $user['password_hash'])) {
        echo "Password matches\n";
    } else {
        echo "Password does not match\n";
    }
}
