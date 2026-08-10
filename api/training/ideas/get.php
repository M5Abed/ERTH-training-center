<?php
// =========================================================
// NMU TRAINING — Get Ideas for Course
// Access: Trainee (sees own idea), Trainer / Admin (sees all ideas)
// Includes vote summary for community evaluation
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int)$user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isAdmin = (bool)($user['is_admin'] || $role === 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_GET['course_id'] ?? 0);
if (!$courseId) {
    respondError('Course ID is required');
}

$db = db();

function attachVotesToIdeas($db, array &$ideas, int $currentUserId) {
    if (empty($ideas)) return;

    $ideaIds = array_column($ideas, 'id');
    $inClause = implode(',', array_fill(0, count($ideaIds), '?'));

    try {
        $votesSql = "
            SELECT tv.*, u.full_name_en AS evaluator_name, u.role AS evaluator_role
            FROM training_votes tv
            JOIN users u ON tv.evaluator_id = u.id
            WHERE tv.idea_id IN ($inClause)
            ORDER BY tv.id DESC
        ";
        $vStmt = $db->prepare($votesSql);
        $vStmt->execute($ideaIds);
        $allVotes = $vStmt->fetchAll();

        $votesByIdea = [];
        foreach ($allVotes as $v) {
            $votesByIdea[$v['idea_id']][] = $v;
        }

        foreach ($ideas as &$idea) {
            $id = $idea['id'];
            $votes = $votesByIdea[$id] ?? [];
            $approveCount = 0;
            $rejectCount = 0;
            $myVote = null;
            $myNotes = null;

            foreach ($votes as $v) {
                if ($v['vote'] === 'approve') $approveCount++;
                if ($v['vote'] === 'reject') $rejectCount++;
                if ((int)$v['evaluator_id'] === $currentUserId) {
                    $myVote = $v['vote'];
                    $myNotes = $v['notes'];
                }
            }

            $idea['vote_summary'] = [
                'total_votes' => count($votes),
                'approve_count' => $approveCount,
                'reject_count' => $rejectCount,
                'my_vote' => $myVote,
                'my_notes' => $myNotes,
                'votes_list' => $votes
            ];
        }
    } catch (Exception $e) {
        foreach ($ideas as &$idea) {
            $idea['vote_summary'] = [
                'total_votes' => 0,
                'approve_count' => 0,
                'reject_count' => 0,
                'my_vote' => null,
                'my_notes' => null,
                'votes_list' => []
            ];
        }
    }
}

if ($role === 'trainee' && !$isAdmin) {
    // Trainee gets their single idea for this course
    $stmt = $db->prepare("
        SELECT ti.*, u.full_name_en AS reviewer_name
        FROM training_ideas ti
        LEFT JOIN users u ON ti.reviewed_by = u.id
        WHERE ti.owner_id = ? AND ti.course_id = ?
    ");
    $stmt->execute([$uid, $courseId]);
    $idea = $stmt->fetch();
    if ($idea) {
        $ideasArr = [$idea];
        attachVotesToIdeas($db, $ideasArr, $uid);
        $idea = $ideasArr[0];
    }
    respond(['idea' => $idea ?: null]);
} else {
    // Trainer/Admin gets list of all trainee ideas for this course
    $stmt = $db->prepare("
        SELECT ti.*, u.full_name_en AS trainee_name, u.email AS trainee_email, u.student_id,
               rev.full_name_en AS reviewer_name
        FROM training_ideas ti
        JOIN users u ON ti.owner_id = u.id
        LEFT JOIN users rev ON ti.reviewed_by = rev.id
        WHERE ti.course_id = ?
        ORDER BY ti.updated_at DESC
    ");
    $stmt->execute([$courseId]);
    $ideas = $stmt->fetchAll();
    attachVotesToIdeas($db, $ideas, $uid);
    respond(['ideas' => $ideas]);
}
