<?php
// =========================================================
// NMU TRAINING — List Materials for Topic
// Access: All authenticated users
// =========================================================

require_once __DIR__ . '/../../config.php';

requireRole(['trainee', 'trainer', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$topicId = (int)($_GET['topic_id'] ?? 0);
if (!$topicId) {
    respondError('Topic ID is required');
}

$db = db();
$stmt = $db->prepare("
    SELECT tc.*, u.full_name AS uploader_name
    FROM topic_content tc
    LEFT JOIN users u ON tc.uploaded_by = u.id
    WHERE tc.topic_id = ?
    ORDER BY tc.created_at DESC
");
$stmt->execute([$topicId]);
$content = $stmt->fetchAll();

respond(['content' => $content]);
