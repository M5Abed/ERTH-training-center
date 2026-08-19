<?php
// =========================================================
// NMU TRAINING — Get Course Projects & Voting State
// GET /api/training/votes/course_votes.php?course_id=X
// Access: Trainee, Trainer, or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid  = (int)$user['id'];
$role = strtolower($user['role'] ?? '');
$isTrainer = (bool)($user['is_admin'] || $role === 'admin' || $role === 'trainer');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_GET['course_id'] ?? 0);
if (!$courseId) {
    respondError('course_id is required', 400);
}

$db = db();

// Check course
$cStmt = $db->prepare("SELECT id, name, voting_status FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();
if (!$course) {
    respondError('Course not found', 404);
}

$votingStatus = $course['voting_status'] ?? 'not_started';

// Fetch all eligible projects in this course
$pStmt = $db->prepare("
    SELECT 
        ti.id,
        COALESCE(ti.title, 'Untitled Project') AS title,
        COALESCE(ti.description, '') AS description,
        ti.tech_stack,
        ti.status,
        ti.owner_id AS trainee_id,
        u.full_name AS trainee_name,
        u.student_id,
        u.email AS trainee_email,
        u.avatar_url AS trainee_avatar,
        te.final_score AS evaluation_score,
        COUNT(DISTINCT cpv.id) AS vote_count,
        ti.created_at
    FROM training_ideas ti
    JOIN users u ON u.id = ti.owner_id
    LEFT JOIN training_evaluations te ON (te.trainee_id = ti.owner_id AND te.course_id = ti.course_id)
    LEFT JOIN course_project_votes cpv ON (cpv.project_id = ti.id AND cpv.course_id = ti.course_id)
    WHERE ti.course_id = ? AND ti.status != 'rejected'
    GROUP BY ti.id
    ORDER BY ti.id ASC
");
$pStmt->execute([$courseId]);
$projects = $pStmt->fetchAll();

// Attach team members
if (!empty($projects)) {
    $projectIds = array_column($projects, 'id');
    $inClause = implode(',', array_fill(0, count($projectIds), '?'));
    try {
        $mStmt = $db->prepare("
            SELECT tim.idea_id, tim.user_id, tim.role, 
                   u.full_name, u.student_id, u.email
            FROM training_idea_members tim
            JOIN users u ON tim.user_id = u.id
            WHERE tim.idea_id IN ($inClause)
            ORDER BY CASE WHEN tim.role = 'leader' THEN 0 ELSE 1 END, u.full_name ASC
        ");
        $mStmt->execute($projectIds);
        $members = $mStmt->fetchAll();
        
        $membersByIdea = [];
        foreach ($members as $m) {
            $membersByIdea[$m['idea_id']][] = [
                'user_id'    => (int)$m['user_id'],
                'role'       => $m['role'],
                'full_name'  => $m['full_name'],
                'student_id' => $m['student_id'],
                'email'      => $m['email']
            ];
        }
        foreach ($projects as &$p) {
            $p['team_members'] = $membersByIdea[$p['id']] ?? [];
        }
        unset($p);
    } catch (Exception $e) {}
}

// Fetch current user's votes for this course
$myVotesStmt = $db->prepare("
    SELECT project_id 
    FROM course_project_votes 
    WHERE course_id = ? AND voter_id = ?
");
$myVotesStmt->execute([$courseId, $uid]);
$myVotes = array_map('intval', $myVotesStmt->fetchAll(PDO::FETCH_COLUMN));

// Calculate Top 5 based on vote_count DESC, id ASC (deterministic tie handling)
$sortedForTop5 = $projects;
usort($sortedForTop5, function($a, $b) {
    $vDiff = (int)$b['vote_count'] - (int)$a['vote_count'];
    if ($vDiff !== 0) return $vDiff;
    return (int)$a['id'] - (int)$b['id'];
});

$top5 = [];
$top5Map = [];
$vRank = 1;
foreach ($sortedForTop5 as $sp) {
    if ($vRank <= 5 && (int)$sp['vote_count'] > 0) {
        $top5Map[$sp['id']] = $vRank;
        $top5[] = [
            'id'               => $sp['id'],
            'title'            => $sp['title'],
            'trainee_name'     => $sp['trainee_name'],
            'student_id'       => $sp['student_id'],
            'team_members'     => $sp['team_members'] ?? [],
            'vote_count'       => (int)$sp['vote_count'],
            'vote_rank'        => $vRank,
            'evaluation_score' => $sp['evaluation_score'] !== null ? round((float)$sp['evaluation_score'], 2) : null
        ];
    }
    $vRank++;
}

foreach ($projects as &$p) {
    $p['vote_count'] = (int)$p['vote_count'];
    $p['is_top_5']   = isset($top5Map[$p['id']]);
    $p['vote_rank']  = $top5Map[$p['id']] ?? null;
    $p['my_voted']   = in_array((int)$p['id'], $myVotes, true);
    $p['evaluation_score'] = $p['evaluation_score'] !== null ? round((float)$p['evaluation_score'], 2) : null;
}
unset($p);

respond([
    'success'       => true,
    'course'        => $course,
    'voting_status' => $votingStatus,
    'can_vote'      => $isTrainer,
    'my_votes'      => $myVotes,
    'max_votes'     => 5,
    'projects'      => $projects,
    'top_5'         => $top5
]);
