<?php
// =========================================================
// NMU TRAINING — Reject Registration Request
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
$reason = sanitizeString($data['reason'] ?? '');

if (!$requestId && !$userId) {
    respondError('request_id or user_id is required');
}

$db = db();

if ($requestId) {
    $stmt = $db->prepare("SELECT user_id FROM registration_requests WHERE id = ?");
    $stmt->execute([$requestId]);
    $req = $stmt->fetch();
    if (!$req) {
        respondError('Registration request not found', 404);
    }
    $userId = (int)$req['user_id'];
}

// 1. Update user approval_status to rejected
$uStmt = $db->prepare("UPDATE users SET approval_status = 'rejected' WHERE id = ?");
$uStmt->execute([$userId]);

// 2. Update registration_requests table
$rStmt = $db->prepare("
    UPDATE registration_requests 
    SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ? 
    WHERE user_id = ?
");
$rStmt->execute([$reviewer['id'], $reason, $userId]);

// 3. Send notification
$nStmt = $db->prepare("
    INSERT INTO notifications (user_id, type, message_en, message_ar)
    VALUES (?, 'registration_rejected', 'Your registration request was not approved.', 'لم يتم قبول طلب التسجيل الخاص بك.')
");
$nStmt->execute([$userId]);

respond([
    'success' => true,
    'message' => 'Registration rejected',
    'user_id' => $userId
]);
