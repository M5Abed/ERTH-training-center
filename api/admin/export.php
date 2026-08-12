<?php
// =========================================================
// NMU TRAINING — Admin Export (Trainees / Ideas / Evaluations)
// Supports: CSV download + XLSX via PhpSpreadsheet (if available)
// Access: Admin only
// =========================================================

require_once __DIR__ . '/../config.php';
requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$type     = strtolower(trim($_GET['type']    ?? ''));
$format   = strtolower(trim($_GET['format']  ?? 'csv'));   // csv | xlsx
$courseId = isset($_GET['course_id']) ? (int)$_GET['course_id'] : null;

$allowed = ['trainees', 'ideas', 'evaluations'];
if (!in_array($type, $allowed, true)) {
    respondError('type must be one of: trainees, ideas, evaluations');
}

$db = db();
$rows  = [];
$heads = [];

// ── Trainees ──────────────────────────────────────────────────────────────────
if ($type === 'trainees') {
    $heads = ['#', 'Student ID', 'Full Name', 'Email', 'Course', 'Source', 'Enrolled At'];
    $where = $courseId ? "WHERE te.course_id = $courseId" : "";
    $stmt  = $db->prepare("
        SELECT te.id, u.student_id, u.full_name, u.email,
               tc.name AS course_name,
               te.source, te.enrolled_at
        FROM trainee_enrollments te
        JOIN users u ON u.id = te.trainee_id
        JOIN training_courses tc ON tc.id = te.course_id
        $where
        ORDER BY tc.name, u.full_name
    ");
    $stmt->execute([]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $i = 1;
    foreach ($data as $r) {
        $rows[] = [$i++, $r['student_id'] ?? '', $r['full_name'], $r['email'], $r['course_name'], $r['source'], $r['enrolled_at']];
    }
}

// ── Ideas ─────────────────────────────────────────────────────────────────────
if ($type === 'ideas') {
    $heads = ['#', 'Title', 'Trainee', 'Student ID', 'Course', 'Status', 'Avg Rating', 'Votes', 'Submitted At'];
    $where = $courseId ? "WHERE ti.course_id = $courseId" : "";
    $stmt  = $db->prepare("
        SELECT ti.id, ti.title, u.full_name AS trainee_name, u.student_id,
               tc.name AS course_name, ti.status,
               COALESCE(AVG(tv.rating), 0) AS avg_rating,
               COUNT(tv.id) AS vote_count,
               ti.created_at
        FROM training_ideas ti
        LEFT JOIN users u ON u.id = COALESCE(ti.trainee_id, ti.owner_id)
        LEFT JOIN training_courses tc ON tc.id = ti.course_id
        LEFT JOIN training_votes tv ON tv.idea_id = ti.id
        $where
        GROUP BY ti.id
        ORDER BY ti.created_at DESC
    ");
    $stmt->execute([]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $i = 1;
    foreach ($data as $r) {
        $rows[] = [$i++, $r['title'], $r['trainee_name'], $r['student_id'] ?? '', $r['course_name'], $r['status'], round((float)$r['avg_rating'], 1), (int)$r['vote_count'], $r['created_at']];
    }
}

// ── Evaluations ───────────────────────────────────────────────────────────────
if ($type === 'evaluations') {
    $heads = ['#', 'Trainee', 'Student ID', 'Email', 'Course', 'Score', 'Status', 'Feedback', 'Evaluated By', 'Evaluated At'];
    $where = $courseId ? "WHERE te_ev.course_id = $courseId" : "";
    $stmt  = $db->prepare("
        SELECT te_ev.id, u.full_name, u.student_id, u.email,
               tc.name AS course_name,
               te_ev.final_score, te_ev.status, te_ev.feedback,
               ev.full_name AS evaluator_name, te_ev.evaluated_at
        FROM training_evaluations te_ev
        JOIN users u   ON u.id = te_ev.trainee_id
        JOIN training_courses tc ON tc.id = te_ev.course_id
        LEFT JOIN users ev ON ev.id = te_ev.evaluator_id
        $where
        ORDER BY tc.name, u.full_name
    ");
    $stmt->execute([]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $i = 1;
    foreach ($data as $r) {
        $rows[] = [$i++, $r['full_name'], $r['student_id'] ?? '', $r['email'], $r['course_name'], $r['final_score'], $r['status'], $r['feedback'] ?? '', $r['evaluator_name'] ?? '', $r['evaluated_at']];
    }
}

$filename = "erth_{$type}_export_" . date('Ymd_His');

// ── XLSX output ───────────────────────────────────────────────────────────────
if ($format === 'xlsx') {
    $vendorAutoload = __DIR__ . '/../../vendor/autoload.php';
    if (file_exists($vendorAutoload)) {
        require_once $vendorAutoload;
        if (class_exists('PhpOffice\\PhpSpreadsheet\\Spreadsheet')) {
            $spreadsheet = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->fromArray(array_merge([$heads], $rows), null, 'A1');
            // Bold header row
            $lastCol = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex(count($heads));
            $sheet->getStyle("A1:{$lastCol}1")->getFont()->setBold(true);
            foreach (range(1, count($heads)) as $col) {
                $sheet->getColumnDimensionByColumn($col)->setAutoSize(true);
            }
            header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            header("Content-Disposition: attachment; filename=\"{$filename}.xlsx\"");
            header('Cache-Control: max-age=0');
            $writer = new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($spreadsheet);
            $writer->save('php://output');
            exit;
        }
    }
    // Fallback to CSV if PhpSpreadsheet not installed
}

// ── CSV output (default / fallback) ──────────────────────────────────────────
header('Content-Type: text/csv; charset=utf-8');
header("Content-Disposition: attachment; filename=\"{$filename}.csv\"");
header('Cache-Control: max-age=0');

$out = fopen('php://output', 'w');
// UTF-8 BOM for Excel compatibility
fwrite($out, "\xEF\xBB\xBF");
fputcsv($out, $heads);
foreach ($rows as $row) {
    fputcsv($out, $row);
}
fclose($out);
exit;
