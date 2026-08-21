<?php
// =========================================================
// NMU TRAINING — Delete Topic
// Access: Admin or Trainer
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$topicId = (int)($data['id'] ?? 0);

if (!$topicId) {
    respondError('Topic ID is required');
}

$db = db();
$tStmt = $db->prepare("SELECT course_id FROM training_topics WHERE id = ?");
$tStmt->execute([$topicId]);
$topic = $tStmt->fetch();
if (!$topic) {
    respondError('Topic not found', 404);
}

verifyCourseAccess((int)$topic['course_id'], $user);

try {
    $db->prepare("DELETE FROM topic_content WHERE topic_id = ?")->execute([$topicId]);
    $db->prepare("DELETE FROM trainee_topic_progress WHERE topic_id = ?")->execute([$topicId]);
} catch (Throwable $e) {}

$stmt = $db->prepare("DELETE FROM training_topics WHERE id = ?");
$stmt->execute([$topicId]);

respond([
    'success' => true,
    'message' => 'Topic deleted successfully'
]);
