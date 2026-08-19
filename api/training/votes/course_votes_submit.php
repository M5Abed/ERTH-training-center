<?php
// =========================================================
// NMU TRAINING — Submit / Cast End-of-Course Votes
// POST /api/training/votes/course_votes_submit.php
// Body: { course_id: int, project_ids: [int, int, ...] }
// Access: Authorized Trainer or Admin
// Validation: max 5 selections, voting must be open, projects must belong to course
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireTrainer(); // trainer or admin
$uid  = (int)$user['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data       = body();
$courseId   = (int)($data['course_id'] ?? 0);
$projectIds = $data['project_ids'] ?? [];

if (!$courseId) {
    respondError('course_id is required', 400);
}

if (!is_array($projectIds)) {
    respondError('project_ids must be an array', 422);
}

// Clean and deduplicate IDs
$cleanProjectIds = [];
foreach ($projectIds as $pId) {
    $id = (int)$pId;
    if ($id > 0 && !in_array($id, $cleanProjectIds, true)) {
        $cleanProjectIds[] = $id;
    }
}

if (count($cleanProjectIds) > 5) {
    respondError('You can select up to 5 projects.', 422);
}

$db = db();

// 1. Verify course and voting lifecycle status
$cStmt = $db->prepare("SELECT id, name, voting_status FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();
if (!$course) {
    respondError('Course not found', 404);
}

if (($course['voting_status'] ?? '') !== 'open') {
    if (($course['voting_status'] ?? '') === 'closed') {
        respondError('Voting is closed for this course.', 403);
    } else {
        respondError('Voting has not started yet for this course.', 403);
    }
}

// Enforce course-level authorization for trainers
verifyCourseAccess($courseId, $user);

// 2. Verify all selected projects belong to this course
if (!empty($cleanProjectIds)) {
    $inClause = implode(',', array_fill(0, count($cleanProjectIds), '?'));
    $checkStmt = $db->prepare("
        SELECT id 
        FROM training_ideas 
        WHERE course_id = ? AND status != 'rejected' AND id IN ($inClause)
    ");
    $checkParams = array_merge([$courseId], $cleanProjectIds);
    $checkStmt->execute($checkParams);
    $validIds = array_map('intval', $checkStmt->fetchAll(PDO::FETCH_COLUMN));

    if (count($validIds) !== count($cleanProjectIds)) {
        respondError('One or more selected projects are invalid or do not belong to this course.', 422);
    }
}

// 3. Atomically update voter's selections
try {
    $db->beginTransaction();

    // Delete existing votes for this course by this voter
    $del = $db->prepare("DELETE FROM course_project_votes WHERE course_id = ? AND voter_id = ?");
    $del->execute([$courseId, $uid]);

    // Insert new votes
    if (!empty($cleanProjectIds)) {
        $ins = $db->prepare("
            INSERT INTO course_project_votes (course_id, project_id, voter_id, created_at)
            VALUES (?, ?, ?, NOW())
        ");
        foreach ($cleanProjectIds as $pId) {
            $ins->execute([$courseId, $pId, $uid]);
        }
    }

    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();
    respondError('Failed to record votes: ' . $e->getMessage(), 500);
}

// 4. Return updated voting state
$myVotesStmt = $db->prepare("SELECT project_id FROM course_project_votes WHERE course_id = ? AND voter_id = ?");
$myVotesStmt->execute([$courseId, $uid]);
$updatedVotes = array_map('intval', $myVotesStmt->fetchAll(PDO::FETCH_COLUMN));

respond([
    'success'    => true,
    'message'    => 'Your votes have been submitted successfully.',
    'course_id'  => $courseId,
    'my_votes'   => $updatedVotes,
    'vote_count' => count($updatedVotes)
]);
