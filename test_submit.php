<?php
// End-to-End Test for submit.php
$loginUrl = 'http://localhost/api/auth/login.php';
$submitUrl = 'http://localhost/api/training/ideas/submit.php';
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

// 2. Submit Idea
$submitData = json_encode([
    'course_id' => 1,
    'title_en' => 'Smart System for Smart Attendance System',
    'title_ar' => 'نظام الحضور الذكي',
    'description_en' => 'This university summer training project focuses on building a full-stack web application tailored for Smart Attendance System.',
    'tech_stack' => 'React.js / Vite, PHP 8, MySQL 8.0',
    'problem_statement' => 'Current manual processes lack real-time visibility.',
    'expected_output' => "1. Web App\n2. ERD"
]);
$ch2 = curl_init($submitUrl);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_POST, true);
curl_setopt($ch2, CURLOPT_POSTFIELDS, $submitData);
curl_setopt($ch2, CURLOPT_COOKIEFILE, $cookieFile);
$submitResp = curl_exec($ch2);
$httpCode = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);
echo "Submit HTTP Code: $httpCode\n";
echo "Submit Response: $submitResp\n";
