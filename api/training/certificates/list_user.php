<?php
// =========================================================
// NMU TRAINING — List User Certificates
// Access: Authenticated User
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireAuth();
$uid = (int)$user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isAdmin = (bool)($user['is_admin'] || $role === 'admin' || $role === 'trainer');

$targetUserId = (isset($_GET['user_id']) && $isAdmin) ? (int)$_GET['user_id'] : $uid;

$db = db();
$stmt = $db->prepare("
    SELECT tc.*,
           c.name_en AS course_title_en, c.name_ar AS course_title_ar,
           issuer.full_name_en AS issuer_name
    FROM training_certificates tc
    JOIN training_courses c ON tc.course_id = c.id
    LEFT JOIN users issuer ON tc.issued_by = issuer.id
    WHERE tc.trainee_id = ?
    ORDER BY tc.issued_at DESC
");
$stmt->execute([$targetUserId]);
$certificates = $stmt->fetchAll();

respond([
    'certificates' => $certificates ?: [],
    'count'        => count($certificates)
]);
?>
