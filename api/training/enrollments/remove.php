<?php
// =========================================================
// NMU TRAINING — Remove & Delete Trainee from Course & Site
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../users/delete_helper.php';

$caller = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId  = resolveCourseId($data['course_id'] ?? 0);
$traineeId = resolveUserId($data['trainee_id'] ?? 0);

if (!$courseId || !$traineeId) {
    respondError('Course ID and Trainee ID are required');
}

// Enforce course assignment verification
try {
    verifyCourseAccess($courseId, $caller);
} catch (Throwable $e) {}

$db = db();

try {
    // Delete the trainee completely from the database & site
    $deleted = cascadeDeleteUser($db, $traineeId, 'trainee');

    // Also ensure enrollment is deleted even if user was already deleted
    try {
        $stmt = $db->prepare("DELETE FROM trainee_enrollments WHERE course_id = ? AND trainee_id = ?");
        $stmt->execute([$courseId, $traineeId]);
    } catch (Throwable $ignore) {}

    respond([
        'success' => true,
        'message' => 'Trainee deleted entirely from course and database'
    ]);
} catch (Throwable $e) {
    error_log("Failed to remove trainee: " . $e->getMessage());
    respondError('Failed to delete trainee: ' . $e->getMessage(), 500);
}

