<?php
// =========================================================
// NMU TRAINING — Download Student Import Template
// GET /api/training/enrollments/template.php
// Columns: [NO., Academic ID, Name, Academic Email, CourseCode, Program, Final Track, Training Platform Email, Password]
// =========================================================

require_once __DIR__ . '/../../config.php';

// Allow trainer or admin
requireTrainer();

// Clean output buffer before streaming CSV
if (ob_get_level()) {
    ob_end_clean();
}

$filename = "Students_Import_Template.csv";

header('Content-Type: text/csv; charset=UTF-8');
header("Content-Disposition: attachment; filename=\"{$filename}\"");
header('Pragma: no-cache');
header('Expires: 0');

$output = fopen('php://output', 'w');

// Write UTF-8 BOM for full Arabic / English Excel compatibility
fwrite($output, "\xEF\xBB\xBF");

// Exact columns specified by user
fputcsv($output, [
    'NO.',
    'Academic ID',
    'Name',
    'Academic Email',
    'CourseCode',
    'Program',
    'Final Track',
    'Training Platform Email',
    'Password'
]);

// Sample Rows
fputcsv($output, [
    '1',
    '20230001',
    'Ahmed Ali Mohamed',
    'ahmed20230001@nmu.edu.eg',
    'CSE401',
    'Artificial Intelligence',
    'Robotics & Embedded Systems',
    'ahmed.ali@example.com',
    'NmuPass#2026'
]);
fputcsv($output, [
    '2',
    '20230002',
    'Sarah Hassan Ibrahim',
    'sarah20230002@nmu.edu.eg',
    'CSE401',
    'Computer Science',
    'Web & Cloud Systems',
    'sarah.hassan@example.com',
    'NmuPass#2026'
]);

fclose($output);
exit;
