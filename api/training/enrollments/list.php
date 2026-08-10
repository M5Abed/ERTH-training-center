<?php
// =========================================================
// NMU TRAINING — List Enrolled Trainees
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

requireTrainer();

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
           u.id AS trainee_id, u.full_name_en, u.email, u.student_id, u.college_key, u.academic_year, u.major,
           (SELECT COUNT(*) FROM trainee_topic_progress ttp 
            JOIN training_topics tt ON ttp.topic_id = tt.id 
            WHERE tt.course_id = ? AND ttp.trainee_id = u.id) AS completed_topics,
           (SELECT status FROM training_evaluations WHERE trainee_id = u.id AND course_id = ?) AS evaluation_status
    FROM trainee_enrollments te
    JOIN users u ON te.trainee_id = u.id
    WHERE te.course_id = ?
    ORDER BY u.full_name_en ASC
");
$stmt->execute([$courseId, $courseId, $courseId]);
$trainees = $stmt->fetchAll();

respond(['trainees' => $trainees]);
