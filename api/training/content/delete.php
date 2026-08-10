<?php
// =========================================================
// NMU TRAINING — Delete Topic Material
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$contentId = (int)($data['id'] ?? 0);

if (!$contentId) {
    respondError('Content ID is required');
}

$db = db();
$stmt = $db->prepare("DELETE FROM topic_content WHERE id = ?");
$stmt->execute([$contentId]);

respond([
    'success' => true,
    'message' => 'Material deleted successfully'
]);
