<?php
// =========================================================
// NMU TRAINING — List External Verification Requests
// Access: Admin and Trainers
// =========================================================

require_once __DIR__ . '/../../config.php';

$caller = requireTrainer();
$courseId = isset($_GET['course_id']) ? resolveCourseId($_GET['course_id']) : 0;
$statusFilter = isset($_GET['status']) ? trim($_GET['status']) : '';

$db = db();

try {
    $sql = "
        SELECT te.id AS enrollment_id, te.course_id, te.trainee_id,
               te.custom_provider_name, te.custom_provider_website, te.custom_provider_linkedin,
               te.verification_doc_url, te.verification_status, te.verification_feedback,
               te.verification_reviewed_at,
               tc.name AS course_name,
               u.full_name AS trainee_name, u.student_id, u.email AS trainee_email, u.major,
               u_rev.full_name AS reviewer_name
        FROM trainee_enrollments te
        JOIN users u ON te.trainee_id = u.id
        JOIN training_courses tc ON te.course_id = tc.id
        LEFT JOIN users u_rev ON te.verification_reviewed_by = u_rev.id
        WHERE te.training_type = 'external' AND te.verification_doc_url IS NOT NULL
    ";
    $params = [];

    if ($courseId > 0) {
        $sql .= " AND te.course_id = ?";
        $params[] = $courseId;
    }

    if (!empty($statusFilter)) {
        $sql .= " AND te.verification_status = ?";
        $params[] = $statusFilter;
    }

    $sql .= " ORDER BY CASE WHEN te.verification_status = 'pending' THEN 0 ELSE 1 END, te.enrolled_at DESC";

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $requests = $stmt->fetchAll();

    foreach ($requests as &$r) {
        $r['trainee_id'] = getUserUuid((int)$r['trainee_id']);
        $r['course_id']  = getCourseUuid((int)$r['course_id']);
    }
    unset($r);

    respond([
        'success' => true,
        'verifications' => $requests
    ]);
} catch (Throwable $e) {
    respondError('Database error: ' . $e->getMessage(), 500);
}
