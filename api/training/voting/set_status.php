<?php
// =========================================================
// NMU TRAINING — Set Course Voting Lifecycle Status
// POST /api/training/voting/set_status.php
// Body: { course_id: int, status: 'not_started' | 'open' | 'closed' }
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$evaluator = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data     = body();
$courseId = (int)($data['course_id'] ?? 0);
$status   = trim(strtolower($data['status'] ?? ''));

if (!$courseId) {
    respondError('course_id is required');
}

if (!in_array($status, ['not_started', 'open', 'closed'], true)) {
    respondError('Invalid voting status. Allowed: not_started, open, closed');
}

// Enforce Object-Level Authorization
verifyCourseAccess($courseId, $evaluator);

$db = db();
$stmt = $db->prepare("UPDATE training_courses SET voting_status = ? WHERE id = ?");
$stmt->execute([$status, $courseId]);

respond([
    'success'       => true,
    'message'       => "Voting status updated to $status",
    'voting_status' => $status
]);
