<?php
// =========================================================
// NMU ERTH — Catalog Idea Selection (ZERO AI CALLS)
// Access: Trainee
//
// When a student selects one of the 64 catalog ideas, this
// endpoint:
//   1. Copies the 7 pregenerated section rows into the
//      student's own training_ideas.proposal_json
//   2. Resolves team/trainer/date from DB (no AI)
//   3. Returns the complete proposal_json immediately
//
// CONFIRMED: No callAI() or any AI provider request is made.
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid  = (int)$user['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data              = body();
$catalogProjectId  = (int)($data['catalog_project_id'] ?? 0);
$courseId          = (int)($data['course_id'] ?? 0);
$trainingIdeaId    = (int)($data['training_idea_id'] ?? 0);  // if idea already exists

if (!$catalogProjectId) {
    respondError('catalog_project_id is required');
}
if (!$courseId && !$trainingIdeaId) {
    respondError('course_id or training_idea_id is required');
}

$db = db();

// ── 1. Verify catalog project exists ─────────────────────────────────────────
$catStmt = $db->prepare("SELECT id, title, category, level, skills FROM projects_catalog WHERE id = ?");
$catStmt->execute([$catalogProjectId]);
$catProject = $catStmt->fetch();
if (!$catProject) {
    respondError('Catalog project not found', 404);
}

// ── 2. Resolve or create the training idea ────────────────────────────────────
if ($trainingIdeaId) {
    // Verify ownership
    $ideaStmt = $db->prepare("SELECT id, course_id, owner_id FROM training_ideas WHERE id = ? AND owner_id = ?");
    $ideaStmt->execute([$trainingIdeaId, $uid]);
    $idea = $ideaStmt->fetch();
    if (!$idea) {
        respondError('Idea not found or access denied', 404);
    }
    $ideaId   = $trainingIdeaId;
    $courseId = (int)$idea['course_id'];
} else {
    // Verify course exists
    $cStmt = $db->prepare("SELECT id FROM training_courses WHERE id = ?");
    $cStmt->execute([$courseId]);
    if (!$cStmt->fetch()) {
        respondError('Course not found');
    }

    $role        = strtolower($user['role'] ?? '');
    $isEvaluator = (bool)($user['is_admin'] || $role === 'admin' || $role === 'trainer');
    if (!$isEvaluator) {
        $enrStmt = $db->prepare("SELECT id FROM trainee_enrollments WHERE trainee_id = ? AND course_id = ?");
        $enrStmt->execute([$uid, $courseId]);
        if (!$enrStmt->fetch()) {
            respondError('You are not enrolled in this course');
        }
    }

    // Check if trainee is already a member in another active team
    $memCheck = $db->prepare("
        SELECT ti.title FROM training_idea_members tim
        JOIN training_ideas ti ON tim.idea_id = ti.id
        WHERE tim.user_id = ? AND tim.role = 'member' AND ti.status != 'rejected'
    ");
    $memCheck->execute([$uid]);
    $alreadyMem = $memCheck->fetchColumn();
    if ($alreadyMem) {
        respondError("You are already enrolled as a team member in another project ('$alreadyMem').");
    }

    // Check if another team has already selected this catalog project in this course
    $takenCheck = $db->prepare("
        SELECT ti.id, ti.owner_id, u.full_name 
        FROM training_ideas ti
        JOIN users u ON u.id = ti.owner_id
        WHERE ti.course_id = ? 
          AND (ti.catalog_project_id = ? OR LOWER(TRIM(ti.title)) = LOWER(TRIM(?)))
          AND ti.status != 'rejected'
          AND ti.owner_id != ?
    ");
    $takenCheck->execute([$courseId, $catalogProjectId, $catProject['title'], $uid]);
    $alreadyTaken = $takenCheck->fetch();

    if ($alreadyTaken) {
        respondError("This project idea has already been chosen. Two teams cannot have the same idea. Please choose a different project.", 409);
    }

    // Check if trainee already has an idea for this course
    $existStmt = $db->prepare("SELECT id FROM training_ideas WHERE owner_id = ? AND course_id = ?");
    $existStmt->execute([$uid, $courseId]);
    $existingId = (int)$existStmt->fetchColumn();

    if ($existingId) {
        $ideaId = $existingId;
        // Update catalog_project_id, title, and reset to submitted
        $updCatStmt = $db->prepare("
            UPDATE training_ideas 
            SET catalog_project_id = ?,
                title = ?,
                title_en = ?,
                description = ?,
                description_en = ?,
                status = 'submitted',
                feedback = NULL,
                reviewed_by = NULL,
                reviewed_at = NULL,
                updated_at = NOW()
            WHERE id = ? AND owner_id = ?
        ");
        $updCatStmt->execute([
            $catalogProjectId,
            $catProject['title'],
            $catProject['title'],
            'Selected from the project catalog: ' . $catProject['title'],
            'Selected from the project catalog: ' . $catProject['title'],
            $ideaId,
            $uid
        ]);
    } else {
        // Create new idea row in 'submitted' (under review) status
        $insStmt = $db->prepare("
            INSERT INTO training_ideas (owner_id, course_id, catalog_project_id, title, title_en, description, description_en, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted')
        ");
        $insStmt->execute([
            $uid,
            $courseId,
            $catalogProjectId,
            $catProject['title'],
            $catProject['title'],
            'Selected from the project catalog: ' . $catProject['title'],
            'Selected from the project catalog: ' . $catProject['title'],
        ]);
        $ideaId = (int)$db->lastInsertId();

        // Insert the owner as leader in training_idea_members
        $memStmt = $db->prepare("
            INSERT IGNORE INTO training_idea_members (idea_id, user_id, role) VALUES (?, ?, 'leader')
        ");
        $memStmt->execute([$ideaId, $uid]);
    }
}

// ── 3. Load the 7 pregenerated sections ──────────────────────────────────────
$secStmt = $db->prepare("
    SELECT section_key, content
    FROM proposals_pregenerated
    WHERE catalog_project_id = ?
    ORDER BY FIELD(section_key,
        'abstract',
        'introduction_background',
        'problem_definition',
        'objectives_scope',
        'related_work',
        'methodology',
        'expected_system_design',
        'team_contribution_statement',
        'success_criteria',
        'technology_stack___tools',
        'anticipated_challenges___risk_mitigation',
        'ethical___safety_considerations',
        'planned_implementation_approach__to_be_expanded_with_real_work_',
        'test_plan__results_added_once_testing_is_performed_',
        'starter_reference_list__expand_as_more_sources_are_used_',
        'appendix_a'
    )
");
$secStmt->execute([$catalogProjectId]);
$rawSections = $secStmt->fetchAll();

if (empty($rawSections)) {
    respondError('No pregenerated sections found for this catalog project. Run the seeder first.', 500);
}

// ── 4. Resolve team / trainer / date from real DB data ───────────────────────
// Team members
$teamStmt = $db->prepare("
    SELECT u.full_name, u.student_id, tim.role
    FROM training_idea_members tim
    JOIN users u ON u.id = tim.user_id
    WHERE tim.idea_id = ?
    ORDER BY CASE WHEN tim.role = 'leader' THEN 0 ELSE 1 END, u.full_name
");
$teamStmt->execute([$ideaId]);
$teamMembers = $teamStmt->fetchAll();

$leaderName  = '';
$memberNames = [];
foreach ($teamMembers as $m) {
    $name = $m['full_name'] ?: ('Student #' . $m['student_id']);
    if ($m['role'] === 'leader') {
        $leaderName = $name;
    } else {
        $memberNames[] = $name;
    }
}
if (!$leaderName) {
    // Fallback to current user name
    $uStmt = $db->prepare("SELECT full_name FROM users WHERE id = ?");
    $uStmt->execute([$uid]);
    $leaderName = $uStmt->fetchColumn() ?: 'Student';
}

// Trainer
$trainerName = '';
$trainerStmt = $db->prepare("
    SELECT u.full_name
    FROM trainer_assignments ta
    JOIN users u ON u.id = ta.trainer_id
    WHERE ta.course_id = ?
    ORDER BY ta.id ASC
    LIMIT 1
");
$trainerStmt->execute([$courseId]);
$trainerRow = $trainerStmt->fetchColumn();
if ($trainerRow) {
    $trainerName = $trainerRow;
}

// Course name
$courseStmt = $db->prepare("SELECT name FROM training_courses WHERE id = ?");
$courseStmt->execute([$courseId]);
$courseName = $courseStmt->fetchColumn() ?: 'Training Course';

$today     = date('d / m / Y');
$teamSize  = count($teamMembers) ?: 1;
$allNames  = array_merge([$leaderName], $memberNames);

// ── 5. Build section titles map ───────────────────────────────────────────────
$sectionTitles = [
    'abstract'                => 'Abstract',
    'introduction_background' => 'Introduction & Background',
    'problem_definition'      => 'Problem Definition',
    'objectives_scope'        => 'Objectives & Scope',
    'related_work'            => 'Related Work',
    'methodology'             => 'Proposed Methodology',
    'expected_system_design'  => 'Expected System Design',
    'team_contribution_statement' => 'Team Contribution Statement',
    'success_criteria' => 'Success Criteria',
    'technology_stack___tools' => 'Technology Stack & Tools',
    'anticipated_challenges___risk_mitigation' => 'Anticipated Challenges & Risk Mitigation',
    'ethical___safety_considerations' => 'Ethical & Safety Considerations',
    'planned_implementation_approach__to_be_expanded_with_real_work_' => 'Planned Implementation Approach',
    'test_plan__results_added_once_testing_is_performed_' => 'Test Plan',
    'starter_reference_list__expand_as_more_sources_are_used_' => 'Starter Reference List',
    'appendix_a' => 'Appendix A: Supporting Materials Index',
];

// ── 6. Build proposal_json structure ─────────────────────────────────────────
$sections = [];
foreach ($rawSections as $row) {
    $key     = $row['section_key'];
    $content = $row['content'];

    // Simple placeholder substitution (no AI)
    $content = str_replace('[TEAM_LEADER]',      $leaderName,                     $content);
    $content = str_replace('[TEAM_MEMBERS]',     implode(', ', $memberNames),     $content);
    $content = str_replace('[TRAINER_NAME]',     $trainerName ?: 'Supervising Trainer', $content);
    $content = str_replace('[COURSE_NAME]',      $courseName,                     $content);
    $content = str_replace('[DATE]',             $today,                          $content);
    $content = str_replace('[TEAM_SIZE]',        (string)$teamSize,               $content);

    $sections[] = [
        'key'    => $key,
        'title'  => $sectionTitles[$key] ?? $key,
        'content' => $content,
        'source' => 'catalog_seed',
    ];
}

$proposalJson = [
    'source'             => 'catalog_seed',
    'catalog_project_id' => $catalogProjectId,
    'project_title'      => $catProject['title'],
    'category'           => $catProject['category'],
    'sections'           => $sections,
    'team' => [
        'leader'       => $leaderName,
        'members'      => $memberNames,
        'all_members'  => $allNames,
        'trainer'      => $trainerName,
        'course'       => $courseName,
        'date'         => $today,
    ],
    'generated_at' => date('c'),
];

// ── 7. Save to training_ideas ────────────────────────────────────────────────
$saveStmt = $db->prepare("
    UPDATE training_ideas
    SET title              = ?,
        title_en           = ?,
        description        = ?,
        description_en     = ?,
        tech_stack         = ?,
        catalog_project_id = ?,
        proposal_json      = ?,
        updated_at         = NOW()
    WHERE id = ?
");
$saveStmt->execute([
    $catProject['title'],
    $catProject['title'],
    $sections[0]['content'] ?? '',   // abstract as short description
    $sections[0]['content'] ?? '',
    $catProject['skills'],
    $catalogProjectId,
    json_encode($proposalJson, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
    $ideaId,
]);

respond([
    'success'       => true,
    'idea_id'       => $ideaId,
    'proposal'      => $proposalJson,
]);
