<?php
/**
 * ai/proxy.php — Server-side proxy for AI chat completions
 *
 * Routes through callAI() — the ONLY authorized AI caller in this codebase.
 * Frontend contract (request / response) is unchanged:
 *   POST  { action: 'expand'|'skills', prompt: string }
 *   200   { text: string }
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/ai_engine.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('POST required', 405);
}

// ── Auth ─────────────────────────────────────────────────────────────────────
$userId = requireSession();      // must be logged in

// ── Rate limit (session-based, defense-in-depth) ─────────────────────────────
rateLimit('ai_proxy', 15, 60);

// ── Input ────────────────────────────────────────────────────────────────────
$data      = body();
$userPrompt = trim($data['prompt'] ?? '');
$action     = trim($data['action'] ?? 'expand');

if (!$userPrompt) {
    respondError('No prompt provided');
}

if (!in_array($action, ['expand', 'skills'], true)) {
    respondError("Unsupported action '$action'. Use 'expand' or 'skills'.");
}

// ── Map action → taskType + payload ─────────────────────────────────────────
if ($action === 'expand') {
    $taskType = 'expand';
    $payload  = ['draft' => $userPrompt];
} else {
    $taskType = 'skills';
    $payload  = ['description' => $userPrompt];
}

// ── Call the engine ──────────────────────────────────────────────────────────
$aiResult = callAI($userId, $taskType, $payload);

if (!$aiResult['ok']) {
    // Structured error — map engine codes to HTTP status codes
    $code = $aiResult['code'] ?? 'ERROR';
    $httpStatus = match ($code) {
        'DAILY_LIMIT'   => 429,
        'NO_KEYS'       => 503,
        'RATE_LIMITED'  => 503,
        'NETWORK_ERROR' => 503,
        'INVALID_TASK'  => 400,
        default         => 500,
    };
    respondError($aiResult['error'], $httpStatus);
}

// Return identical shape to the old proxy so the frontend needs no changes
respond(['text' => is_string($aiResult['result']) ? $aiResult['result'] : json_encode($aiResult['result'])]);
