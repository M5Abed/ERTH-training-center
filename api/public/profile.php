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
    SELECT u.*,
           (SELECT JSON_ARRAYAGG(
               JSON_OBJECT('skill_id', us.skill_id, 'proficiency', us.proficiency)
           ) FROM user_skills us WHERE us.user_id = u.id) AS user_skills
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

// 2. Fetch completed projects where this user was a team member or owner
$projStmt = db()->prepare("
    SELECT p.id, p.title, p.title_en, p.title_ar, p.status, p.description, p.description_en, p.description_ar
    FROM projects p
    WHERE p.status = 'completed'
      AND (
        p.owner_id = ?
        OR EXISTS (
            SELECT 1 FROM team_members tm WHERE tm.project_id = p.id AND tm.user_id = ?
        )
      )
    ORDER BY p.updated_at DESC
");
$projStmt->execute([$userId, $userId]);
$user['completed_projects'] = $projStmt->fetchAll();

// Ensure project titles/descriptions fallbacks
foreach ($user['completed_projects'] as &$p) {
    if (empty($p['title'])) $p['title'] = !empty($p['title_en']) ? $p['title_en'] : $p['title_ar'];
    if (empty($p['description'])) $p['description'] = !empty($p['description_en']) ? $p['description_en'] : $p['description_ar'];
}

// 3. Fetch aggregate reviews
$reviewStmt = db()->prepare("
    SELECT 
        COUNT(*) as review_count,
        AVG(rating) as avg_rating,
        AVG(commitment_rating) as avg_commitment,
        AVG(quality_rating) as avg_quality,
        AVG(collaboration_rating) as avg_collaboration
    FROM reviews
    WHERE target_user_id = ?
");
$reviewStmt->execute([$userId]);
$reviewStats = $reviewStmt->fetch();

if ($reviewStats && $reviewStats['review_count'] > 0) {
    $user['reputation'] = [
        'count' => (int)$reviewStats['review_count'],
        'overall' => round((float)$reviewStats['avg_rating'], 1),
        'commitment' => round((float)$reviewStats['avg_commitment'], 1),
        'quality' => round((float)$reviewStats['avg_quality'], 1),
        'collaboration' => round((float)$reviewStats['avg_collaboration'], 1)
    ];
} else {
    $user['reputation'] = null;
}

respond($user);
