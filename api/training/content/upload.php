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
$titleEn = sanitizeString($_POST['title_en'] ?? '');
$titleAr = sanitizeString($_POST['title_ar'] ?? '');
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
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$validExts = $allowedExts[$type] ?? ['pdf', 'doc', 'docx', 'mp4'];

if (!in_array($ext, $validExts, true)) {
    respondError("Invalid file type .$ext for category $type");
}

// Create uploads directory: /uploads/training/{topic_id}/
$uploadDir = __DIR__ . '/../../../uploads/training/' . $topicId . '/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$filename = uniqid('material_', true) . '.' . $ext;
$targetPath = $uploadDir . $filename;

if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
    respondError('Failed to save uploaded file on server', 500);
}

// Public URL path
$publicUrl = '/uploads/training/' . $topicId . '/' . $filename;

$db = db();
$stmt = $db->prepare("
    INSERT INTO topic_content (topic_id, uploaded_by, type, title_en, title_ar, url, file_size)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");
$stmt->execute([
    $topicId,
    $user['id'],
    $type,
    $titleEn ?: $file['name'],
    $titleAr ?: null,
    $publicUrl,
    $file['size']
]);
$contentId = (int)$db->lastInsertId();

// Notify enrolled trainees of new material
$topicRow = $db->prepare("SELECT tt.course_id, tt.title_en FROM training_topics tt WHERE tt.id = ?");
$topicRow->execute([$topicId]);
$topic = $topicRow->fetch();
if ($topic) {
    $enrolledStmt = $db->prepare("SELECT trainee_id FROM trainee_enrollments WHERE course_id = ?");
    $enrolledStmt->execute([$topic['course_id']]);
    $enrolled = $enrolledStmt->fetchAll(PDO::FETCH_COLUMN);
    if ($enrolled) {
        $matTitle = $titleEn ?: $file['name'];
        $nStmt = $db->prepare("INSERT INTO notifications (user_id, type, message_en, message_ar) VALUES (?, 'new_content', ?, ?)");
        foreach ($enrolled as $tid) {
            $msgEn = "New material added to topic \"{$topic['title_en']}\": $matTitle";
            $msgAr = "تم إضافة مادة جديدة إلى الموضوع \"{$topic['title_en']}\": $matTitle";
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
