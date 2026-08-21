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
$role = strtolower($user['role'] ?? '');
$isAdmin = (bool)($user['is_admin'] || $role === 'admin');
$isEvaluator = (bool)($isAdmin || $role === 'trainer');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data              = body();
$catalogProjectId  = (int)($data['catalog_project_id'] ?? 0);
$courseId          = resolveCourseId($data['course_id'] ?? 0);
$trainingIdeaId    = resolveIdeaId($data['training_idea_id'] ?? 0);  // if idea already exists

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

// Ensure canonical category from static catalog data
if (file_exists(__DIR__ . '/catalog_64_data.php')) {
    require_once __DIR__ . '/catalog_64_data.php';
    if (function_exists('getCatalog64')) {
        $cItems = getCatalog64();
        foreach ($cItems as $ci) {
            if ((int)$ci['id'] === $catalogProjectId) {
                if (!$catProject) {
                    $catProject = [
                        'id'       => (int)$ci['id'],
                        'title'    => $ci['title'],
                        'category' => $ci['category'],
                        'level'    => $ci['level'],
                        'skills'   => $ci['skills'] ?? '',
                    ];
                } else {
                    $catProject['category'] = $ci['category'];
                }
                break;
            }
        }
    }
}

if (!$catProject) {
    respondError('Catalog project not found', 404);
}

// ── 2. Resolve course, enrollment, and approval rules ─────────────────────────
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
}

