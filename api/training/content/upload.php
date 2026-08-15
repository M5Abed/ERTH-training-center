<?php
// =========================================================
// NMU TRAINING — Upload Topic Material (PDF/Word/Video)
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$topicId = (int)($_POST['topic_id'] ?? 0);
$titleEn = sanitizeString($_POST['title'] ?? '');
$titleAr = sanitizeString($_POST['title'] ?? '');
$type    = trim(strtolower($_POST['type'] ?? 'pdf')); // pdf, word, video

if (!$topicId || empty($_FILES['file'])) {
    respondError('Topic ID and file upload are required');
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    respondError('File upload failed with error code ' . $file['error']);
}

// 20MB Max size limit
$maxSizeBytes = 20 * 1024 * 1024;
if ($file['size'] > $maxSizeBytes) {
    respondError('File size exceeds maximum allowed limit (20MB)');
}

// Allowed extensions
$allowedExts = [
    'pdf'   => ['pdf'],
    'word'  => ['doc', 'docx'],
    'video' => ['mp4', 'mov', 'webm', 'mkv']
];
$db = db();
$topicRow = $db->prepare("SELECT tt.course_id, tt.title FROM training_topics tt WHERE tt.id = ?");
$topicRow->execute([$topicId]);
$topic = $topicRow->fetch();
if (!$topic) {
    respondError('Topic not found', 404);
}

// Enforce Object-Level Authorization for Trainer
verifyCourseAccess((int)$topic['course_id'], $user);

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$validExts = $allowedExts[$type] ?? ['pdf', 'doc', 'docx', 'mp4'];

if (!in_array($ext, $validExts, true)) {
    respondError("Invalid file type .$ext for category $type");
}

// Server-side real MIME type verification
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$detectedMime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

$allowedMimes = [
    'pdf'   => ['application/pdf'],
    'word'  => ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'],
    'video' => ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
];
$categoryMimes = $allowedMimes[$type] ?? [];
if ($categoryMimes && !in_array($detectedMime, $categoryMimes, true)) {
    respondError("Uploaded file contents do not match the expected $type format.");
}

// Create uploads directory: /uploads/training/{topic_id}/
$uploadDir = __DIR__ . '/../../../uploads/training/' . $topicId . '/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$filename = 'material_' . bin2hex(random_bytes(12)) . '.' . $ext;
$targetPath = $uploadDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    respondError('Failed to save uploaded file on server', 500);
}

// Public URL path
$publicUrl = '/uploads/training/' . $topicId . '/' . $filename;

$stmt = $db->prepare("
    INSERT INTO topic_content (topic_id, uploaded_by, type, title, url, file_size)
    VALUES (?, ?, ?, ?, ?, ?)
");
$stmt->execute([
    $topicId,
    $user['id'],
    $type,
    $titleEn ?: $file['name'],
    $publicUrl,
    $file['size']
]);
$contentId = (int)$db->lastInsertId();
if ($topic) {
    $enrolledStmt = $db->prepare("SELECT trainee_id FROM trainee_enrollments WHERE course_id = ?");
    $enrolledStmt->execute([$topic['course_id']]);
    $enrolled = $enrolledStmt->fetchAll(PDO::FETCH_COLUMN);
    if ($enrolled) {
        $matTitle = $titleEn ?: $file['name'];
        $nStmt = $db->prepare("INSERT INTO notifications (user_id, type, message_en, message_ar) VALUES (?, 'new_content', ?, ?)");
        foreach ($enrolled as $tid) {
            $msgEn = "New material added to topic \"{$topic['title']}\": $matTitle";
            $msgAr = "تم إضافة مادة جديدة إلى الموضوع \"{$topic['title']}\": $matTitle";
            $nStmt->execute([(int)$tid, $msgEn, $msgAr]);
        }
    }
}

respond([
    'success' => true,
    'message' => 'Material uploaded successfully',
    'content_id' => $contentId,
    'url' => $publicUrl
], 201);
