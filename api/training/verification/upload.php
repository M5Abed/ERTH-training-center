<?php
// =========================================================
// NMU TRAINING — Upload External Verification Document
// Access: Trainee (upload own) or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int)$user['id'];
$role = strtolower($user['role'] ?? '');
$isAdmin = (!empty($user['is_admin']) || $role === 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$courseId = resolveCourseId($_POST['course_id'] ?? 0);
$traineeId = ($isAdmin && !empty($_POST['trainee_id'])) ? resolveUserId($_POST['trainee_id']) : $uid;

$customName = trim($_POST['custom_provider_name'] ?? '');
$customWebsite = trim($_POST['custom_provider_website'] ?? '');
$customLinkedin = trim($_POST['custom_provider_linkedin'] ?? '');

if (!$courseId) {
    respondError('Course ID is required', 400);
}

if (empty($_FILES['verification_file'])) {
    respondError('Verification document file is required', 400);
}

$file = $_FILES['verification_file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    respondError('File upload error code: ' . $file['error'], 400);
}

$maxSize = 25 * 1024 * 1024; // 25MB
if ($file['size'] > $maxSize) {
    respondError('File size exceeds the 25MB limit', 400);
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$allowed = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'doc'];
if (!in_array($ext, $allowed, true)) {
    respondError('Invalid file format. Allowed types: PDF, PNG, JPG, DOCX', 400);
}

$db = db();

try {
    // 1. Verify enrollment exists
    $stmt = $db->prepare("SELECT id, training_type, provider_id, custom_provider_name FROM trainee_enrollments WHERE trainee_id = ? AND course_id = ?");
    $stmt->execute([$traineeId, $courseId]);
    $enrollment = $stmt->fetch();
    if (!$enrollment) {
        respondError('Trainee is not enrolled in this course', 404);
    }

    // 2. Prepare upload directory
    $uploadDir = __DIR__ . '/../../../uploads/verification/';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }

    $safeName = 'verif_' . $courseId . '_' . $traineeId . '_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $targetPath = $uploadDir . $safeName;

    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        respondError('Failed to save uploaded verification document', 500);
    }

    $publicUrl = '/uploads/verification/' . $safeName;

    // 3. Update enrollment record
    $upd = $db->prepare("
        UPDATE trainee_enrollments
        SET training_type = 'external',
            custom_provider_name = COALESCE(NULLIF(?, ''), custom_provider_name),
            custom_provider_website = COALESCE(NULLIF(?, ''), custom_provider_website),
            custom_provider_linkedin = COALESCE(NULLIF(?, ''), custom_provider_linkedin),
            verification_doc_url = ?,
            verification_status = 'pending',
            verification_feedback = NULL,
            verification_reviewed_by = NULL,
            verification_reviewed_at = NULL
        WHERE trainee_id = ? AND course_id = ?
    ");
    $upd->execute([
        $customName,
        $customWebsite,
        $customLinkedin,
        $publicUrl,
        $traineeId,
        $courseId
    ]);

    // 4. Send notification to Admins
    try {
        $admins = $db->query("SELECT id FROM users WHERE is_admin = 1 OR role = 'admin'")->fetchAll(PDO::FETCH_COLUMN);
        $nStmt = $db->prepare("
            INSERT INTO notifications (user_id, type, message_en, message_ar)
            VALUES (?, 'verification_submitted', ?, ?)
        ");
        $sName = $user['full_name'] ?: 'A student';
        $msgEn = "$sName submitted an external training verification document for review.";
        $msgAr = "قام الطالب $sName برفع وثيقة إثبات تدريب خارجي للمراجعة والاعتماد.";
        foreach ($admins as $aId) {
            $nStmt->execute([(int)$aId, $msgEn, $msgAr]);
        }
    } catch (Throwable $ne) {}

    respond([
        'success' => true,
        'message' => 'Verification document uploaded successfully and is pending admin review',
        'verification_doc_url' => $publicUrl,
        'verification_status' => 'pending'
    ]);
} catch (Throwable $e) {
    respondError('Server error: ' . $e->getMessage(), 500);
}
