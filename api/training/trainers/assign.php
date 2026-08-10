<?php
// =========================================================
// NMU TRAINING — Assign Trainer to Course / Topic
// Access: Admin only
// =========================================================

require_once __DIR__ . '/../../config.php';

requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$trainerId = (int)($data['trainer_id'] ?? 0);
$courseId  = (int)($data['course_id'] ?? 0);
$topicId   = isset($data['topic_id']) && $data['topic_id'] ? (int)$data['topic_id'] : null;

if (!$trainerId || !$courseId) {
    respondError('Trainer ID and Course ID are required');
}

$db = db();

// Verify user is a trainer
$tCheck = $db->prepare("SELECT role, is_admin FROM users WHERE id = ?");
$tCheck->execute([$trainerId]);
$tUser = $tCheck->fetch();
if (!$tUser || (!in_array($tUser['role'], ['trainer', 'admin']) && !$tUser['is_admin'])) {
    respondError('User is not a trainer or admin', 400);
}

// Upsert assignment
$stmt = $db->prepare("
    INSERT INTO trainer_assignments (trainer_id, course_id, topic_id)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE trainer_id = VALUES(trainer_id)
");
$stmt->execute([$trainerId, $courseId, $topicId]);

respond([
    'success' => true,
    'message' => 'Trainer assigned successfully'
]);
