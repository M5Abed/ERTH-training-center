<?php
// =========================================================
// NMU ERTH — Live Section Edit (Case A AI Call)
// Access: Trainee (own idea only)
//
// This is ONE of exactly TWO places in this feature where
// an AI call is permitted. The student requests a plain-
// language revision to ONE section. Only that section is
// updated in proposal_json; all others remain untouched.
//
// POST body: { idea_id: int, section_key: string, instruction: string }
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../ai/ai_engine.php';

$user = requireRole(['trainee', 'admin']);
$uid  = (int)$user['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data        = body();
$ideaId      = (int)($data['idea_id']     ?? 0);
$sectionKey  = sanitizeString($data['section_key']  ?? '');
$instruction = sanitizeString($data['instruction']  ?? '');

if (!$ideaId || !$sectionKey || !$instruction) {
    respondError('idea_id, section_key, and instruction are required');
}

$validSections = [
    'abstract', 'introduction_background', 'problem_definition',
    'objectives_scope', 'related_work', 'methodology', 'expected_system_design',
    'team_contribution_statement', 'success_criteria', 'technology_stack___tools',
    'anticipated_challenges___risk_mitigation', 'ethical___safety_considerations',
    'planned_implementation_approach__to_be_expanded_with_real_work_',
    'test_plan__results_added_once_testing_is_performed_',
    'starter_reference_list__expand_as_more_sources_are_used_', 'appendix_a',
    // Documentation-stage sections (also allowed for live edit once team has work)
    'implementation', 'testing_results', 'discussion', 'conclusion_future_work',
    'references', 'appendices',
];
if (!in_array($sectionKey, $validSections, true)) {
    respondError("Invalid section_key: '$sectionKey'");
}

$db = db();

// Fetch the idea — only owner (or team leader) can edit
$role    = strtolower($user['role'] ?? '');
$isAdmin = (bool)($user['is_admin'] || $role === 'admin');

if ($isAdmin) {
    $stmt = $db->prepare("SELECT id, owner_id, status, proposal_json FROM training_ideas WHERE id = ?");
    $stmt->execute([$ideaId]);
} else {
    $stmt = $db->prepare("
        SELECT id, owner_id, status, proposal_json FROM training_ideas
        WHERE id = ? AND (
            owner_id = ?
            OR EXISTS (
                SELECT 1 FROM training_idea_members
                WHERE idea_id = ? AND user_id = ? AND role = 'leader'
            )
        )
    ");
    $stmt->execute([$ideaId, $uid, $ideaId, $uid]);
}

$idea = $stmt->fetch();
if (!$idea) {
    respondError('Idea not found or access denied', 404);
}

$ideaStatus = strtolower($idea['status'] ?? '');
if (!$isAdmin && ($ideaStatus === 'approved' || $ideaStatus === 'completed')) {
    respondError("This project idea has been officially approved by the supervisor and the proposal is finalized and locked. You can still add team members and upload deliverables until training is complete.", 403);
}

// Parse existing proposal
$proposal = [];
if (!empty($idea['proposal_json'])) {
    $decoded = json_decode($idea['proposal_json'], true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $proposal = $decoded;
    }
}

// Find the current section content to include in the AI prompt
$currentContent = '';
foreach (($proposal['sections'] ?? []) as $sec) {
    if ($sec['key'] === $sectionKey) {
        $currentContent = $sec['content'] ?? '';
        break;
    }
}

if (!$currentContent) {
    respondError("Section '$sectionKey' not found in this proposal. Generate the proposal first.");
}

$sectionTitles = [
    'abstract'                => 'Abstract',
    'introduction_background' => 'Introduction & Background',
    'problem_definition'      => 'Problem Definition',
    'objectives_scope'        => 'Objectives & Scope',
    'related_work'            => 'Related Work',
    'methodology'             => 'Proposed Methodology',
    'expected_system_design'  => 'Expected System Design',
    'implementation'          => 'Implementation',
    'testing_results'         => 'Testing & Results',
    'discussion'              => 'Discussion',
    'conclusion_future_work'  => 'Conclusion & Future Work',
    'references'              => 'References',
    'appendices'              => 'Appendices',
];
$sectionTitle = $sectionTitles[$sectionKey] ?? $sectionKey;

// Guidelines per section type
$sectionGuidelines = [
    'abstract'                => 'Write a concise academic abstract (150-250 words) summarizing the project, problem, approach, and expected outcomes.',
    'introduction_background' => 'Write 2-3 paragraphs introducing the project context, its importance, and background technical concepts relevant to this work.',
    'problem_definition'      => 'Clearly state the specific problem being solved, why it matters, and what specific objectives are targeted.',
    'objectives_scope'        => 'List clear, measurable objectives and define what is in scope and out of scope for this project.',
    'related_work'            => 'Briefly review 2-3 related prior approaches or systems, highlighting their limitations and how this project addresses them.',
    'methodology'             => 'Describe the technical approach, tools, algorithms, and step-by-step methodology chosen for this project.',
    'expected_system_design'  => 'Describe the high-level architecture, key components, data flow, and expected system design.',
    'implementation'          => 'Describe what was actually built, key technical decisions made, and code/system structure.',
    'testing_results'         => 'Describe the testing strategy, test cases run, metrics achieved, and results observed.',
    'discussion'              => 'Analyze the results: what worked well, what did not, and what insights were gained.',
    'conclusion_future_work'  => 'Summarize what was accomplished and propose concrete future improvements or extensions.',
    'references'              => 'List academic references, libraries, and resources used in IEEE or APA format.',
    'appendices'              => 'Include supplementary material such as code listings, configuration files, or additional diagrams.',
];

// ── THIS IS THE CASE A AI CALL — legitimate and intentional ──────────────────
$aiPayload = [
    'section_title' => $sectionTitle,
    'guidelines'    => ($sectionGuidelines[$sectionKey] ?? 'Revise this section professionally.') .
                       ' IMPORTANT: Apply the following user instruction exactly: ' . $instruction,
    'raw_input'     => "EXISTING SECTION CONTENT:\n" . $currentContent .
                       "\n\nUSER INSTRUCTION: " . $instruction,
];

$aiResult = callAI($uid, 'report_section_writer', $aiPayload);

if (!$aiResult['ok']) {
    $errCode = $aiResult['code'] ?? 'ERROR';
    if (in_array($errCode, ['DAILY_LIMIT', 'RATE_LIMITED'], true)) {
        respondError($aiResult['error'], 429);
    }
    respondError('AI revision failed: ' . ($aiResult['error'] ?? 'Unknown error'), 500);
}

$newContent = is_string($aiResult['result']) ? trim($aiResult['result']) : $currentContent;

// ── Update ONLY the targeted section in proposal_json ────────────────────────
$updated = false;
if (!empty($proposal['sections'])) {
    foreach ($proposal['sections'] as &$sec) {
        if ($sec['key'] === $sectionKey) {
            $sec['content']         = $newContent;
            $sec['source']          = 'ai_edited';
            $sec['last_edited_at']  = date('c');
            $updated = true;
            break;
        }
    }
    unset($sec);
}

if (!$updated) {
    // Section didn't exist yet (documentation stage) — append it
    $proposal['sections'][] = [
        'key'           => $sectionKey,
        'title'         => $sectionTitle,
        'content'       => $newContent,
        'source'        => 'ai_edited',
        'last_edited_at' => date('c'),
    ];
}

$proposal['last_ai_edit_at'] = date('c');

// Save back
$saveStmt = $db->prepare("UPDATE training_ideas SET proposal_json = ?, updated_at = NOW() WHERE id = ?");
$saveStmt->execute([
    json_encode($proposal, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
    $ideaId,
]);

respond([
    'success'         => true,
    'section_key'     => $sectionKey,
    'updated_content' => $newContent,
    'cached'          => $aiResult['cached'] ?? false,
]);
