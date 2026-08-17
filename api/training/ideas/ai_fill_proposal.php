<?php
// =========================================================
// NMU TRAINING — AI Fill Proposal Pages (Groq AI, Two-Batch)
// Access: Trainee, Trainer, Admin
// Calls Groq twice (12 sections each) and merges results.
// Uses robust JSON extraction that handles any wrapper text.
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../ai/ai_engine.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid  = (int)$user['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data     = body();
$ideaId   = (int)($data['idea_id'] ?? 0);
$title    = sanitizeString($data['title'] ?? '');
$desc     = sanitizeString($data['description'] ?? '');
$domain   = sanitizeString($data['domain'] ?? 'Software / AI');
$tech     = sanitizeString($data['tech_stack'] ?? '');
$prob     = sanitizeString($data['problem_statement'] ?? '');
$outp     = sanitizeString($data['expected_output'] ?? '');
$courseName = 'NMU Summer Field Training';

$db = db();

// ─── Enrich from DB ─────────────────────────────────────
if ($ideaId) {
    $stmt = $db->prepare("
        SELECT ti.*, tc.name AS course_name
        FROM training_ideas ti
        LEFT JOIN training_courses tc ON ti.course_id = tc.id
        WHERE ti.id = ?
    ");
    $stmt->execute([$ideaId]);
    $idea = $stmt->fetch();
    if ($idea) {
        $title      = $title ?: ($idea['title'] ?: 'Training Project');
        $desc       = $desc  ?: ($idea['description'] ?: '');
        $tech       = $tech  ?: ($idea['tech_stack'] ?? '');
        $prob       = $prob  ?: ($idea['problem_statement'] ?? '');
        $outp       = $outp  ?: ($idea['expected_output'] ?? '');
        $courseName = $idea['course_name'] ?: $courseName;
    }
}

if (!$title && !$desc) {
    respondError('Project title or description is required');
}

// ─── Robust JSON extractor ──────────────────────────────
// Finds the first valid JSON object anywhere in a string,
// even if the model wrapped it in markdown or added prose.
function extractJsonObject(string $raw): ?array {
    if (!$raw) return null;

    // 1. Try direct decode first
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) return $decoded;

    // 2. Strip all markdown code fences (```json ... ```, ``` ... ```)
    $stripped = preg_replace('/```(?:json)?\s*/i', '', $raw);
    $stripped = preg_replace('/```/', '', $stripped);
    $decoded  = json_decode(trim($stripped), true);
    if (is_array($decoded)) return $decoded;

    // 3. Extract by finding outermost { ... } block
    $start = strpos($raw, '{');
    $end   = strrpos($raw, '}');
    if ($start !== false && $end !== false && $end > $start) {
        $jsonStr = substr($raw, $start, $end - $start + 1);
        $decoded = json_decode($jsonStr, true);
        if (is_array($decoded)) return $decoded;
    }

    // 4. Try fixing common truncation — append missing }
    if ($start !== false) {
        $fragment = substr($raw, $start);
        // Count open vs close braces to see how many } are missing
        $openCount  = substr_count($fragment, '{');
        $closeCount = substr_count($fragment, '}');
        $missing = $openCount - $closeCount;
        if ($missing > 0) {
            $fixed   = $fragment . str_repeat('}', $missing);
            $decoded = json_decode($fixed, true);
            if (is_array($decoded)) return $decoded;
        }
    }

    return null;
}

// ─── Build shared payload ───────────────────────────────
$aiPayload = [
    'title'             => $title,
    'domain'            => $domain,
    'description'       => $desc ?: $title,
    'tech_stack'        => $tech ?: 'Python, ROS, OpenCV, PyTorch, Embedded Linux',
    'problem_statement' => $prob ?: 'Autonomous perception and task execution under real-world constraints',
    'expected_output'   => $outp ?: 'A validated prototype system running on laboratory hardware',
    'course_name'       => $courseName,
];

// ─── Call Batch A ────────────────────────────────────────
$resultA = callAI($uid, 'fill_proposal_a', $aiPayload);
if (!$resultA['ok']) {
    respondError('Groq AI failed on batch A: ' . ($resultA['error'] ?? 'unknown error'), 500);
}

$rawA      = is_string($resultA['result']) ? $resultA['result'] : json_encode($resultA['result']);
$generatedA = is_array($resultA['result'])
    ? $resultA['result']
    : extractJsonObject($rawA);

if (!is_array($generatedA) || empty($generatedA)) {
    // Log for debugging
    error_log('fill_proposal batch A parse failed. Raw: ' . substr($rawA, 0, 500));
    respondError('Batch A parse failed. Raw response: ' . substr($rawA, 0, 300), 500);
}

// ─── Call Batch B ────────────────────────────────────────
$resultB = callAI($uid, 'fill_proposal_b', $aiPayload);
if (!$resultB['ok']) {
    respondError('Groq AI failed on batch B: ' . ($resultB['error'] ?? 'unknown error'), 500);
}

$rawB      = is_string($resultB['result']) ? $resultB['result'] : json_encode($resultB['result']);
$generatedB = is_array($resultB['result'])
    ? $resultB['result']
    : extractJsonObject($rawB);

if (!is_array($generatedB) || empty($generatedB)) {
    error_log('fill_proposal batch B parse failed. Raw: ' . substr($rawB, 0, 500));
    respondError('Batch B parse failed. Raw response: ' . substr($rawB, 0, 300), 500);
}

// ─── Merge both batches ──────────────────────────────────
$generated = array_merge($generatedA, $generatedB);

// ─── Section titles map (All 27 pages) ───────────────────
$SECTION_TITLES = [
    'declaration'             => 'Student Declaration',
    'acknowledgment'          => 'Acknowledgment',
    'abstract'                => 'Executive Summary / Abstract',
    'figures_tables'          => 'Lists of Figures and Tables',
    'abbreviations'           => 'Abbreviations and Technical Terms',
    'introduction_background' => 'Chapter 1 — Introduction',
    'technical_background'    => '1.2 Technical Background',
    'objectives_scope'        => '1.3 Aim, Objectives and Scope',
    'related_work'            => 'Chapter 2 — Related Work',
    'comparative_analysis'    => '2.2 Comparative Analysis Table',
    'design_gap'              => '2.3 Research / Design Gap',
    'problem_definition'      => 'Chapter 3 — Problem Definition',
    'requirements'            => '3.2 Users and Requirements Specification',
    'project_plan'            => '3.3 Project Plan and Success Criteria',
    'methodology'             => 'Chapter 4 — Methodology',
    'platform_description'    => '4.2 Robot / Platform Description',
    'expected_system_design'  => '4.3 System Architecture',
    'algorithm_workflow'      => '4.4 Algorithm and Workflow',
    'implementation'          => 'Chapter 5 — Implementation Steps',
    'programming'             => '5.2 Programming and Configuration',
    'application_scenario'    => '5.3 Operational Application Scenario',
    'test_plan'               => 'Chapter 6 — Testing & Test Plan',
    'results'                 => '6.2 Results and Evaluation',
    'discussion'              => '6.3 Discussion and Limitations',
    'conclusion'              => 'Chapter 7 — Conclusion and Future Work',
    'references'              => 'References & Technical Sources',
    'appendices'              => 'Appendices & Supporting Records',
];

$newSections = [];
foreach ($SECTION_TITLES as $key => $defaultTitle) {
    $content = $generated[$key] ?? '';
    if (is_array($content)) {
        $content = json_encode($content, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    }
    $newSections[] = [
        'key'     => $key,
        'title'   => $defaultTitle,
        'content' => (string)$content,
        'source'  => 'ai_generated',
    ];
}

// ─── Build proposal ──────────────────────────────────────
$proposal = [
    'source'        => 'groq_ai_generated',
    'project_title' => $title,
    'category'      => $domain,
    'sections'      => $newSections,
    'team'          => [
        'leader'  => $user['full_name'] ?? ($user['username'] ?? 'Trainee'),
        'members' => [],
        'course'  => $courseName,
        'date'    => date('d / m / Y'),
    ],
    'generated_at'  => date('c'),
];

// Preserve existing team data if present
if ($ideaId) {
    $curStmt = $db->prepare("SELECT proposal_json FROM training_ideas WHERE id = ?");
    $curStmt->execute([$ideaId]);
    $curJson = $curStmt->fetchColumn();
    if ($curJson) {
        $curDecoded = json_decode($curJson, true);
        if (is_array($curDecoded) && !empty($curDecoded['team'])) {
            $proposal['team'] = $curDecoded['team'];
        }
    }

    // Persist
    $saveStmt = $db->prepare("
        UPDATE training_ideas
        SET proposal_json = ?, updated_at = NOW()
        WHERE id = ?
    ");
    $saveStmt->execute([
        json_encode($proposal, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
        $ideaId
    ]);
}

respond([
    'success'  => true,
    'message'  => 'Groq AI filled all sections across 2 batches successfully!',
    'proposal' => $proposal,
    'tokens'   => ($resultA['tokens'] ?? 0) + ($resultB['tokens'] ?? 0),
]);
