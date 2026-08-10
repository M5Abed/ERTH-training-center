<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SESSION['user_id'] = 4; // trainee id
$_SESSION['csrf_token'] = 'test';

require_once '/var/www/html/api/config.php';
require_once '/var/www/html/api/ai/ai_engine.php';

$res = callAI(4, 'proposal', ['keywords' => 'Smart Attendance System', 'domain' => 'Software Engineering']);
print_r($res);
