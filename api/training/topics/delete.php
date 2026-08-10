<?php
// =========================================================
// NMU TRAINING — Delete Topic
// Access: Admin or Trainer
// =========================================================

require_once __DIR__ . '/../../config.php';

requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$topicId = (int)($data['id'] ?? 0);

if (!$topicId) {
    respondError('Topic ID is required');
}

$db = db();
$stmt = $db->prepare("DELETE FROM training_topics WHERE id = ?");
$stmt->execute([$topicId]);

respond([
    'success' => true,
    'message' => 'Topic deleted successfully'
]);
