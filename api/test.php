<?php
require __DIR__ . '/config.php';

$q = ''; // empty string
$stmt = db()->prepare("
    SELECT id, email, full_name, username, role, avatar_url, department
    FROM users 
    WHERE role IN ('trainer', 'admin') 
      AND (full_name LIKE ? OR email LIKE ? OR username LIKE ?)
    LIMIT 20
");
$searchMatch = "%{$q}%";
$stmt->execute([$searchMatch, $searchMatch, $searchMatch]);
$results = $stmt->fetchAll();
print_r($results);
