<?php
// =========================================================
// NMU TRAINING — List Votes / Leaderboard
// Access: All authenticated users
// =========================================================

require_once __DIR__ . '/../../config.php';

requireRole(['trainee', 'trainer', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = isset($_GET['course_id']) ? (int)$_GET['course_id'] : null;
$limit    = min((int)($_GET['limit'] ?? 50), 100);

$db = db();

$where = "";
$params = [];
if ($courseId) {
    $where = "WHERE ti.course_id = ?";
    $params[] = $courseId;
}
$params[] = $limit;

$stmt = $db->prepare("
    SELECT 
        ti.id,
        ti.title,
        ti.description,
        ti.status,
        ti.course_id,
        tc.name AS course_name,
        ti.owner_id AS trainee_id,
        u.full_name AS trainee_name,
        u.student_id,
        COALESCE(AVG(tv.rating), 0) AS avg_rating,
        COUNT(tv.id)               AS vote_count,
        ti.created_at
    FROM training_ideas ti
    LEFT JOIN training_votes    tv ON tv.idea_id   = ti.id
    LEFT JOIN training_courses  tc ON tc.id        = ti.course_id
    LEFT JOIN users             u  ON u.id         = ti.owner_id
    $where
    GROUP BY ti.id, ti.title, ti.description, ti.status, ti.course_id, tc.name, ti.owner_id, u.full_name, u.student_id, ti.created_at
    ORDER BY avg_rating DESC, vote_count DESC, ti.created_at ASC
    LIMIT ?
");
$stmt->execute($params);
$ideas = $stmt->fetchAll();

foreach ($ideas as &$i) {
    $i['avg_rating']  = round((float)$i['avg_rating'], 1);
    $i['vote_count']  = (int)$i['vote_count'];
}
unset($i);

respond(['ideas' => $ideas]);
