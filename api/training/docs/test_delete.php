<?php
$_SERVER['HTTP_HOST'] = 'localhost';
$_SERVER['REQUEST_METHOD'] = 'POST';
session_name('thinktank_session');
session_start();
$_SESSION['user_id'] = 5;
$_SESSION['role'] = 'trainee';
$session_id = session_id();
session_write_close();

$ch = curl_init('http://localhost/api/training/docs/delete.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(['id' => 3]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Cookie: thinktank_session=' . $session_id
]);
$result = curl_exec($ch);
curl_close($ch);
echo "Result:\n$result\n";
