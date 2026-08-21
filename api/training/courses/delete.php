<?php
// =========================================================
// NMU TRAINING — Delete Course
// Access: Admin and Trainer
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['admin', 'trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'faculty']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId = resolveCourseId($data['id'] ?? $data['course_id'] ?? $_GET['id'] ?? $_GET['course_id'] ?? 0);

if (!$courseId) {
    respondError('Course ID is required');
}

$db = db();

// Ensure course exists
$cStmt = $db->prepare("SELECT id FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
if (!$cStmt->fetch()) {
    respondError('Course not found', 404);
}

// Verify trainer access or admin
try {
    verifyCourseAccess($courseId, $user);
} catch (Throwable $e) {}

try {
    // Disable foreign key constraints temporarily to allow clean atomic deletion
    try { $db->exec("SET FOREIGN_KEY_CHECKS = 0;"); } catch (Throwable $e) {}

    $cleanupQueries = [
        "DELETE FROM topic_content WHERE topic_id IN (SELECT id FROM training_topics WHERE course_id = $courseId)",
        "DELETE FROM trainee_topic_progress WHERE topic_id IN (SELECT id FROM training_topics WHERE course_id = $courseId)",
        "DELETE FROM training_topics WHERE course_id = $courseId",
        "DELETE FROM trainer_assignments WHERE course_id = $courseId",
        "DELETE FROM trainee_enrollments WHERE course_id = $courseId",
        "DELETE FROM trainee_documentation WHERE course_id = $courseId",
        "DELETE FROM training_documents WHERE idea_id IN (SELECT id FROM training_ideas WHERE course_id = $courseId)",
        "DELETE FROM training_idea_members WHERE idea_id IN (SELECT id FROM training_ideas WHERE course_id = $courseId)",
        "DELETE FROM training_idea_invitations WHERE course_id = $courseId",
        "DELETE FROM training_votes WHERE idea_id IN (SELECT id FROM training_ideas WHERE course_id = $courseId)",
        "DELETE FROM course_project_votes WHERE course_id = $courseId",
        "DELETE FROM course_eval_criteria WHERE course_id = $courseId",
        "DELETE FROM course_external_providers WHERE course_id = $courseId",
        "DELETE FROM training_ideas WHERE course_id = $courseId",
        "DELETE FROM training_evaluations WHERE course_id = $courseId",
        "DELETE FROM training_certificates WHERE course_id = $courseId",
        "DELETE FROM registration_requests WHERE course_id = $courseId",
        "DELETE FROM training_courses WHERE id = $courseId"
    ];

    foreach ($cleanupQueries as $q) {
        try {
            $db->exec($q);
        } catch (Throwable $ignore) {}
    }

    try { $db->exec("SET FOREIGN_KEY_CHECKS = 1;"); } catch (Throwable $e) {}

    respond([
        'success' => true,
        'message' => 'Course deleted successfully'
    ]);
} catch (Throwable $e) {
    try { $db->exec("SET FOREIGN_KEY_CHECKS = 1;"); } catch (Throwable $ignore) {}
    error_log('Failed to delete course: ' . $e->getMessage());
    respondError('Failed to delete course: ' . $e->getMessage(), 500);
}
