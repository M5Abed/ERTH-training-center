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
$title       = sanitizeString($data['title'] ?? '');
$description = sanitizeString($data['description'] ?? '');
$dueDate       = trim($data['due_date'] ?? '');

if (!$topicId || !$title) {
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

$providerId = isset($data['provider_id']) ? ($data['provider_id'] === '' || $data['provider_id'] === '0' || $data['provider_id'] === null ? null : (int)$data['provider_id']) : null;

try {
    $stmt = $db->prepare("
        UPDATE training_topics 
        SET title = ?, 
            description = ?, 
            due_date = ?, 
            provider_id = ?
        WHERE id = ?
    ");
    $stmt->execute([
        $title,
        $description ?: null,
        $dueDate ?: null,
        $providerId,
        $topicId
    ]);

    respond([
        'success' => true,
        'message' => 'Track updated successfully',
        'topic_id' => $topicId
    ]);
} catch (Throwable $e) {
    error_log('Failed to update topic/track: ' . $e->getMessage());
    respondError('Failed to update track: ' . $e->getMessage(), 500);
}
