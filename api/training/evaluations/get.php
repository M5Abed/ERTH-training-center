<?php
// =========================================================
// NMU TRAINING — Get Trainee Evaluation Detail
// Access: Trainee (own), Trainer, Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int)$user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isAdmin = (bool)($user['is_admin'] || $role === 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId  = (int)($_GET['course_id'] ?? 0);
$traineeId = isset($_GET['trainee_id']) ? (int)$_GET['trainee_id'] : $uid;

if (!$courseId) {
    respondError('Course ID is required');
}

if ($role === 'trainee' && !$isAdmin && $traineeId !== $uid) {
    respondError('Forbidden: You can only view your own evaluation', 403);
}

$db = db();
$stmt = $db->prepare("
    SELECT te.*, 
           u.full_name AS trainee_name, u.email AS trainee_email, u.student_id,
           ev.full_name AS evaluator_name
    FROM training_evaluations te
    JOIN users u ON te.trainee_id = u.id
    LEFT JOIN users ev ON te.evaluator_id = ev.id
    WHERE te.course_id = ? AND te.trainee_id = ?
");
$stmt->execute([$courseId, $traineeId]);
$eval = $stmt->fetch();

respond(['evaluation' => $eval ?: null]);
