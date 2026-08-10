<?php
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_METHOD'] = 'GET';
session_name('thinktank_session');
session_start();
$_SESSION['user_id'] = 5;
$_GET['course_id'] = '1';
ob_start();
require '/var/www/html/api/training/docs/list.php';
echo ob_get_clean();
