<?php
// =========================================================
// NMU TRAINING — List Project Documentation & Links
// Access: All authenticated users
// =========================================================

require_once __DIR__ . '/../../config.php';

try {
    $user = requireRole(['trainee', 'trainer', 'admin']);
    $uid = (int)$user['id'];
    $role = strtolower($user['role'] ?? 'trainee');
    $isAdmin = (bool)($user['is_admin'] || $role === 'admin');

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        respondError('Method not allowed', 405);
    }

    $db = db();

    // Ensure trainee_documentation table exists
    $db->exec("
        CREATE TABLE IF NOT EXISTS trainee_documentation (
            id INT AUTO_INCREMENT PRIMARY KEY,
            idea_id INT DEFAULT NULL,
            trainee_id INT NOT NULL,
            course_id INT DEFAULT NULL,
            doc_type VARCHAR(50) NOT NULL DEFAULT 'report',
            file_name VARCHAR(255) NOT NULL,
            file_url TEXT NOT NULL,
            file_size INT DEFAULT 0,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_td_idea (idea_id),
            KEY idx_td_trainee (trainee_id),
            KEY idx_td_course (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    $ideaId   = isset($_GET['idea_id']) ? (int)$_GET['idea_id'] : 0;
    $courseId = isset($_GET['course_id']) ? (int)$_GET['course_id'] : 0;
    $targetTraineeId = isset($_GET['trainee_id']) ? (int)$_GET['trainee_id'] : 0;

    $whereClauses = [];
    $params = [];

    if ($ideaId > 0) {
        $whereClauses[] = "td.idea_id = ?";
        $params[] = $ideaId;
    } elseif ($courseId > 0) {
        $whereClauses[] = "(td.course_id = ? OR td.idea_id IN (SELECT id FROM training_ideas WHERE course_id = ?))";
        $params[] = $courseId;
        $params[] = $courseId;
    }

    if ($targetTraineeId > 0) {
        $whereClauses[] = "td.trainee_id = ?";
        $params[] = $targetTraineeId;
    } elseif ($role === 'trainee' && !$isAdmin && !$ideaId) {
        if ($courseId > 0) {
            $whereClauses[] = "(td.trainee_id = ? OR td.course_id = ? OR td.idea_id IN (SELECT id FROM training_ideas WHERE trainee_id = ? OR owner_id = ?))";
            $params[] = $uid;
            $params[] = $courseId;
            $params[] = $uid;
            $params[] = $uid;
        } else {
            $whereClauses[] = "(td.trainee_id = ? OR td.idea_id IN (SELECT id FROM training_ideas WHERE trainee_id = ? OR owner_id = ?))";
            $params[] = $uid;
            $params[] = $uid;
            $params[] = $uid;
        }
    }

    $whereSql = $whereClauses ? "WHERE " . implode(" AND ", $whereClauses) : "";

    $stmt = $db->prepare("
        SELECT td.*, 
               u.full_name AS trainee_name, 
               u.email AS trainee_email, 
               u.student_id,
               COALESCE(
                   (SELECT COALESCE(title, 'Summer Training Project') FROM training_ideas WHERE id = td.idea_id LIMIT 1),
                   (SELECT COALESCE(title, 'Summer Training Project') FROM training_ideas WHERE course_id = td.course_id AND (owner_id = td.trainee_id) ORDER BY id DESC LIMIT 1),
                   'Summer Training Project'
               ) AS project_title
        FROM trainee_documentation td
        LEFT JOIN users u ON td.trainee_id = u.id
        $whereSql
        ORDER BY td.uploaded_at DESC
    ");
    $stmt->execute($params);
    $docs = $stmt->fetchAll();

    respond(['success' => true, 'docs' => $docs]);
} catch (Throwable $e) {
    respondError('Server error: ' . $e->getMessage(), 500);
}
