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
$customProposal = $data['proposal_json'] ?? null;

$rawTeammateIds = $data['teammate_ids'] ?? [];
if (!is_array($rawTeammateIds)) {
    $rawTeammateIds = [];
}

// Clean and deduplicate teammate IDs (Max 4 teammates + 1 leader = 5 total)
$teammateIds = [];
foreach ($rawTeammateIds as $tId) {
    $id = (int) $tId;
    if ($id > 0 && $id !== $uid && !in_array($id, $teammateIds, true)) {
        $teammateIds[] = $id;
    }
}
$teammateIds = array_slice($teammateIds, 0, 4);

if (!$courseId || !$title || !$description) {
    respondError('Course ID, title, and description are required');
}

$db = db();

// Verify course exists
$cStmt = $db->prepare("SELECT id, name_en FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();
if (!$course) {
    respondError('Invalid or non-existent course selected');
}
$courseName = $course['name_en'] ?? 'Training Course';

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

// Check if submitter is already in another team as a member (site-wide)
$mStmt = $db->prepare("
    SELECT ti.id, ti.title_en, tim.role, tc.name AS course_name
    FROM training_idea_members tim
    JOIN training_ideas ti ON tim.idea_id = ti.id
    LEFT JOIN training_courses tc ON ti.course_id = tc.id
    WHERE tim.user_id = ? AND tim.role = 'member'
");
$mStmt->execute([$uid]);
$existingMemberRow = $mStmt->fetch();
if ($existingMemberRow) {
    respondError("You are already enrolled as a team member in project ('" . ($existingMemberRow['title_en'] ?: 'Project') . "'). You cannot submit another project.");
}

// Check if submitter already owns an idea for this course
$fStmt = $db->prepare("SELECT id, proposal_json FROM training_ideas WHERE owner_id = ? AND course_id = ?");
$fStmt->execute([$uid, $courseId]);
$existingRow = $fStmt->fetch();
$existingIdeaId = $existingRow ? (int) $existingRow['id'] : 0;
$existingProposalJson = $existingRow['proposal_json'] ?? null;

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

        // 3. Teammate is not leader of another project
        $tOwnSql = "SELECT id, title_en FROM training_ideas WHERE owner_id = ?" . ($existingIdeaId ? " AND id != ?" : "");
        $tOwnParams = $existingIdeaId ? [$tId, $existingIdeaId] : [$tId];
        $tOwnStmt = $db->prepare($tOwnSql);
        $tOwnStmt->execute($tOwnParams);
        $tOwnRow = $tOwnStmt->fetch();
        if ($tOwnRow) {
            respondError("Student '$tName' is already the leader of another project ('" . ($tOwnRow['title_en'] ?: 'Project') . "').");
        }

        // 4. Teammate is not a member of another project
        $tMemSql = "
            SELECT ti.id, ti.title_en 
            FROM training_idea_members tim
            JOIN training_ideas ti ON tim.idea_id = ti.id
            WHERE tim.user_id = ?" . ($existingIdeaId ? " AND ti.id != ?" : "");
        $tMemParams = $existingIdeaId ? [$tId, $existingIdeaId] : [$tId];
        $tMemStmt = $db->prepare($tMemSql);
        $tMemStmt->execute($tMemParams);
        $tMemRow = $tMemStmt->fetch();
        if ($tMemRow) {
            respondError("Student '$tName' is already a team member in another project ('" . ($tMemRow['title_en'] ?: 'Project') . "').");
        }
    }
}

// ── Prepare structured proposal_json ──────────────────────────────────────────
$finalProposalJson = null;
if (!empty($customProposal) && is_array($customProposal)) {
    $finalProposalJson = json_encode($customProposal, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} elseif (!empty($existingProposalJson)) {
    // Keep existing sections, update title/desc if needed
    $decoded = json_decode($existingProposalJson, true);
    if (is_array($decoded)) {
        $decoded['project_title'] = $title;
        $finalProposalJson = json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }
}

if (!$finalProposalJson) {
    // Generate standard 7-section structure for custom idea
    $today = date('d / m / Y');
    $sections = [
        ['key' => 'abstract',                'title' => 'Abstract',                 'content' => $description, 'source' => 'user_input'],
        ['key' => 'introduction_background', 'title' => 'Introduction & Background', 'content' => "This university training project focuses on $title within $courseName. It introduces modern, localized software and engineering methods to solve practical challenges.", 'source' => 'user_input'],
        ['key' => 'problem_definition',      'title' => 'Problem Definition',      'content' => $problemStmt ?: "Manual and legacy operations lack automation and real-time efficiency. This project addresses these constraints through a purpose-built system.", 'source' => 'user_input'],
        ['key' => 'objectives_scope',        'title' => 'Objectives & Scope',        'content' => "In scope: Design and implementation of core $title capabilities; verification with test datasets. Out of scope: proprietary hardware modifications.", 'source' => 'user_input'],
        ['key' => 'related_work',            'title' => 'Related Work',            'content' => "Existing commercial alternatives either incur recurring cloud latency or require proprietary infrastructure. The proposed system provides a reliable, open-source pipeline.", 'source' => 'user_input'],
        ['key' => 'methodology',             'title' => 'Proposed Methodology',     'content' => "The technical approach follows structured phases: requirements modeling, modular component engineering using " . ($techStack ?: 'modern frameworks') . ", and empirical testing.", 'source' => 'user_input'],
        ['key' => 'expected_system_design',  'title' => 'Expected System Design',  'content' => "Input acquisition -> Processing and business logic modules -> Output display and data persistence.", 'source' => 'user_input'],
    ];

    $uName = $user['full_name'] ?: ($user['username'] ?: 'Student');
    $struct = [
        'source'        => 'custom_user',
        'project_title' => $title,
        'category'      => 'software',
        'sections'      => $sections,
        'team' => [
            'leader'      => $uName,
            'members'     => [],
            'all_members' => [$uName],
            'course'      => $courseName,
            'date'        => $today,
        ],
        'generated_at'  => date('c'),
    ];
    $finalProposalJson = json_encode($struct, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
}

// Perform atomic insert/update and team member synchronization
try {
    $db->beginTransaction();

    if ($existingIdeaId) {
        $ideaId = $existingIdeaId;
        $uStmt = $db->prepare("
            UPDATE training_ideas 
            SET title_en          = ?,
                description_en    = ?,
                tech_stack        = ?,
                problem_statement = ?,
                expected_output   = ?,
                proposal_json     = ?,
                status            = CASE WHEN status = 'approved' THEN status ELSE 'submitted' END,
                updated_at        = NOW()
            WHERE id = ?
        ");
        $uStmt->execute([
            $title,
            $description,
            $techStack ?: null,
            $problemStmt ?: null,
            $expectedOutput ?: null,
            $finalProposalJson,
            $ideaId
        ]);
    } else {
        $iStmt = $db->prepare("
            INSERT INTO training_ideas 
                (owner_id, course_id, title_en, description_en, tech_stack, problem_statement, expected_output, proposal_json, status)
            VALUES 
                (?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
        ");
        $iStmt->execute([
            $uid,
            $courseId,
            $title,
            $description,
            $techStack ?: null,
            $problemStmt ?: null,
            $expectedOutput ?: null,
            $finalProposalJson,
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
