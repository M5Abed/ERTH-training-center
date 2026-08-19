<?php
// =========================================================
// NMU TRAINING — List Enrolled Trainees
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_GET['course_id'] ?? 0);
if (!$courseId) {
    respondError('Course ID is required');
}

$db = db();
$stmt = $db->prepare("
    SELECT te.id AS enrollment_id, te.enrolled_at, te.source,
           te.training_type, te.provider_id, te.track_id,
           te.custom_provider_name, te.custom_provider_website, te.custom_provider_linkedin,
           te.verification_doc_url, te.verification_status, te.verification_feedback,
           te.verification_reviewed_by, te.verification_reviewed_at,
           p.name AS provider_name, p.name_ar AS provider_name_ar, p.is_contracted AS provider_is_contracted,
           p.website_url AS provider_website_url, p.linkedin_url AS provider_linkedin_url,
           tt.title AS track_name,
           u.id AS trainee_id, u.full_name, u.email, u.student_id, u.college_key, u.academic_year, u.major,
           (SELECT COUNT(*) FROM trainee_topic_progress ttp 
            JOIN training_topics tt_sub ON ttp.topic_id = tt_sub.id 
            WHERE tt_sub.course_id = ? AND ttp.trainee_id = u.id) AS completed_topics,
           (SELECT status FROM training_evaluations WHERE trainee_id = u.id AND course_id = ?) AS evaluation_status,
           (SELECT final_score FROM training_evaluations WHERE trainee_id = u.id AND course_id = ?) AS evaluation_score,
           (SELECT cert_code FROM training_certificates WHERE trainee_id = u.id AND course_id = ?) AS cert_code
    FROM trainee_enrollments te
    JOIN users u ON te.trainee_id = u.id
    LEFT JOIN external_training_providers p ON te.provider_id = p.id
    LEFT JOIN training_topics tt ON te.track_id = tt.id
    WHERE te.course_id = ?
    ORDER BY te.training_type ASC, COALESCE(p.name, te.custom_provider_name) ASC, u.full_name ASC
");
$stmt->execute([$courseId, $courseId, $courseId, $courseId, $courseId]);
$trainees = $stmt->fetchAll();

respond(['trainees' => $trainees]);
