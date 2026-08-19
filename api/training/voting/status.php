<?php
// =========================================================
// NMU TRAINING — Get Course Voting Status & Eligible Projects
// GET /api/training/voting/status.php?course_id=X
// Access: Trainee, Trainer, or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid  = (int)$user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isAdmin = (bool)($user['is_admin'] || $role === 'admin');
$canVote = ($role === 'trainer' || $isAdmin);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_GET['course_id'] ?? 0);
if (!$courseId) {
    respondError('course_id is required');
}

$db = db();

// Fetch course details
$cStmt = $db->prepare("SELECT id, name, name AS name_ar, voting_status FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();

if (!$course) {
    respondError('Course not found', 404);
}

// Fetch user's existing votes for this course
$vStmt = $db->prepare("SELECT project_id FROM course_project_votes WHERE course_id = ? AND voter_id = ?");
$vStmt->execute([$courseId, $uid]);
$myVotes = $vStmt->fetchAll(PDO::FETCH_COLUMN);

// Fetch all eligible projects in this course
$pStmt = $db->prepare("
    SELECT 
        ti.id,
        COALESCE(ti.title, 'Untitled Project') AS title,
        COALESCE(ti.description, '') AS description,
        ti.tech_stack,
        ti.status,
        ti.course_id,
        ti.owner_id AS trainee_id,
        u.full_name AS trainee_name,
        u.student_id,
        u.email AS trainee_email,
        u.avatar_url AS trainee_avatar,
        COUNT(DISTINCT cpv.id) AS vote_count,
        ti.created_at
    FROM training_ideas ti
    JOIN users u ON u.id = ti.owner_id
    LEFT JOIN course_project_votes cpv ON (cpv.project_id = ti.id AND cpv.course_id = ti.course_id)
    WHERE ti.course_id = ?
    GROUP BY ti.id
    ORDER BY vote_count DESC, ti.id ASC
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
            $p['vote_count']   = (int)$p['vote_count'];
        }
        unset($p);
    } catch (Exception $e) {}
}

// Calculate Top 5 Projects by Votes
$top5 = [];
$rank = 1;
foreach ($projects as $p) {
    if ($rank <= 5) {
        $top5[] = [
            'id'           => $p['id'],
            'title'        => $p['title'],
            'trainee_name' => $p['trainee_name'],
            'student_id'   => $p['student_id'],
            'team_members' => $p['team_members'] ?? [],
            'vote_count'   => (int)$p['vote_count'],
            'vote_rank'    => $rank
        ];
    }
    $rank++;
}

// Count total unique voters who participated
$votersCount = $db->prepare("SELECT COUNT(DISTINCT voter_id) FROM course_project_votes WHERE course_id = ?");
$votersCount->execute([$courseId]);
$totalVoters = (int)$votersCount->fetchColumn();

respond([
    'success'           => true,
    'course'            => $course,
    'voting_status'     => $course['voting_status'] ?? 'not_started',
    'can_vote'          => $canVote,
    'has_voted'         => !empty($myVotes),
    'my_votes'          => array_map('intval', $myVotes),
    'total_voters'      => $totalVoters,
    'eligible_projects' => $projects,
    'top_5_projects'    => $top5
]);
