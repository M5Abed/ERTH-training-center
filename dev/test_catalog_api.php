<?php
// Test catalog_list.php
$db = new PDO('mysql:host=erth_training_db;dbname=nmu_thinktank;charset=utf8mb4', 'erth_user', 'change_me_in_production');
$stmt = $db->query("SELECT * FROM sessions LIMIT 1");
$sess = $stmt->fetch(PDO::FETCH_ASSOC);
if ($sess) {
    echo "Found session for user_id: " . $sess['user_id'] . "\n";
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $_COOKIE['session_token'] = $sess['token'];
    $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer ' . $sess['token'];
    require '/var/www/html/api/training/ideas/catalog_list.php';
} else {
    echo "No session in DB\n";
}
