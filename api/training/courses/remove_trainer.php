<?php
/**
 * POST /api/training/courses/remove_trainer.php
 * Removes a trainer from a specific course.
 */
require_once __DIR__ . '/../../config.php';

requireAdmin(); // Only admins can remove trainers

$data = body();
$assignmentId = (int)($data['assignment_id'] ?? 0);

if (!$assignmentId) {
    respondError('Assignment ID is required', 400);
}

$db = db();

$stmt = $db->prepare("DELETE FROM trainer_assignments WHERE id = ?");
$stmt->execute([$assignmentId]);

if ($stmt->rowCount() > 0) {
    respond(['success' => true]);
} else {
    respondError('Assignment not found', 404);
}
