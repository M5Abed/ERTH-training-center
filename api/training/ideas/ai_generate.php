<?php
// =========================================================
// NMU TRAINING — AI Proposal Generator (Case B: Custom Ideas)
// Access: Trainee, Trainer, Admin
// Generates comprehensive 7-section proposals from student Title & Description
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../ai/ai_engine.php';

requireRole(['trainee', 'trainer', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data        = body();
$titleInput  = sanitizeString($data['title']       ?? '');
$descInput   = sanitizeString($data['description'] ?? '');
$keywords    = sanitizeString($data['keywords']    ?? '');
$domain      = sanitizeString($data['domain']      ?? 'Software / AI');

// Unify title and description
$title = $titleInput ?: $keywords;
$desc  = $descInput ?: ($keywords ? "Project focusing on $keywords" : '');

if (empty($title) && empty($desc)) {
    respondError('Please provide a project title and a detailed description', 400);
}

$userId = requireSession();

// Helper: Robust JSON extractor
function extractProposalJson(string $raw): ?array {
    if (!$raw) return null;
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) return $decoded;

    $stripped = preg_replace('/```(?:json)?\s*/i', '', $raw);
    $stripped = preg_replace('/```/', '', $stripped);
    $decoded  = json_decode(trim($stripped), true);
    if (is_array($decoded)) return $decoded;

    $start = strpos($raw, '{');
    $end   = strrpos($raw, '}');
    if ($start !== false && $end !== false && $end > $start) {
        $jsonStr = substr($raw, $start, $end - $start + 1);
        $decoded = json_decode($jsonStr, true);
        if (is_array($decoded)) return $decoded;
    }
    return null;
}

$aiPayload = [
    'title'       => $title,
    'description' => $desc ?: $title,
    'domain'      => $domain,
];

$aiResult = callAI($userId, 'custom_proposal_7_sections', $aiPayload);

$p = $aiResult['result'] ?? null;
if (is_string($p)) {
    $p = extractProposalJson($p);
}

if ($aiResult['ok'] && is_array($p)) {
    $sectionTitles = [
        'abstract'                => 'Executive Summary / Abstract',
        'introduction_background' => 'Introduction & Background',
        'problem_definition'      => 'Problem Definition & Motivation',
        'objectives_scope'        => 'Aim, Objectives & Scope',
        'related_work'            => 'Related Work & Comparative Analysis',
        'methodology'             => 'Methodology & Engineering Pipeline',
        'expected_system_design'  => 'System Architecture & Design',
    ];

    $sections = [];
    foreach ($sectionTitles as $k => $secTitle) {
        $secContent = $p[$k] ?? '';
        if (is_array($secContent)) {
            $secContent = json_encode($secContent, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        }
        $sections[] = [
            'key'     => $k,
            'title'   => $secTitle,
            'content' => trim((string)$secContent),
            'source'  => 'ai_generated',
        ];
    }

    $finalTitle = !empty($p['title']) ? trim($p['title']) : $title;
    $finalDesc  = !empty($p['abstract']) ? trim($p['abstract']) : (!empty($p['description']) ? trim($p['description']) : $desc);
    $finalProb  = !empty($p['problem_statement']) ? trim($p['problem_statement']) : (!empty($p['problem_definition']) ? trim($p['problem_definition']) : '');
    $finalTech  = !empty($p['tech_stack']) ? trim($p['tech_stack']) : 'React, Node.js, Python, MySQL';
    
    $expectedOutputRaw = $p['expected_output'] ?? null;
    $expectedOutputStr = "1. Functional prototype and core application pipeline\n2. Database schema and RESTful API endpoints\n3. Verification test suite and benchmark evaluation report";
    if (is_array($expectedOutputRaw)) {
        $lines = [];
        foreach ($expectedOutputRaw as $idx => $item) {
            if (is_string($item)) {
                $lines[] = ($idx + 1) . ". " . trim($item);
            }
        }
        if (!empty($lines)) {
            $expectedOutputStr = implode("\n", $lines);
        }
    } elseif (is_string($expectedOutputRaw) && trim($expectedOutputRaw) !== '') {
        $expectedOutputStr = trim($expectedOutputRaw);
    }

    respond([
        'success'  => true,
        'cached'   => $aiResult['cached'] ?? false,
        'proposal' => [
            'source'            => 'custom_ai',
            'title'             => $finalTitle,
            'description'       => $finalDesc,
            'problem_statement' => $finalProb,
            'tech_stack'        => $finalTech,
            'expected_output'   => $expectedOutputStr,
            'sections'          => $sections,
        ],
    ]);
}

// If AI service failed:
respondError(
    'The AI service is currently experiencing high demand. Please try again in a few moments.',
    429,
    [
        'error_en' => 'The AI service is currently experiencing high demand. Please try again in a few moments.',
        'error_ar' => 'خدمة الذكاء الاصطناعي تشهد ضغطاً حالياً، يرجى المحاولة مرة أخرى بعد لحظات.'
    ]
);
