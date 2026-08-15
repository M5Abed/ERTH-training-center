<?php
// =========================================================
// NMU ERTH AI — Full 30-Page .docx Proposal Generator
// Access: Trainee (own idea), Trainer, Admin
// GET /api/training/ideas/proposal_docx.php?idea_id=123
//
// Generates the official NMU Field Training Project Report
// by hydrating the exact Template.docx using TemplateProcessor.
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../../vendor/autoload.php';

use PhpOffice\PhpWord\TemplateProcessor;

$user   = requireRole(['trainee', 'trainer', 'admin']);
$uid    = (int)$user['id'];
$role   = strtolower($user['role'] ?? 'trainee');
$isEval = (bool)($user['is_admin'] || $role === 'admin' || $role === 'trainer');

$ideaId = (int)($_GET['idea_id'] ?? 0);
if (!$ideaId) respondError('idea_id is required');

$db = db();
if ($isEval) {
    $stmt = $db->prepare('SELECT i.*, u.full_name AS owner_name FROM training_ideas i LEFT JOIN users u ON u.id = i.owner_id WHERE i.id = ?');
    $stmt->execute([$ideaId]);
} else {
    $stmt = $db->prepare('
        SELECT i.*, u.full_name AS owner_name 
        FROM training_ideas i 
        LEFT JOIN users u ON u.id = i.owner_id 
        WHERE i.id = ? 
          AND (i.owner_id = ? OR EXISTS (SELECT 1 FROM training_idea_members tim WHERE tim.idea_id = i.id AND tim.user_id = ?))
    ');
    $stmt->execute([$ideaId, $uid, $uid]);
}
$idea = $stmt->fetch();
if (!$idea) respondError('Idea not found or access denied', 404);

if (empty($idea['proposal_json'])) {
    respondError('No proposal has been generated for this idea yet. Please generate a proposal first.', 404);
}

$p = json_decode($idea['proposal_json'], true);
if (!is_array($p) || json_last_error() !== JSON_ERROR_NONE) {
    respondError('Proposal data is corrupted. Please regenerate the proposal.', 500);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
$s  = fn($v, $fallback = '') => is_string($v) ? trim($v) : (is_array($v) ? implode(', ', $v) : $fallback);
$a  = fn($v) => is_array($v) ? $v : [];
$today = date('d / m / Y');
$trainingPeriod = '14 July 2025 to 18 July 2025'; // 1-week summer camp default

// ── Extract fields — supports both new 30-section schema and legacy schemas ───
$title           = $s($p['title']           ?? $idea['title_en'],  $idea['title_en']);
$platform        = $s($p['platform']        ?? 'Python / OpenCV on Laptop');
$trainingTrack   = $s($p['training_track']  ?? 'Software');
$ownerName       = $s($idea['owner_name']   ?? 'Student');
$keywords        = implode(', ', $a($p['keywords'] ?? []));
$execSummary     = $s($p['executive_summary'] ?? '');
$problemStmt     = $s($p['ch3_problem_statement'] ?? $s($p['problem_statement']['pain_points'] ?? 'N/A'));

// Prepare the Template Processor
$templateFile = __DIR__ . '/../../../NMU_AI_Robotics_Field_Training_Project_Template.docx';
if (!file_exists($templateFile)) {
    respondError('Template file missing.', 500);
}

$tp = new TemplateProcessor($templateFile);
// We use the exact brackets from the template so we don't need to risk XML corruption by normalizing the file
$tp->setMacroChars('[', ']');

// Set Scalar Variables
$tp->setValue('Enter the full project title', $title);
$tp->setValue('Student 1', $ownerName);
$tp->setValue('Student 2', '');
$tp->setValue('Student 3', '');
$tp->setValue('Student 4', '');
$tp->setValue('Student 5', '');
$tp->setValue('ID 1', (string)$uid);
$tp->setValue('ID 2', '');
$tp->setValue('ID 3', '');
$tp->setValue('Yanshee / NAO / Robot Arm / AI Box / LIMO / Other', $platform);
$tp->setValue('Name and title', 'Prof. Ahmed');
$tp->setValue('Start date', '14 July 2025');
$tp->setValue('End date', '18 July 2025');
$tp->setValue('Day / Month / Year', $today);
$tp->setValue('Project title', $title);
$tp->setValue('Names and IDs', "$ownerName ($uid)");
$tp->setValue('3–6 keywords, e.g., robotics, computer vision, NAO, object detection', $keywords);
$tp->setValue('Enter problem statement here', $problemStmt);

$deliverables = '';
if (!empty($p['ch3_success_criteria'])) {
    $deliverables = implode("\n• ", $a($p['ch3_success_criteria']));
    $deliverables = "• " . $deliverables;
}
$tp->setValue('Expected deliverables', $deliverables);

// Hydrate Related Work Table
$rwData = $a($p['ch2_related_work'] ?? []);
if (count($rwData) > 0) {
    $tp->cloneRow('Name', count($rwData));
    $i = 1;
    foreach ($rwData as $work) {
        $tp->setValue("Name#$i", $s($work['name'] ?? ''));
        $tp->setValue("Robot#$i", $s($work['platform'] ?? ''));
        $tp->setValue("Feature#$i", $s($work['description'] ?? ''));
        $tp->setValue("Limitation#$i", $s($work['limitation'] ?? ''));
        $tp->setValue("Citation#$i", '[N/A]');
        $i++;
    }
} else {
    // Fill with empty if no data
    $tp->setValue('Name', 'None');
    $tp->setValue('Robot', '');
    $tp->setValue('Feature', '');
    $tp->setValue('Limitation', '');
    $tp->setValue('Citation', '');
}

// Hydrate Risk Register Table
$riskData = $a($p['ch3_risks'] ?? []);
if (count($riskData) > 0) {
    $tp->cloneRow('Risk', count($riskData));
    $i = 1;
    foreach ($riskData as $risk) {
        $tp->setValue("Risk#$i", $s($risk['risk'] ?? ''));
        $tp->setValue("Action#$i", $s($risk['mitigation'] ?? ''));
        $i++;
    }
} else {
    $tp->setValue('Risk', 'None identified');
    $tp->setValue('Action', '');
}

// Hydrate Test Cases Table
$testData = $a($p['ch6_test_cases'] ?? []);
if (count($testData) > 0) {
    $tp->cloneRow('Test', count($testData));
    $i = 1;
    foreach ($testData as $test) {
        $tp->setValue("Test#$i", $s($test['test'] ?? ''));
        $tp->setValue("Condition#$i", $s($test['condition'] ?? ''));
        $tp->setValue("Expected#$i", $s($test['expected'] ?? ''));
        $tp->setValue("Actual#$i", $s($test['actual'] ?? ''));
        $i++;
    }
} else {
    $tp->setValue('Test', 'No tests defined');
    $tp->setValue('Condition', '');
    $tp->setValue('Expected', '');
    $tp->setValue('Actual', '');
}

// Hydrate Abbreviations Table
$abbrData = $a($p['abbreviations'] ?? []);
if (count($abbrData) > 0) {
    $tp->cloneRow('Add project-specific abbreviation', count($abbrData));
    $i = 1;
    foreach ($abbrData as $abbr) {
        $tp->setValue("Add project-specific abbreviation#$i", $s($abbr['abbr'] ?? ''));
        $tp->setValue("Add#$i", $s($abbr['meaning'] ?? ''));
        $i++;
    }
} else {
    $tp->setValue('Add project-specific abbreviation', 'AI');
    $tp->setValue('Add', 'Artificial Intelligence');
}

// Remove the ch_title placeholder if we didn't map it to an array
$tp->setValue('Title', '');


// ═══════════════════════════════════════════════════════
// STREAM THE DOCUMENT — via temp file for clean binary
// ═══════════════════════════════════════════════════════
$safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', substr($title, 0, 60));
$filename = 'NMU_ErthaAI_' . $safeName . '.docx';

// Save to a temp file first — this guarantees a 100% clean binary stream
// because php://output can be polluted by stray whitespace or notices
$tmpFile = tempnam(sys_get_temp_dir(), 'erth_docx_');
$tp->saveAs($tmpFile);

// Now flush any buffered PHP output and stream the clean file
while (ob_get_level() > 0) ob_end_clean();

header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . filesize($tmpFile));
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: public');
header('Expires: 0');

readfile($tmpFile);
@unlink($tmpFile);
exit;
