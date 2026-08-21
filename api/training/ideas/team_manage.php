<?php
// =========================================================
// NMU TRAINING — Team Management & Member Invitation System
// Access: Idea Leader / Owner, Admin, or Invited Student
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int) $user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isAdmin = (bool) ($user['is_admin'] || $role === 'admin');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$db = db();

// Ensure training_idea_invitations table exists
try {
    $db->exec("
        CREATE TABLE IF NOT EXISTS training_idea_invitations (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          idea_id       INT NOT NULL,
          course_id     INT NOT NULL,
          inviter_id    INT NOT NULL,
          invitee_id    INT NOT NULL,
          status        ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending',
          created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          responded_at  TIMESTAMP NULL,
          INDEX idx_tii_idea (idea_id),
          INDEX idx_tii_invitee (invitee_id),
          INDEX idx_tii_course (course_id),
          INDEX idx_tii_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
} catch (Throwable $e) {}

$data = body();
$action = trim($data['action'] ?? 'add'); // 'add', 'invite', 'cancel_invitation', 'respond_invitation', 'remove'
$ideaId = (int) ($data['idea_id'] ?? 0);
$invitationId = (int) ($data['invitation_id'] ?? 0);
$targetUserId = (int) ($data['user_id'] ?? 0);
$targetIdentifier = trim($data['identifier'] ?? '');
$decision = strtolower(trim($data['decision'] ?? '')); // 'accept', 'reject'

// ── 1. Handle Respond to Invitation (Invitee accepts or rejects) ───────────────
if ($action === 'respond_invitation') {
    if (!$invitationId && !$ideaId) {
        respondError('Invitation ID or Project Idea ID is required', 400);
    }
    if (!in_array($decision, ['accept', 'reject'], true)) {
        respondError("Decision must be either 'accept' or 'reject'", 400);
    }

    $invSql = "SELECT * FROM training_idea_invitations WHERE invitee_id = ? AND status = 'pending'";
    $invParams = [$uid];
    if ($invitationId) {
        $invSql .= " AND id = ?";
        $invParams[] = $invitationId;
    } else {
        $invSql .= " AND idea_id = ?";
        $invParams[] = $ideaId;
    }
    $invStmt = $db->prepare($invSql);
    $invStmt->execute($invParams);
    $inv = $invStmt->fetch();

    if (!$inv) {
        respondError('No pending invitation found for you on this project.', 404);
    }

    $targetIdeaId   = (int) $inv['idea_id'];
    $targetCourseId = (int) $inv['course_id'];
    $currentInvId   = (int) $inv['id'];

    if ($decision === 'reject') {
        $rejStmt = $db->prepare("UPDATE training_idea_invitations SET status = 'rejected', responded_at = NOW() WHERE id = ?");
        $rejStmt->execute([$currentInvId]);

        // Send notification to the project owner/inviter
        try {
            $inviteeName = $user['full_name'] ?: ($user['username'] ?: 'Student');
            $tiQuery = $db->prepare("SELECT owner_id, title FROM training_ideas WHERE id = ?");
            $tiQuery->execute([$targetIdeaId]);
            $tIdea = $tiQuery->fetch();
            $targetOwnerId = $tIdea['owner_id'] ?? $inv['inviter_id'];
            if ($targetOwnerId) {
                $nStmt = $db->prepare("
                    INSERT INTO notifications (user_id, type, message_en, message_ar, project_id, is_read, created_at)
                    VALUES (?, 'team_invitation_declined', ?, ?, ?, 0, NOW())
                ");
                $tTitle = $tIdea['title'] ?? 'Project';
                $msgEn = "{$inviteeName} declined your team invitation for project: \"{$tTitle}\"";
                $msgAr = "اعتذر الطالب {$inviteeName} عن قبول دعوة الانضمام لفريق مشروع: \"{$tTitle}\"";
                $nStmt->execute([$targetOwnerId, $msgEn, $msgAr, $targetIdeaId]);
            }
        } catch (Throwable $notifErr) {}

        respond([
            'success' => true,
            'message' => 'تم رفض الدعوة بنجاح / Invitation declined successfully',
            'status'  => 'rejected'
        ]);
    }

    // Process Accept
    // 1. Check if trainee is already leader/member of another project in this course
    $otherCheck = $db->prepare("
        SELECT ti.title 
        FROM training_idea_members tim
        JOIN training_ideas ti ON tim.idea_id = ti.id
        WHERE tim.user_id = ? AND ti.course_id = ? AND ti.id != ? AND ti.status != 'rejected'
        UNION
        SELECT ti_owner.title 
        FROM training_ideas ti_owner
        WHERE ti_owner.owner_id = ? AND ti_owner.course_id = ? AND ti_owner.id != ? AND ti_owner.status != 'rejected'
    ");
    $otherCheck->execute([$uid, $targetCourseId, $targetIdeaId, $uid, $targetCourseId, $targetIdeaId]);
    $alreadyJoined = $otherCheck->fetchColumn();
    if ($alreadyJoined) {
        respondError("You are already enrolled in another project ('$alreadyJoined') for this course. You cannot accept another invitation.", 400);
    }

    // 2. Check team capacity (< 5 members)
    $memCountStmt = $db->prepare("SELECT COUNT(*) FROM training_idea_members WHERE idea_id = ?");
    $memCountStmt->execute([$targetIdeaId]);
    if ((int)$memCountStmt->fetchColumn() >= 5) {
        respondError('This team has already reached its maximum capacity of 5 members.', 400);
    }

    // 3. Mark invitation as accepted
    $accStmt = $db->prepare("UPDATE training_idea_invitations SET status = 'accepted', responded_at = NOW() WHERE id = ?");
    $accStmt->execute([$currentInvId]);

    // 4. Add to training_idea_members
    $insMem = $db->prepare("INSERT IGNORE INTO training_idea_members (idea_id, user_id, role) VALUES (?, ?, 'member')");
    $insMem->execute([$targetIdeaId, $uid]);

    // 5. Update proposal_json in training_ideas if present
    $tiStmt = $db->prepare("SELECT proposal_json FROM training_ideas WHERE id = ?");
    $tiStmt->execute([$targetIdeaId]);
    $tiRow = $tiStmt->fetch();
    if (!empty($tiRow['proposal_json'])) {
        try {
            $pData = json_decode($tiRow['proposal_json'], true);
            if (is_array($pData) && isset($pData['team'])) {
                $uName = $user['full_name'] ?: ($user['username'] ?: 'Student');
                if (!isset($pData['team']['members']) || !is_array($pData['team']['members'])) {
                    $pData['team']['members'] = [];
                }
                if (!in_array($uName, $pData['team']['members'], true)) {
                    $pData['team']['members'][] = $uName;
                }
                if (!isset($pData['team']['all_members']) || !is_array($pData['team']['all_members'])) {
                    $pData['team']['all_members'] = [];
                }
                if (!in_array($uName, $pData['team']['all_members'], true)) {
                    $pData['team']['all_members'][] = $uName;
                }
                $upStmt = $db->prepare("UPDATE training_ideas SET proposal_json = ? WHERE id = ?");
                $upStmt->execute([json_encode($pData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), $targetIdeaId]);
            }
        } catch (Throwable $ignored) {}
    }

    // 6. Automatically decline any other pending invitations for this user in this course
    $cancelOthers = $db->prepare("UPDATE training_idea_invitations SET status = 'cancelled', responded_at = NOW() WHERE invitee_id = ? AND course_id = ? AND id != ? AND status = 'pending'");
    $cancelOthers->execute([$uid, $targetCourseId, $currentInvId]);

    // 7. Send notification to the project leader/inviter
    try {
        $inviteeName = $user['full_name'] ?: ($user['username'] ?: 'Student');
        $tiQuery = $db->prepare("SELECT owner_id, title FROM training_ideas WHERE id = ?");
        $tiQuery->execute([$targetIdeaId]);
        $tIdea = $tiQuery->fetch();
        $targetOwnerId = $tIdea['owner_id'] ?? $inv['inviter_id'];
        if ($targetOwnerId) {
            $nStmt = $db->prepare("
                INSERT INTO notifications (user_id, type, message_en, message_ar, project_id, is_read, created_at)
                VALUES (?, 'team_invitation_accepted', ?, ?, ?, 0, NOW())
            ");
            $tTitle = $tIdea['title'] ?? 'Project';
            $msgEn = "{$inviteeName} accepted your team invitation and joined project: \"{$tTitle}\"";
            $msgAr = "وافق الطالب {$inviteeName} على دعوتك وانضم إلى فريق عمل مشروع: \"{$tTitle}\"";
            $nStmt->execute([$targetOwnerId, $msgEn, $msgAr, $targetIdeaId]);
        }
    } catch (Throwable $notifErr) {}

    respond([
        'success' => true,
        'message' => 'تم قبول الدعوة بنجاح! أنت الآن عضو في فريق المشروع / Invitation accepted! You have joined the team.',
        'status'  => 'accepted',
        'idea_id' => $targetIdeaId
    ]);
}

// ── 2. For other actions, resolve the idea & permissions ──────────────────────
if (!$ideaId) {
    respondError('Project Idea ID is required', 400);
}

$iStmt = $db->prepare("
    SELECT ti.*, tc.name AS course_name, tc.course_type 
    FROM training_ideas ti 
    JOIN training_courses tc ON ti.course_id = tc.id
    WHERE ti.id = ?
");
$iStmt->execute([$ideaId]);
$idea = $iStmt->fetch();

if (!$idea) {
    respondError('Project idea not found', 404);
}

if (($idea['course_type'] ?? '') === 'external') {
    respondError('Team formation is not available for external training courses. External training projects are strictly individual.', 400);
}

$courseId = (int) $idea['course_id'];
$ownerId  = (int) $idea['owner_id'];

$isTrainer = ($isAdmin || in_array($role, ['trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator'], true));
$isLeader  = ($uid === $ownerId);
if (!$isLeader && !$isAdmin && !$isTrainer) {
    $checkLeader = $db->prepare("SELECT 1 FROM training_idea_members WHERE idea_id = ? AND user_id = ? AND role = 'leader'");
    $checkLeader->execute([$ideaId, $uid]);
    if ($checkLeader->fetch()) {
        $isLeader = true;
    }
}

// ── Action: ADD / INVITE CLASSMATE ───────────────────────────────────────────
if ($action === 'add' || $action === 'invite') {
    if (!$isLeader && !$isAdmin && !$isTrainer) {
        respondError('Only the team leader, trainer, or an administrator can invite team members', 403);
    }

    // Resolve target user
    $targetUser = null;
    if ($targetUserId > 0) {
        $uStmt = $db->prepare("SELECT id, full_name, email, student_id, role FROM users WHERE id = ?");
        $uStmt->execute([$targetUserId]);
        $targetUser = $uStmt->fetch();
    } elseif ($targetIdentifier !== '') {
        $uStmt = $db->prepare("
            SELECT id, full_name, email, student_id, role 
            FROM users 
            WHERE LOWER(student_id) = LOWER(?) OR LOWER(email) = LOWER(?) OR CAST(id AS CHAR) = ?
            LIMIT 1
        ");
        $uStmt->execute([$targetIdentifier, $targetIdentifier, $targetIdentifier]);
        $targetUser = $uStmt->fetch();
    }

    if (!$targetUser) {
        respondError('Student not found with the provided information. Please check student ID or name.', 404);
    }

    $tId = (int) $targetUser['id'];

    if ($tId === $ownerId || $tId === $uid) {
        respondError('You cannot invite yourself to the team', 400);
    }

    // Check if enrolled in this course
    if (!$isAdmin) {
        $enrCheck = $db->prepare("SELECT id FROM trainee_enrollments WHERE trainee_id = ? AND course_id = ?");
        $enrCheck->execute([$tId, $courseId]);
        if (!$enrCheck->fetch()) {
            respondError('Student is not enrolled in this course', 400);
        }
    }

    // Check if already a member of THIS idea
    $mCheck = $db->prepare("SELECT id FROM training_idea_members WHERE idea_id = ? AND user_id = ?");
    $mCheck->execute([$ideaId, $tId]);
    if ($mCheck->fetch()) {
        respondError('Student is already a member of this project team', 400);
    }

    // Check if there is already a pending invitation for this student
    $pendCheck = $db->prepare("SELECT id FROM training_idea_invitations WHERE idea_id = ? AND invitee_id = ? AND status = 'pending'");
    $pendCheck->execute([$ideaId, $tId]);
    if ($pendCheck->fetch()) {
        respondError('تم إرسال دعوة انضمام لهذا الطالب مسبقاً وما زالت قيد الانتظار / An invitation has already been sent to this student and is pending acceptance.', 400);
    }

    // Check team capacity: (accepted members + pending invitations) cannot exceed 5
    $activeCountStmt = $db->prepare("SELECT COUNT(*) FROM training_idea_members WHERE idea_id = ?");
    $activeCountStmt->execute([$ideaId]);
    $activeCount = (int) $activeCountStmt->fetchColumn();

    $pendCountStmt = $db->prepare("SELECT COUNT(*) FROM training_idea_invitations WHERE idea_id = ? AND status = 'pending'");
    $pendCountStmt->execute([$ideaId]);
    $pendCount = (int) $pendCountStmt->fetchColumn();

    if (($activeCount + $pendCount) >= 5) {
        respondError('Team size limit reached (maximum 5 members including pending invitations)', 400);
    }

    // Check if student is in another team for this course
    $otherStmt = $db->prepare("
        SELECT ti.title AS project_title, tim.role
        FROM training_idea_members tim
        JOIN training_ideas ti ON tim.idea_id = ti.id
        WHERE tim.user_id = ? AND ti.course_id = ? AND ti.id != ? AND ti.status != 'rejected'
        UNION
        SELECT ti_owner.title AS project_title, 'leader' AS role
        FROM training_ideas ti_owner
        WHERE ti_owner.owner_id = ? AND ti_owner.course_id = ? AND ti_owner.id != ? AND ti_owner.status != 'rejected'
    ");
    $otherStmt->execute([$tId, $courseId, $ideaId, $tId, $courseId, $ideaId]);
    $otherTeam = $otherStmt->fetch();
    if ($otherTeam) {
        $projName = $otherTeam['project_title'] ?: 'another project';
        respondError("This student is already participating in '{$projName}' for this course. Each student can participate in only 1 project per course.", 400);
    }

    // Insert pending invitation (request like facebook friend request)
    $insInv = $db->prepare("
        INSERT INTO training_idea_invitations (idea_id, course_id, inviter_id, invitee_id, status)
        VALUES (?, ?, ?, ?, 'pending')
    ");
    $insInv->execute([$ideaId, $courseId, $uid, $tId]);

    // Send in-app notification to the invited student
    try {
        $inviterName = $user['full_name'] ?: ($user['username'] ?: 'Team Leader');
        $projTitle = $idea['title'] ?: 'University Project';
        $nStmt = $db->prepare("
            INSERT INTO notifications (user_id, type, message_en, message_ar, project_id, is_read, created_at)
            VALUES (?, 'team_invitation', ?, ?, ?, 0, NOW())
        ");
        $msgEn = "You have received a team invitation from {$inviterName} to join project: \"{$projTitle}\"";
        $msgAr = "تلقيت دعوة للانضمام إلى فريق عمل المشروع: \"{$projTitle}\" من قِبل: {$inviterName}";
        $nStmt->execute([$tId, $msgEn, $msgAr, $ideaId]);
    } catch (Throwable $notifErr) {
        error_log('[team_manage] notification error: ' . $notifErr->getMessage());
    }

    $studentName = $targetUser['full_name'] ?: $targetUser['email'];
    $successMessage = "تم إرسال طلب الانضمام إلى الطالب ($studentName) بنجاح. سيتم إضافته إلى الفريق بمجرد قبوله الدعوة.";

// ── Action: CANCEL INVITATION (Leader cancels sent request) ───────────────────
} elseif ($action === 'cancel_invitation') {
    if (!$isLeader && !$isAdmin && !$isTrainer) {
        respondError('Only the team leader can cancel sent invitations', 403);
    }

    $cancelSql = "UPDATE training_idea_invitations SET status = 'cancelled', responded_at = NOW() WHERE idea_id = ? AND status = 'pending'";
    $cancelParams = [$ideaId];
    if ($invitationId) {
        $cancelSql .= " AND id = ?";
        $cancelParams[] = $invitationId;
    } elseif ($targetUserId) {
        $cancelSql .= " AND invitee_id = ?";
        $cancelParams[] = $targetUserId;
    } else {
        respondError('Invitation ID or User ID is required to cancel invitation', 400);
    }

    $cStmt = $db->prepare($cancelSql);
    $cStmt->execute($cancelParams);

    $successMessage = 'تم إلغاء الدعوة بنجاح / Invitation cancelled successfully';

// ── Action: REMOVE MEMBER (Leader removes accepted member, or self-leave) ──────
} elseif ($action === 'remove') {
    if (!$targetUserId) {
        respondError('Target user ID is required to remove a team member', 400);
    }

    if (!$isLeader && !$isAdmin && !$isTrainer && $uid !== $targetUserId) {
        respondError('Forbidden: You can only remove members if you are team leader, trainer, administrator, or leaving the team yourself', 403);
    }

    if ($targetUserId === $ownerId) {
        respondError('Cannot remove the project creator/leader from the team', 400);
    }

    // Remove from training_idea_members
    $del = $db->prepare("DELETE FROM training_idea_members WHERE idea_id = ? AND user_id = ?");
    $del->execute([$ideaId, $targetUserId]);

    // Also cancel any invitation row
    $delInv = $db->prepare("DELETE FROM training_idea_invitations WHERE idea_id = ? AND invitee_id = ?");
    $delInv->execute([$ideaId, $targetUserId]);

    // Update proposal_json team section if present
    if (!empty($idea['proposal_json'])) {
        try {
            $uStmt = $db->prepare("SELECT full_name, email FROM users WHERE id = ?");
            $uStmt->execute([$targetUserId]);
            $uRow = $uStmt->fetch();
            if ($uRow) {
                $studentName = $uRow['full_name'] ?: $uRow['email'];
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

    $successMessage = 'تمت إزالة العضو من الفريق بنجاح / Team member removed successfully';

} else {
    respondError('Invalid action specified', 400);
}

// ── Fetch active team members ────────────────────────────────────────────────
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
        'user_id'       => (int) $m['user_id'],
        'id'            => (int) $m['user_id'],
        'role'          => $m['role'],
        'full_name'     => $m['full_name'] ?: $m['email'],
        'student_id'    => $m['student_id'],
        'email'         => $m['email'],
        'major'         => $m['major'],
        'academic_year' => $m['academic_year'],
        'department'    => $m['department']
    ];
}

// ── Fetch pending sent invitations for this idea ──────────────────────────────
$invListStmt = $db->prepare("
    SELECT tii.id AS invitation_id, tii.invitee_id, tii.created_at, tii.status,
           u.full_name, u.student_id, u.email, u.major, u.academic_year
    FROM training_idea_invitations tii
    JOIN users u ON tii.invitee_id = u.id
    WHERE tii.idea_id = ? AND tii.status = 'pending'
    ORDER BY tii.created_at DESC
");
$invListStmt->execute([$ideaId]);
$pendingInvitations = [];
foreach ($invListStmt->fetchAll() as $inv) {
    $pendingInvitations[] = [
        'invitation_id' => (int) $inv['invitation_id'],
        'user_id'       => (int) $inv['invitee_id'],
        'id'            => (int) $inv['invitee_id'],
        'full_name'     => $inv['full_name'] ?: $inv['email'],
        'student_id'    => $inv['student_id'],
        'email'         => $inv['email'],
        'created_at'    => $inv['created_at'],
        'status'        => 'pending'
    ];
}

respond([
    'success'             => true,
    'message'             => $successMessage,
    'team_members'        => $formattedMembers,
    'pending_invitations' => $pendingInvitations
]);


