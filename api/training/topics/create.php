<?php
// =========================================================
// NMU TRAINING — Create Topic
// Access: Admin or Assigned Trainer
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId      = (int)($data['course_id'] ?? 0);
$titleEn       = sanitizeString($data['title'] ?? '');
$titleAr       = sanitizeString($data['title'] ?? '');
$descriptionEn = sanitizeString($data['description'] ?? '');
$descriptionAr = sanitizeString($data['description'] ?? '');
$dueDate       = trim($data['due_date'] ?? '');

if (!$courseId || !$titleEn) {
    respondError('Course ID and English title are required');
}

$db = db();

// Get max order_index for this course
$ordStmt = $db->prepare("SELECT COALESCE(MAX(order_index), 0) + 1 FROM training_topics WHERE course_id = ?");
$ordStmt->execute([$courseId]);
$nextOrder = (int)$ordStmt->fetchColumn();

$stmt = $db->prepare("
    INSERT INTO training_topics (course_id, title, title, description, description, due_date, order_index)
    VALUES (?, ?, ?, ?, ?, ?, ?)
");
$stmt->execute([
    $courseId,
    $titleEn,
    $titleAr ?: null,
    $descriptionEn ?: null,
    $descriptionAr ?: null,
    $dueDate ?: null,
    $nextOrder
]);
$topicId = (int)$db->lastInsertId();

respond([
    'success' => true,
    'message' => 'Topic created successfully',
    'topic_id' => $topicId
], 201);
