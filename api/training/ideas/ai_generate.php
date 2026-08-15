<?php
// =========================================================
// NMU TRAINING — AI Proposal Generator
// Access: Trainee or Trainer
// Routes through callAI() — falls back to template if no key configured.
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../ai/ai_engine.php';

requireRole(['trainee', 'trainer', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data     = body();
$keywords = sanitizeString($data['keywords'] ?? '');
$domain   = sanitizeString($data['domain']   ?? 'Software Engineering');

if (!$keywords) {
    respondError('Please provide keywords or a short summary for AI generation');
}

// ── Attempt real AI generation ───────────────────────────────────────────────
$userId   = requireSession();
$aiResult = callAI($userId, 'proposal', ['keywords' => $keywords, 'domain' => $domain]);

if ($aiResult['ok'] && is_array($aiResult['result'])) {
    // AI returned a parsed JSON proposal
    $p = $aiResult['result'];

    // Format expected_output properly (AI sometimes returns an array of objects/strings)
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

    // Normalize keys — strictly English fields
    respond([
        'success'  => true,
        'cached'   => $aiResult['cached'] ?? false,
        'proposal' => [
            'title'             => $p['title'] ?? ("Smart System for " . ucwords($keywords)),
            'description'       => $p['description'] ?? '',
            'problem_statement' => $p['problem_statement'] ?? '',
            'tech_stack'        => $p['tech_stack'] ?? 'React.js / Vite, PHP 8, MySQL 8.0',
            'expected_output'   => $expectedOutputStr,
        ],
    ]);
}

// ── Fallback: built-in template generator ────────────────────────────────────
// Used when no AI key is configured or the AI call fails for a non-fatal reason.
// Logs the AI error but does NOT surface it to the user.
if (!$aiResult['ok']) {
    $errorCode = $aiResult['code'] ?? '';
    // Surface quota / rate errors — those the user should know about
    if (in_array($errorCode, ['DAILY_LIMIT', 'RATE_LIMITED'], true)) {
        respondError($aiResult['error'], 429);
    }
    error_log('[ai_generate] AI call failed, using template fallback. Error: ' . ($aiResult['error'] ?? ''));
}

// Template fallback response (STRICTLY English only)
respond([
    'success'  => true,
    'cached'   => false,
    'fallback' => true,
    'proposal' => [
        'title'             => "Smart System for " . ucwords($keywords),
        'description'       => "This university summer training project focuses on building a full-stack web application tailored for $keywords. It includes user authentication, role-based access control, responsive dashboards, and automated report generation.",
        'problem_statement' => "Current manual processes in $domain lack real-time visibility, automated tracking, and data integrity. Trainees will design a web solution for $keywords to optimize workflow efficiency.",
        'tech_stack'        => "React.js / Vite, PHP 8 (REST API), MySQL 8.0, HTML5/CSS3, Docker",
        'expected_output'   => "1. Fully functional Web Application\n2. Database Schema (ERD)\n3. Technical Documentation & User Guide\n4. Final Presentation Slides",
    ],
]);
