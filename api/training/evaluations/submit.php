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

if (!empty($configuredCriteria)) {
    // Build a lookup: name (lowercase) → weight
    $lookup = [];
    foreach ($configuredCriteria as $c) {
        $lookup[strtolower(trim($c['name']))] = (float)$c['weight'];
    }

    foreach ($criteriaInput as $rawName => $rawScore) {
        $key   = strtolower(trim($rawName));
        $score = (float)$rawScore;

        if (!isset($lookup[$key])) {
            // Unknown criterion — skip gracefully (do not error on stale data)
            continue;
        }

        $maxScore = $lookup[$key];
        // Clamp score to [0, maxScore]
        $score = max(0.0, min($maxScore, $score));

        $criteriaScores[$rawName] = $score;
        $finalScore += $score;
    }

    // Clamp total to [0, 100]
    $finalScore = max(0.0, min(100.0, round($finalScore, 2)));

} else {
    // ── Legacy fallback: no criteria configured, use hard-coded 5 defaults ──
    $att  = min(15, max(0, (float)($criteriaInput['attendance']     ?? 0)));
    $arch = min(20, max(0, (float)($criteriaInput['architecture']   ?? 0)));
    $impl = min(25, max(0, (float)($criteriaInput['implementation'] ?? 0)));
    $pres = min(20, max(0, (float)($criteriaInput['presentation']   ?? 0)));
    $doc  = min(20, max(0, (float)($criteriaInput['documentation']  ?? 0)));

    $finalScore = round($att + $arch + $impl + $pres + $doc, 2);
    $criteriaScores = [
        'attendance'     => $att,
        'architecture'   => $arch,
        'implementation' => $impl,
        'presentation'   => $pres,
        'documentation'  => $doc,
    ];
}

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
