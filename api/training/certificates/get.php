<?php
// =========================================================
// NMU TRAINING — Get Certificate Details
// Access: Trainee, Trainer, Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int)$user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isAdmin = (bool)($user['is_admin'] || $role === 'admin' || $role === 'trainer');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId  = (int)($_GET['course_id'] ?? 0);
$traineeId = isset($_GET['trainee_id']) ? (int)$_GET['trainee_id'] : $uid;
$certCode  = trim($_GET['code'] ?? '');

$db = db();

if ($certCode) {
    $stmt = $db->prepare("
        SELECT tc.*,
               u.full_name AS trainee_name, u.full_name AS trainee_name, u.student_id, u.email AS trainee_email,
               c.name AS course_title, c.name AS course_title,
               issuer.full_name AS issuer_name
        FROM training_certificates tc
        JOIN users u ON tc.trainee_id = u.id
        JOIN training_courses c ON tc.course_id = c.id
        LEFT JOIN users issuer ON tc.issued_by = issuer.id
        WHERE tc.cert_code = ?
    ");
    $stmt->execute([$certCode]);
    $cert = $stmt->fetch();
} else if ($courseId && $traineeId) {
    if (!$isAdmin && $traineeId !== $uid) {
        respondError('Forbidden: You can only view your own certificate', 403);
    }
    
    $stmt = $db->prepare("
        SELECT tc.*,
               u.full_name AS trainee_name, u.full_name AS trainee_name, u.student_id, u.email AS trainee_email,
               c.name AS course_title, c.name AS course_title,
               issuer.full_name AS issuer_name
        FROM training_certificates tc
        JOIN users u ON tc.trainee_id = u.id
        JOIN training_courses c ON tc.course_id = c.id
        LEFT JOIN users issuer ON tc.issued_by = issuer.id
        WHERE tc.course_id = ? AND tc.trainee_id = ?
    ");
    $stmt->execute([$courseId, $traineeId]);
    $cert = $stmt->fetch();
} else {
    respondError('Course ID and Trainee ID, or Certificate Code are required');
}

respond([
    'certificate' => $cert ?: null,
    'issued' => (bool)$cert
]);
?>
