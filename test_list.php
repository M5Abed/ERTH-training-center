<?php
// End-to-End Test for list.php
$loginUrl = 'http://localhost/api/auth/login.php';
$listUrl = 'http://localhost/api/training/ideas/list.php';
$cookieFile = '/tmp/cookie.txt';

// 1. Login to get a session
$loginData = json_encode(['email' => 'trainee@nmu.edu.eg', 'password' => 'password123']);
$ch = curl_init($loginUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $loginData);
curl_setopt($ch, CURLOPT_COOKIEJAR, $cookieFile);
$loginResp = curl_exec($ch);
curl_close($ch);
echo "Login Response: $loginResp\n";

// 2. Fetch Ideas List
$ch2 = curl_init($listUrl);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_COOKIEFILE, $cookieFile);
$listResp = curl_exec($ch2);
$httpCode = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);
echo "List HTTP Code: $httpCode\n";
echo "List Response: $listResp\n";
