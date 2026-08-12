<?php
require_once __DIR__ . '/../config.php';

if (empty($_SESSION['user_id'])) {
    respond(['user' => null, 'session' => null]);
}

$uid  = (int)$_SESSION['user_id'];
$stmt = db()->prepare("
    SELECT id, email, username, full_name_en AS full_name, student_id, college_key,
           academic_year, major, bio, avatar_url, availability, enrolled_courses, is_admin, avg_rating, role, email_verified, created_at
    FROM users WHERE id = ?
");
$stmt->execute([$uid]);
$user = $stmt->fetch();

if (!$user) {
    session_destroy();
    respond(['user' => null, 'session' => null]);
}

$user['enrolled_courses'] = json_decode($user['enrolled_courses'] ?? 'null', true) ?? [];
$user['availability']     = json_decode($user['availability'] ?? 'null', true) ?? new stdClass();

$user = sanitizeUserResponse($user, true); // own session = isSelf
respond(['user' => $user, 'session' => ['user' => $user]]);
