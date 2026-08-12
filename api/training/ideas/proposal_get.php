<?php
// =========================================================
// NMU TRAINING — Get Full Proposal for an Idea
// Access: Trainee (own idea), Trainer, Admin
// Returns the stored proposal_json for a given idea_id.
// =========================================================

require_once __DIR__ . '/../../config.php';

$user   = requireRole(['trainee', 'trainer', 'admin']);
$uid    = (int)$user['id'];
$role   = strtolower($user['role'] ?? 'trainee');
$isEval = (bool)($user['is_admin'] || $role === 'admin' || $role === 'trainer');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$ideaId = (int)($_GET['idea_id'] ?? 0);
if (!$ideaId) {
    respondError('idea_id is required');
}

$db = db();

// Fetch the idea — trainees can only read their own idea
if ($isEval) {
    $stmt = $db->prepare('SELECT id, owner_id, title_en, proposal_json, catalog_key FROM training_ideas WHERE id = ?');
    $stmt->execute([$ideaId]);
} else {
    $stmt = $db->prepare('SELECT id, owner_id, title_en, proposal_json, catalog_key FROM training_ideas WHERE id = ? AND owner_id = ?');
    $stmt->execute([$ideaId, $uid]);
}

$idea = $stmt->fetch();

if (!$idea) {
    respondError('Idea not found or access denied', 404);
}

$proposal = null;
if (!empty($idea['proposal_json'])) {
    $decoded = json_decode($idea['proposal_json'], true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $proposal = $decoded;
    }
}

respond([
    'idea_id'     => (int)$idea['id'],
    'title'       => $idea['title_en'],
    'catalog_key' => $idea['catalog_key'],
    'proposal'    => $proposal,
]);
