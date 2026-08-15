<?php
// =========================================================
// NMU TRAINING — List All Trainee Submitted Projects / Ideas
// Access: Trainee (sees own & team ideas), Trainer / Admin (sees all submitted ideas)
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int) $user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isAdmin = (bool) ($user['is_admin'] || $role === 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = isset($_GET['course_id']) && $_GET['course_id'] !== '' ? (int) $_GET['course_id'] : null;
$statusFilter = isset($_GET['status']) && $_GET['status'] !== '' ? trim($_GET['status']) : null;

$db = db();

$params = [];
$whereClauses = [];

if ($role === 'trainee' && !$isAdmin) {
    // Trainee views ideas where they are owner or a team member
    $whereClauses[] = "(ti.owner_id = ? OR EXISTS (SELECT 1 FROM training_idea_members tim WHERE tim.idea_id = ti.id AND tim.user_id = ?))";
    $params[] = $uid;
    $params[] = $uid;
}

if ($courseId) {
    $whereClauses[] = "ti.course_id = ?";
    $params[] = $courseId;
}

if ($statusFilter) {
    $whereClauses[] = "ti.status = ?";
    $params[] = $statusFilter;
}

$whereSql = $whereClauses ? "WHERE " . implode(" AND ", $whereClauses) : "";

$sql = "
    SELECT ti.*, 
           u.full_name AS trainee_name, 
           u.email AS trainee_email, 
           u.student_id,
           tc.name AS course_name,
           rev.full_name AS reviewer_name,
           rev.email AS reviewer_email
    FROM training_ideas ti
    JOIN users u ON ti.owner_id = u.id
    JOIN training_courses tc ON ti.course_id = tc.id
    LEFT JOIN users rev ON ti.reviewed_by = rev.id
    $whereSql
    ORDER BY ti.updated_at DESC
";

function attachTeamMembers($db, array &$ideas, int $currentUserId) {
    if (empty($ideas)) return;

    $ideaIds = array_column($ideas, 'id');
    $inClause = implode(',', array_fill(0, count($ideaIds), '?'));

    $membersByIdea = [];
    try {
        $mStmt = $db->prepare("
            SELECT tim.idea_id, tim.user_id, tim.role, 
                   u.full_name, u.student_id, u.email, u.avatar_url, u.username,
                   u.major, u.academic_year, u.department
            FROM training_idea_members tim
            JOIN users u ON tim.user_id = u.id
            WHERE tim.idea_id IN ($inClause)
            ORDER BY CASE WHEN tim.role = 'leader' THEN 0 ELSE 1 END, u.full_name ASC
        ");
        $mStmt->execute($ideaIds);
        $allMembers = $mStmt->fetchAll();

        foreach ($allMembers as $m) {
            $membersByIdea[$m['idea_id']][] = [
                'user_id' => (int) $m['user_id'],
                'id' => (int) $m['user_id'],
                'role' => $m['role'],
                'full_name' => $m['full_name'] ?: $m['username'] ?: $m['email'],
                'student_id' => $m['student_id'],
                'email' => $m['email'],
                'avatar_url' => $m['avatar_url'],
                'username' => $m['username'],
                'major' => $m['major'],
                'academic_year' => $m['academic_year'],
                'department' => $m['department']
            ];
        }
    } catch (Exception $e) {
        error_log('Error attaching team members: ' . $e->getMessage());
    }

    foreach ($ideas as &$idea) {
        $id = $idea['id'];
        $members = $membersByIdea[$id] ?? [];

        // Fallback for legacy records missing member rows
        if (empty($members) && !empty($idea['owner_id'])) {
            $members[] = [
                'user_id' => (int) $idea['owner_id'],
                'id' => (int) $idea['owner_id'],
                'role' => 'leader',
                'full_name' => $idea['trainee_name'] ?? 'Team Leader',
                'student_id' => $idea['student_id'] ?? null,
                'email' => $idea['trainee_email'] ?? null,
                'avatar_url' => null,
                'username' => null
            ];
        }

        $myRole = null;
        foreach ($members as $mem) {
            if ($mem['user_id'] === $currentUserId) {
                $myRole = $mem['role'];
                break;
            }
        }
        if (!$myRole && (int) ($idea['owner_id'] ?? 0) === $currentUserId) {
            $myRole = 'leader';
        }

        $idea['team_members'] = $members;
        $idea['my_team_role'] = $myRole;
        $idea['is_team_leader'] = ($myRole === 'leader' || (int) ($idea['owner_id'] ?? 0) === $currentUserId);
    }
}

function attachVotesAndTrainers($db, array &$ideas, int $currentUserId) {
    if (empty($ideas)) return;

    $ideaIds = array_column($ideas, 'id');
    $courseIds = array_unique(array_filter(array_column($ideas, 'course_id')));
    
    $inClause = implode(',', array_fill(0, count($ideaIds), '?'));

    // Fetch assigned course trainers
    $courseTrainersMap = [];
    if (!empty($courseIds)) {
        try {
            $cInClause = implode(',', array_fill(0, count($courseIds), '?'));
            $tStmt = $db->prepare("
                SELECT ta.course_id, tu.full_name AS trainer_name, tu.email AS trainer_email
                FROM trainer_assignments ta
                JOIN users tu ON ta.trainer_id = tu.id
                WHERE ta.course_id IN ($cInClause)
            ");
            $tStmt->execute(array_values($courseIds));
            $tRows = $tStmt->fetchAll();
            foreach ($tRows as $tr) {
                $courseTrainersMap[$tr['course_id']][] = $tr['trainer_name'];
            }
        } catch (Exception $e) {}
    }

    try {
        $votesSql = "
            SELECT tv.*, u.full_name AS evaluator_name, u.role AS evaluator_role
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
            $cId = $idea['course_id'];
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

            // Assigned trainers fallback if reviewer_name not present
            $assignedList = $courseTrainersMap[$cId] ?? [];
            $idea['assigned_trainers'] = implode(', ', array_unique($assignedList));
            $idea['effective_trainer_name'] = $idea['reviewer_name'] ?: ($idea['assigned_trainers'] ?: 'Course Trainer');
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
            $idea['assigned_trainers'] = '';
            $idea['effective_trainer_name'] = $idea['reviewer_name'] ?: 'Course Trainer';
        }
    }
}

$stmt = $db->prepare($sql);
$stmt->execute($params);
$ideas = $stmt->fetchAll();

attachVotesAndTrainers($db, $ideas, $uid);
attachTeamMembers($db, $ideas, $uid);

respond([
    'success' => true,
    'ideas' => $ideas
]);
