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
$courseId = isset($_GET['course_id']) && $_GET['course_id'] !== '' ? (int)$_GET['course_id'] : null;
$search   = sanitizeString($_GET['search'] ?? '');
$page     = max(1, (int)($_GET['page'] ?? 1));
$perPage  = 50;
$offset   = ($page - 1) * $perPage;

$where  = "WHERE 1=1";
$params = [];

if ($courseId) {
    $where   .= " AND u.id IN (SELECT trainee_id FROM trainee_enrollments WHERE course_id = ?)";
    $params[] = $courseId;
}
if ($search) {
    $where   .= " AND (u.full_name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)";
    $like     = "%$search%";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

// Total distinct trainees count
$countStmt = $db->prepare("
    SELECT COUNT(DISTINCT u.id) 
    FROM trainee_enrollments te
    JOIN users u ON u.id = te.trainee_id
    $where
");
$countStmt->execute($params);
$total = (int)$countStmt->fetchColumn();

// Paginated distinct trainees results
$stmt = $db->prepare("
    SELECT
        u.id                AS trainee_id,
        u.full_name,
        u.email,
        u.student_id,
        u.avatar_url,
        MIN(te.enrolled_at) AS enrolled_at,
        GROUP_CONCAT(DISTINCT CONCAT(tc.id, ':::', tc.name) SEPARATOR '|||') AS courses_raw,
        (SELECT COUNT(*) FROM training_ideas ti WHERE ti.owner_id = u.id) AS idea_count,
        (SELECT COUNT(*) FROM trainee_topic_progress ttp WHERE ttp.trainee_id = u.id) AS topics_viewed
    FROM users u
    JOIN trainee_enrollments te ON te.trainee_id = u.id
    JOIN training_courses tc ON tc.id = te.course_id
    $where
    GROUP BY u.id
    ORDER BY u.full_name ASC
    LIMIT $perPage OFFSET $offset
");
$stmt->execute($params);
$rawTrainees = $stmt->fetchAll(PDO::FETCH_ASSOC);

$trainees = [];
foreach ($rawTrainees as $row) {
    $coursesList = [];
    if (!empty($row['courses_raw'])) {
        $pairs = explode('|||', $row['courses_raw']);
        foreach ($pairs as $p) {
            $parts = explode(':::', $p, 2);
            if (count($parts) === 2) {
                $coursesList[] = [
                    'id'   => (int)$parts[0],
                    'name' => $parts[1]
                ];
            }
        }
    }

    $firstCourseName = !empty($coursesList) ? $coursesList[0]['name'] : '';

    $trainees[] = [
        'enrollment_id' => (int)$row['trainee_id'],
        'trainee_id'    => (int)$row['trainee_id'],
        'full_name'     => $row['full_name'],
        'email'         => $row['email'],
        'student_id'    => $row['student_id'],
        'avatar_url'    => $row['avatar_url'],
        'enrolled_at'   => $row['enrolled_at'],
        'courses'       => $coursesList,
        'course_name'   => $firstCourseName,
        'idea_count'    => (int)$row['idea_count'],
        'topics_viewed' => (int)$row['topics_viewed']
    ];
}

respond([
    'trainees' => $trainees,
    'total'    => $total,
    'page'     => $page,
    'per_page' => $perPage,
]);
