<?php
// =========================================================
// NMU TRAINING — Submit End-of-Course Ballot (Up to 5 Projects)
// POST /api/training/voting/cast.php
// Body: { course_id: int, project_ids: [int, ...] }
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$evaluator   = requireTrainer();
$voterId     = (int)$evaluator['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data       = body();
$courseId   = (int)($data['course_id'] ?? 0);
$projectIds = $data['project_ids'] ?? [];

if (!$courseId) {
    respondError('course_id is required');
}

if (!is_array($projectIds) || empty($projectIds)) {
    respondError('Please select at least 1 project to vote');
}

// ── Rule: Max 5 selections ──────────────────────────────
$uniqueProjectIds = array_values(array_unique(array_filter(array_map('intval', $projectIds))));

if (count($uniqueProjectIds) === 0) {
    respondError('Please select at least 1 valid project');
}

if (count($uniqueProjectIds) > 5) {
    respondError('You can select up to 5 projects only', 422);
}

$db = db();

// Enforce Object-Level Authorization
verifyCourseAccess($courseId, $evaluator);

// ── Rule: Course must have voting open ───────────────────
$cStmt = $db->prepare("SELECT id, voting_status FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();

if (!$course) {
    respondError('Course not found', 404);
}

if (($course['voting_status'] ?? 'not_started') !== 'open') {
    respondError('Voting is currently closed or not started for this course', 403);
}

// ── Rule: Prevent duplicate ballot submission ───────────
$existingVotes = $db->prepare("SELECT COUNT(*) FROM course_project_votes WHERE course_id = ? AND voter_id = ?");
$existingVotes->execute([$courseId, $voterId]);
if ((int)$existingVotes->fetchColumn() > 0) {
    respondError('You have already submitted your votes for this course', 409);
}

// ── Rule: Verify all projects belong to this course ──────
$inClause = implode(',', array_fill(0, count($uniqueProjectIds), '?'));
$vParams = array_merge([$courseId], $uniqueProjectIds);
$checkStmt = $db->prepare("
    SELECT id FROM training_ideas 
    WHERE course_id = ? AND id IN ($inClause)
");
$checkStmt->execute($vParams);
$validIds = $checkStmt->fetchAll(PDO::FETCH_COLUMN);

if (count($validIds) !== count($uniqueProjectIds)) {
    respondError('One or more selected projects do not belong to this course or do not exist', 422);
}

// ── Insert votes in transaction ─────────────────────────
try {
    $db->beginTransaction();

    $insStmt = $db->prepare("
        INSERT INTO course_project_votes (course_id, project_id, voter_id, created_at)
        VALUES (?, ?, ?, NOW())
    ");

    foreach ($uniqueProjectIds as $pId) {
        $insStmt->execute([$courseId, $pId, $voterId]);
    }

    $db->commit();

    respond([
        'success'     => true,
        'message'     => 'Your votes have been submitted successfully',
        'votes_cast'  => count($uniqueProjectIds)
    ]);
} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    respondError('Database error while saving votes: ' . $e->getMessage(), 500);
}
