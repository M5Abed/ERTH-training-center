<?php
// =========================================================
// NMU TRAINING — List Enrolled Trainees for Course
// Access: All Authenticated Users / Faculty / Admins
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator', 'student', 'staff', 'doctor', 'faculty']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$db = db();
$courseId = resolveCourseId($_GET['course_id'] ?? 0);

if (!$courseId) {
    respond(['trainees' => []]);
    exit;
}

$trainees = [];

try {
    $stmt = $db->prepare("
        SELECT DISTINCT
               te.id AS enrollment_id,
               te.enrolled_at,
               COALESCE(te.source, 'direct') AS source,
               COALESCE(te.training_type, 'internal') AS training_type,
               te.provider_id,
               te.track_id,
               te.course_code,
               COALESCE(te.program, u.major, u.department) AS program,
               COALESCE(te.final_track, u.final_track) AS final_track,
               COALESCE((SELECT final_score FROM training_evaluations WHERE trainee_id = u.id AND course_id = ?), te.final_grade) AS final_grade,
               p.name AS provider_name,
               p.is_contracted AS provider_is_contracted,
               p.website_url AS provider_website_url,
               p.linkedin_url AS provider_linkedin_url,
               COALESCE(tt.title, te.final_track, u.final_track) AS track_name,
               u.id AS trainee_id,
               u.full_name,
               u.email,
               COALESCE(u.academic_id, u.student_id) AS student_id,
               COALESCE(u.academic_id, u.student_id) AS academic_id,
               COALESCE(te.program, u.major, u.department) AS program_name,
               u.academic_year,
               u.major,
               (SELECT COUNT(*) FROM trainee_topic_progress ttp 
                JOIN training_topics tt_sub ON ttp.topic_id = tt_sub.id 
                WHERE tt_sub.course_id = ? AND ttp.trainee_id = u.id) AS completed_topics,
               COALESCE(
                   (SELECT ti.status FROM training_ideas ti WHERE ti.owner_id = u.id AND ti.course_id = ? LIMIT 1),
                   (SELECT ti.status FROM training_idea_members tim JOIN training_ideas ti ON tim.idea_id = ti.id WHERE tim.user_id = u.id AND ti.course_id = ? LIMIT 1)
               ) AS idea_status,
               (SELECT status FROM training_evaluations WHERE trainee_id = u.id AND course_id = ?) AS evaluation_status,
               COALESCE((SELECT final_score FROM training_evaluations WHERE trainee_id = u.id AND course_id = ?), te.final_grade) AS evaluation_score,
               (SELECT cert_code FROM training_certificates WHERE trainee_id = u.id AND course_id = ?) AS cert_code
        FROM trainee_enrollments te
        JOIN users u ON te.trainee_id = u.id
        LEFT JOIN external_training_providers p ON te.provider_id = p.id
        LEFT JOIN training_topics tt ON te.track_id = tt.id
        WHERE te.course_id = ?
          AND (u.approval_status != 'rejected' OR u.approval_status IS NULL)
        ORDER BY COALESCE(te.training_type, 'internal') ASC, u.full_name ASC
    ");
    $stmt->execute([
        $courseId, $courseId, $courseId, $courseId, $courseId, $courseId, $courseId, $courseId
    ]);
    $trainees = $stmt->fetchAll();
} catch (Throwable $e) {
    try {
        $stmt2 = $db->prepare("
            SELECT DISTINCT
                   te.id AS enrollment_id,
                   te.enrolled_at,
                   COALESCE(te.source, 'direct') AS source,
                   COALESCE(te.training_type, 'internal') AS training_type,
                   COALESCE(te.program, u.major, u.department) AS program,
                   COALESCE(te.program, u.major, u.department) AS program_name,
                   u.id AS trainee_id,
                   u.full_name,
                   u.email,
                   COALESCE(u.student_id, u.academic_id) AS student_id,
                   COALESCE(u.student_id, u.academic_id) AS academic_id,
                   u.academic_year,
                   u.major
            FROM trainee_enrollments te
            JOIN users u ON te.trainee_id = u.id
            WHERE te.course_id = ?
              AND (u.approval_status != 'rejected' OR u.approval_status IS NULL)
            ORDER BY u.full_name ASC
        ");
        $stmt2->execute([$courseId]);
        $trainees = $stmt2->fetchAll();
    } catch (Throwable $e2) {
        $trainees = [];
    }
}

foreach ($trainees as &$t) {
    if (!empty($t['trainee_id']) && is_numeric($t['trainee_id'])) {
        $t['trainee_uuid'] = getUserUuid((int)$t['trainee_id']);
        $t['trainee_id'] = $t['trainee_uuid'];
        $t['id'] = $t['trainee_uuid'];
    }
}
unset($t);

respond(['trainees' => $trainees]);
