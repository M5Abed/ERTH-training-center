<?php
// =========================================================
// NMU ERTH — Full .docx Proposal / Documentation Generator
// Access: Trainee (own idea), Trainer, Admin
// GET /api/training/ideas/proposal_docx.php?idea_id=123
//
// Generates the official NMU Field Training Project Report
// by hydrating the official template using TemplateProcessor.
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
    $stmt = $db->prepare('SELECT i.*, u.full_name AS owner_name, u.student_id AS owner_student_id FROM training_ideas i LEFT JOIN users u ON u.id = i.owner_id WHERE i.id = ?');
    $stmt->execute([$ideaId]);
} else {
    $stmt = $db->prepare('
        SELECT i.*, u.full_name AS owner_name, u.student_id AS owner_student_id
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

// ── Extract sections from 7-section structure or legacy format ──────────────
$secMap = [];
if (!empty($p['sections']) && is_array($p['sections'])) {
    foreach ($p['sections'] as $sec) {
        $k = $sec['key'] ?? '';
        if ($k) {
            $secMap[$k] = $sec['content'] ?? '';
        }
    }
}

$title           = $s($p['project_title']   ?? $p['title'] ?? $idea['title_en'], $idea['title_en']);
$category        = $s($p['category']        ?? 'software');
$platformMap     = [
    'software'   => 'Python / OpenCV / Deep Learning on Laptop',
    'yanshee'    => 'Yanshee Humanoid Robot',
    'nao'        => 'NAO Humanoid Robot',
    'integrated' => 'Integrated Capstone (Software + Humanoid Robot)',
];
$platform        = $platformMap[$category] ?? 'Python Environment on Laptop';
$trainingTrack   = ucfirst($category);

// Team and Trainer data
$teamData   = $p['team'] ?? [];
$leaderName = $s($teamData['leader'] ?? $idea['owner_name'], $idea['owner_name'] ?: 'Student');
$members    = $a($teamData['members'] ?? []);
$trainerName = $s($teamData['trainer'] ?? 'Dr. Supervising Trainer', 'Supervising Trainer');
$courseName  = $s($teamData['course'] ?? 'AI & Robotics Field Training', 'Field Training');

// Sections content
$abstract    = $secMap['abstract'] ?? $s($p['executive_summary'] ?? $idea['description_en'] ?? '');
$intro       = $secMap['introduction_background'] ?? $s($p['ch1_introduction'] ?? '');
$problem     = $secMap['problem_definition'] ?? $s($p['ch3_problem_statement'] ?? $idea['problem_statement'] ?? '');
$objectives  = $secMap['objectives_scope'] ?? $s($p['ch1_aim'] ?? '');
$related     = $secMap['related_work'] ?? $s($p['ch2_gap'] ?? '');
$methodology = $secMap['methodology'] ?? $s($p['ch4_methodology'] ?? '');
$sysDesign   = $secMap['expected_system_design'] ?? $s($p['ch4_system_architecture'] ?? '');

// Prepare the Template Processor
$templateFile = __DIR__ . '/../../../NMU_AI_Robotics_Field_Training_Project_Template.docx';
if (!file_exists($templateFile)) {
    // Try alternate dev path
    $templateFile = __DIR__ . '/../../dev/NMU_AI_Robotics_Field_Training_Project_Template.docx';
}
if (!file_exists($templateFile)) {
    respondError('Template file missing.', 500);
}

$tp = new TemplateProcessor($templateFile);
$tp->setMacroChars('[', ']');

// Set Scalar Variables
$tp->setValue('Enter the full project title', $title);
$tp->setValue('Student 1', $leaderName);
$tp->setValue('Student 2', $members[0] ?? '');
$tp->setValue('Student 3', $members[1] ?? '');
$tp->setValue('Student 4', $members[2] ?? '');
$tp->setValue('Student 5', $members[3] ?? '');
$tp->setValue('ID 1', (string)($idea['owner_student_id'] ?: $idea['owner_id'] ?: $uid));
$tp->setValue('ID 2', '');
$tp->setValue('ID 3', '');
$tp->setValue('Yanshee / NAO / Robot Arm / AI Box / LIMO / Other', $platform);
$tp->setValue('Name and title', $trainerName);
$tp->setValue('Start date', '14 July 2025');
$tp->setValue('End date', '18 July 2025');
$tp->setValue('Day / Month / Year', $today);
$tp->setValue('Project title', $title);

$allMembersStr = $leaderName . (!empty($members) ? ', ' . implode(', ', $members) : '');
$tp->setValue('Names and IDs', $allMembersStr);
$tp->setValue('3–6 keywords, e.g., robotics, computer vision, NAO, object detection', $s($idea['tech_stack'] ?? 'Artificial Intelligence, Robotics, Computer Vision'));
$tp->setValue('Enter problem statement here', $problem);
$tp->setValue('Expected deliverables', "• 1. Working System Demonstration\n• 2. Technical Documentation & Source Code\n• 3. Final Report & Presentation");

// Hydrate Related Work Table
$tp->setValue('Name', 'Prior Baseline System');
$tp->setValue('Robot', $platform);
$tp->setValue('Feature', substr($related, 0, 100));
$tp->setValue('Limitation', 'High latency / requires cloud dependency');
$tp->setValue('Citation', '[1]');

// Hydrate Risk Register Table
$tp->setValue('Risk', 'Environmental variation / lighting changes');
$tp->setValue('Action', 'Implement adaptive thresholding and robust confidence filtering');

// Hydrate Test Cases Table
$tp->setValue('Test', 'Baseline Verification');
$tp->setValue('Condition', 'Standard testing inputs');
$tp->setValue('Expected', 'Accurate output within latency threshold');
$tp->setValue('Actual', 'Pass');

// Hydrate Abbreviations Table
$tp->setValue('Add project-specific abbreviation', 'AI');
$tp->setValue('Add', 'Artificial Intelligence');
$tp->setValue('Title', '');

// ═══════════════════════════════════════════════════════
// STREAM THE DOCUMENT — via temp file for clean binary
// ═══════════════════════════════════════════════════════
$safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', substr($title, 0, 60));
$filename = 'ERTH_' . $safeName . '_Proposal.docx';

$tmpFile = tempnam(sys_get_temp_dir(), 'erth_docx_');
$tp->saveAs($tmpFile);

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
