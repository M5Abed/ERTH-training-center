<?php
// =========================================================
// NMU TRAINING — Get External Verification Status
// Access: Trainee (own), Trainer, Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int)$user['id'];
$role = strtolower($user['role'] ?? '');
$isAdmin = (!empty($user['is_admin']) || $role === 'admin');
$isTrainer = ($role === 'trainer');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_GET['course_id'] ?? 0);
$traineeId = ($isAdmin || $isTrainer) && !empty($_GET['trainee_id']) ? (int)$_GET['trainee_id'] : $uid;

if (!$courseId) {
    respondError('Course ID is required', 400);
}

$db = db();

try {
    $stmt = $db->prepare("
        SELECT te.training_type, te.provider_id, te.track_id,
               te.custom_provider_name, te.custom_provider_website, te.custom_provider_linkedin,
               te.verification_doc_url, te.verification_status, te.verification_feedback,
               te.verification_reviewed_at,
               u_rev.full_name AS reviewer_name,
               p.name AS provider_name, p.is_contracted AS provider_is_contracted,
               tt.title AS track_name
        FROM trainee_enrollments te
        LEFT JOIN users u_rev ON te.verification_reviewed_by = u_rev.id
        LEFT JOIN external_training_providers p ON te.provider_id = p.id
        LEFT JOIN training_topics tt ON te.track_id = tt.id
        WHERE te.trainee_id = ? AND te.course_id = ?
    ");
    $stmt->execute([$traineeId, $courseId]);
    $status = $stmt->fetch();

    if (!$status) {
        respondError('Enrollment record not found', 404);
    }

    respond([
        'success' => true,
        'verification' => $status
    ]);
} catch (Throwable $e) {
    respondError('Database error: ' . $e->getMessage(), 500);
}
