<?php
// =========================================================
// NMU TRAINING â€” Team Management & Member Add/Remove
// Access: Idea Leader / Owner, Admin (or member self-leave)
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int) $user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isAdmin = (bool) ($user['is_admin'] || $role === 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$ideaId = (int) ($data['idea_id'] ?? 0);
$action = trim($data['action'] ?? 'add'); // 'add', 'remove'
$targetUserId = (int) ($data['user_id'] ?? 0);
$targetIdentifier = trim($data['identifier'] ?? ''); // student_id, email, or username

if (!$ideaId) {
    respondError('Project Idea ID is required', 400);
}

$db = db();

// Fetch the idea and verify permissions
$iStmt = $db->prepare("
    SELECT ti.*, tc.name AS course_name 
    FROM training_ideas ti 
    JOIN training_courses tc ON ti.course_id = tc.id
    WHERE ti.id = ?
");
$iStmt->execute([$ideaId]);
$idea = $iStmt->fetch();

if (!$idea) {
    respondError('Project idea not found', 404);
}

$courseId = (int) $idea['course_id'];
$ownerId = (int) $idea['owner_id'];

// Check if current user is owner/leader
$isTrainer = ($isAdmin || in_array($role, ['trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator'], true));
$isLeader = ($uid === $ownerId);
if (!$isLeader && !$isAdmin && !$isTrainer) {
    $checkLeader = $db->prepare("SELECT 1 FROM training_idea_members WHERE idea_id = ? AND user_id = ? AND role = 'leader'");
    $checkLeader->execute([$ideaId, $uid]);
    if ($checkLeader->fetch()) {
        $isLeader = true;
    }
}

if ($action === 'add') {
    if (!$isLeader && !$isAdmin && !$isTrainer) {
        respondError('Only the team leader, trainer, or an administrator can add team members', 403);
    }

    // Resolve target user
    $targetUser = null;
    if ($targetUserId > 0) {
        $uStmt = $db->prepare("SELECT id, full_name, email, student_id, role, major, academic_year, department FROM users WHERE id = ?");
        $uStmt->execute([$targetUserId]);
        $targetUser = $uStmt->fetch();
    } elseif ($targetIdentifier !== '') {
        $uStmt = $db->prepare("
            SELECT id, full_name, email, student_id, role, major, academic_year, department 
            FROM users 
            WHERE LOWER(student_id) = LOWER(?) OR LOWER(email) = LOWER(?) OR CAST(id AS CHAR) = ?
            LIMIT 1
        ");
        $uStmt->execute([$targetIdentifier, $targetIdentifier, $targetIdentifier]);
        $targetUser = $uStmt->fetch();
    }

    if (!$targetUser) {
        respondError('Student not found with the provided information. Please check student ID or email.', 404);
    }

    $tId = (int) $targetUser['id'];

    if ($tId === $ownerId) {
        respondError('This user is already the team leader of this project', 400);
    }

    // Check if already a member of THIS idea
    $mCheck = $db->prepare("SELECT id FROM training_idea_members WHERE idea_id = ? AND user_id = ?");
    $mCheck->execute([$ideaId, $tId]);
    if ($mCheck->fetch()) {
        respondError('Student is already a member of this project team', 400);
    }

    // Check max team size (max 5 members total: 1 leader + 4 members)
    $countStmt = $db->prepare("SELECT COUNT(*) FROM training_idea_members WHERE idea_id = ?");
    $countStmt->execute([$ideaId]);
    $currentCount = (int) $countStmt->fetchColumn();
    if ($currentCount >= 5) {
        respondError('Team size limit reached (maximum 5 members per team)', 400);
    }

    // Check if student is in another team for this course
    $otherStmt = $db->prepare("
        SELECT ti.title AS project_title, tim.role
        FROM training_idea_members tim
        JOIN training_ideas ti ON tim.idea_id = ti.id
        WHERE tim.user_id = ? AND ti.course_id = ? AND ti.id != ?
        UNION
        SELECT ti_owner.title AS project_title, 'leader' AS role
        FROM training_ideas ti_owner
        WHERE ti_owner.owner_id = ? AND ti_owner.course_id = ? AND ti_owner.id != ?
    ");
    $otherStmt->execute([$tId, $courseId, $ideaId, $tId, $courseId, $ideaId]);
    $otherTeam = $otherStmt->fetch();
    if ($otherTeam) {
        $projName = $otherTeam['project_title'] ?: 'another project';
        respondError("This student is already participating in '{$projName}' for this course. Each student can participate in only 1 project per course.", 400);
    }

    // Add to training_idea_members
    $ins = $db->prepare("INSERT INTO training_idea_members (idea_id, user_id, role) VALUES (?, ?, 'member')");
    $ins->execute([$ideaId, $tId]);

    // Update proposal_json team section if present
    if (!empty($idea['proposal_json'])) {
        try {
            $pData = json_decode($idea['proposal_json'], true);
            if (is_array($pData) && isset($pData['team'])) {
                $studentName = $targetUser['full_name'] ?: $targetUser['username'] ?: $targetUser['email'];
                if (!isset($pData['team']['members']) || !is_array($pData['team']['members'])) {
                    $pData['team']['members'] = [];
                }
                if (!in_array($studentName, $pData['team']['members'], true)) {
                    $pData['team']['members'][] = $studentName;
                }
                if (!isset($pData['team']['all_members']) || !is_array($pData['team']['all_members'])) {
                    $pData['team']['all_members'] = [];
                }
                if (!in_array($studentName, $pData['team']['all_members'], true)) {
                    $pData['team']['all_members'][] = $studentName;
                }
                $upStmt = $db->prepare("UPDATE training_ideas SET proposal_json = ? WHERE id = ?");
                $upStmt->execute([json_encode($pData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), $ideaId]);
            }
        } catch (Throwable $ignored) {}
    }

} elseif ($action === 'remove') {
    if (!$targetUserId) {
        respondError('Target user ID is required to remove a team member', 400);
    }

    // Check permissions: leader, admin, trainer, or the user themselves leaving
    if (!$isLeader && !$isAdmin && !$isTrainer && $uid !== $targetUserId) {
        respondError('Forbidden: You can only remove members if you are team leader, trainer, administrator, or leaving the team yourself', 403);
    }

    if ($targetUserId === $ownerId) {
        respondError('Cannot remove the project creator/leader from the team', 400);
    }

    // Remove from training_idea_members
    $del = $db->prepare("DELETE FROM training_idea_members WHERE idea_id = ? AND user_id = ?");
    $del->execute([$ideaId, $targetUserId]);

    // Update proposal_json team section if present
    if (!empty($idea['proposal_json'])) {
        try {
            $uStmt = $db->prepare("SELECT full_name, username, email FROM users WHERE id = ?");
            $uStmt->execute([$targetUserId]);
            $uRow = $uStmt->fetch();
            if ($uRow) {
                $studentName = $uRow['full_name'] ?: $uRow['username'] ?: $uRow['email'];
                $pData = json_decode($idea['proposal_json'], true);
                if (is_array($pData) && isset($pData['team'])) {
                    if (isset($pData['team']['members']) && is_array($pData['team']['members'])) {
                        $pData['team']['members'] = array_values(array_filter($pData['team']['members'], fn($n) => $n !== $studentName));
                    }
                    if (isset($pData['team']['all_members']) && is_array($pData['team']['all_members'])) {
                        $pData['team']['all_members'] = array_values(array_filter($pData['team']['all_members'], fn($n) => $n !== $studentName));
                    }
                    $upStmt = $db->prepare("UPDATE training_ideas SET proposal_json = ? WHERE id = ?");
                    $upStmt->execute([json_encode($pData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), $ideaId]);
                }
            }
        } catch (Throwable $ignored) {}
    }

} else {
    respondError('Invalid action specified', 400);
}

// Fetch and return fresh team members list
$mStmt = $db->prepare("
    SELECT tim.idea_id, tim.user_id, tim.role, 
           u.full_name, u.student_id, u.email,
           u.major, u.academic_year, u.department
    FROM training_idea_members tim
    JOIN users u ON tim.user_id = u.id
    WHERE tim.idea_id = ?
    ORDER BY CASE WHEN tim.role = 'leader' THEN 0 ELSE 1 END, u.full_name ASC
");
$mStmt->execute([$ideaId]);
$members = $mStmt->fetchAll();

$formattedMembers = [];
foreach ($members as $m) {
    $formattedMembers[] = [
        'user_id' => (int) $m['user_id'],
        'id' => (int) $m['user_id'],
        'role' => $m['role'],
        'full_name' => $m['full_name'] ?: $m['email'],
        'student_id' => $m['student_id'],
        'email' => $m['email'],
        'avatar_url' => null,
        'username' => null,
        'major' => $m['major'],
        'academic_year' => $m['academic_year'],
        'department' => $m['department']
    ];
}

respond([
    'success' => true,
    'message' => $action === 'add' ? 'Team member added successfully' : 'Team member removed successfully',
    'team_members' => $formattedMembers
]);

