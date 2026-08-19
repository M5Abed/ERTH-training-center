<?php
// =========================================================
// NMU TRAINING — List / Auto-seed Course Evaluation Criteria
// GET /api/training/criteria/list.php?course_id=X
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

requireRole(['trainee', 'trainer', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_GET['course_id'] ?? 0);
if (!$courseId) {
    respondError('course_id is required');
}

$db = db();

// Fetch existing criteria
$stmt = $db->prepare("
    SELECT id, course_id, name, weight, order_index
    FROM course_eval_criteria
    WHERE course_id = ?
    ORDER BY order_index ASC, id ASC
");
$stmt->execute([$courseId]);
$criteria = $stmt->fetchAll();

// Auto-seed legacy defaults if none exist for this course
if (empty($criteria)) {
    $defaults = [
        ['Attendance',      15.00, 0],
        ['Architecture',    20.00, 1],
        ['Implementation',  25.00, 2],
        ['Presentation',    20.00, 3],
        ['Documentation',   20.00, 4],
    ];

    $ins = $db->prepare("
        INSERT INTO course_eval_criteria (course_id, name, weight, order_index)
        VALUES (?, ?, ?, ?)
    ");
    foreach ($defaults as [$name, $weight, $idx]) {
        $ins->execute([$courseId, $name, $weight, $idx]);
    }

    // Re-fetch after seeding
    $stmt->execute([$courseId]);
    $criteria = $stmt->fetchAll();
}

respond(['criteria' => $criteria]);
