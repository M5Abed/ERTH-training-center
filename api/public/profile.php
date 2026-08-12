<?php
/**
 * GET /api/public/profile.php?id=X
 * Returns a safe, public subset of a user's profile for the CV/Public view.
 * No authentication required.
 */
require_once __DIR__ . '/../config.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'GET') {
    respondError('Method not allowed', 405);
}

$reqId = isset($_GET['id']) ? trim($_GET['id']) : null;
if (!$reqId) {
    respondError('No user specified', 400);
}

// 1. Fetch user data (safe fields only)
$stmt = db()->prepare("
    SELECT u.*
    FROM users u
    WHERE (u.student_id = ? OR u.id = ?)
");
$stmt->execute([$reqId, $reqId]);
$user = $stmt->fetch();

if (!$user) {
    respondError('User not found', 404);
}

// Ensure full_name is consistent
if (empty($user['full_name']) && !empty($user['full_name_en'])) {
    $user['full_name'] = $user['full_name_en'];
}

$user['user_skills'] = json_decode($user['user_skills'] ?? 'null', true) ?? [];
$userId = (int)$user['id'];

// Remove sensitive fields
unset($user['password_hash'], $user['email'], $user['student_id'], $user['availability'], $user['user_preferences'], $user['enrolled_courses']);

$user['reputation'] = null;
$user['completed_projects'] = [];

respond($user);
