<?php
require_once __DIR__ . '/../api/config.php';
$stmt = db()->query("DESCRIBE users");
print_r($stmt->fetchAll());
