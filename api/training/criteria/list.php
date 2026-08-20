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

// Ensure table exists
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

$criteria = [];
$defaults = [
    ['name' => 'Attendance',      'weight' => 15.00, 'order_index' => 0],
    ['name' => 'Architecture',    'weight' => 20.00, 'order_index' => 1],
    ['name' => 'Implementation',  'weight' => 25.00, 'order_index' => 2],
    ['name' => 'Presentation',    'weight' => 20.00, 'order_index' => 3],
    ['name' => 'Documentation',   'weight' => 20.00, 'order_index' => 4],
];

try {
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
        $ins = $db->prepare("
            INSERT INTO course_eval_criteria (course_id, name, weight, order_index)
            VALUES (?, ?, ?, ?)
        ");
        foreach ($defaults as $d) {
            $ins->execute([$courseId, $d['name'], $d['weight'], $d['order_index']]);
        }

        // Re-fetch after seeding
        $stmt->execute([$courseId]);
        $criteria = $stmt->fetchAll();
    }
} catch (Throwable $e) {
    error_log('Criteria fetch error: ' . $e->getMessage());
    $criteria = $defaults;
}

respond(['criteria' => !empty($criteria) ? $criteria : $defaults]);
