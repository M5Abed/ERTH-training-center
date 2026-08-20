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
$submittedFinalScore = isset($data['final_score']) ? (float)$data['final_score'] : null;

if (!$traineeId || !$courseId) {
    respondError('Trainee ID and Course ID are required');
}

if (!in_array($status, ['pass', 'fail', 'needs_revision'], true)) {
    respondError('Invalid evaluation status. Allowed: pass, fail, needs_revision');
}

$db = db();

// Enforce Object-Level Authorization
verifyCourseAccess($courseId, $evaluator);

// Trainee must have a submitted project idea (or belong to an idea team) in this course
$ideaCheckStmt = $db->prepare("
    SELECT ti.id 
    FROM training_ideas ti
    LEFT JOIN training_idea_members tim ON tim.idea_id = ti.id
    WHERE ti.course_id = ? 
      AND (ti.owner_id = ? OR tim.user_id = ?)
      AND ti.status != 'rejected'
    LIMIT 1
");
$ideaCheckStmt->execute([$courseId, $traineeId, $traineeId]);
$hasIdea = $ideaCheckStmt->fetchColumn();

if (!$hasIdea) {
    respondError('Cannot evaluate trainee before they submit or join a project idea for this course.', 400);
}

// ── Load this course's configured criteria ────────────────────────────────
try {
    $db->exec("CREATE TABLE IF NOT EXISTS course_eval_criteria (
        id INT AUTO_INCREMENT PRIMARY KEY,
        course_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        weight DECIMAL(5,2) NOT NULL,
        order_index INT NOT NULL DEFAULT 0
    )");

    $cStmt = $db->prepare("
        SELECT id, name, weight
        FROM course_eval_criteria
        WHERE course_id = ?
        ORDER BY order_index ASC, id ASC
    ");
    $cStmt->execute([$courseId]);
    $configuredCriteria = $cStmt->fetchAll();
} catch (Throwable $e) {
    $configuredCriteria = [];
}

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
    try {
        $ins = $db->prepare("INSERT INTO course_eval_criteria (course_id, name, weight, order_index) VALUES (?, ?, ?, ?)");
        foreach ($defaults as [$name, $weight, $idx]) {
            $ins->execute([$courseId, $name, $weight, $idx]);
        }
        $cStmt = $db->prepare("
            SELECT id, name, weight
            FROM course_eval_criteria
            WHERE course_id = ?
            ORDER BY order_index ASC, id ASC
        ");
        $cStmt->execute([$courseId]);
        $configuredCriteria = $cStmt->fetchAll();
    } catch (Throwable $e) {
        $configuredCriteria = [];
    }
}

// Build a lookup: name (lowercase), id, and slug -> [weight, canonicalName]
$lookup = [];
foreach ($configuredCriteria as $c) {
    $canonical = trim($c['name']);
    $w = (float)$c['weight'];
    $lookup[strtolower($canonical)] = [$w, $canonical];
    $lookup[(string)$c['id']] = [$w, $canonical];
}

if (is_array($criteriaInput)) {
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
}

if ($submittedFinalScore !== null) {
    $finalScore = $submittedFinalScore;
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

    // Synchronize final_grade in trainee_enrollments table
    try {
        $db->prepare("UPDATE trainee_enrollments SET final_grade = ? WHERE trainee_id = ? AND course_id = ?")
           ->execute([$finalScore, $traineeId, $courseId]);
    } catch (Throwable $e) {}

    // Auto-issue certificate if passed
    if ($status === 'pass') {
        $db->exec("
            CREATE TABLE IF NOT EXISTS training_certificates (
              id            INT AUTO_INCREMENT PRIMARY KEY,
              cert_code     VARCHAR(64) UNIQUE NOT NULL,
              course_id     INT NOT NULL,
              trainee_id    INT NOT NULL,
              issued_by     INT NOT NULL,
              final_score   DECIMAL(5,2) DEFAULT NULL,
              status        VARCHAR(32) DEFAULT 'issued',
              pdf_path      VARCHAR(255) DEFAULT NULL,
              issued_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE INDEX idx_tc_trainee_course (trainee_id, course_id),
              INDEX idx_tc_code (cert_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ");
        
        $randomHash = strtoupper(substr(md5(uniqid($traineeId . '_' . $courseId, true)), 0, 8));
        $certCode   = "NMU-CERT-2026-" . $randomHash;

        $cStmt = $db->prepare("
            INSERT INTO training_certificates
                (cert_code, course_id, trainee_id, issued_by, final_score, status, issued_at)
            VALUES
                (?, ?, ?, ?, ?, 'issued', NOW())
            ON DUPLICATE KEY UPDATE 
                final_score = VALUES(final_score),
                issued_by   = VALUES(issued_by),
                status      = 'issued',
                issued_at   = NOW()
        ");
        $cStmt->execute([
            $certCode,
            $courseId,
            $traineeId,
            $evaluator['id'],
            $finalScore
        ]);
    } else {
        // Remove certificate if they failed
        try {
            $db->prepare("DELETE FROM training_certificates WHERE course_id = ? AND trainee_id = ?")->execute([$courseId, $traineeId]);
        } catch (Throwable $e) {}
    }

    // Notify trainee
    $nStmt = $db->prepare("
        INSERT INTO notifications (user_id, type, message_en, message_ar)
        VALUES (?, 'training_evaluation', ?, ?)
    ");
    $msgEn = $status === 'pass' 
        ? "Congratulations! Your training evaluation has PASSED with score $finalScore/100 and your certificate has been issued automatically." 
        : "Your training evaluation has been submitted. Status: " . strtoupper($status) . " (Score: $finalScore/100).";
    $msgAr = $status === 'pass'
        ? "تهانينا! لقد اجتزت التقييم التدريبي بنجاح بدرجة $finalScore/100 وتم إصدار شهادتك الرسمية تلقائياً."
        : "تم رصد تقييمك للتدريب الصيفي. الحالة: " . ($status === 'pass' ? 'ناجح' : 'راسب') . " (الدرجة: $finalScore/100).";
    $nStmt->execute([$traineeId, $msgEn, $msgAr]);

    respond([
        'success'            => true,
        'message'            => 'Trainee evaluation submitted successfully' . ($status === 'pass' ? ' and certificate issued automatically' : ''),
        'status'             => $status,
        'final_score'        => $finalScore,
        'certificate_issued' => ($status === 'pass'),
        'cert_code'          => ($status === 'pass' ? ($certCode ?? null) : null)
    ]);
} catch (Throwable $e) {
    respondError('Database error saving evaluation: ' . $e->getMessage(), 500);
}
