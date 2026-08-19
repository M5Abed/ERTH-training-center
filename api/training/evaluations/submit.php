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

$data          = body();
$traineeId     = (int)($data['trainee_id'] ?? 0);
$courseId      = (int)($data['course_id']  ?? 0);
$status        = trim($data['status']   ?? 'pass');  // pass | fail | needs_revision
$feedback      = sanitizeString($data['feedback'] ?? '');
$criteriaInput = $data['criteria_scores'] ?? null;

if (!$traineeId || !$courseId) {
    respondError('Trainee ID and Course ID are required');
}

if (!in_array($status, ['pass', 'fail', 'needs_revision'], true)) {
    respondError('Invalid evaluation status. Allowed: pass, fail, needs_revision');
}

if (!is_array($criteriaInput) || count($criteriaInput) === 0) {
    respondError('criteria_scores must be a non-empty object of {name: score} pairs');
}

$db = db();

// Enforce Object-Level Authorization
verifyCourseAccess($courseId, $evaluator);

// ── Load this course's configured criteria ────────────────────────────────
$cStmt = $db->prepare("
    SELECT id, name, weight
    FROM course_eval_criteria
    WHERE course_id = ?
    ORDER BY order_index ASC, id ASC
");
$cStmt->execute([$courseId]);
$configuredCriteria = $cStmt->fetchAll();

// ── Calculate final score from submitted scores ───────────────────────────
// Each criterion's maximum score equals its weight (so sum of all maxes = 100).
// Final score = SUM of individual scores (already out-of-weight).
// The backend independently recalculates — submitted final_score is ignored.

$finalScore     = 0.0;
$criteriaScores = [];

if (empty($configuredCriteria)) {
    // Auto-seed defaults for this course
    $defaults = [
        ['Attendance',      15.00, 0],
        ['Architecture',    20.00, 1],
        ['Implementation',  25.00, 2],
        ['Presentation',    20.00, 3],
        ['Documentation',   20.00, 4],
    ];
    $ins = $db->prepare("INSERT INTO course_eval_criteria (course_id, name, weight, order_index) VALUES (?, ?, ?, ?)");
    foreach ($defaults as [$name, $weight, $idx]) {
        $ins->execute([$courseId, $name, $weight, $idx]);
    }
    $cStmt->execute([$courseId]);
    $configuredCriteria = $cStmt->fetchAll();
}

// Build a lookup: name (lowercase), id, and slug -> [weight, canonicalName]
$lookup = [];
foreach ($configuredCriteria as $c) {
    $canonical = trim($c['name']);
    $w = (float)$c['weight'];
    $lookup[strtolower($canonical)] = [$w, $canonical];
    $lookup[(string)$c['id']] = [$w, $canonical];
}

foreach ($criteriaInput as $rawKey => $rawScore) {
    $lookupKey = strtolower(trim((string)$rawKey));
    $score = (float)$rawScore;

    if (!isset($lookup[$lookupKey])) {
        continue;
    }

    [$maxScore, $canonicalName] = $lookup[$lookupKey];
    $score = max(0.0, min($maxScore, $score));
    $criteriaScores[$canonicalName] = round($score, 2);
    $finalScore += $score;
}

$finalScore = max(0.0, min(100.0, round($finalScore, 2)));

// Validate range
if ($finalScore < 0 || $finalScore > 100) {
    respondError('Calculated score is out of range (0–100)');
}

$criteriaJson = json_encode($criteriaScores, JSON_UNESCAPED_UNICODE);

// Ensure criteria_scores column exists
try {
    $db->exec("ALTER TABLE training_evaluations ADD COLUMN criteria_scores JSON DEFAULT NULL");
} catch (Throwable $e) {}

try {
    // Upsert evaluation record
    $stmt = $db->prepare("
        INSERT INTO training_evaluations
            (trainee_id, course_id, evaluator_id, status, final_score, feedback, criteria_scores, evaluated_at)
        VALUES
            (?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
            evaluator_id    = VALUES(evaluator_id),
            status          = VALUES(status),
            final_score     = VALUES(final_score),
            feedback        = VALUES(feedback),
            criteria_scores = VALUES(criteria_scores),
            evaluated_at    = NOW()
    ");
    $stmt->execute([
        $traineeId,
        $courseId,
        $evaluator['id'],
        $status,
        $finalScore,
        $feedback ?: null,
        $criteriaJson
    ]);

    // Notify trainee
    $nStmt = $db->prepare("
        INSERT INTO notifications (user_id, type, message_en, message_ar)
        VALUES (?, 'training_evaluation', ?, ?)
    ");
    $msgEn = "Your training evaluation has been submitted. Status: " . strtoupper($status) . " (Score: $finalScore/100).";
    $msgAr = "تم رصد تقييمك للتدريب الصيفي. الحالة: " . strtoupper($status) . " (الدرجة: $finalScore/100).";
    $nStmt->execute([$traineeId, $msgEn, $msgAr]);

    respond([
        'success'     => true,
        'message'     => 'Trainee evaluation submitted successfully',
        'status'      => $status,
        'final_score' => $finalScore,
    ]);
} catch (Throwable $e) {
    respondError('Database error saving evaluation: ' . $e->getMessage(), 500);
}
