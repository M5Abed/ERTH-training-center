<?php
/**
 * POST /api/training/courses/assign_trainer.php
 * Assigns a trainer to a specific course.
 */
require_once __DIR__ . '/../../config.php';

requireRole(['admin', 'trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'faculty']);

$data = body();
$courseId = resolveCourseId($data['course_id'] ?? 0);
$trainerId = resolveUserId($data['trainer_id'] ?? 0);

if (!$courseId || !$trainerId) {
    respondError('Course ID and Trainer ID are required', 400);
}

$db = db();

// Check if already assigned
$chk = $db->prepare("SELECT id FROM trainer_assignments WHERE course_id = ? AND trainer_id = ?");
$chk->execute([$courseId, $trainerId]);
if ($chk->fetch()) {
    respondError('Trainer is already assigned to this course', 400);
}

// Assign trainer
$stmt = $db->prepare("INSERT INTO trainer_assignments (course_id, trainer_id) VALUES (?, ?)");
$stmt->execute([$courseId, $trainerId]);

respond(['success' => true, 'assignment_id' => $db->lastInsertId()]);
