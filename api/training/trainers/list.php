<?php
// =========================================================
// NMU TRAINING — List Course Trainer Assignments / All Trainers
// Access: All authenticated users
// =========================================================

require_once __DIR__ . '/../../config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$user = requireRole(['admin', 'trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'trainee', 'student', 'staff', 'faculty']);

$db = db();

// Ensure trainer_assignments table exists
try {
    $db->exec("
        CREATE TABLE IF NOT EXISTS trainer_assignments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_id INT NOT NULL,
            trainer_id INT NOT NULL,
            topic_id INT DEFAULT NULL,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_ta_course (course_id),
            INDEX idx_ta_trainer (trainer_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
} catch (Throwable $e) {}

$courseId = resolveCourseId($_GET['course_id'] ?? 0);

if ($courseId > 0) {
    try {
        $stmt = $db->prepare("
            SELECT ta.id AS assignment_id, ta.topic_id, u.id AS trainer_id, u.full_name, u.email, u.department, tt.title AS topic_title
            FROM trainer_assignments ta
            JOIN users u ON ta.trainer_id = u.id
            LEFT JOIN training_topics tt ON ta.topic_id = tt.id
            WHERE ta.course_id = ?
            ORDER BY u.full_name ASC
        ");
        $stmt->execute([$courseId]);
        $assignments = $stmt->fetchAll();

        // If no explicit assignments yet, return all active faculty/trainers as fallback
        if (empty($assignments)) {
            $stmtAll = $db->query("
                SELECT NULL AS assignment_id, NULL AS topic_id, u.id AS trainer_id, u.full_name, u.email, u.department, NULL AS topic_title
                FROM users u
                WHERE (
                    TRIM(LOWER(COALESCE(u.role, ''))) IN ('trainer', 'admin', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'doctor', 'faculty', 'staff')
                    OR u.is_admin = 1
                    OR u.id IN (SELECT trainer_id FROM trainer_assignments)
                    OR TRIM(LOWER(COALESCE(u.role, ''))) NOT IN ('trainee', 'student')
                )
                AND (u.approval_status != 'rejected' OR u.approval_status IS NULL)
                ORDER BY u.full_name ASC
            ");
            $assignments = $stmtAll ? $stmtAll->fetchAll() : [];
        }

        foreach ($assignments as &$as) {
            $as['uuid'] = getUserUuid((int)$as['trainer_id']);
            $as['trainer_id'] = $as['uuid'];
            $as['id'] = $as['uuid'];
        }
        unset($as);

        respond(['assignments' => $assignments, 'trainers' => $assignments]);
    } catch (Throwable $e) {
        error_log('Course trainers query error: ' . $e->getMessage());
        respond(['assignments' => [], 'trainers' => []]);
    }
} else {
    try {
        $stmt = $db->query("
            SELECT DISTINCT
                   u.id, u.id AS trainer_id, u.full_name, NULL AS username, u.email, u.department, u.role, u.is_admin,
                   (SELECT COUNT(*) FROM trainer_assignments WHERE trainer_id = u.id) AS assigned_courses_count,
                   (
                       SELECT GROUP_CONCAT(CONCAT(tc.id, ':::', tc.name, ':::', ta.id) SEPARATOR '|||')
                       FROM trainer_assignments ta
                       JOIN training_courses tc ON ta.course_id = tc.id
                       WHERE ta.trainer_id = u.id
                   ) AS assigned_courses_raw
            FROM users u
            WHERE (
                TRIM(LOWER(COALESCE(u.role, ''))) IN ('trainer', 'admin', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'doctor', 'faculty', 'staff')
                OR u.is_admin = 1
                OR u.id IN (SELECT trainer_id FROM trainer_assignments)
                OR (
                    TRIM(LOWER(COALESCE(u.role, ''))) NOT IN ('trainee', 'student')
                    AND u.role IS NOT NULL
                    AND u.role != ''
                )
            )
            AND (u.approval_status != 'rejected' OR u.approval_status IS NULL)
            ORDER BY u.full_name ASC, u.id ASC
        ");
        $trainers = $stmt ? $stmt->fetchAll() : [];

        // If no trainers found with specific role filter, fetch all non-trainees or admin accounts
        if (empty($trainers)) {
            $stmtFallback = $db->query("
                SELECT u.id, u.id AS trainer_id, u.full_name, NULL AS username, u.email, u.department, u.role, u.is_admin
                FROM users u
                WHERE u.is_admin = 1 OR TRIM(LOWER(COALESCE(u.role, ''))) NOT IN ('trainee', 'student')
                ORDER BY u.full_name ASC
            ");
            $trainers = $stmtFallback ? $stmtFallback->fetchAll() : [];
        }

        foreach ($trainers as &$tr) {
            $tr['uuid'] = getUserUuid((int)$tr['id']);
            $tr['id'] = $tr['uuid'];
            $tr['trainer_id'] = $tr['uuid'];

            $tr['assigned_courses'] = [];
            if (!empty($tr['assigned_courses_raw'])) {
                $items = explode('|||', $tr['assigned_courses_raw']);
                foreach ($items as $item) {
                    $parts = explode(':::', $item);
                    if (count($parts) >= 3) {
                        $cInternalId = (int)$parts[0];
                        $tr['assigned_courses'][] = [
                            'course_id' => getCourseUuid($cInternalId),
                            'course_title' => $parts[1],
                            'assignment_id' => (int)$parts[2]
                        ];
                    }
                }
            }
            unset($tr['assigned_courses_raw']);
        }
        unset($tr);

        respond(['trainers' => $trainers]);
    } catch (Throwable $e) {
        error_log('Trainers list query error: ' . $e->getMessage());
        respond(['trainers' => []]);
    }
}
