<?php
// =========================================================
// NMU ERTH — Save Trainee Edits to Proposal Sections
// Access: Trainee (own idea), Trainer, Admin
//
// POST body: { idea_id: int, section_key: string, content: string, section_title?: string }
//
// Unlike proposal_edit_section.php (which calls AI to rewrite),
// this endpoint directly saves the raw trainee-typed text
// into proposal_json — no AI involved, immediate save.
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid  = (int)$user['id'];
$role = strtolower($user['role'] ?? 'trainee');
$isEval = (bool)($user['is_admin'] || $role === 'admin' || $role === 'trainer');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data         = body();
$ideaId       = (int)($data['idea_id']       ?? 0);
$sectionKey   = sanitizeString($data['section_key']   ?? '');
$newContent   = $data['content']      ?? '';           // raw string, no sanitation (student owns it)
$sectionTitle = sanitizeString($data['section_title'] ?? '');

if (!$ideaId || !$sectionKey) {
    respondError('idea_id and section_key are required');
}

// All 30 NMU template section keys
$validSections = [
    'approval', 'declaration', 'acknowledgment', 'abstract',
    'figures_tables', 'abbreviations',
    'introduction_background', 'technical_background',
    'objectives_scope', 'related_work',
    'comparative_analysis', 'design_gap',
    'problem_definition', 'requirements',
    'project_plan', 'methodology',
    'platform_description', 'expected_system_design',
    'algorithm_workflow', 'implementation',
    'programming', 'application_scenario',
    'test_plan', 'results', 'discussion',
    'conclusion', 'references', 'appendices',
];

if (!in_array($sectionKey, $validSections, true)) {
    respondError("Invalid section_key: '$sectionKey'");
}

$db = db();

// Access control — trainees can only edit their own / team ideas
if ($isEval) {
    $stmt = $db->prepare("SELECT id, owner_id, proposal_json FROM training_ideas WHERE id = ?");
    $stmt->execute([$ideaId]);
} else {
    $stmt = $db->prepare("
        SELECT id, owner_id, proposal_json FROM training_ideas
        WHERE id = ? AND (
            owner_id = ?
            OR EXISTS (
                SELECT 1 FROM training_idea_members
                WHERE idea_id = ? AND user_id = ?
            )
        )
    ");
    $stmt->execute([$ideaId, $uid, $ideaId, $uid]);
}

$idea = $stmt->fetch();
if (!$idea) {
    respondError('Idea not found or access denied', 404);
}

// Parse existing proposal_json
$proposal = [];
if (!empty($idea['proposal_json'])) {
    $decoded = json_decode($idea['proposal_json'], true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $proposal = $decoded;
    }
}

if (empty($proposal)) {
    respondError('No proposal found for this idea. Select a catalog project first.', 400);
}

// Default titles for all 30 NMU sections
$defaultTitles = [
    'declaration'             => 'Student Declaration',
    'acknowledgment'          => 'Acknowledgment',
    'abstract'                => 'Executive Summary / Abstract',
    'figures_tables'          => 'Lists of Figures and Tables',
    'abbreviations'           => 'Abbreviations and Technical Terms',
    'introduction_background' => 'Chapter 1 — Introduction & Background',
    'technical_background'    => 'Technical Background',
    'objectives_scope'        => 'Aim, Objectives & Scope',
    'related_work'            => 'Chapter 2 — Related Work',
    'comparative_analysis'    => 'Comparative Analysis',
    'design_gap'              => 'Research / Design Gap',
    'problem_definition'      => 'Chapter 3 — Problem Definition',
    'requirements'            => 'Users, Requirements & Use Cases',
    'project_plan'            => 'Project Plan, Timeline & Risk Register',
    'methodology'             => 'Chapter 4 — Methodology',
    'platform_description'    => 'Robot / Platform Description',
    'expected_system_design'  => 'System Architecture',
    'algorithm_workflow'      => 'Algorithm & Workflow',
    'implementation'          => 'Chapter 5 — Implementation',
    'programming'             => 'Programming & Configuration',
    'application_scenario'    => 'Application Scenario',
    'test_plan'               => 'Chapter 6 — Test Plan & Cases',
    'results'                 => 'Results & Evaluation',
    'discussion'              => 'Discussion & Limitations',
    'conclusion'              => 'Chapter 7 — Conclusion & Future Work',
    'references'              => 'References',
    'appendices'              => 'Appendices',
];

$resolvedTitle = $sectionTitle ?: ($defaultTitles[$sectionKey] ?? $sectionKey);

// Handle approval team fields
if ($sectionKey === 'approval') {
    $decodedTeam = is_string($newContent) ? json_decode($newContent, true) : (is_array($newContent) ? $newContent : null);
    if (is_array($decodedTeam)) {
        if (!isset($proposal['team'])) $proposal['team'] = [];
        $proposal['team'] = array_merge($proposal['team'], $decodedTeam);
    }
}

// Find and update the section, or insert it if new
$updated = false;
if (!empty($proposal['sections'])) {
    foreach ($proposal['sections'] as &$sec) {
        if ($sec['key'] === $sectionKey) {
            $sec['content']          = is_array($newContent) ? json_encode($newContent) : (string)$newContent;
            $sec['source']           = 'trainee_edit';
            $sec['last_edited_at']   = date('c');
            $sec['last_edited_by']   = $uid;
            if ($sectionTitle) {
                $sec['title'] = $resolvedTitle;
            }
            $updated = true;
            break;
        }
    }
    unset($sec);
}

if (!$updated) {
    // New section not previously in the AI-generated set
    $proposal['sections'][] = [
        'key'            => $sectionKey,
        'title'          => $resolvedTitle,
        'content'        => is_array($newContent) ? json_encode($newContent) : (string)$newContent,
        'source'         => 'trainee_edit',
        'last_edited_at' => date('c'),
        'last_edited_by' => $uid,
    ];
}

$proposal['last_trainee_edit_at'] = date('c');

// Persist
$saveStmt = $db->prepare("UPDATE training_ideas SET proposal_json = ?, updated_at = NOW() WHERE id = ?");
$saveStmt->execute([
    json_encode($proposal, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT),
    $ideaId,
]);

respond([
    'success'       => true,
    'section_key'   => $sectionKey,
    'source'        => 'trainee_edit',
    'saved_at'      => date('c'),
]);
