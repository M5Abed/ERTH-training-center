<?php
require "config.php";
$db = db();
$stmt = $db->query("SHOW COLUMNS FROM training_courses");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
?>
