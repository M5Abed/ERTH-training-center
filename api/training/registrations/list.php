<?php
// =========================================================
// NMU TRAINING — List Pending Registrations
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireTrainer(); // Trainer or Admin required

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$stmt = db()->prepare("
    SELECT 
        rr.id AS request_id,
        rr.status AS request_status,
        rr.created_at AS requested_at,
        rr.course_id,
        u.id AS user_id,
        u.full_name_en,
        u.email,
        u.username,
        u.student_id,
        u.college_key,
        u.academic_year,
        u.major,
        u.approval_status,
        tc.name_en AS requested_course_name_en,
        tc.name_ar AS requested_course_name_ar
    FROM registration_requests rr
    JOIN users u ON rr.user_id = u.id
    LEFT JOIN training_courses tc ON rr.course_id = tc.id
    WHERE rr.status = 'pending' AND u.approval_status = 'pending'
    ORDER BY rr.created_at ASC
");
$stmt->execute();
$requests = $stmt->fetchAll();

respond(['requests' => $requests]);
