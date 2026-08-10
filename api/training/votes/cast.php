<?php
// =========================================================
// NMU TRAINING — Cast / Update a Vote on a Training Idea
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$reviewer = requireTrainer(); // trainer or admin

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data   = body();
$ideaId = (int)($data['idea_id'] ?? 0);
$rating = (int)($data['rating']  ?? 0);
$notes  = sanitizeString($data['notes'] ?? '');

if (!$ideaId || $rating < 1 || $rating > 5) {
    respondError('Valid idea_id and rating (1-5) are required');
}

$db = db();

// Upsert vote
$stmt = $db->prepare("
    INSERT INTO training_votes (idea_id, evaluator_id, rating, notes, voted_at)
    VALUES (?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE rating = VALUES(rating), notes = VALUES(notes), voted_at = NOW()
");
$stmt->execute([$ideaId, (int)$reviewer['id'], $rating, $notes ?: null]);

// Return updated average for this idea
$avg = $db->prepare("SELECT AVG(rating) AS avg_rating, COUNT(*) AS vote_count FROM training_votes WHERE idea_id = ?");
$avg->execute([$ideaId]);
$agg = $avg->fetch();

respond([
    'success'    => true,
    'message'    => 'Vote saved',
    'avg_rating' => $agg ? round((float)$agg['avg_rating'], 1) : $rating,
    'vote_count' => $agg ? (int)$agg['vote_count'] : 1,
]);
