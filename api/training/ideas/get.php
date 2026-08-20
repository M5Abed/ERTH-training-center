<?php
// =========================================================
// NMU TRAINING — Get Ideas for Course
// Access: Trainee (sees own or team project), Trainer / Admin (sees all ideas)
// Includes vote summary and team members list
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int) $user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isAdmin = (bool) ($user['is_admin'] || $role === 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int) ($_GET['course_id'] ?? 0);
if (!$courseId) {
    respondError('Course ID is required');
}

$db = db();

function attachTeamMembersToIdeas($db, array &$ideas, int $currentUserId) {
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
                'full_name' => $idea['trainee_name'] ?? $idea['owner_name'] ?? 'Team Leader',
                'student_id' => $idea['student_id'] ?? $idea['owner_student_id'] ?? null,
                'email' => $idea['trainee_email'] ?? $idea['owner_email'] ?? null,
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

function attachVotesToIdeas($db, array &$ideas, int $currentUserId) {
    if (empty($ideas)) return;

    $ideaIds = array_column($ideas, 'id');
    $inClause = implode(',', array_fill(0, count($ideaIds), '?'));

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
    // Trainee gets their idea or team project for this course
    $stmt = $db->prepare("
        SELECT ti.*, 
               u.full_name AS reviewer_name,
               owner.full_name AS trainee_name,
               owner.full_name AS owner_name,
               owner.email AS trainee_email,
               owner.email AS owner_email,
               owner.student_id AS student_id,
               owner.student_id AS owner_student_id,
               te.training_type,
               te.provider_id,
               te.track_id,
               te.custom_provider_name,
               te.custom_provider_website,
               te.custom_provider_linkedin,
               te.verification_doc_url,
               te.verification_status,
               te.verification_feedback,
               p.name AS provider_name,
               p.is_contracted AS provider_is_contracted,
               tt.title AS track_name
        FROM training_ideas ti
        JOIN users owner ON ti.owner_id = owner.id
        LEFT JOIN users u ON ti.reviewed_by = u.id
        LEFT JOIN trainee_enrollments te ON (te.trainee_id = ti.owner_id AND te.course_id = ti.course_id)
        LEFT JOIN external_training_providers p ON te.provider_id = p.id
        LEFT JOIN training_topics tt ON te.track_id = tt.id
        WHERE ti.course_id = ?
          AND (ti.owner_id = ? OR EXISTS (
              SELECT 1 FROM training_idea_members tim WHERE tim.idea_id = ti.id AND tim.user_id = ?
          ))
        LIMIT 1
    ");
    $stmt->execute([$courseId, $uid, $uid]);
    $idea = $stmt->fetch();
    if ($idea) {
        $ideasArr = [$idea];
        attachVotesToIdeas($db, $ideasArr, $uid);
        attachTeamMembersToIdeas($db, $ideasArr, $uid);
        $idea = $ideasArr[0];
    }
    respond(['idea' => $idea ?: null]);
} else {
    // Trainer/Admin gets list of all trainee ideas for this course
    $stmt = $db->prepare("
        SELECT ti.*, 
               u.full_name AS trainee_name, 
               u.email AS trainee_email, 
               u.student_id,
               rev.full_name AS reviewer_name,
               te.training_type,
               te.provider_id,
               te.track_id,
               te.custom_provider_name,
               te.verification_status,
               p.name AS provider_name,
               tt.title AS track_name
        FROM training_ideas ti
        JOIN users u ON ti.owner_id = u.id
        LEFT JOIN users rev ON ti.reviewed_by = rev.id
        LEFT JOIN trainee_enrollments te ON (te.trainee_id = ti.owner_id AND te.course_id = ti.course_id)
        LEFT JOIN external_training_providers p ON te.provider_id = p.id
        LEFT JOIN training_topics tt ON te.track_id = tt.id
        WHERE ti.course_id = ?
        ORDER BY ti.updated_at DESC
    ");
    $stmt->execute([$courseId]);
    $ideas = $stmt->fetchAll();
    attachVotesToIdeas($db, $ideas, $uid);
    attachTeamMembersToIdeas($db, $ideas, $uid);
    respond(['ideas' => $ideas]);
}
