<?php
// =========================================================
// NMU TRAINING — List Courses
// Access: All authenticated users
// Trainees: Filtered to their enrolled courses (or active if none)
// Faculty/Admins: All courses
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'student', 'staff', 'faculty']);
$uid = (int)$user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$staffRoles = ['trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'admin', 'faculty', 'staff', 'doctor'];
$isStaff = (bool)($user['is_admin'] || in_array($role, $staffRoles, true));

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$db = db();
$courses = [];

try {
    if ($isStaff) {
        $stmt = $db->query("
            SELECT tc.*, tc.name AS name, tc.description AS description,
                   u.full_name AS creator_name,
                   (SELECT COUNT(*) FROM training_topics WHERE course_id = tc.id) AS total_topics,
                   (SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = tc.id) AS total_trainees
            FROM training_courses tc
            LEFT JOIN users u ON tc.created_by = u.id
            WHERE tc.status != 'archived' OR tc.status IS NULL
            ORDER BY tc.created_at DESC, tc.id DESC
        ");
        $courses = $stmt->fetchAll();
    } else {
        // Trainee: Fetch only enrolled courses
        $stmt = $db->prepare("
            SELECT tc.*, tc.name AS name, tc.description AS description,
                   u.full_name AS creator_name,
                   (SELECT COUNT(*) FROM training_topics WHERE course_id = tc.id) AS total_topics,
                   (SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = tc.id) AS total_trainees
            FROM training_courses tc
            LEFT JOIN users u ON tc.created_by = u.id
            WHERE (tc.status != 'archived' OR tc.status IS NULL)
              AND (
                  tc.id IN (SELECT course_id FROM trainee_enrollments WHERE trainee_id = ?)
                  OR tc.id IN (SELECT course_id FROM training_ideas WHERE owner_id = ?)
                  OR tc.id IN (SELECT ti.course_id FROM training_idea_members tim JOIN training_ideas ti ON tim.idea_id = ti.id WHERE tim.user_id = ?)
              )
            ORDER BY tc.created_at DESC, tc.id DESC
        ");
        $stmt->execute([$uid, $uid, $uid]);
        $courses = $stmt->fetchAll();

        // If trainee has no enrollments yet, show active available courses so they can choose
        if (empty($courses)) {
            $stmtAll = $db->query("
                SELECT tc.*, tc.name AS name, tc.description AS description,
                       u.full_name AS creator_name,
                       (SELECT COUNT(*) FROM training_topics WHERE course_id = tc.id) AS total_topics,
                       (SELECT COUNT(*) FROM trainee_enrollments WHERE course_id = tc.id) AS total_trainees
                FROM training_courses tc
                LEFT JOIN users u ON tc.created_by = u.id
                WHERE tc.status = 'active' OR tc.status IS NULL
                ORDER BY tc.created_at DESC, tc.id DESC
            ");
            $courses = $stmtAll ? $stmtAll->fetchAll() : [];
        }
    }
} catch (Throwable $e) {
    try {
        $fallback = $db->query("SELECT * FROM training_courses ORDER BY id DESC");
        $courses = $fallback->fetchAll();
    } catch (Throwable $e2) {
        $courses = [];
    }
}

foreach ($courses as &$c) {
    if (!empty($c['id']) && is_numeric($c['id'])) {
        $c['uuid'] = getCourseUuid((int)$c['id']);
        $c['id'] = $c['uuid'];
    }
}
unset($c);

respond(['courses' => $courses]);
