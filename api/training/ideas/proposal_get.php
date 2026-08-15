<?php
// =========================================================
// NMU ERTH — Get Full Proposal for an Idea
// Access: Trainee (own idea), Trainer, Admin
// Returns the stored proposal_json for a given idea_id.
// Label returned: "proposal" for trainee, "documentation"
//                 for trainer/admin (same data, different label).
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

// Fetch the idea — trainees can only read their own or team idea
if ($isEval) {
    $stmt = $db->prepare('
        SELECT i.id, i.owner_id, i.title_en, i.proposal_json, i.catalog_project_id,
               i.status, i.course_id
        FROM training_ideas i
        WHERE i.id = ?
    ');
    $stmt->execute([$ideaId]);
} else {
    $stmt = $db->prepare('
        SELECT i.id, i.owner_id, i.title_en, i.proposal_json, i.catalog_project_id,
               i.status, i.course_id
        FROM training_ideas i
        WHERE i.id = ?
          AND (
              i.owner_id = ?
              OR EXISTS (
                  SELECT 1 FROM training_idea_members tim
                  WHERE tim.idea_id = i.id AND tim.user_id = ?
              )
          )
    ');
    $stmt->execute([$ideaId, $uid, $uid]);
}

$idea = $stmt->fetch();

if (!$idea) {
    respondError('Idea not found or access denied', 404);
}

$proposal = null;
$source   = null;
if (!empty($idea['proposal_json'])) {
    $decoded = json_decode($idea['proposal_json'], true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $proposal = $decoded;
        $source   = $decoded['source'] ?? null;
    }
}

// Label: student sees "proposal", staff sees "documentation"
$documentLabel = $isEval ? 'documentation' : 'proposal';

respond([
    'idea_id'            => (int)$idea['id'],
    'title'              => $idea['title_en'],
    'catalog_project_id' => $idea['catalog_project_id'] ? (int)$idea['catalog_project_id'] : null,
    'status'             => $idea['status'],
    'document_label'     => $documentLabel,
    'source'             => $source,
    'proposal'           => $proposal,
]);
