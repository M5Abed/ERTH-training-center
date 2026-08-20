<?php
// =========================================================
// NMU TRAINING — Remove All Trainees from Course
// Access: Trainer or Admin
// POST /api/training/enrollments/remove_all.php
// Body: { course_id: int, confirmation: 'delete' }
// =========================================================

require_once __DIR__ . '/../../config.php';

$caller = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId     = (int)($data['course_id'] ?? 0);
$confirmation = strtolower(trim($data['confirmation'] ?? ''));

if (!$courseId) {
    respondError('Course ID is required', 400);
}

if ($confirmation !== 'delete') {
    respondError("Confirmation keyword 'delete' is required to perform this action", 400);
}

// Enforce course-level authorization
verifyCourseAccess($courseId, $caller);

$db = db();

try {
    $db->beginTransaction();

    // 1. Delete all enrollments for this course
    $stmt = $db->prepare("DELETE FROM trainee_enrollments WHERE course_id = ?");
    $stmt->execute([$courseId]);
    $deletedCount = $stmt->rowCount();

    // 2. Clean up topic progress for this course
    $db->prepare("
        DELETE FROM trainee_topic_progress 
        WHERE topic_id IN (SELECT id FROM training_topics WHERE course_id = ?)
    ")->execute([$courseId]);

    // 3. Clean up evaluations & certificates for this course
    $db->prepare("DELETE FROM training_evaluations WHERE course_id = ?")->execute([$courseId]);
    $db->prepare("DELETE FROM training_certificates WHERE course_id = ?")->execute([$courseId]);

    // 4. Remove idea memberships for ideas in this course
    $db->prepare("
        DELETE FROM training_idea_members 
        WHERE idea_id IN (SELECT id FROM training_ideas WHERE course_id = ?)
    ")->execute([$courseId]);

    $db->commit();

    respond([
        'success'       => true,
        'message'       => "Successfully removed all trainees ($deletedCount enrolled) from this course.",
        'deleted_count' => $deletedCount
    ]);
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    respondError('Database error while removing trainees: ' . $e->getMessage(), 500);
}
