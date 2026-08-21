<?php
// =========================================================
// NMU TRAINING — Remove & Delete All Trainees from Course
// Access: Trainer or Admin
// POST /api/training/enrollments/remove_all.php
// Body: { course_id: int, confirmation: 'delete' }
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../users/delete_helper.php';

$caller = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId     = resolveCourseId($data['course_id'] ?? 0);
$confirmation = strtolower(trim($data['confirmation'] ?? ''));

if (!$courseId) {
    respondError('Course ID is required', 400);
}

if ($confirmation !== 'delete') {
    respondError("Confirmation keyword 'delete' is required to perform this action", 400);
}

// Enforce course-level authorization
try {
    verifyCourseAccess($courseId, $caller);
} catch (Throwable $e) {}

$db = db();

try {
    // 1. Fetch all trainee user IDs currently enrolled in this course
    $stmt = $db->prepare("SELECT DISTINCT trainee_id FROM trainee_enrollments WHERE course_id = ?");
    $stmt->execute([$courseId]);
    $traineeIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

    // 2. Cascade delete each trainee entirely from the site and database
    $deletedCount = 0;
    foreach ($traineeIds as $tid) {
        if ($tid) {
            try {
                $ok = cascadeDeleteUser($db, (int)$tid, 'trainee');
                if ($ok) {
                    $deletedCount++;
                }
            } catch (Throwable $innerErr) {
                error_log("Error deleting trainee $tid during course clear: " . $innerErr->getMessage());
            }
        }
    }

    // 3. Clean up any remaining course-level orphaned records
    try {
        $db->prepare("DELETE FROM trainee_enrollments WHERE course_id = ?")->execute([$courseId]);
        $db->prepare("
            DELETE FROM trainee_topic_progress 
            WHERE topic_id IN (SELECT id FROM training_topics WHERE course_id = ?)
        ")->execute([$courseId]);
        $db->prepare("DELETE FROM training_evaluations WHERE course_id = ?")->execute([$courseId]);
        $db->prepare("DELETE FROM training_certificates WHERE course_id = ?")->execute([$courseId]);
        $db->prepare("
            DELETE FROM training_idea_members 
            WHERE idea_id IN (SELECT id FROM training_ideas WHERE course_id = ?)
        ")->execute([$courseId]);
        $db->prepare("DELETE FROM training_idea_invitations WHERE course_id = ?")->execute([$courseId]);
    } catch (Throwable $ignore) {}

    respond([
        'success'       => true,
        'message'       => "Successfully cleared and deleted all $deletedCount trainees from this course and database.",
        'deleted_count' => $deletedCount
    ]);
} catch (Throwable $e) {
    respondError('Database error while removing trainees: ' . $e->getMessage(), 500);
}

