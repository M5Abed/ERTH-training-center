<?php
// =========================================================
// NMU TRAINING — Delete Course
// Access: Admin and Trainer
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['admin', 'trainer']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId = (int)($data['id'] ?? $data['course_id'] ?? 0);

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
verifyCourseAccess($courseId, $user);

try {
    $db->beginTransaction();

    // 1. Delete topic content & progress for topics in this course
    $db->exec("
        DELETE FROM topic_content 
        WHERE topic_id IN (SELECT id FROM training_topics WHERE course_id = $courseId)
    ");
    $db->exec("
        DELETE FROM trainee_topic_progress 
        WHERE topic_id IN (SELECT id FROM training_topics WHERE course_id = $courseId)
    ");

    // 2. Delete training topics
    $stmtTopics = $db->prepare("DELETE FROM training_topics WHERE course_id = ?");
    $stmtTopics->execute([$courseId]);

    // 3. Delete trainer assignments
    $stmtTrainers = $db->prepare("DELETE FROM trainer_assignments WHERE course_id = ?");
    $stmtTrainers->execute([$courseId]);

    // 4. Delete trainee enrollments
    $stmtEnroll = $db->prepare("DELETE FROM trainee_enrollments WHERE course_id = ?");
    $stmtEnroll->execute([$courseId]);

    // 5. Delete trainee documentation
    $stmtDocs = $db->prepare("DELETE FROM trainee_documentation WHERE course_id = ?");
    $stmtDocs->execute([$courseId]);

    // 6. Delete idea deliverables, members, votes, and ideas
    $db->exec("
        DELETE FROM training_documents 
        WHERE idea_id IN (SELECT id FROM training_ideas WHERE course_id = $courseId)
    ");
    $db->exec("
        DELETE FROM training_idea_members 
        WHERE idea_id IN (SELECT id FROM training_ideas WHERE course_id = $courseId)
    ");
    $db->exec("
        DELETE FROM training_votes 
        WHERE idea_id IN (SELECT id FROM training_ideas WHERE course_id = $courseId)
    ");
    $stmtIdeas = $db->prepare("DELETE FROM training_ideas WHERE course_id = ?");
    $stmtIdeas->execute([$courseId]);

    // 7. Delete evaluations & certificates & criteria
    $stmtEvals = $db->prepare("DELETE FROM training_evaluations WHERE course_id = ?");
    $stmtEvals->execute([$courseId]);

    $stmtCerts = $db->prepare("DELETE FROM training_certificates WHERE course_id = ?");
    $stmtCerts->execute([$courseId]);

    try {
        $stmtCrit = $db->prepare("DELETE FROM course_eval_criteria WHERE course_id = ?");
        $stmtCrit->execute([$courseId]);
    } catch (Throwable $e) {}

    // 8. Delete registration requests for this course
    $stmtReqs = $db->prepare("DELETE FROM registration_requests WHERE course_id = ?");
    $stmtReqs->execute([$courseId]);

    // 9. Delete course itself
    $stmtCourse = $db->prepare("DELETE FROM training_courses WHERE id = ?");
    $stmtCourse->execute([$courseId]);

    $db->commit();

    respond([
        'success' => true,
        'message' => 'Course deleted successfully'
    ]);
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    error_log('Failed to delete course: ' . $e->getMessage());
    respondError('Failed to delete course: ' . $e->getMessage(), 500);
}
