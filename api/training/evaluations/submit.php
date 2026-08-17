<?php
// =========================================================
// NMU TRAINING — Submit Trainee Evaluation
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$evaluator = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$traineeId = (int)($data['trainee_id'] ?? 0);
$courseId  = (int)($data['course_id'] ?? 0);
$score     = (float)($data['final_score'] ?? 0);
$status    = trim($data['status'] ?? 'pass'); // pass, fail, needs_revision
$feedback  = sanitizeString($data['feedback'] ?? '');
$criteria  = isset($data['criteria_scores']) ? json_encode($data['criteria_scores']) : null;

if (!$traineeId || !$courseId) {
    respondError('Trainee ID and Course ID are required');
}

if ($score < 0 || $score > 100) {
    respondError('Score must be between 0 and 100');
}

if (!in_array($status, ['pass', 'fail', 'needs_revision'], true)) {
    respondError('Invalid evaluation status. Allowed: pass, fail, needs_revision');
}

$db = db();

// Enforce Object-Level Authorization
verifyCourseAccess($courseId, $evaluator);

// Ensure criteria_scores column exists in training_evaluations table
try {
    $db->exec("ALTER TABLE training_evaluations ADD COLUMN criteria_scores JSON DEFAULT NULL");
} catch (Throwable $e) {}

// Process criteria_scores into a robust valid JSON string or NULL
$criteriaRaw = $data['criteria_scores'] ?? null;
$criteriaJson = null;
if (is_array($criteriaRaw) || is_object($criteriaRaw)) {
    $criteriaJson = json_encode($criteriaRaw, JSON_UNESCAPED_UNICODE);
} elseif (is_string($criteriaRaw) && trim($criteriaRaw) !== '') {
    $decoded = json_decode($criteriaRaw, true);
    if (json_last_error() === JSON_ERROR_NONE) {
        $criteriaJson = json_encode($decoded, JSON_UNESCAPED_UNICODE);
    } else {
        $criteriaJson = json_encode(['score' => $criteriaRaw], JSON_UNESCAPED_UNICODE);
    }
}

try {
    // Upsert evaluation record
    $stmt = $db->prepare("
        INSERT INTO training_evaluations
            (trainee_id, course_id, evaluator_id, status, final_score, feedback, criteria_scores, evaluated_at)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            evaluator_id = VALUES(evaluator_id),
            status = VALUES(status),
            final_score = VALUES(final_score),
            feedback = VALUES(feedback),
            criteria_scores = VALUES(criteria_scores),
            evaluated_at = NOW()
    ");
    $stmt->execute([
        $traineeId,
        $courseId,
        $evaluator['id'],
        $status,
        $score,
        $feedback ?: null,
        $criteriaJson
    ]);

    // Send notification to trainee
    $nStmt = $db->prepare("
        INSERT INTO notifications (user_id, type, message_en, message_ar)
        VALUES (?, 'training_evaluation', ?, ?)
    ");
    $msgEn = "Your training evaluation for course has been submitted. Status: " . strtoupper($status) . " (Score: $score/100).";
    $msgAr = "تم رصد تقييمك للتدريب الصيفي. الحالة: " . strtoupper($status) . " (الدرجة: $score/100).";
    $nStmt->execute([$traineeId, $msgEn, $msgAr]);

    respond([
        'success' => true,
        'message' => 'Trainee evaluation submitted successfully',
        'status' => $status,
        'final_score' => $score
    ]);
} catch (Throwable $e) {
    respondError('Database error saving evaluation: ' . $e->getMessage(), 500);
}
