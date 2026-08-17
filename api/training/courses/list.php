<?php
// =========================================================
// NMU TRAINING — List Courses
// Access: All authenticated users (filtered by role)
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int)$user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isAdmin = (bool)($user['is_admin'] || $role === 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$db = db();

if ($isAdmin) {
    // Admin sees all courses
    $stmt = $db->query("
        SELECT tc.*, tc.name AS name, tc.description AS description,
               u.full_name AS creator_name,
               (SELECT COUNT(*) FROM training_topics WHERE course_id = tc.id) AS total_topics,
               (SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = tc.id) AS total_trainees
        FROM training_courses tc
        LEFT JOIN users u ON tc.created_by = u.id
        ORDER BY tc.created_at DESC
    ");
    $courses = $stmt->fetchAll();
} elseif ($role === 'trainer') {
    // Trainer sees courses they are assigned to (whole course or topic level)
    $stmt = $db->prepare("
        SELECT DISTINCT tc.*, tc.name AS name, tc.description AS description,
               (SELECT COUNT(*) FROM training_topics WHERE course_id = tc.id) AS total_topics,
               (SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = tc.id) AS total_trainees
        FROM training_courses tc
        JOIN trainer_assignments ta ON tc.id = ta.course_id
        WHERE ta.trainer_id = ? AND tc.status != 'archived'
        ORDER BY tc.created_at DESC
    ");
    $stmt->execute([$uid]);
    $courses = $stmt->fetchAll();
} else {
    // Trainee sees courses they are enrolled in (or all active courses if requested)
    if (isset($_GET['all']) && $_GET['all'] == '1') {
        $stmt = $db->query("
            SELECT tc.*, tc.name AS name, tc.description AS description,
                   (SELECT COUNT(*) FROM training_topics WHERE course_id = tc.id) AS total_topics,
                   (SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = tc.id) AS total_trainees
            FROM training_courses tc
            WHERE tc.status = 'active'
            ORDER BY tc.created_at DESC
        ");
        $courses = $stmt->fetchAll();
    } else {
        $stmt = $db->prepare("
            SELECT tc.*, tc.name AS name, tc.description AS description,
                   te.enrolled_at,
                   (SELECT COUNT(*) FROM training_topics WHERE course_id = tc.id) AS total_topics,
                   (SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = tc.id) AS total_trainees,
                   (SELECT COUNT(*) FROM trainee_topic_progress ttp 
                    JOIN training_topics tt ON ttp.topic_id = tt.id 
                    WHERE tt.course_id = tc.id AND ttp.trainee_id = ?) AS completed_topics
            FROM training_courses tc
            JOIN trainee_enrollments te ON tc.id = te.course_id
            WHERE te.trainee_id = ? AND tc.status = 'active'
            ORDER BY tc.created_at DESC
        ");
        $stmt->execute([$uid, $uid]);
        $courses = $stmt->fetchAll();

        // If trainee is not enrolled in any course yet, show all active courses with counts
        if (empty($courses)) {
            $allStmt = $db->query("
                SELECT tc.*, tc.name AS name, tc.description AS description,
                       (SELECT COUNT(*) FROM training_topics WHERE course_id = tc.id) AS total_topics,
                       (SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = tc.id) AS total_trainees,
                       0 AS completed_topics
                FROM training_courses tc
                WHERE tc.status = 'active'
                ORDER BY tc.created_at DESC
            ");
            $courses = $allStmt->fetchAll();
        }
    }
}

respond(['courses' => $courses]);
