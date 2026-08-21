<?php
/**
 * POST /api/training/courses/remove_trainer.php
 * Removes a trainer from a specific course.
 */
require_once __DIR__ . '/../../config.php';

requireRole(['admin', 'trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'faculty']);

$data = body();
$assignmentId = (int)($data['assignment_id'] ?? 0);
$courseId     = resolveCourseId($data['course_id'] ?? 0);
$trainerId    = resolveUserId($data['trainer_id'] ?? 0);

if (!$assignmentId && (!$courseId || !$trainerId)) {
    respondError('Assignment ID or Course ID and Trainer ID are required', 400);
}

$db = db();

if ($assignmentId > 0) {
    $stmt = $db->prepare("DELETE FROM trainer_assignments WHERE id = ?");
    $stmt->execute([$assignmentId]);
} else {
    $stmt = $db->prepare("DELETE FROM trainer_assignments WHERE course_id = ? AND trainer_id = ?");
    $stmt->execute([$courseId, $trainerId]);
}

respond(['success' => true, 'message' => 'Trainer assignment removed successfully']);

