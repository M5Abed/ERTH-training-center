<?php
// =========================================================
// NMU TRAINING — Reorder Topics
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$items = $data['items'] ?? [];

if (!is_array($items)) {
    respondError('Items array is required');
}

$db = db();
$stmt = $db->prepare("UPDATE training_topics SET order_index = ? WHERE id = ?");

foreach ($items as $item) {
    if (isset($item['id']) && isset($item['order_index'])) {
        $stmt->execute([(int)$item['order_index'], (int)$item['id']]);
    }
}

respond([
    'success' => true,
    'message' => 'Topics reordered successfully'
]);
