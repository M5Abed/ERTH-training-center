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
$titleEn       = sanitizeString($data['title'] ?? '');
$titleAr       = sanitizeString($data['title'] ?? '');
$descriptionEn = sanitizeString($data['description'] ?? '');
$descriptionAr = sanitizeString($data['description'] ?? '');
$dueDate       = trim($data['due_date'] ?? '');

if (!$topicId || !$titleEn) {
    respondError('Topic ID and title are required');
}

$db = db();
$tStmt = $db->prepare("SELECT course_id FROM training_topics WHERE id = ?");
$tStmt->execute([$topicId]);
$topic = $tStmt->fetch();
if (!$topic) {
    respondError('Topic not found', 404);
}

verifyCourseAccess((int)$topic['course_id'], $user);

$stmt = $db->prepare("
    UPDATE training_topics 
    SET title = ?, description = ?, due_date = ?
    WHERE id = ?
");
$stmt->execute([
    $titleEn,
    $descriptionEn ?: null,
    $dueDate ?: null,
    $topicId
]);

respond([
    'success' => true,
    'message' => 'Topic updated successfully',
    'topic_id' => $topicId
]);
