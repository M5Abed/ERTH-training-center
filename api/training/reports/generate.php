<?php
// =========================================================
// NMU TRAINING — AI Automated Report Generation
// Access: Trainee, Trainer, Admin
//
// Verified against: NMU_AI_Robotics_Field_Training_Project_Template.pdf
// Template is 30 pages. Sections with "Student content" are:
//   Pages: 2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../ai/ai_engine.php';
require_once __DIR__ . '/../../../vendor/autoload.php';

use PhpOffice\PhpWord\TemplateProcessor;

requireRole(['trainee', 'trainer', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

// Ensure the master template file exists — dynamic relative paths
$candidateTemplates = [
    __DIR__ . '/master_template.docx',
    __DIR__ . '/../templates/NMU_AI_Robotics_Field_Training_Project_Template.docx',
    dirname(__DIR__, 2) . '/templates/NMU_AI_Robotics_Field_Training_Project_Template.docx',
    dirname(__DIR__, 2) . '/dev/NMU_AI_Robotics_Field_Training_Project_Template.docx',
    dirname(__DIR__, 2) . '/NMU_AI_Robotics_Field_Training_Project_Template.docx',
];
$templatePath = null;
foreach ($candidateTemplates as $ct) {
    if (file_exists($ct)) {
        $templatePath = $ct;
        break;
    }
}
if (!$templatePath) {
    respondError('Official report template not found.', 500);
}

$userId = requireSession();

// body() restricts array fields — override for report generation
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    respondError('Invalid JSON body', 400);
}

// Validate top-level keys
if (empty($data['metadata']) || !is_array($data['metadata'])) {
    respondError('Missing or invalid report metadata', 400);
}
if (empty($data['sections']) || !is_array($data['sections'])) {
    respondError('Missing or invalid report sections', 400);
}

$metadata = $data['metadata'];
$sections = $data['sections'];

// ── AI Section Configuration ────────────────────────────────────────────────
// Verified from the official NMU PDF template (30 pages).
// Placeholder names must be used verbatim in master_template.docx.
// ─────────────────────────────────────────────────────────────────────────────
$aiSectionsConfig = [

    // Page 2 — Approval Page (metadata only, no AI text needed)
    // Page 3 — Student Declaration (static text, no AI needed)

    // Page 4 — Acknowledgment
    'ack_content'       => [
        'title'      => 'Acknowledgment',
        'guidelines' => 'Thank the university, faculty, laboratory team, supervisors, and trainers. '
                      . 'Mention any technical or logistical support that directly contributed to the project. '
                      . 'Keep it professional and concise (150-250 words).',
    ],

    // Page 5 — Executive Summary / Abstract
    'exec_summary'      => [
        'title'      => 'Executive Summary / Abstract',
        'guidelines' => 'Write 200-300 words after completing the project. '
                      . 'Include the problem, objective, robot/platform, methodology, main implementation, key result, and conclusion. '
                      . 'Avoid citations, long background discussion, and undefined abbreviations.',
    ],

    // Page 6 — Table of Contents (generated automatically in Word, no AI section)
    // Page 7 — Lists of Figures and Tables (student fills, no AI)

    // Page 8 — Abbreviations and Technical Terms
    'ch0_abbreviations' => [
        'title'      => 'Abbreviations and Technical Terms',
        'guidelines' => 'List only the abbreviations that appear in the report. '
                      . 'Write the full term for each. Include robot-specific and software-specific terms used by this project. '
                      . 'Format as: ABBREVIATION — Full Term. One entry per line.',
    ],

    // Page 9 — Chapter 1: 1.1 Field Training Context and Technology Area
    'ch1_intro'         => [
        'title'      => '1.1 Field Training Context and Technology Area',
        'guidelines' => 'Describe the AI & Robotics field training and the selected application area. '
                      . 'Explain why the topic is relevant to education, industry, healthcare, museums, smart cities, or society. '
                      . 'Introduce the robot/platform used without giving detailed implementation yet.',
    ],

    // Page 10 — 1.2 Technical Background
    'ch1_background'    => [
        'title'      => '1.2 Technical Background',
        'guidelines' => 'Explain the basic concepts required to understand the project. '
                      . 'Describe the role of sensors, actuators, controller, software, and AI in the system. '
                      . 'Use simple descriptions and cite any external technical information.',
    ],

    // Page 11 — 1.3 Aim, Objectives and Scope
    'ch1_aim_scope'     => [
        'title'      => '1.3 Aim, Objectives and Scope',
        'guidelines' => 'Write one clear overall aim. '
                      . 'Provide 4-7 measurable objectives beginning with action verbs (design, implement, test, evaluate, integrate). '
                      . 'State what is included and excluded from the project scope.',
    ],

    // Page 12 — 2.1 Existing Systems and Similar Projects
    'ch2_related_work'  => [
        'title'      => '2.1 Existing Systems and Similar Projects',
        'guidelines' => 'Review at least three relevant systems, research projects, products, or educational demonstrations. '
                      . 'For each, explain the platform, method, main capability, and limitation. '
                      . 'Do not copy product descriptions; summarize and cite the source.',
    ],

    // Page 13 — 2.2 Comparison of Related Systems (NEW — was missing in previous implementation)
    'ch2_comparison'    => [
        'title'      => '2.2 Comparison of Related Systems',
        'guidelines' => 'Compare existing work using common criteria such as robot type, sensors, AI function, programming environment, '
                      . 'cost, accuracy, or application. '
                      . 'Explain what this project adopts, improves, simplifies, or changes. '
                      . 'Use the comparison to justify the proposed project.',
    ],

    // Page 14 — 2.3 Identified Gap and Project Contribution (NEW — was missing in previous implementation)
    'ch2_gap'           => [
        'title'      => '2.3 Identified Gap and Project Contribution',
        'guidelines' => 'Identify the unmet need or limitation found in related work. '
                      . 'Explain why the gap matters for selected users or environments. '
                      . 'State the expected contribution of the student project in 2-4 precise points.',
    ],

    // Page 15 — 3.1 Problem Statement
    'ch3_problem'       => [
        'title'      => '3.1 Problem Statement',
        'guidelines' => 'Describe the current situation, affected users, and main difficulty. '
                      . 'State causes, constraints, and consequences. '
                      . 'Write the problem as an engineering challenge.',
    ],

    // Page 16 — 3.2 Functional and Non-Functional Requirements (NEW — was missing)
    'ch3_requirements'  => [
        'title'      => '3.2 Functional and Non-Functional Requirements',
        'guidelines' => 'List functional requirements (what the system must do) and non-functional requirements (performance, '
                      . 'accuracy, reliability, safety, power consumption, cost). '
                      . 'Format each as a numbered list. Be specific and measurable where possible.',
    ],

    // Page 17 — 3.3 Tasks, Timeline, Risks and Evaluation Metrics (NEW — was missing)
    'ch3_plan'          => [
        'title'      => '3.3 Tasks, Timeline, Risks and Evaluation Metrics',
        'guidelines' => 'Break the project into training and development tasks. '
                      . 'Define measurable success criteria such as detection accuracy, task completion rate, response time, '
                      . 'navigation success, or repeatability. '
                      . 'Identify key technical risks and mitigation actions. '
                      . 'Describe the timeline for each major task.',
    ],

    // Page 18 — 4.1 Development Approach
    'ch4_methodology'   => [
        'title'      => '4.1 Development Approach',
        'guidelines' => 'Explain the steps followed from problem analysis to final testing. '
                      . 'Describe how the team divided tasks, reviewed progress, and made design decisions. '
                      . 'Include a description of the complete project methodology flow.',
    ],

    // Page 19 — 4.2 Selected Laboratory Equipment
    'ch4_platform'      => [
        'title'      => '4.2 Selected Laboratory Equipment',
        'guidelines' => 'Identify the selected platform (Yanshee, NAO, Robot Arm, AI Box, LIMO, Computer Vision Kit, or other). '
                      . 'Describe relevant hardware: cameras, microphones, motors, joints, LiDAR, IMU, gripper, controller, and connectivity. '
                      . 'Explain why this platform is suitable for the project.',
    ],

    // Page 20 — 4.3 Hardware and Software Architecture
    'ch4_architecture'  => [
        'title'      => '4.3 Hardware and Software Architecture',
        'guidelines' => 'Describe a block diagram showing inputs, processing, decision-making, and outputs. '
                      . 'List software tools, programming languages, libraries, APIs, operating systems, and communication methods. '
                      . 'Explain how the components exchange data.',
    ],

    // Page 21 — 4.4 System Logic and AI / Robotics Pipeline
    'ch4_workflow'      => [
        'title'      => '4.4 System Logic and AI / Robotics Pipeline',
        'guidelines' => 'Present the project flow from startup to task completion. '
                      . 'Describe sensing, preprocessing, AI inference or rule-based decision, robot action, and feedback. '
                      . 'Describe the main algorithm in pseudocode or step-by-step logic.',
    ],

    // Page 22 — 5.1 Setup and Integration Steps
    'ch5_setup'         => [
        'title'      => '5.1 Setup and Integration Steps',
        'guidelines' => 'Document the implementation in chronological steps. '
                      . 'Include hardware setup, network connection, software installation, calibration, and testing of individual components. '
                      . 'Use numbered steps; describe what was configured and why.',
    ],

    // Page 23 — 5.2 Code Structure and Key Functions
    'ch5_code'          => [
        'title'      => '5.2 Code Structure and Key Functions',
        'guidelines' => 'Explain the main files, modules, functions, robot behaviors, or block-programming sequences. '
                      . 'Include only important code excerpts and explain each excerpt. '
                      . 'Note that full code belongs in the appendix or repository, not in this section.',
    ],

    // Page 24 — 5.3 Complete System Operation
    'ch5_scenario'      => [
        'title'      => '5.3 Complete System Operation',
        'guidelines' => 'Describe one complete real-world or competition scenario. '
                      . 'Explain the initial state, user input, robot perception, decision, action, and final output. '
                      . 'Describe how the scenario demonstrates that all system components work together.',
    ],

    // Page 25 — 6.1 Test Plan and Test Cases (NEW — was missing)
    'ch6_test_plan'     => [
        'title'      => '6.1 Test Plan and Test Cases',
        'guidelines' => 'Test components individually before testing the full system. '
                      . 'For every test, record purpose, input/condition, expected result, actual result, and status. '
                      . 'Include normal cases, edge cases, and failure conditions. '
                      . 'Format as a prose description of the test strategy.',
    ],

    // Page 26 — 6.2 Measurements and Observed Performance
    'ch6_results'       => [
        'title'      => '6.2 Measurements and Observed Performance',
        'guidelines' => 'Present quantitative and qualitative results. '
                      . 'Reference tables, charts, images, or videos as evidence. '
                      . 'Compare results with the success criteria defined in Chapter 3 and explain any deviations.',
    ],

    // Page 27 — 6.3 Interpretation of Results / Discussion and Limitations
    'ch6_limitations'   => [
        'title'      => '6.3 Interpretation of Results',
        'guidelines' => 'Explain what worked well and why. '
                      . 'Discuss technical limitations such as lighting, noise, battery, Wi-Fi, processing delay, mechanical reach, '
                      . 'sensor range, or dataset limitations. '
                      . 'Describe corrective changes made during development.',
    ],

    // Page 28 — Chapter 7: Conclusion and Future Work
    'ch7_conclusion'    => [
        'title'      => 'Chapter 7 — Conclusion and Future Work',
        'guidelines' => 'Summarize the problem, system, method, and main result without adding new information. '
                      . 'Describe technical and teamwork skills gained during field training. '
                      . 'Recommend realistic future improvements or additional features.',
    ],

    // Page 29 — References
    'references'        => [
        'title'      => 'References',
        'guidelines' => 'Format a list of references based on the provided source information using a consistent academic style. '
                      . 'Include every source cited in the report: books, papers, official manuals, websites, datasets, and software documentation. '
                      . 'Each entry must include author/organization, title, year, publisher/site, URL if applicable, and access date for online material.',
    ],

    // Page 30 — Appendices
    'appendices'        => [
        'title'      => 'Appendices',
        'guidelines' => 'Organize supporting materials into labeled appendices: '
                      . 'Appendix A: Source code summary or repository link. '
                      . 'Appendix B: Datasheets, wiring diagrams, calibration settings. '
                      . 'Appendix C: Weekly training log, attendance records, photographs, additional test results, and team contribution table. '
                      . 'Describe each appendix item professionally.',
    ],
];

// ── Cover page metadata placeholders ────────────────────────────────────────
// Verified against PDF page 1 cover page fields.
$metadataPlaceholders = [
    'project_title',
    'student_1_name', 'student_1_id',
    'student_2_name', 'student_2_id',
    'student_3_name', 'student_3_id',
    'student_4_name', 'student_4_id',
    'student_5_name', 'student_5_id',
    'training_track',   // e.g. "Hardware"
    'platform_name',    // e.g. "LIMO", "NAO", "Yanshee"
    'supervisor_name',
    'trainer_name',
    'start_date',
    'end_date',
    'submit_date',
    // Page 5: Keywords field
    'keywords',
    // Composite / static fields — not AI generated, cleared if not supplied
    'student_names_ids',     // Page 2 approval page composite
    'approval_signatures',   // Page 2 approval block
    'declaration_extra',     // Page 3 declaration extra space
    'toc_content',           // Page 6 TOC (auto-generated in Word)
    'figures_tables',        // Page 7 figures/tables list
    // Page 2: Approval page project title/student names (same vars reused)
];

// ── Load the Word Template ───────────────────────────────────────────────────
try {
    $templateProcessor = new TemplateProcessor($templatePath);
} catch (\Exception $e) {
    error_log('[Report Generation] Failed to load template: ' . $e->getMessage());
    respondError('Failed to process the master template.', 500);
}

// ── 1. Inject Metadata ───────────────────────────────────────────────────────
foreach ($metadataPlaceholders as $placeholder) {
    $value = isset($metadata[$placeholder]) ? trim((string)$metadata[$placeholder]) : '';
    try {
        $templateProcessor->setValue($placeholder, htmlspecialchars($value, ENT_XML1, 'UTF-8'));
    } catch (\Exception $e) {
        // Placeholder may not exist in the template — skip silently
    }
}

// ── 2. Process Content Sections through AI Engine ───────────────────────────
$generatedSections = [];

foreach ($sections as $placeholder => $rawInput) {
    if (!isset($aiSectionsConfig[$placeholder])) {
        continue; // Unknown placeholder — skip
    }

    $config = $aiSectionsConfig[$placeholder];
    $rawText = trim((string)$rawInput);

    if (empty($rawText)) {
        // Clear the placeholder but do not call AI
        try { $templateProcessor->setValue($placeholder, ''); } catch (\Exception $e) {}
        $generatedSections[$placeholder] = 'skipped';
        continue;
    }

    // Call AI Engine
    $aiResult = callAI($userId, 'report_section_writer', [
        'section_title' => $config['title'],
        'guidelines'    => $config['guidelines'],
        'raw_input'     => $rawText,
    ]);

    if ($aiResult['ok']) {
        $generatedText = is_string($aiResult['result']) ? $aiResult['result'] : json_encode($aiResult['result']);

        // Safe XML line break substitution for PhpWord TemplateProcessor
        // The TemplateProcessor setValue() only works with plain text or XML-safe content.
        // We use the PhpWord-supported approach: embed a literal newline as a Word XML break.
        $safeText = htmlspecialchars($generatedText, ENT_XML1, 'UTF-8');
        $safeText = str_replace("\n", '</w:t><w:br/><w:t xml:space="preserve">', $safeText);

        try {
            $templateProcessor->setValue($placeholder, $safeText);
        } catch (\Exception $e) {
            error_log("[Report Generation] setValue failed for $placeholder: " . $e->getMessage());
        }

        $generatedSections[$placeholder] = 'success';

    } else {
        $errorCode = $aiResult['code'] ?? 'ERROR';

        // Quota / rate limit errors must surface to the user
        if (in_array($errorCode, ['DAILY_LIMIT', 'RATE_LIMITED'], true)) {
            respondError($aiResult['error'], 429);
        }

        error_log("[Report Generation] AI error for $placeholder: " . ($aiResult['error'] ?? ''));
        try {
            $templateProcessor->setValue($placeholder, '[Content generation failed. Please fill this section manually.]');
        } catch (\Exception $e) {}

        $generatedSections[$placeholder] = 'error';
    }
}

// Clear any remaining un-submitted section placeholders
foreach (array_keys($aiSectionsConfig) as $configPlaceholder) {
    if (!isset($sections[$configPlaceholder])) {
        try { $templateProcessor->setValue($configPlaceholder, ''); } catch (\Exception $e) {}
    }
}

// ── 3. Save & Serve File ─────────────────────────────────────────────────────
try {
    $tempFile = tempnam(sys_get_temp_dir(), 'nmu_report_') . '.docx';
    $templateProcessor->saveAs($tempFile);

    $fileContent = file_get_contents($tempFile);
    @unlink($tempFile);

    // Build a safe filename from the project title
    $projectTitle = trim((string)($metadata['project_title'] ?? 'Project_Report'));
    $safeTitle    = preg_replace('/[^a-zA-Z0-9_\- ]/', '', $projectTitle);
    $safeTitle    = trim(str_replace(' ', '_', $safeTitle)) ?: 'Project_Report';
    $filename     = 'NMU_Report_' . $safeTitle . '.docx';

    // Override the global JSON Content-Type header set by config.php
    header_remove('Content-Type');
    header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Transfer-Encoding: binary');
    header('Expires: 0');
    header('Cache-Control: must-revalidate, post-check=0, pre-check=0');
    header('Pragma: public');
    header('Content-Length: ' . strlen($fileContent));
    header('X-Report-Sections: ' . json_encode($generatedSections));

    echo $fileContent;
    exit;

} catch (\Exception $e) {
    error_log('[Report Generation] Failed to save/send report: ' . $e->getMessage());
    respondError('Failed to generate the report file.', 500);
}
