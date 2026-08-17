<?php
// =========================================================
// NMU ERTH — Full .docx Proposal / Documentation Generator
// Access: Trainee (own idea), Trainer, Admin
// GET /api/training/ideas/proposal_docx.php?idea_id=123
//
// Generates the official NMU Field Training Project Report
// by hydrating the official template using TemplateProcessor
// + direct XML manipulation to fill all 29 "Student content"
// section bodies with real catalog proposal data.
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

// ── Load catalog and find matching project ─────────────────────────────────
require_once __DIR__ . '/catalog_64_data.php';
$catalog   = getCatalog64();
$catProject = null;

// Priority 1: explicit catalog_project_id
if (!empty($idea['catalog_project_id'])) {
    foreach ($catalog as $cp) {
        if ($cp['id'] === (int)$idea['catalog_project_id']) { $catProject = $cp; break; }
    }
}
// Priority 2: title_en exact match
if (!$catProject && !empty($idea['title_en'])) {
    foreach ($catalog as $cp) {
        if (strcasecmp($cp['title'], $idea['title_en']) === 0) { $catProject = $cp; break; }
    }
}
// Priority 3: title match
if (!$catProject && !empty($idea['title'])) {
    foreach ($catalog as $cp) {
        if (strcasecmp($cp['title'], $idea['title']) === 0) { $catProject = $cp; break; }
    }
}
// Priority 4: fuzzy substring match on title
if (!$catProject) {
    $searchTitle = strtolower($idea['title_en'] ?: $idea['title'] ?: '');
    if ($searchTitle) {
        foreach ($catalog as $cp) {
            if (stripos($cp['title'], $searchTitle) !== false || stripos($searchTitle, $cp['title']) !== false) {
                $catProject = $cp;
                break;
            }
        }
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
$s  = fn($v, $fallback = '') => is_string($v) ? trim($v) : (is_array($v) ? implode(', ', $v) : $fallback);
$a  = fn($v) => is_array($v) ? $v : [];
$today = date('d / m / Y');

// ── Merge proposal_json + catalog sections ─────────────────────────────────
$p = !empty($idea['proposal_json']) ? json_decode($idea['proposal_json'], true) : [];
if (!is_array($p)) $p = [];

// Build section map from proposal_json
$secMap = [];
if (!empty($p['sections']) && is_array($p['sections'])) {
    foreach ($p['sections'] as $sec) {
        $k = $sec['key'] ?? '';
        if ($k) $secMap[$k] = $sec['content'] ?? '';
    }
}

// Override / fill gaps with catalog data (catalog has richer content)
if ($catProject && !empty($catProject['sections'])) {
    foreach ($catProject['sections'] as $sk => $sVal) {
        if (empty($secMap[$sk]) || strlen(trim($secMap[$sk])) < 50) {
            $secMap[$sk] = $sVal;
        }
    }
}

// ── Resolve project metadata ────────────────────────────────────────────────
$title = $s($p['project_title'] ?? $p['title'] ?? '', '');
if (empty($title)) $title = $s($idea['title_en'] ?? '', $idea['title'] ?? 'Training Project');

$category = $s($catProject['category'] ?? $p['category'] ?? 'software');
$platformMap = [
    'software'   => 'Python / OpenCV / Deep Learning on Laptop',
    'yanshee'    => 'Yanshee Humanoid Robot',
    'nao'        => 'NAO Humanoid Robot',
    'integrated' => 'Integrated Capstone (Software + Humanoid Robot)',
];
$platform      = $platformMap[$category] ?? 'Python / OpenCV Environment on Laptop';
$trainingTrack = ucfirst($category);
$level         = $catProject['level'] ?? 'Intermediate';
$skills        = $catProject['skills'] ?? $s($idea['tech_stack'] ?? 'AI, Computer Vision, Python');

// ── Team members from DB ────────────────────────────────────────────────────
$memStmt = $db->prepare('
    SELECT u.full_name, u.student_id, tim.role
    FROM training_idea_members tim
    JOIN users u ON u.id = tim.user_id
    WHERE tim.idea_id = ?
    ORDER BY CASE WHEN tim.role = "leader" THEN 0 ELSE 1 END, u.full_name
');
$memStmt->execute([$ideaId]);
$dbMembers = $memStmt->fetchAll();

$leaderName = $s($_GET['team_leader'] ?? '', '');
$leaderId   = (string)($idea['owner_student_id'] ?: $idea['owner_id'] ?: $uid);
$memberList = [];
$memberIds  = [];

if (!empty($dbMembers)) {
    foreach ($dbMembers as $dm) {
        $mName = $dm['full_name'] ?: 'Student';
        $mId   = (string)($dm['student_id'] ?: '');
        if ($dm['role'] === 'leader' && empty($leaderName)) {
            $leaderName = $mName;
            if ($mId) $leaderId = $mId;
        } else {
            $memberList[] = $mName;
            $memberIds[]  = $mId;
        }
    }
}

$teamData = $p['team'] ?? [];
if (empty($leaderName)) {
    $leaderName = $s($teamData['leader'] ?? $idea['owner_name'], $idea['owner_name'] ?: 'Student');
}
if (empty($memberList) && !empty($teamData['members'])) {
    $memberList = $a($teamData['members']);
}
if (!empty($_GET['team_members'])) {
    $memberList = array_map('trim', explode(',', $_GET['team_members']));
}

$trainerName = $s($_GET['trainer_name'] ?? $teamData['trainer'] ?? 'Dr. Supervising Trainer', 'Supervising Trainer');
$courseName  = $s($teamData['course'] ?? 'AI & Robotics Field Training', 'Field Training');
$startDate   = $s($_GET['start_date'] ?? '14 July 2026', '14 July 2026');
$endDate     = $s($_GET['end_date'] ?? '18 August 2026', '18 August 2026');

// ── Extract full section content ────────────────────────────────────────────
// Map of catalog keys -> section bodies
$abstract    = $secMap['abstract']                    ?? $s($idea['description_en'] ?? $idea['description'] ?? '');
$intro       = $secMap['introduction_background']     ?? $s($p['ch1_introduction'] ?? '');
$objectives  = $secMap['objectives_scope']            ?? $s($p['ch1_aim'] ?? '');
$related     = $secMap['related_work']                ?? $s($p['ch2_gap'] ?? '');
$methodology = $secMap['methodology']                 ?? $s($p['ch4_methodology'] ?? '');
$sysDesign   = $secMap['expected_system_design']      ?? $s($p['ch4_system_architecture'] ?? '');
$problem     = $secMap['problem_definition']          ?? $s($p['ch3_problem_statement'] ?? $idea['problem_statement'] ?? '');

// Build rich derived content for sections not directly in catalog
$acknowledgment = "We would like to express our sincere appreciation and gratitude to New Mansoura University, the Faculty of Artificial Intelligence & Robotics, our academic supervisors, and our technical trainers at the ERTH Training Center.\n\nTheir continuous mentorship, technical support, and provision of state-of-the-art laboratory robotics hardware, computing resources, and simulation platforms have been invaluable to the successful completion of this field training project.\n\nWe are grateful to " . $trainerName . " for their guidance throughout this project titled \"" . $title . "\".";

$ch1FieldTraining = "This project, titled \"" . $title . "\", was completed as part of the AI & Robotics Field Training program at New Mansoura University, Faculty of Artificial Intelligence & Robotics.\n\nThe training program is designed to bridge academic theory with practical engineering experience by requiring students to design, implement, and document a complete AI or robotics system under laboratory conditions.\n\n" . ($intro ?: "The selected application area for this project is " . $title . ", which falls within the " . $trainingTrack . " track, utilizing " . $skills . " as the primary technical foundation.");

$ch1Background = "The technical foundation for this project draws on the following core concepts:\n\n• Computer Vision and Perception: The ability to extract meaningful information from visual input using image processing and machine learning.\n• Machine Learning / Deep Learning: Training models to recognize patterns and make decisions from data.\n• System Integration: Combining hardware sensors, software pipelines, and output interfaces into a cohesive system.\n\nThe platform selected for implementation is: " . $platform . ".\n\nThis platform provides the necessary capabilities for the " . $title . " system, enabling " . $skills . " to be applied effectively in a controlled laboratory environment.";

$ch1Objectives = !empty($objectives) ? $objectives : "Overall Aim: To design and implement a working " . $title . " system that can be demonstrated reliably in a laboratory setting.\n\nMeasurable Objectives:\n1. Implement the core " . $title . " pipeline using " . $skills . ".\n2. Demonstrate the system on realistic inputs, not just isolated examples.\n3. Validate system performance through a structured test plan.\n4. Document all implementation decisions, results, and known limitations.\n5. Deliver a complete technical report and live demonstration.\n\nIn Scope: Building and testing the core system pipeline; demonstrating it during evaluation; full technical documentation.\nOut of Scope: Large-scale production deployment; extensive data collection beyond training requirements.";

$ch2ExistingSystems = !empty($related) ? $related : "Several existing systems and research projects are relevant to " . $title . ". These include:\n\n1. OpenCV-based baseline systems: Classical computer vision approaches that are well-documented and widely used in educational contexts. These systems are fast to set up but fragile under real-world variation.\n\n2. Deep Learning approaches: CNN-based models that generalize better to real-world inputs but require more computational resources and labeled training data.\n\n3. Platform-specific implementations: Systems built specifically for " . $platform . " that demonstrate the integration of AI models with physical hardware.\n\nEach of these approaches has been studied to inform the design choices for this project.";

$ch2Comparison = "The following comparison table summarizes key differences between related approaches:\n\n| System | Platform | Main Feature | Limitation | Source |\n|--------|----------|-------------|-----------|--------|\n| Classical CV Pipeline | Laptop / PC | Fast, easy to reason about | Fragile under lighting variation | [1] |\n| CNN-based Deep Learning | GPU Server | High accuracy, generalizes well | Requires large dataset and GPU | [2] |\n| " . $title . " (This Project) | " . $platform . " | " . substr($title, 0, 40) . " | Limited to laboratory conditions | This work |\n\nThis project improves on existing approaches by applying " . $skills . " to achieve the described capability within the constraints of the training program.";

$ch2Gap = "The identified gap in existing work is: existing systems for " . $title . " either require more resources than available in a training laboratory, or they lack sufficient documentation for a student to replicate and understand the implementation.\n\nThis project addresses this gap by:\n1. Implementing a complete, documented pipeline using " . $skills . ".\n2. Testing the system systematically with defined test cases.\n3. Providing a reproducible implementation that can be extended in future training cycles.";

$ch3Problem = !empty($problem) ? $problem : "Current Situation: The task addressed by " . $title . " currently depends on manual processes or is not automated in the target environment.\n\nAffected Users: Students, instructors, and researchers in the AI & Robotics training program who would benefit from an automated solution.\n\nTechnical Challenge: Building a reliable " . $title . " system that works consistently under laboratory conditions using " . $skills . ", while remaining simple enough to implement within the training timeframe.\n\nSuccess Definition: A system that processes realistic inputs, produces correct outputs reliably, and can be demonstrated to an evaluator without manual intervention.";

$ch3Requirements = "Stakeholders:\n• Primary Users: Trainees and instructors at the ERTH Training Center.\n• Secondary Users: Lab supervisors and external evaluators.\n• Environment: NMU AI & Robotics Laboratory, " . $platform . ".\n\nFunctional Requirements:\n• FR-01 [High]: The system shall process input from " . $platform . " in real time.\n• FR-02 [High]: The system shall produce correct outputs for at least 80% of test inputs.\n• FR-03 [Medium]: The system shall display results in a clear, human-readable format.\n• FR-04 [Low]: The system shall log results for post-demo review.\n\nNon-Functional Requirements:\n• NFR-01 [High]: The system should respond within 2 seconds per input under normal conditions.\n• NFR-02 [High]: The system should be safe to operate in a shared laboratory environment.\n• NFR-03 [Medium]: The system should be documented sufficiently for a peer to replicate.";

$ch3Plan = "Project Tasks and Timeline:\n\nWeek 1: System design, component study, environment setup, and initial testing of " . $skills . ".\nWeek 2: Core algorithm implementation and unit testing of each pipeline stage.\nWeek 3: Integration testing, edge-case handling, and performance optimization.\nWeek 4: Documentation, final report writing, and demonstration preparation.\n\nSuccess Criteria:\n• Core pipeline processes at least 10 varied inputs correctly during evaluation.\n• System response time < 2 seconds per input.\n• Complete documentation submitted with report.\n\nRisk Register:\n• Risk: Hardware/platform unavailability | Likelihood: Low | Impact: High | Mitigation: Test on alternative hardware or simulation.\n• Risk: Algorithm accuracy below target | Likelihood: Medium | Impact: High | Mitigation: Use pretrained models as fallback.\n• Risk: Documentation incomplete | Likelihood: Low | Impact: Medium | Mitigation: Maintain running notes from Day 1.";

$ch4DevApproach = !empty($methodology) ? $methodology : "Development Methodology: This project follows a staged development approach:\n\nStage 1 — Requirements & Design: Analyze the problem, study relevant tools, and finalize the system design before writing code.\n\nStage 2 — Implementation (3 independent modules):\n  Module A: Input/Perception — Get raw input flowing reliably from " . $platform . " before adding any intelligence.\n  Module B: Core Logic — Implement and validate the " . $title . " algorithm in isolation using saved test inputs.\n  Module C: Output/Action — Connect the validated logic to its final output and polish the end-to-end experience.\n\nStage 3 — Testing & Validation: Run the structured test plan, record results, and fix identified issues.\n\nStage 4 — Documentation & Presentation: Write the final report and prepare the live demonstration.";

$ch4Platform = "Selected Platform: " . $platform . "\n\nThis platform was selected for the " . $title . " project because it provides the necessary hardware capabilities for " . $skills . " while being available in the NMU AI & Robotics Laboratory.\n\nRelevant Hardware Components:\n• Camera/Sensor: For visual input acquisition and preprocessing.\n• Processing Unit: For running AI inference and decision logic.\n• Output Interface: For displaying results or triggering actions.\n• Communication: For data exchange between system components.\n\nThe platform is suitable for this project because it supports the required " . $skills . " stack and can demonstrate the system's capabilities in a controlled laboratory environment.";

$ch4Architecture = !empty($sysDesign) ? $sysDesign : "System Architecture for " . $title . ":\n\nHigh-Level Pipeline:\nInput → Preprocessing → Core AI/Processing → Decision → Output\n\nComponents:\n1. Input Module: Captures data from " . $platform . " (camera frames, sensor readings, or other inputs).\n2. Preprocessing Module: Normalizes, filters, and prepares raw input for the AI model.\n3. Core Logic / AI Module: Applies " . $skills . " to process input and produce intermediate results.\n4. Decision Module: Interprets AI output and determines the appropriate system response.\n5. Output Module: Displays results on screen, sends commands to robot hardware, or logs data.\n\nSoftware Stack:\n• Language: Python 3.x\n• Libraries: " . $skills . "\n• Development Environment: Standard lab laptop / " . $platform . "\n• Version Control: Git / GitHub";

$ch4Algorithm = "Algorithm and System Logic for " . $title . ":\n\nThe main processing pipeline executes the following steps:\n\n1. INPUT: Acquire raw data from " . $platform . " (frame capture, sensor read, or file load).\n2. PREPROCESS: Apply necessary transformations (resize, normalize, denoise) to prepare input.\n3. PROCESS: Run the core " . $skills . " algorithm to extract meaningful information.\n4. DECIDE: Apply thresholding, classification, or rule-based logic to the processed output.\n5. OUTPUT: Display result to user or trigger robot action.\n6. LOG: Record input, output, and timestamp for testing and documentation.\n\nThe pipeline is designed to be modular: each step can be tested independently before full integration.";

$ch5Implementation = "Implementation Steps:\n\nStep 1: Environment Setup\n• Install Python 3.x and required libraries (" . $skills . ").\n• Configure " . $platform . " and verify hardware connectivity.\n• Set up version control and project directory structure.\n\nStep 2: Module A — Input/Perception\n• Implement and test the raw input acquisition pipeline.\n• Verify data format, resolution, and frame rate meet requirements.\n\nStep 3: Module B — Core Logic\n• Implement the " . $title . " algorithm using " . $skills . ".\n• Test with saved example inputs before connecting to live input.\n\nStep 4: Module C — Integration\n• Connect all three modules into a complete end-to-end pipeline.\n• Verify the full system works on at least 5 different inputs.\n\nStep 5: Polish\n• Add error handling, clear output display, and user feedback.\n• Optimize for response time and reliability.";

$ch5Code = "Code Structure:\n\nMain files:\n• main.py: Entry point, initializes all modules and runs the main loop.\n• perception.py: Input acquisition and preprocessing from " . $platform . ".\n• processor.py: Core " . $title . " algorithm using " . $skills . ".\n• output.py: Result display and logging.\n• config.py: Configuration constants (thresholds, paths, parameters).\n\nKey Functions:\n• capture_input(): Acquires raw data from " . $platform . ".\n• preprocess(frame): Applies image normalization and filtering.\n• run_model(preprocessed): Executes the AI/CV algorithm.\n• display_result(result): Shows output on screen or triggers robot action.\n• log_result(input, output): Records test data for documentation.\n\nFull source code is available in Appendix A.";

$ch5Scenario = "Complete Operation Scenario for " . $title . ":\n\nScenario: Standard Laboratory Demonstration\n\n1. INITIAL STATE: System starts up, " . $platform . " is connected and camera is active.\n2. USER INPUT: Evaluator presents the target input (object, gesture, document, etc.) to the camera or sensor.\n3. PERCEPTION: The system captures and preprocesses the input in real time.\n4. PROCESSING: The " . $title . " algorithm runs and produces a classification or detection result.\n5. DECISION: The system determines the appropriate output based on the confidence threshold.\n6. ACTION/OUTPUT: Result is displayed on screen with label, confidence score, and timestamp.\n7. LOGGING: The system records the input-output pair for the test log.\n\nThis scenario can be repeated for multiple different inputs to demonstrate system reliability.";

$ch6TestPlan = "Test Plan for " . $title . ":\n\nTest 1 — Normal Case (T-01)\n• Input/Condition: Typical, expected input under standard laboratory lighting.\n• Expected: System produces correct output within 2 seconds.\n• Actual: [To be recorded during testing]\n• Status: [Pass/Fail]\n\nTest 2 — Edge Case (T-02)\n• Input/Condition: Partial, ambiguous, or low-quality input (poor lighting, occluded object, background noise).\n• Expected: System fails gracefully without crashing; outputs a low-confidence or 'uncertain' label.\n• Actual: [To be recorded during testing]\n• Status: [Pass/Fail]\n\nTest 3 — Repeatability (T-03)\n• Input/Condition: Same input presented 3 times consecutively.\n• Expected: System produces the same output each time (consistent behavior).\n• Actual: [To be recorded during testing]\n• Status: [Pass/Fail]\n\nTest 4 — Performance (T-04)\n• Input/Condition: 10 varied inputs presented sequentially.\n• Expected: Correct output for at least 8/10 inputs (80% accuracy).\n• Actual: [To be recorded during testing]\n• Status: [Pass/Fail]";

$ch6Results = "Results and Performance Measurements:\n\nSystem performance was measured against the success criteria defined in Chapter 3:\n\n• Accuracy: [To be filled after testing — target: ≥80% on 10 test inputs]\n• Response Time: [To be filled after testing — target: <2 seconds per input]\n• Repeatability: [To be filled after testing — target: same output for same input]\n\nQualitative Observations:\n• The system successfully demonstrates the core " . $title . " capability end-to-end.\n• Performance is consistent under standard laboratory conditions.\n• Edge cases (poor lighting, ambiguous input) are handled gracefully.\n\nEvidence: Screenshots and video recordings of system operation are available in Appendix A.";

$ch6Discussion = "Discussion of Results:\n\nWhat Worked Well:\n• The core " . $title . " pipeline using " . $skills . " performed reliably on the target input types.\n• Modular development allowed independent testing of each stage, making debugging straightforward.\n• The system response time met the target threshold under standard laboratory conditions.\n\nLimitations:\n• Performance may degrade under non-standard conditions (extreme lighting variation, unusual input angles, network latency if applicable).\n• The system was tested on a limited set of inputs; real-world performance may vary.\n• Hardware constraints (processing speed, sensor range) impose practical limits.\n\nCorrective Changes Made:\n• [Document any design changes made during implementation based on testing results]\n• Threshold values were tuned based on initial test results to improve accuracy.";

$ch7Conclusion = "Summary:\nThis project successfully designed and implemented a working " . $title . " system using " . $skills . " on the " . $platform . " platform as part of the NMU AI & Robotics Field Training program.\n\nThe system addresses the identified problem — [restate core problem from Chapter 3] — by implementing a complete pipeline from input acquisition to result output, tested and validated against the success criteria defined in the project plan.\n\nLearning Outcomes:\nThrough this project, the team gained practical experience in:\n• Applying " . $skills . " to solve a real engineering problem.\n• Designing and testing a modular software system.\n• Documenting an AI/robotics system to professional standards.\n• Working collaboratively under time constraints.\n\nFuture Improvements:\n• Extend the system to handle additional input types or edge cases.\n• Integrate with a larger robotics pipeline (e.g., connect perception output to robot actuation).\n• Improve model accuracy using additional training data or a more sophisticated algorithm.\n• Deploy the system for actual use in the training laboratory as a demonstration tool.";

$references = "References:\n\n[1] OpenCV Development Team. OpenCV: Open Source Computer Vision Library. Available: https://opencv.org. Accessed: August 2026.\n\n[2] Python Software Foundation. Python 3 Documentation. Available: https://docs.python.org. Accessed: August 2026.\n\n[3] New Mansoura University. Faculty of AI & Robotics: Field Training Guidelines. NMU Internal Document, 2026.\n\n[4] [Author(s)]. [Title of relevant paper or documentation for " . $skills . "]. [Publisher/Journal/Website], [Year].\n\n[5] [Author(s)]. [Title of related system or algorithm documentation]. [Publisher/Journal/Website], [Year].\n\nNote: Expand this reference list as additional sources are consulted during implementation. Use a consistent citation format (IEEE or APA) throughout the report.";

$appendices = "Appendix A: Source Code and Repository\n• GitHub Repository: [To be added by student]\n• Build/Run Instructions: See README.md in repository for setup and dependency installation.\n• Key source files: main.py, perception.py, processor.py, output.py, config.py.\n\nAppendix B: Hardware and Configuration\n• Platform: " . $platform . "\n• Software dependencies: " . $skills . "\n• Configuration parameters: [document threshold values, model paths, and key settings]\n• Wiring / connection diagram: [if applicable for hardware projects]\n\nAppendix C: Field Training Records\n• Weekly training log: [attendance and progress summary per week]\n• Team contribution table: [list each team member's specific contributions]\n• Test evidence: [screenshots or video links for T-01 through T-04]\n• Supervisor sign-off: [obtained at end of training period]";

// ── Map 29 template sections to content ─────────────────────────────────────
// The template has 29 "Student content" headings in this order (from XML analysis):
// 01: Acknowledgment
// 02: Abstract
// 03: Ch1.1 Introduction / Field Training Context
// 04: Ch1.2 Background
// 05: Ch1.3 Aim, Objectives & Scope
// 06: Ch2.1 Existing Systems
// 07: Ch2.2 Comparative Analysis
// 08: Ch2.3 Research Gap
// 09: Ch3.1 Problem Statement
// 10: Ch3.2 Users & Requirements
// 11: Ch3.3 Project Plan
// 12: Ch4.1 Development Approach
// 13: Ch4.2 Platform Description
// 14: Ch4.3 System Architecture
// 15: Ch4.4 Algorithm & Workflow
// 16: Ch5.1 Implementation Steps
// 17: Ch5.2 Code Structure
// 18: Ch5.3 Application Scenario
// 19: Ch6.1 Test Plan
// 20: Ch6.2 Results & Evaluation
// 21: Ch6.3 Discussion & Limitations
// 22: Ch7 Conclusion & Future Work
// 23: References
// 24: Appendices
// 25-29: Extra blank content blocks (table rows etc.)

$sectionContents = [
    1  => $acknowledgment,
    2  => $abstract,
    3  => $ch1FieldTraining,
    4  => $ch1Background,
    5  => $ch1Objectives,
    6  => $ch2ExistingSystems,
    7  => $ch2Comparison,
    8  => $ch2Gap,
    9  => $ch3Problem,
    10 => $ch3Requirements,
    11 => $ch3Plan,
    12 => $ch4DevApproach,
    13 => $ch4Platform,
    14 => $ch4Architecture,
    15 => $ch4Algorithm,
    16 => $ch5Implementation,
    17 => $ch5Code,
    18 => $ch5Scenario,
    19 => $ch6TestPlan,
    20 => $ch6Results,
    21 => $ch6Discussion,
    22 => $ch7Conclusion,
    23 => $references,
    24 => $appendices,
    25 => '(Additional supporting materials are available in the project repository.)',
    26 => '(See Appendix C for weekly training logs and attendance records.)',
    27 => '(Team contribution and signatures are recorded in the official training log.)',
    28 => '(Further details and raw data are available upon request.)',
    29 => '(End of document.)',
];

// ── Locate template file ────────────────────────────────────────────────────
$candidatePaths = [
    __DIR__ . '/../../templates/NMU_AI_Robotics_Field_Training_Project_Template.docx',
    __DIR__ . '/../../../dev/NMU_AI_Robotics_Field_Training_Project_Template.docx',
    __DIR__ . '/../../../NMU_AI_Robotics_Field_Training_Project_Template.docx',
];
$templateFile = null;
foreach ($candidatePaths as $cp) {
    if (file_exists($cp)) { $templateFile = $cp; break; }
}
if (!$templateFile) {
    respondError('Official NMU Field Training Template file not found.', 500);
}

// ── PRE-PROCESS: Number all "Student content" occurrences in XML ─────────────
// We extract the .docx (zip), modify word/document.xml to rename each
// occurrence of the literal text "Student content" to a unique placeholder
// like {{SC_01}}, {{SC_02}}, etc., then TemplateProcessor can setValue each.

$tmpDocx = tempnam(sys_get_temp_dir(), 'erth_tpl_') . '.docx';
copy($templateFile, $tmpDocx);

// Use ZipArchive to read/write the docx XML in-place
$zip = new ZipArchive();
if ($zip->open($tmpDocx) !== true) {
    @unlink($tmpDocx);
    respondError('Failed to open template archive.', 500);
}

$docXml = $zip->getFromName('word/document.xml');
if ($docXml === false) {
    $zip->close();
    @unlink($tmpDocx);
    respondError('Could not read template document XML.', 500);
}

// Replace each occurrence of "Student content" text node with numbered tokens.
// The text appears as the content of <w:t> elements in Heading 2 paragraphs.
// Strategy: scan the XML and number each occurrence.
$counter = 0;
$processedXml = preg_replace_callback(
    '/>Student content</',
    function($match) use (&$counter) {
        $counter++;
        $padded = str_pad($counter, 2, '0', STR_PAD_LEFT);
        return '>{{SC_' . $padded . '}}<';
    },
    $docXml
);

if ($counter === 0) {
    // Fallback: try without > < anchors (split across runs)
    // Search for the text spread across XML runs and combine
    $processedXml = $docXml;
}

// ── Also fix broken-run variables in the XML (e.g. Student 4, Student 5)
// These are split across multiple <w:r> runs with <w:proofErr> between them,
// which prevents TemplateProcessor from matching them. We collapse them first.
$processedXml = preg_replace(
    '#>Student</w:t></w:r><w:proofErr[^>]*/><w:r[^>]*>(?:<w:rPr>.*?</w:rPr>)?<w:t[^>]*>\s*4\s*</w:t></w:r><w:r[^>]*>(?:<w:rPr>.*?</w:rPr>)?<w:t[^>]*>#s',
    '>Student 4</w:t></w:r><w:r><w:t>',
    $processedXml
);
$processedXml = preg_replace(
    '#>Student</w:t></w:r><w:proofErr[^>]*/><w:r[^>]*>(?:<w:rPr>.*?</w:rPr>)?<w:t[^>]*>\s*5\s*</w:t>#s',
    '>Student 5</w:t>',
    $processedXml
);


$zip->close();
$zip->open($tmpDocx);
$zip->addFromString('word/document.xml', $processedXml);
$zip->close();

// ── TemplateProcessor on pre-processed docx ─────────────────────────────────
$tp = new TemplateProcessor($tmpDocx);
// Use {{...}} as macro chars for our numbered section tokens
$tp->setMacroChars('{{', '}}');

// Hydrate numbered section content tokens
foreach ($sectionContents as $num => $content) {
    $key = 'SC_' . str_pad($num, 2, '0', STR_PAD_LEFT);
    // Sanitize content: remove characters that would break XML
    $cleanContent = htmlspecialchars(strip_tags($content), ENT_XML1, 'UTF-8');
    // Replace with plain text (newlines -> <w:br/>)
    try {
        $tp->setValue($key, $cleanContent);
    } catch (\Exception $e) {
        $tp->setValue($key, '(Content unavailable)');
    }
}

// Switch back to [ ] delimiters for the original template scalar vars
// We need a second pass — re-open with the correct macro chars
// Actually setValue with {{ }} works for our SC_ vars; we'll handle [var] separately
// by temporarily setting macro chars. PhpWord's TemplateProcessor is not stateless,
// so we set [  ] for the next round of setValue calls.
$tp->setMacroChars('[', ']');

// ── Scalar variable hydration (original template variables) ─────────────────
$tp->setValue('Enter the full project title', htmlspecialchars($title, ENT_XML1, 'UTF-8'));
$tp->setValue('Student 1', htmlspecialchars($leaderName ?: 'Student 1', ENT_XML1, 'UTF-8'));
$tp->setValue('Student 2', htmlspecialchars($memberList[0] ?? '', ENT_XML1, 'UTF-8'));
$tp->setValue('Student 3', htmlspecialchars($memberList[1] ?? '', ENT_XML1, 'UTF-8'));
$tp->setValue('Student 4', htmlspecialchars($memberList[2] ?? '', ENT_XML1, 'UTF-8'));
$tp->setValue('Student 5', htmlspecialchars($memberList[3] ?? '', ENT_XML1, 'UTF-8'));
$tp->setValue('ID 1', htmlspecialchars($leaderId, ENT_XML1, 'UTF-8'));
$tp->setValue('ID 2', htmlspecialchars($memberIds[0] ?? '', ENT_XML1, 'UTF-8'));
$tp->setValue('ID 3', htmlspecialchars($memberIds[1] ?? '', ENT_XML1, 'UTF-8'));
$tp->setValue('Yanshee / NAO / Robot Arm / AI Box / LIMO / Other', htmlspecialchars($platform, ENT_XML1, 'UTF-8'));
$tp->setValue('Name and title', htmlspecialchars($trainerName, ENT_XML1, 'UTF-8'));
$tp->setValue('Start date', htmlspecialchars($startDate, ENT_XML1, 'UTF-8'));
$tp->setValue('End date', htmlspecialchars($endDate, ENT_XML1, 'UTF-8'));
$tp->setValue('Day / Month / Year', htmlspecialchars($today, ENT_XML1, 'UTF-8'));
$tp->setValue('Project title', htmlspecialchars($title, ENT_XML1, 'UTF-8'));

$allMembersArr = array_merge(
    [$leaderName . ($leaderId ? " ($leaderId)" : '')],
    array_map(function($m, $i) use ($memberIds) {
        $id = $memberIds[$i] ?? '';
        return $m . ($id ? " ($id)" : '');
    }, $memberList, array_keys($memberList))
);
$tp->setValue('Names and IDs', htmlspecialchars(implode(', ', $allMembersArr), ENT_XML1, 'UTF-8'));

$keywords = !empty($catProject['skills']) ? $catProject['skills'] : $s($idea['tech_stack'] ?? 'Artificial Intelligence, Robotics, Computer Vision');
// Note: the template uses Unicode en-dash (U+2013) in "3\u20136 keywords"
$tp->setValue("3\u{2013}6 keywords, e.g., robotics, computer vision, NAO, object detection", htmlspecialchars($keywords, ENT_XML1, 'UTF-8'));

$tp->setValue('Enter problem statement here', htmlspecialchars($problem ?: 'Autonomous perception, navigation and physical execution under laboratory test conditions.', ENT_XML1, 'UTF-8'));
$tp->setValue('Expected deliverables', htmlspecialchars("1. Working system & algorithm demonstration\n2. Technical documentation & source code\n3. Final report & live presentation", ENT_XML1, 'UTF-8'));

// Hydrate Related Work Table
$tp->setValue('Name', htmlspecialchars('Prior Baseline System', ENT_XML1, 'UTF-8'));
$tp->setValue('Robot', htmlspecialchars($platform, ENT_XML1, 'UTF-8'));
$tp->setValue('Feature', htmlspecialchars(substr($related ?: 'Computer vision and control architecture', 0, 100), ENT_XML1, 'UTF-8'));
$tp->setValue('Limitation', htmlspecialchars('Requires calibration and controlled environment conditions', ENT_XML1, 'UTF-8'));
$tp->setValue('Citation', htmlspecialchars('[1]', ENT_XML1, 'UTF-8'));

// Hydrate Risk Register Table
$tp->setValue('Risk', htmlspecialchars('Environmental variation (lighting, noise, hardware availability)', ENT_XML1, 'UTF-8'));
$tp->setValue('Action', htmlspecialchars('Implement adaptive thresholds; prepare hardware backup; test in target environment early', ENT_XML1, 'UTF-8'));

// Hydrate Test Cases Table
$tp->setValue('Test', htmlspecialchars('Normal Case Verification', ENT_XML1, 'UTF-8'));
$tp->setValue('Condition', htmlspecialchars('Standard laboratory conditions with expected input', ENT_XML1, 'UTF-8'));
$tp->setValue('Expected', htmlspecialchars('Correct output within 2-second response time', ENT_XML1, 'UTF-8'));
$tp->setValue('Actual', htmlspecialchars('[To be completed during testing]', ENT_XML1, 'UTF-8'));

// Hydrate Abbreviations Table
$tp->setValue('Add project-specific abbreviation', htmlspecialchars('AI', ENT_XML1, 'UTF-8'));
$tp->setValue('Add', htmlspecialchars('Artificial Intelligence', ENT_XML1, 'UTF-8'));
$tp->setValue('Title', htmlspecialchars('', ENT_XML1, 'UTF-8'));

// ── Stream the final document ───────────────────────────────────────────────
$safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', substr($title, 0, 60));
$filename = 'ERTH_' . $safeName . '_Proposal.docx';

$tmpOutput = tempnam(sys_get_temp_dir(), 'erth_out_') . '.docx';
$tp->saveAs($tmpOutput);

// Clean up pre-processed temp template
@unlink($tmpDocx);

while (ob_get_level() > 0) ob_end_clean();

header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . filesize($tmpOutput));
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: public');
header('Expires: 0');

readfile($tmpOutput);
@unlink($tmpOutput);
exit;
