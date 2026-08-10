<?php
require_once __DIR__ . '/../config.php';
$uid = requireSession();
$stmt = db()->prepare("
    SELECT * FROM notifications WHERE user_id = ?
    ORDER BY created_at DESC LIMIT 50
");
$stmt->execute([$uid]);
respond($stmt->fetchAll());
