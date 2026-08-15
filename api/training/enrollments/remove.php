<?php
// =========================================================
// NMU TRAINING — Remove Trainee Enrollment
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$caller = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId  = (int)($data['course_id'] ?? 0);
$traineeId = (int)($data['trainee_id'] ?? 0);

if (!$courseId || !$traineeId) {
    respondError('Course ID and Trainee ID are required');
}

// Enforce course assignment verification
verifyCourseAccess($courseId, $caller);

$db = db();
$stmt = $db->prepare("DELETE FROM trainee_enrollments WHERE course_id = ? AND trainee_id = ?");
$stmt->execute([$courseId, $traineeId]);

respond([
    'success' => true,
    'message' => 'Trainee un-enrolled from course'
]);
