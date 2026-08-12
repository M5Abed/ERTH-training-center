<?php
// =========================================================
// NMU TRAINING — List Course Trainer Assignments
// Access: All authenticated users
// =========================================================

require_once __DIR__ . '/../../config.php';

requireRole(['trainee', 'trainer', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_GET['course_id'] ?? 0);
if (!$courseId) {
    respondError('Course ID is required');
}

$db = db();
$stmt = $db->prepare("
    SELECT ta.id AS assignment_id, ta.topic_id, u.id AS trainer_id, u.full_name, u.email, u.department, tt.title AS topic_title
    FROM trainer_assignments ta
    JOIN users u ON ta.trainer_id = u.id
    LEFT JOIN training_topics tt ON ta.topic_id = tt.id
    WHERE ta.course_id = ?
");
$stmt->execute([$courseId]);
$assignments = $stmt->fetchAll();

respond(['assignments' => $assignments]);