// Verify course exists and determine training type
$cStmt = $db->prepare("SELECT id, name, course_type FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();
if (!$course) {
    respondError('Course not found');
}
$courseName = $course['name'] ?? 'Training Course';
$courseType = strtolower($course['course_type'] ?? 'internal');

$isExternal = ($courseType === 'external');
if (!$isEvaluator) {
    $enrStmt = $db->prepare("SELECT id, training_type FROM trainee_enrollments WHERE trainee_id = ? AND course_id = ?");
    $enrStmt->execute([$uid, $courseId]);
    $enrRow = $enrStmt->fetch();
    if (!$enrRow) {
        try {
            $autoEnr = $db->prepare("
                INSERT INTO trainee_enrollments (course_id, trainee_id, training_type, source)
                VALUES (?, ?, ?, 'catalog_selection')
            ");
            $autoEnr->execute([$courseId, $uid, $courseType]);
        } catch (Throwable $e) {}
    } else if (strtolower($enrRow['training_type'] ?? '') === 'external') {
        $isExternal = true;
    }
}

// ── Approval Logic Business Rules: ───────────────────────────────────────────
// 1. Internal / Robotics Training selecting from 64 pre-approved catalog:
//    => Auto-Approved ('approved') immediately without waiting for admin review.
// 2. External Training selecting from 24 software catalog:
//    => Requires admin/supervisor review ('submitted').
if ($isExternal) {
    $targetStatus      = 'submitted';
    $initialFeedback   = null;
    $initialReviewedAt = null;
} else {
    $targetStatus      = 'approved';
    $initialFeedback   = 'معتمد تلقائياً (فكرة معتمدة مسبقاً من دليل مشاريع الكلية)';
    $initialReviewedAt = date('Y-m-d H:i:s');
}

if (!$trainingIdeaId) {
    // Check if trainee already has an idea for this course
    $existStmt = $db->prepare("SELECT id, status FROM training_ideas WHERE owner_id = ? AND course_id = ?");
    $existStmt->execute([$uid, $courseId]);
    $existingRow = $existStmt->fetch();
    $existingId = $existingRow ? (int)$existingRow['id'] : 0;
    $existingStatus = strtolower($existingRow['status'] ?? '');

    // Check if trainee is already a member in another active team FOR THIS COURSE
    $memSql = "
        SELECT ti.title FROM training_idea_members tim
        JOIN training_ideas ti ON tim.idea_id = ti.id
        WHERE tim.user_id = ? AND tim.role = 'member' AND ti.status != 'rejected' AND ti.course_id = ?
    ";
    $memParams = [$uid, $courseId];
    if ($existingId) {
        $memSql .= " AND ti.id != ?";
        $memParams[] = $existingId;
    }
    $memCheck = $db->prepare($memSql);
    $memCheck->execute($memParams);
    $alreadyMem = $memCheck->fetchColumn();
    if ($alreadyMem) {
        respondError("You are already enrolled as a team member in another project ('$alreadyMem').");
    }

    // Check if another team has already selected this catalog project ACROSS THE ENTIRE PLATFORM (Global Constraint)
    $takenCheck = $db->prepare("
        SELECT ti.id, ti.owner_id, u.full_name 
        FROM training_ideas ti
        JOIN users u ON u.id = ti.owner_id
        WHERE (ti.catalog_project_id = ? OR LOWER(TRIM(ti.title)) = LOWER(TRIM(?)))
          AND ti.status != 'rejected'
          AND ti.owner_id != ?
    ");
    $takenCheck->execute([$catalogProjectId, $catProject['title'], $uid]);
    $alreadyTaken = $takenCheck->fetch();

    if ($alreadyTaken) {
        respondError("This project idea has already been chosen by another team on the platform. Two teams cannot have the same idea. Please choose a different project.", 409);
    }

    if ($existingId) {
        if (($existingStatus === 'approved' || $existingStatus === 'completed') && !$isEvaluator && $isExternal) {
            respondError("This project idea has been officially approved by the supervisor and cannot be replaced.", 403);
        }
        $ideaId = $existingId;
        // Check existing columns
        $tiCols = $db->query("SHOW COLUMNS FROM training_ideas")->fetchAll(PDO::FETCH_COLUMN);
        $hasTitleEn = in_array('title_en', $tiCols, true);
        $hasDescEn  = in_array('description_en', $tiCols, true);

        // Update catalog_project_id, title, and set status according to course training type
        $sql = "
            UPDATE training_ideas 
            SET catalog_project_id = ?,
                title = ?,
                description = ?,
                status = ?,
                feedback = ?,
                reviewed_by = NULL,
                reviewed_at = ?,
                updated_at = NOW()
        ";
        $params = [
            $catalogProjectId,
            $catProject['title'],
            'Selected from the project catalog: ' . $catProject['title'],
            $targetStatus,
            $initialFeedback,
            $initialReviewedAt
        ];
        if ($hasTitleEn) {
            $sql .= ", title_en = ?";
            $params[] = $catProject['title'];
        }
        if ($hasDescEn) {
            $sql .= ", description_en = ?";
            $params[] = 'Selected from the project catalog: ' . $catProject['title'];
        }
        $sql .= " WHERE id = ? AND owner_id = ?";
        $params[] = $ideaId;
        $params[] = $uid;

        $updCatStmt = $db->prepare($sql);
        $updCatStmt->execute($params);
    } else {
        // Check existing columns
        $tiCols = $db->query("SHOW COLUMNS FROM training_ideas")->fetchAll(PDO::FETCH_COLUMN);
        $hasTitleEn = in_array('title_en', $tiCols, true);
        $hasDescEn  = in_array('description_en', $tiCols, true);

        $fields = ['owner_id', 'course_id', 'catalog_project_id', 'title', 'description', 'status', 'feedback', 'reviewed_at'];
        $placeholders = ['?', '?', '?', '?', '?', '?', '?', '?'];
        $params = [
            $uid,
            $courseId,
            $catalogProjectId,
            $catProject['title'],
            'Selected from the project catalog: ' . $catProject['title'],
            $targetStatus,
            $initialFeedback,
            $initialReviewedAt
        ];
        if ($hasTitleEn) {
            $fields[] = 'title_en';
            $placeholders[] = '?';
            $params[] = $catProject['title'];
        }
        if ($hasDescEn) {
            $fields[] = 'description_en';
            $placeholders[] = '?';
            $params[] = 'Selected from the project catalog: ' . $catProject['title'];
        }

        $insStmt = $db->prepare("INSERT INTO training_ideas (" . implode(', ', $fields) . ") VALUES (" . implode(', ', $placeholders) . ")");
        $insStmt->execute($params);
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
        description        = ?,
        tech_stack         = ?,
        catalog_project_id = ?,
        proposal_json      = ?,
        status             = ?,
        feedback           = ?,
        reviewed_by        = NULL,
        reviewed_at        = ?,
        updated_at         = NOW()
    WHERE id = ?
");
$saveStmt->execute([
    $catProject['title'],
    $sections[0]['content'] ?? '',   // abstract as short description
    $catProject['skills'],
    $catalogProjectId,
    json_encode($proposalJson, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
    $targetStatus,
    $initialFeedback,
    $initialReviewedAt,
    $ideaId,
]);

respond([
    'success'          => true,
    'idea_id'          => $ideaId,
    'status'           => $targetStatus,
    'is_auto_approved' => ($targetStatus === 'approved'),
    'proposal'         => $proposalJson,
]);
