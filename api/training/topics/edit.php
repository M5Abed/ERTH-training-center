<?php
// =========================================================
// NMU TRAINING — Edit Topic
// Access: Admin or Assigned Trainer
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$topicId       = (int)($data['id'] ?? 0);
$titleEn       = sanitizeString($data['title_en'] ?? '');
$titleAr       = sanitizeString($data['title_ar'] ?? '');
$descriptionEn = sanitizeString($data['description_en'] ?? '');
$descriptionAr = sanitizeString($data['description_ar'] ?? '');
$dueDate       = trim($data['due_date'] ?? '');

if (!$topicId || !$titleEn) {
    respondError('Topic ID and title are required');
}

$db = db();
$stmt = $db->prepare("
    UPDATE training_topics 
    SET title_en = ?, title_ar = ?, description_en = ?, description_ar = ?, due_date = ?
    WHERE id = ?
");
$stmt->execute([
    $titleEn,
    $titleAr ?: null,
    $descriptionEn ?: null,
    $descriptionAr ?: null,
    $dueDate ?: null,
    $topicId
]);

respond([
    'success' => true,
    'message' => 'Topic updated successfully',
    'topic_id' => $topicId
]);
