<?php
// =========================================================
// NMU TRAINING — Mark Topic Progress
// Access: Trainee or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'admin']);
$uid = (int)$user['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$topicId = (int)($data['topic_id'] ?? 0);

if (!$topicId) {
    respondError('Topic ID is required');
}

$db = db();
$stmt = $db->prepare("
    INSERT INTO trainee_topic_progress (trainee_id, topic_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE viewed_at = NOW()
");
$stmt->execute([$uid, $topicId]);

respond([
    'success' => true,
    'message' => 'Topic progress updated'
]);
