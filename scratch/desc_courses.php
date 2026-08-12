<?php
require_once __DIR__ . '/../api/config.php';
$stmt = db()->query("DESCRIBE training_courses");
print_r($stmt->fetchAll());
