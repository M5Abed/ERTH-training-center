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

$courseId = (int)($_GET['course_id'] ?? 0);
if (!$courseId) {
    respondError('Course ID is required');
}

$db = db();
$stmt = $db->prepare("
    SELECT te.*, 
           u.full_name_en AS trainee_name, u.email AS trainee_email, u.student_id,
           ev.full_name_en AS evaluator_name
    FROM training_evaluations te
    JOIN users u ON te.trainee_id = u.id
    LEFT JOIN users ev ON te.evaluator_id = ev.id
    WHERE te.course_id = ?
    ORDER BY u.full_name_en ASC
");
$stmt->execute([$courseId]);
$evaluations = $stmt->fetchAll();

respond(['evaluations' => $evaluations]);
