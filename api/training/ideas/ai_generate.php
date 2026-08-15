<?php
// =========================================================
// NMU TRAINING — AI Proposal Generator (Case B: Custom Ideas)
// Access: Trainee or Trainer
//
// This is ONE of exactly TWO places where an AI call is
// permitted (Case B: custom project idea outside the 64-catalog).
// Generates proposal content following the 7 official template sections.
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../ai/ai_engine.php';

requireRole(['trainee', 'trainer', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data         = body();
$keywords     = sanitizeString($data['keywords'] ?? '');
$domain       = sanitizeString($data['domain']   ?? 'Software / AI');
$fullSections = !empty($data['full_sections']); // request 7 official template sections

if (!$keywords) {
    respondError('Please provide keywords or a short summary for AI generation');
}

$userId = requireSession();

if ($fullSections) {
    // ── Generate full 7-section proposal for custom idea ──────────────────────
    $aiPayload = [
        'keywords' => $keywords,
        'domain'   => $domain,
        'context'  => sanitizeString($data['context'] ?? $keywords),
    ];
    $aiResult = callAI($userId, 'custom_proposal_7_sections', $aiPayload);

    if ($aiResult['ok'] && is_array($aiResult['result'])) {
        $r = $aiResult['result'];
        $sectionTitles = [
            'abstract'                => 'Abstract',
            'introduction_background' => 'Introduction & Background',
            'problem_definition'      => 'Problem Definition',
            'objectives_scope'        => 'Objectives & Scope',
            'related_work'            => 'Related Work',
            'methodology'             => 'Proposed Methodology',
            'expected_system_design'  => 'Expected System Design',
        ];

        $sections = [];
        foreach ($sectionTitles as $k => $title) {
            $sections[] = [
                'key'     => $k,
                'title'   => $title,
                'content' => $r[$k] ?? '',
                'source'  => 'ai_generated',
            ];
        }

        respond([
            'success'  => true,
            'cached'   => $aiResult['cached'] ?? false,
            'proposal' => [
                'source'        => 'custom_ai',
                'title'         => $r['title'] ?? ("Smart System for " . ucwords($keywords)),
                'tech_stack'    => $r['tech_stack'] ?? 'Python, FastAPI, React, MySQL',
                'sections'      => $sections,
                'description'   => $r['abstract'] ?? '',
                'problem_statement' => $r['problem_definition'] ?? '',
                'expected_output'   => "1. Core Application Pipeline\n2. Database & API Implementation\n3. Verification & Benchmark Report",
            ],
        ]);
    }
}

// ── Standard Quick Generator ────────────────────────────────────────────────
$aiResult = callAI($userId, 'proposal', ['keywords' => $keywords, 'domain' => $domain]);

if ($aiResult['ok'] && is_array($aiResult['result'])) {
    $p = $aiResult['result'];

    $expectedOutputRaw = $p['expected_output'] ?? null;
    $expectedOutputStr = "1. Web Application\n2. Documentation\n3. Final Presentation";
    if (is_array($expectedOutputRaw)) {
        $lines = [];
        foreach ($expectedOutputRaw as $idx => $item) {
            if (is_string($item)) {
                $lines[] = ($idx + 1) . ". " . $item;
            } elseif (is_array($item) && isset($item['deliverable'])) {
                $num = $item['number'] ?? ($idx + 1);
                $lines[] = "$num. " . $item['deliverable'];
            }
        }
        if (!empty($lines)) {
            $expectedOutputStr = implode("\n", $lines);
        }
    } elseif (is_string($expectedOutputRaw) && trim($expectedOutputRaw) !== '') {
        $expectedOutputStr = trim($expectedOutputRaw);
    }

    $title = $p['title'] ?? ("Smart System for " . ucwords($keywords));
    $desc  = $p['description'] ?? '';
    $prob  = $p['problem_statement'] ?? '';
    $tech  = $p['tech_stack'] ?? 'React.js / Vite, PHP 8, MySQL 8.0';

    // Construct the 7 official sections structure
    $sections = [
        ['key' => 'abstract', 'title' => 'Abstract', 'content' => $desc, 'source' => 'ai_generated'],
        ['key' => 'introduction_background', 'title' => 'Introduction & Background', 'content' => "This university training project focuses on $title within $domain. It aims to develop a robust, modern system meeting practical academic and industrial benchmarks.", 'source' => 'ai_generated'],
        ['key' => 'problem_definition', 'title' => 'Problem Definition', 'content' => $prob, 'source' => 'ai_generated'],
        ['key' => 'objectives_scope', 'title' => 'Objectives & Scope', 'content' => "In scope: implementation of core $title capabilities using $tech; system testing and documentation. Out of scope: proprietary hardware modifications.", 'source' => 'ai_generated'],
        ['key' => 'related_work', 'title' => 'Related Work', 'content' => "Existing systems in $domain typically rely on either manual workflows or expensive closed-source tools. This project builds an accessible, open-stack alternative.", 'source' => 'ai_generated'],
        ['key' => 'methodology', 'title' => 'Proposed Methodology', 'content' => "The system is developed in structured milestones: requirements analysis, component architecture using $tech, iterative implementation, and comprehensive testing.", 'source' => 'ai_generated'],
        ['key' => 'expected_system_design', 'title' => 'Expected System Design', 'content' => "Input layer -> Core processing & business logic engine -> Persistence and responsive user dashboard.", 'source' => 'ai_generated'],
    ];

    respond([
        'success'  => true,
        'cached'   => $aiResult['cached'] ?? false,
        'proposal' => [
            'source'            => 'custom_ai',
            'title'             => $title,
            'description'       => $desc,
            'problem_statement' => $prob,
            'tech_stack'        => $tech,
            'expected_output'   => $expectedOutputStr,
            'sections'          => $sections,
        ],
    ]);
}

// ── Fallback: built-in template generator ────────────────────────────────────
if (!$aiResult['ok']) {
    $errorCode = $aiResult['code'] ?? '';
    if (in_array($errorCode, ['DAILY_LIMIT', 'RATE_LIMITED'], true)) {
        respondError($aiResult['error'], 429);
    }
    error_log('[ai_generate] AI call failed, using template fallback. Error: ' . ($aiResult['error'] ?? ''));
}

$title = "Smart System for " . ucwords($keywords);
$desc  = "This university summer training project focuses on building a full-stack application tailored for $keywords. It includes user authentication, role-based access control, responsive dashboards, and automated report generation.";
$prob  = "Current manual processes in $domain lack real-time visibility, automated tracking, and data integrity. Trainees will design an automated solution for $keywords to optimize workflow efficiency.";
$tech  = "React.js / Vite, PHP 8 (REST API), MySQL 8.0, HTML5/CSS3, Docker";

$sections = [
    ['key' => 'abstract', 'title' => 'Abstract', 'content' => $desc, 'source' => 'template_fallback'],
    ['key' => 'introduction_background', 'title' => 'Introduction & Background', 'content' => "The rapid advancement of modern technologies necessitates localized, optimized implementations. The $title is designed to bridge the gap between theory and practical application.", 'source' => 'template_fallback'],
    ['key' => 'problem_definition', 'title' => 'Problem Definition', 'content' => $prob, 'source' => 'template_fallback'],
    ['key' => 'objectives_scope', 'title' => 'Objectives & Scope', 'content' => "In scope: core functionality implementation using $tech; testing and reporting. Out of scope: enterprise cloud deployments.", 'source' => 'template_fallback'],
    ['key' => 'related_work', 'title' => 'Related Work', 'content' => "Prior approaches suffer from high maintenance overhead or manual dependency. The proposed solution delivers a self-contained, reproducible pipeline.", 'source' => 'template_fallback'],
    ['key' => 'methodology', 'title' => 'Proposed Methodology', 'content' => "Agile-driven implementation across structured phases: data preparation, core module development, user interface integration, and validation.", 'source' => 'template_fallback'],
    ['key' => 'expected_system_design', 'title' => 'Expected System Design', 'content' => "User Interface / Sensor Inputs -> Backend REST Service & Computation -> Database & Analytics Output.", 'source' => 'template_fallback'],
];

respond([
    'success'  => true,
    'cached'   => false,
    'fallback' => true,
    'proposal' => [
        'source'            => 'template_fallback',
        'title'             => $title,
        'description'       => $desc,
        'problem_statement' => $prob,
        'tech_stack'        => $tech,
        'expected_output'   => "1. Fully functional Web Application\n2. Database Schema (ERD)\n3. Technical Documentation & User Guide\n4. Final Presentation Slides",
        'sections'          => $sections,
    ],
]);
