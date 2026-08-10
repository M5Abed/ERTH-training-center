<?php
// =========================================================
// NMU TRAINING — Get Course Detail
// Access: All authenticated users
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int)$user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isAdmin = (bool)($user['is_admin'] || $role === 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_GET['id'] ?? 0);
if (!$courseId) {
    respondError('Course ID is required');
}

$db = db();

// Fetch course details
$stmt = $db->prepare("
    SELECT tc.*, u.full_name_en AS creator_name
    FROM training_courses tc
    LEFT JOIN users u ON tc.created_by = u.id
    WHERE tc.id = ?
");
$stmt->execute([$courseId]);
$course = $stmt->fetch();

if (!$course) {
    respondError('Course not found', 404);
}

// Access check for trainees: must be enrolled
if ($role === 'trainee' && !$isAdmin) {
    $enr = $db->prepare("SELECT id FROM trainee_enrollments WHERE trainee_id = ? AND course_id = ?");
    $enr->execute([$uid, $courseId]);
    if (!$enr->fetch()) {
        respondError('Forbidden: Not enrolled in this course', 403);
    }
}

// Fetch topics ordered by order_index
$topStmt = $db->prepare("
    SELECT tt.*,
           (SELECT COUNT(*) FROM topic_content WHERE topic_id = tt.id) AS total_materials,
           (SELECT COUNT(*) FROM trainee_topic_progress WHERE topic_id = tt.id AND trainee_id = ?) AS is_completed
    FROM training_topics tt
    WHERE tt.course_id = ?
    ORDER BY tt.order_index ASC, tt.id ASC
");
$topStmt->execute([$uid, $courseId]);
$topics = $topStmt->fetchAll();

// Fetch assigned trainers
$trStmt = $db->prepare("
    SELECT ta.id AS assignment_id, ta.topic_id, u.id AS trainer_id, u.full_name_en, u.email, u.department
    FROM trainer_assignments ta
    JOIN users u ON ta.trainer_id = u.id
    WHERE ta.course_id = ?
");
$trStmt->execute([$courseId]);
$trainers = $trStmt->fetchAll();

// Fetch summary metrics
$traineeCount = $db->prepare("SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = ?");
$traineeCount->execute([$courseId]);

respond([
    'course' => $course,
    'topics' => $topics,
    'trainers' => $trainers,
    'total_trainees' => (int)$traineeCount->fetchColumn()
]);
