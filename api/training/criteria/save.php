<?php
// =========================================================
// NMU TRAINING — Save Course Evaluation Criteria
// POST /api/training/criteria/save.php
// Body: { course_id: int, criteria: [{name: str, weight: float}, ...] }
// Access: Trainer or Admin
// Validation: total weight must equal exactly 100
// =========================================================

require_once __DIR__ . '/../../config.php';

$evaluator = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data     = body();
$courseId = resolveCourseId($data['course_id'] ?? 0);
$criteria = $data['criteria'] ?? null;

if (!$courseId) {
    respondError('course_id is required');
}

if (!is_array($criteria) || count($criteria) === 0) {
    respondError('criteria must be a non-empty array');
}

// Enforce Object-Level Authorization
verifyCourseAccess($courseId, $evaluator);

// Validate each criterion entry
$totalWeight = 0.0;
$cleaned = [];
foreach ($criteria as $idx => $c) {
    $name   = trim($c['name'] ?? '');
    $weight = (float)($c['weight'] ?? 0);

    if ($name === '') {
        respondError("Criterion at index $idx is missing a name");
    }
    if ($weight <= 0) {
        respondError("Criterion '$name' must have a positive weight");
    }

    $totalWeight += $weight;
    $cleaned[] = [$name, $weight, $idx];
}

// ── CRITICAL: total must be exactly 100 ──────────────────
if (abs($totalWeight - 100.0) > 0.001) {
    respondError(
        'Total weight must be exactly 100%. Current total: ' . round($totalWeight, 2) . '%',
        422
    );
}

$db = db();

try {
    $db->exec("
        CREATE TABLE IF NOT EXISTS course_eval_criteria (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_id INT NOT NULL,
            name VARCHAR(150) NOT NULL,
            weight DECIMAL(5,2) NOT NULL,
            order_index INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cec_course (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
} catch (Throwable $e) {}

try {
    $db->beginTransaction();

    // Delete existing criteria for this course
    $del = $db->prepare("DELETE FROM course_eval_criteria WHERE course_id = ?");
    $del->execute([$courseId]);

    // Insert the new set
    $ins = $db->prepare("
        INSERT INTO course_eval_criteria (course_id, name, weight, order_index)
        VALUES (?, ?, ?, ?)
    ");
    foreach ($cleaned as [$name, $weight, $idx]) {
        $ins->execute([$courseId, $name, $weight, $idx]);
    }

    $db->commit();
} catch (Throwable $e) {
    $db->rollBack();
    respondError('Database error saving criteria: ' . $e->getMessage(), 500);
}

// Return the saved criteria
$stmt = $db->prepare("
    SELECT id, course_id, name, weight, order_index
    FROM course_eval_criteria
    WHERE course_id = ?
    ORDER BY order_index ASC, id ASC
");
$stmt->execute([$courseId]);
$saved = $stmt->fetchAll();

respond(['success' => true, 'criteria' => $saved]);
