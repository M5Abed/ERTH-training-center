<?php
// =========================================================
// NMU TRAINING — Search Candidate Trainees for Course Enrollment
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_GET['course_id'] ?? 0);
$q        = trim($_GET['q'] ?? '');
$offset   = max(0, (int)($_GET['offset'] ?? 0));
$limit    = 50;

$db = db();

$where  = "u.role != 'admin' AND (u.approval_status IS NULL OR u.approval_status != 'rejected')";
$params = [];

if ($q !== '') {
    $like = '%' . $q . '%';
    $where .= " AND (u.full_name LIKE ? OR u.student_id LIKE ? OR u.email LIKE ? OR u.username LIKE ? OR CAST(u.id AS CHAR) = ?)";
    $params = [$like, $like, $like, $like, $q];
}

$query = "
    SELECT u.id, u.username, u.full_name, u.email, u.student_id AS academic_id, 
           u.college_key, u.academic_year, u.major, u.avatar_url, u.role,
           CASE WHEN te.id IS NOT NULL THEN 1 ELSE 0 END AS is_enrolled
    FROM users u
    LEFT JOIN trainee_enrollments te ON u.id = te.trainee_id AND te.course_id = ?
    WHERE $where
    ORDER BY 
        is_enrolled ASC,
        u.full_name ASC
    LIMIT $limit OFFSET $offset
";

$stmt = $db->prepare($query);
$stmt->execute(array_merge([$courseId], $params));
$candidates = $stmt->fetchAll();

foreach ($candidates as &$c) {
    $c['is_enrolled'] = (bool)$c['is_enrolled'];
}

respond(['candidates' => $candidates]);
