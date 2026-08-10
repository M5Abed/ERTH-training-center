<?php
// =========================================================
// NMU TRAINING — Delete Course
// Access: Admin only
// =========================================================

require_once __DIR__ . '/../../config.php';

requireRole('admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId = (int)($data['id'] ?? 0);

if (!$courseId) {
    respondError('Course ID is required');
}

$db = db();
$stmt = $db->prepare("DELETE FROM training_courses WHERE id = ?");
$stmt->execute([$courseId]);

respond([
    'success' => true,
    'message' => 'Course deleted successfully'
]);
