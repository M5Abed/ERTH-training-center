<?php
// =========================================================
// NMU TRAINING — AI Writing & Wording Assistant
// Access: Trainee or Trainer
//
// Purpose: Refines, clarifies, and polishes the student's
// OWN original text without creating an idea from scratch.
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../ai/ai_engine.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$userId = (int)$user['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$originalText = trim($data['text'] ?? $data['original_text'] ?? '');
$fieldKey = trim($data['field'] ?? 'description'); // 'title', 'description', 'problem_statement', 'expected_output', 'tech_stack'
$language = trim($data['language'] ?? 'en'); // 'en' or 'ar'

if (empty($originalText)) {
    respondError('Please provide the text you would like the AI assistant to refine and polish.', 400);
}

$promptInstruction = "You are a professional academic writing assistant for university summer training. "
    . "The student has provided their own draft text for the field: '$fieldKey'. "
    . "Your task is strictly to polish the wording, enhance clarity, correct grammatical and punctuation errors, "
    . "and format it with a professional, academic tone while PRESERVING the student's exact concept and core idea. "
    . "Do NOT invent a new project or change their technology/objectives. Return ONLY the refined text directly without conversational commentary.";

$aiPayload = [
    'instruction' => $promptInstruction,
    'original_text' => $originalText,
    'field' => $fieldKey,
    'language' => $language
];

try {
    $aiResult = callAI($userId, 'wording_assistant', $aiPayload);
    $refinedText = '';

    if (!empty($aiResult['ok']) && !empty($aiResult['result'])) {
        $raw = $aiResult['result'];
        if (is_array($raw)) {
            $refinedText = $raw['refined_text'] ?? $raw['text'] ?? json_encode($raw);
        } else {
            $refinedText = trim((string)$raw);
            // Clean markdown code fence if wrapped
            if (preg_match('/^```(?:text|markdown)?\s*([\s\S]*?)\s*```$/i', $refinedText, $m)) {
                $refinedText = trim($m[1]);
            }
        }
    }

    // Fallback linguistic polisher if external AI engine is not configured or returned empty
    if (empty($refinedText) || $refinedText === $originalText) {
        $lines = explode("\n", $originalText);
        $cleanedLines = array_map(function($line) {
            $l = trim($line);
            if (empty($l)) return '';
            // Capitalize first character of sentence
            $l = ucfirst($l);
            // Ensure proper terminal punctuation
            if (!in_array(substr($l, -1), ['.', '!', '?', ':'])) {
                $l .= '.';
            }
            return $l;
        }, $lines);

        $polished = implode("\n", array_filter($cleanedLines));
        if ($fieldKey === 'title') {
            $polished = ucwords(rtrim($originalText, '.'));
        }
        $refinedText = $polished ?: $originalText;
    }

    respond([
        'success' => true,
        'original_text' => $originalText,
        'refined_text' => $refinedText,
        'field' => $fieldKey
    ]);
} catch (Throwable $e) {
    respondError('Writing assistant error: ' . $e->getMessage(), 500);
}
