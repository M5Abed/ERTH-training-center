<?php
// =========================================================
// NMU TRAINING — List All Evaluations for Course
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$db = db();
$courseId = resolveCourseId($_GET['course_id'] ?? 0);
if (!$courseId) {
    $courseId = (int)$db->query("SELECT id FROM training_courses WHERE status != 'archived' ORDER BY id ASC LIMIT 1")->fetchColumn();
}

if (!$courseId) {
    respond(['evaluations' => []]);
    exit;
}
$stmt = $db->prepare("
    SELECT te.*, 
           u.full_name AS trainee_name, u.email AS trainee_email, u.student_id,
           ev.full_name AS evaluator_name
    FROM training_evaluations te
    JOIN users u ON te.trainee_id = u.id
    LEFT JOIN users ev ON te.evaluator_id = ev.id
    WHERE te.course_id = ?
    ORDER BY u.full_name ASC
");
$stmt->execute([$courseId]);
$evaluations = $stmt->fetchAll();

foreach ($evaluations as &$ev) {
    if (!empty($ev['trainee_id']) && is_numeric($ev['trainee_id'])) {
        $ev['trainee_id'] = getUserUuid((int)$ev['trainee_id']);
    }
    if (!empty($ev['course_id']) && is_numeric($ev['course_id'])) {
        $ev['course_id'] = getCourseUuid((int)$ev['course_id']);
    }
}
unset($ev);

respond(['evaluations' => $evaluations]);

