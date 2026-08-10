<?php
// =========================================================
// NMU TRAINING — List All Trainees (Admin/Trainer view)
// Access: Admin or Trainer
// =========================================================

require_once __DIR__ . '/../../config.php';

requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$db       = db();
$courseId = isset($_GET['course_id']) ? (int)$_GET['course_id'] : null;
$search   = sanitizeString($_GET['search'] ?? '');
$page     = max(1, (int)($_GET['page'] ?? 1));
$perPage  = 50;
$offset   = ($page - 1) * $perPage;

$where  = "WHERE 1=1";
$params = [];

if ($courseId) {
    $where   .= " AND te.course_id = ?";
    $params[] = $courseId;
}
if ($search) {
    $where   .= " AND (u.full_name_en LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)";
    $like     = "%$search%";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

// Total count
$countStmt = $db->prepare("
    SELECT COUNT(*) FROM trainee_enrollments te
    JOIN users u ON u.id = te.trainee_id
    $where
");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

// Paginated results
$stmt = $db->prepare("
    SELECT
        te.id            AS enrollment_id,
        te.trainee_id,
        te.course_id,
        te.source,
        te.enrolled_at,
        u.full_name_en,
        u.email,
        u.student_id,
        u.avatar_url,
        tc.name_en       AS course_name_en,
        tc.name_ar       AS course_name_ar,
        (SELECT COUNT(*) FROM training_ideas ti
            WHERE ti.course_id = te.course_id
              AND COALESCE(ti.trainee_id, ti.owner_id) = te.trainee_id
        ) AS idea_count,
        (SELECT COUNT(*) FROM trainee_topic_progress ttp
            JOIN training_topics tt ON tt.id = ttp.topic_id
            WHERE ttp.trainee_id = te.trainee_id
              AND tt.course_id   = te.course_id
        ) AS topics_viewed
    FROM trainee_enrollments te
    JOIN users u ON u.id = te.trainee_id
    JOIN training_courses tc ON tc.id = te.course_id
    $where
    ORDER BY tc.name_en, u.full_name_en
    LIMIT $perPage OFFSET $offset
");
$stmt->execute($params);
$trainees = $stmt->fetchAll();

respond([
    'trainees' => $trainees,
    'total'    => $total,
    'page'     => $page,
    'per_page' => $perPage,
]);
