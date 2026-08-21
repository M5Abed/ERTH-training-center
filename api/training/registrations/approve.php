<?php
// =========================================================
// NMU TRAINING — Approve Registration Request
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$reviewer = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$requestId = (int)($data['request_id'] ?? 0);
$userId = resolveUserId($data['user_id'] ?? 0);
$courseId = isset($data['course_id']) ? resolveCourseId($data['course_id']) : null;

if (!$requestId && !$userId) {
    respondError('request_id or user_id is required');
}

$db = db();

if ($requestId) {
    $stmt = $db->prepare("SELECT user_id, course_id FROM registration_requests WHERE id = ?");
    $stmt->execute([$requestId]);
    $req = $stmt->fetch();
    if (!$req) {
        respondError('Registration request not found', 404);
    }
    $userId = (int)$req['user_id'];
    if (!$courseId && !empty($req['course_id'])) {
        $courseId = (int)$req['course_id'];
    }
}

// 1. Update user approval_status to approved
$uStmt = $db->prepare("UPDATE users SET approval_status = 'approved' WHERE id = ?");
$uStmt->execute([$userId]);

// 2. Update registration_requests table
$rStmt = $db->prepare("
    UPDATE registration_requests 
    SET status = 'approved', reviewed_by = ?, reviewed_at = NOW() 
    WHERE user_id = ?
");
$rStmt->execute([$reviewer['id'], $userId]);

// 3. Enroll in course if course_id provided
if ($courseId) {
    $eStmt = $db->prepare("
        INSERT INTO trainee_enrollments (trainee_id, course_id, source)
        VALUES (?, ?, 'self')
        ON DUPLICATE KEY UPDATE course_id = VALUES(course_id)
    ");
    $eStmt->execute([$userId, $courseId]);
}

// 4. Send notification
$nStmt = $db->prepare("
    INSERT INTO notifications (user_id, type, message_en, message_ar)
    VALUES (?, 'registration_approved', 'Your summer training registration has been approved!', 'تم قبول طلب التسجيل الخاص بك للتدريب الصيفي!')
");
$nStmt->execute([$userId]);

respond([
    'success' => true,
    'message' => 'Registration approved successfully',
    'user_id' => $userId,
    'course_id' => $courseId
]);
