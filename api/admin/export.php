<?php
// =========================================================
// NMU TRAINING — Admin Export API
// Exports trainees or ideas to CSV (Excel compatible)
// =========================================================

require_once __DIR__ . '/../config.php';

requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$type = strtolower(trim($_GET['type'] ?? 'trainees'));
$format = strtolower(trim($_GET['format'] ?? 'csv'));
$courseId = isset($_GET['course_id']) && (int)$_GET['course_id'] > 0 ? (int)$_GET['course_id'] : null;

$db = db();
$reportRows = [];
$columns = [];
$filename = "Export_";

if ($type === 'trainees') {
    $filename .= "Trainees_" . ($courseId ? "Course_{$courseId}_" : "All_") . date('Y-m-d') . ".csv";
    
    $where = "WHERE u.role = 'trainee'";
    $params = [];
    
    if ($courseId) {
        $where .= " AND te.course_id = ?";
        $params[] = $courseId;
    }
    
    // Ensure required columns exist safely (prevent failures if missing)
    try { $db->exec("ALTER TABLE users ADD COLUMN academic_email VARCHAR(255) NULL AFTER email"); } catch (Throwable $e) {}
    try { $db->exec("ALTER TABLE trainee_enrollments ADD COLUMN final_grade DECIMAL(5,2) NULL"); } catch (Throwable $e) {}

    $stmt = $db->prepare("
        SELECT 
            u.id AS trainee_id,
            COALESCE(NULLIF(TRIM(u.academic_id), ''), NULLIF(TRIM(u.student_id), ''), '-') AS academic_id,
            COALESCE(NULLIF(TRIM(u.full_name), ''), 'Trainee') AS full_name,
            u.email AS platform_email,
            u.academic_email,
            COALESCE(NULLIF(TRIM(te.program), ''), NULLIF(TRIM(u.program), ''), NULLIF(TRIM(u.major), ''), NULLIF(TRIM(u.department), ''), 'General') AS program,
            COALESCE(
                NULLIF(TRIM(te.final_track), ''),
                NULLIF(TRIM(tt.title), ''),
                NULLIF(TRIM(te.custom_provider_name), ''),
                NULLIF(TRIM(p.name), ''),
                NULLIF(TRIM(u.final_track), ''),
                NULLIF(TRIM(c.category), ''),
                c.name
            ) AS final_track,
            COALESCE(NULLIF(TRIM(te.course_code), ''), NULLIF(TRIM(c.course_code), ''), NULLIF(TRIM(c.category), ''), NULLIF(TRIM(c.name), ''), CONCAT('COURSE-', c.id)) AS course_code,
            c.name AS course_name,
            te.training_type,
            COALESCE(p.name, te.custom_provider_name) AS provider_name,
            COALESCE((SELECT final_score FROM training_evaluations WHERE trainee_id = u.id AND course_id = c.id), te.final_grade) AS final_grade,
            (SELECT status FROM training_evaluations WHERE trainee_id = u.id AND course_id = c.id) AS eval_status
        FROM users u
        LEFT JOIN trainee_enrollments te ON te.trainee_id = u.id
        LEFT JOIN training_courses c ON c.id = te.course_id
        LEFT JOIN external_training_providers p ON te.provider_id = p.id
        LEFT JOIN training_topics tt ON te.track_id = tt.id
        $where
        ORDER BY c.name ASC, u.full_name ASC
    ");
    $stmt->execute($params);
    $trainees = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $columns = [
        'NO.',
        'Academic ID',
        'Name',
        'Academic Email',
        'Platform Email',
        'Program / Major',
        'Course Code',
        'Course Name',
        'Final Track',
        'Training Type',
        'Provider',
        'Final Grade',
        'Evaluation Status'
    ];
    
    $no = 1;
    foreach ($trainees as $t) {
        $finalGradeStr = ($t['final_grade'] !== null) ? number_format((float)$t['final_grade'], 2, '.', '') : 'Not Graded';
        $reportRows[] = [
            $no++,
            $t['academic_id'],
            $t['full_name'],
            $t['academic_email'] ?: '-',
            $t['platform_email'],
            $t['program'],
            $t['course_code'] ?: '-',
            $t['course_name'] ?: '-',
            $t['final_track'] ?: '-',
            $t['training_type'] ?: '-',
            $t['provider_name'] ?: '-',
            $finalGradeStr,
            $t['eval_status'] ?? 'pending'
        ];
    }
} elseif ($type === 'ideas') {
    // Basic ideas export if needed by DocumentsArchive
    $filename .= "Ideas_" . date('Y-m-d') . ".csv";
    
    $stmt = $db->query("
        SELECT i.id, i.title, u.full_name AS owner_name, c.name AS course_name, i.status, i.created_at
        FROM training_ideas i
        LEFT JOIN users u ON i.owner_id = u.id
        LEFT JOIN training_courses c ON i.course_id = c.id
        ORDER BY i.created_at DESC
    ");
    $ideas = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    $columns = ['ID', 'Title', 'Owner', 'Course', 'Status', 'Created At'];
    foreach ($ideas as $i) {
        $reportRows[] = [
            $i['id'],
            $i['title'],
            $i['owner_name'],
            $i['course_name'],
            $i['status'],
            $i['created_at']
        ];
    }
} else {
    respondError("Invalid export type", 400);
}

if ($format === 'json') {
    respond([
        'success' => true,
        'type'    => $type,
        'total'   => count($reportRows),
        'columns' => $columns,
        'data'    => $reportRows
    ]);
}

// Clean output buffer before streaming CSV
if (ob_get_level()) {
    ob_end_clean();
}

header('Content-Type: text/csv; charset=UTF-8');
header("Content-Disposition: attachment; filename=\"{$filename}\"");
header('Pragma: no-cache');
header('Expires: 0');

$output = fopen('php://output', 'w');

// Write UTF-8 BOM for full Arabic / English Excel compatibility
fwrite($output, "\xEF\xBB\xBF");

// Write header
fputcsv($output, $columns);

// Write rows
foreach ($reportRows as $row) {
    fputcsv($output, $row);
}

fclose($output);
exit;
