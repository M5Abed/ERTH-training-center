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

$where = $courseId ? "WHERE ti.course_id = $courseId" : "";

$stmt = $db->prepare("
    SELECT 
        ti.id,
        ti.title_en,
        ti.title_ar,
        ti.description_en,
        ti.status,
        ti.course_id,
        tc.name_en AS course_name_en,
        tc.name_ar AS course_name_ar,
        COALESCE(ti.trainee_id, ti.owner_id) AS trainee_id,
        u.full_name_en AS trainee_name,
        u.student_id,
        COALESCE(AVG(tv.rating), 0) AS avg_rating,
        COUNT(tv.id)               AS vote_count,
        ti.created_at
    FROM training_ideas ti
    LEFT JOIN training_votes    tv ON tv.idea_id   = ti.id
    LEFT JOIN training_courses  tc ON tc.id        = ti.course_id
    LEFT JOIN users             u  ON u.id         = COALESCE(ti.trainee_id, ti.owner_id)
    $where
    GROUP BY ti.id
    ORDER BY avg_rating DESC, vote_count DESC, ti.created_at ASC
    LIMIT ?
");
$stmt->execute([$limit]);
$ideas = $stmt->fetchAll();

foreach ($ideas as &$i) {
    $i['avg_rating']  = round((float)$i['avg_rating'], 1);
    $i['vote_count']  = (int)$i['vote_count'];
}
unset($i);

respond(['ideas' => $ideas]);
