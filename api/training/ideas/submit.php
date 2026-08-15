<?php
// =========================================================
// NMU TRAINING — Submit or Update Trainee Idea
// Access: Trainee
// Enforces: Enrolled trainees only, single project per course,
//           and syncs project teammates (training_idea_members)
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'admin']);
$uid = (int) $user['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId       = (int) ($data['course_id'] ?? 0);
$title          = sanitizeString($data['title'] ?? '');
$description    = sanitizeString($data['description'] ?? '');
$techStack      = sanitizeString($data['tech_stack'] ?? '');
$problemStmt    = sanitizeString($data['problem_statement'] ?? '');
$expectedOutput = sanitizeString($data['expected_output'] ?? '');

$rawTeammateIds = $data['teammate_ids'] ?? [];
if (!is_array($rawTeammateIds)) {
    $rawTeammateIds = [];
}

// Clean and deduplicate teammate IDs
$teammateIds = [];
foreach ($rawTeammateIds as $tId) {
    $id = (int) $tId;
    if ($id > 0 && $id !== $uid && !in_array($id, $teammateIds, true)) {
        $teammateIds[] = $id;
    }
}

if (!$courseId || !$title || !$description) {
    respondError('Course ID, title, and description are required');
}

$db = db();

// Verify course exists
$cStmt = $db->prepare("SELECT id, name FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();
if (!$course) {
    respondError('Invalid or non-existent course selected');
}

// Require submitter to be enrolled in the course (unless admin)
$role = strtolower($user['role'] ?? '');
$isAdmin = (bool) ($user['is_admin'] || $role === 'admin');

if (!$isAdmin) {
    $enr = $db->prepare("SELECT id FROM trainee_enrollments WHERE trainee_id = ? AND course_id = ?");
    $enr->execute([$uid, $courseId]);
    if (!$enr->fetch()) {
        respondError('You are not enrolled in this course. You can only submit project ideas for courses you are enrolled in.');
    }
}

// Check if submitter is already in another team as a member
$mStmt = $db->prepare("
    SELECT ti.id, ti.title, tim.role
    FROM training_idea_members tim
    JOIN training_ideas ti ON tim.idea_id = ti.id
    WHERE tim.user_id = ? AND ti.course_id = ? AND tim.role = 'member'
");
$mStmt->execute([$uid, $courseId]);
$existingMemberRow = $mStmt->fetch();
if ($existingMemberRow) {
    respondError("You are already enrolled as a team member in another project ('" . ($existingMemberRow['title'] ?: 'Project') . "') for this course. You cannot submit a new project.");
}

// Check if submitter already owns an idea for this course
$fStmt = $db->prepare("SELECT id FROM training_ideas WHERE owner_id = ? AND course_id = ?");
$fStmt->execute([$uid, $courseId]);
$existingIdeaId = (int) $fStmt->fetchColumn();

// Validate all selected teammates
if (!empty($teammateIds)) {
    foreach ($teammateIds as $tId) {
        // 1. Teammate user existence
        $uStmt = $db->prepare("SELECT id, full_name, username, email, student_id FROM users WHERE id = ?");
        $uStmt->execute([$tId]);
        $teammateUser = $uStmt->fetch();
        if (!$teammateUser) {
            respondError("Selected teammate ID $tId not found");
        }
        $tName = $teammateUser['full_name'] ?: ($teammateUser['username'] ?: ($teammateUser['student_id'] ?: 'Student #' . $tId));

        // 2. Teammate enrollment check
        if (!$isAdmin) {
            $teStmt = $db->prepare("SELECT id FROM trainee_enrollments WHERE trainee_id = ? AND course_id = ?");
            $teStmt->execute([$tId, $courseId]);
            if (!$teStmt->fetch()) {
                respondError("Student '$tName' is not enrolled in this course and cannot be added as a teammate.");
            }
        }

        // 3. Teammate is not leader of another project in this course
        $tOwnSql = "SELECT id, title FROM training_ideas WHERE owner_id = ? AND course_id = ?" . ($existingIdeaId ? " AND id != ?" : "");
        $tOwnParams = $existingIdeaId ? [$tId, $courseId, $existingIdeaId] : [$tId, $courseId];
        $tOwnStmt = $db->prepare($tOwnSql);
        $tOwnStmt->execute($tOwnParams);
        $tOwnRow = $tOwnStmt->fetch();
        if ($tOwnRow) {
            respondError("Student '$tName' is already the leader of another project ('" . ($tOwnRow['title'] ?: 'Project') . "') for this course.");
        }

        // 4. Teammate is not a member of another project in this course
        $tMemSql = "
            SELECT ti.id, ti.title 
            FROM training_idea_members tim
            JOIN training_ideas ti ON tim.idea_id = ti.id
            WHERE tim.user_id = ? AND ti.course_id = ?" . ($existingIdeaId ? " AND ti.id != ?" : "");
        $tMemParams = $existingIdeaId ? [$tId, $courseId, $existingIdeaId] : [$tId, $courseId];
        $tMemStmt = $db->prepare($tMemSql);
        $tMemStmt->execute($tMemParams);
        $tMemRow = $tMemStmt->fetch();
        if ($tMemRow) {
            respondError("Student '$tName' is already a member of another project team ('" . ($tMemRow['title'] ?: 'Project') . "') for this course.");
        }
    }
}

// Perform atomic insert/update and team member synchronization
try {
    $db->beginTransaction();

    if ($existingIdeaId) {
        $ideaId = $existingIdeaId;
        $uStmt = $db->prepare("
            UPDATE training_ideas 
            SET title = ?,
                description = ?,
                tech_stack = ?,
                problem_statement = ?,
                expected_output = ?,
                updated_at = NOW()
            WHERE id = ?
        ");
        $uStmt->execute([
            $title,
            $description,
            $techStack ?: null,
            $problemStmt ?: null,
            $expectedOutput ?: null,
            $ideaId
        ]);
    } else {
        $iStmt = $db->prepare("
            INSERT INTO training_ideas 
                (owner_id, course_id, title, description, tech_stack, problem_statement, expected_output, status)
            VALUES 
                (?, ?, ?, ?, ?, ?, ?, 'draft')
        ");
        $iStmt->execute([
            $uid,
            $courseId,
            $title,
            $description,
            $techStack ?: null,
            $problemStmt ?: null,
            $expectedOutput ?: null
        ]);
        $ideaId = (int) $db->lastInsertId();
    }

    // Sync team members
    $delMembers = $db->prepare("DELETE FROM training_idea_members WHERE idea_id = ?");
    $delMembers->execute([$ideaId]);

    // Insert Leader
    $insMember = $db->prepare("INSERT INTO training_idea_members (idea_id, user_id, role) VALUES (?, ?, ?)");
    $insMember->execute([$ideaId, $uid, 'leader']);

    // Insert Members
    foreach ($teammateIds as $tId) {
        $insMember->execute([$ideaId, $tId, 'member']);
    }

    $db->commit();

    respond([
        'success' => true,
        'message' => 'Idea submitted successfully',
        'idea_id' => $ideaId
    ]);

} catch (Throwable $e) {
    if ($db->inTransaction()) {
        $db->rollBack();
    }
    respondError('Server error while saving project idea: ' . $e->getMessage(), 500);
}
