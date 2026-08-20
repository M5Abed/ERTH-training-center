<?php
// =========================================================
// NMU TRAINING — Review External Training Verification Document
// Access: Admin only
// =========================================================

require_once __DIR__ . '/../../config.php';

$reviewer = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId = (int)($data['course_id'] ?? 0);
$traineeId = (int)($data['trainee_id'] ?? 0);
$decision = strtolower(trim($data['decision'] ?? $data['status'] ?? '')); // 'approved' or 'rejected'
$feedback = trim($data['feedback'] ?? $data['rejection_reason'] ?? '');

if (!$courseId || !$traineeId) {
    respondError('Course ID and Trainee ID are required', 400);
}

if (!in_array($decision, ['approved', 'rejected'], true)) {
    respondError("Decision must be either 'approved' or 'rejected'", 400);
}

if ($decision === 'rejected' && empty($feedback)) {
    respondError('Rejection feedback / reason is required when rejecting a verification request', 400);
}

$db = db();

try {
    // Check enrollment
    $stmt = $db->prepare("
        SELECT te.id, te.verification_doc_url, u.full_name, u.email, tc.name AS course_name
        FROM trainee_enrollments te
        JOIN users u ON te.trainee_id = u.id
        JOIN training_courses tc ON te.course_id = tc.id
        WHERE te.trainee_id = ? AND te.course_id = ?
    ");
    $stmt->execute([$traineeId, $courseId]);
    $enr = $stmt->fetch();
    if (!$enr) {
        respondError('Trainee enrollment not found', 404);
    }

    $upd = $db->prepare("
        UPDATE trainee_enrollments
        SET verification_status = ?,
            verification_feedback = ?,
            verification_reviewed_by = ?,
            verification_reviewed_at = NOW()
        WHERE trainee_id = ? AND course_id = ?
    ");
    $upd->execute([
        $decision,
        $feedback ?: null,
        $adminId,
        $traineeId,
        $courseId
    ]);

    // Send notification to the student
    try {
        $nStmt = $db->prepare("
            INSERT INTO notifications (user_id, type, message_en, message_ar)
            VALUES (?, 'verification_reviewed', ?, ?)
        ");
        if ($decision === 'approved') {
            $msgEn = "Your external training verification document for course '{$enr['course_name']}' has been APPROVED.";
            $msgAr = "تمت الموافقة على وثيقة إثبات التدريب الخارجي الخاصة بك في دورة '{$enr['course_name']}'.";
        } else {
            $msgEn = "Your external training verification document was REJECTED: $feedback";
            $msgAr = "تم رفض وثيقة إثبات التدريب الخارجي الخاصة بك. سبب الرفض: $feedback";
        }
        $nStmt->execute([$traineeId, $msgEn, $msgAr]);
    } catch (Throwable $ne) {}

    respond([
        'success' => true,
        'message' => "Verification request successfully marked as $decision",
        'verification_status' => $decision
    ]);
} catch (Throwable $e) {
    respondError('Database error: ' . $e->getMessage(), 500);
}
