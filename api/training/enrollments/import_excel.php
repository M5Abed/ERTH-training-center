<?php
// =========================================================
// NMU TRAINING — Bulk Import & Enroll Trainees from Excel
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../vendor/autoload.php';

use PhpOffice\PhpSpreadsheet\IOFactory;

$reviewer = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_POST['course_id'] ?? 0);
if (!$courseId || empty($_FILES['excel_file'])) {
    respondError('Course ID and Excel file upload are required');
}

$file = $_FILES['excel_file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    respondError('File upload failed with error code ' . $file['error']);
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['xlsx', 'xls', 'csv'], true)) {
    respondError('Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV file.');
}

try {
    $spreadsheet = IOFactory::load($file['tmp_name']);
    $sheet = $spreadsheet->getActiveSheet();
    $rows = $sheet->toArray(null, true, true, true);
} catch (Exception $e) {
    respondError('Failed to parse Excel file: ' . $e->getMessage(), 400);
}

if (count($rows) <= 1) {
    respondError('Excel file is empty or contains only headers.');
}

$db = db();

// Expected Columns (Header on row 1):
// A: Student ID | B: Full Name (EN) | C: Email | D: College Key (optional) | E: Academic Year (optional) | F: Major (optional)

$createdCount = 0;
$enrolledCount = 0;
$skippedCount = 0;
$errors = [];

// Skip header row
$isHeader = true;
foreach ($rows as $rowIndex => $row) {
    if ($isHeader) {
        $isHeader = false;
        continue;
    }

    $studentId   = trim((string)($row['A'] ?? ''));
    $fullNameEn  = trim((string)($row['B'] ?? ''));
    $email       = trim(strtolower((string)($row['C'] ?? '')));
    $collegeKey  = trim((string)($row['D'] ?? ''));
    $academicYr  = trim((string)($row['E'] ?? ''));
    $major       = trim((string)($row['F'] ?? ''));

    if (!$email) {
        continue; // Skip empty rows
    }

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Row $rowIndex: Invalid email '$email'";
        $skippedCount++;
        continue;
    }

    // Domain check: must end with @nmu.edu.eg
    if (!str_ends_with($email, '@nmu.edu.eg')) {
        $errors[] = "Row $rowIndex: Email '$email' must be an official @nmu.edu.eg address";
        $skippedCount++;
        continue;
    }

    try {
        // Check if user exists
        $userStmt = $db->prepare("SELECT id, role, approval_status FROM users WHERE email = ?");
        $userStmt->execute([$email]);
        $user = $userStmt->fetch();

        if (!$user) {
            // Auto-create trainee user
            $parts = explode('@', $email);
            $username = preg_replace('/[^a-zA-Z0-9_]/', '', $parts[0]);
            if (strlen($username) < 3) $username = 'trainee_' . rand(1000, 9999);

            // Default random password (trainee can reset or use default format)
            $defaultPass = 'NmuTrainee#' . rand(1000, 9999);
            $hash = password_hash($defaultPass, PASSWORD_DEFAULT);

            $insStmt = $db->prepare("
                INSERT INTO users (email, username, password_hash, full_name_en, role, student_id, college_key, academic_year, major, approval_status, email_verified, created_at)
                VALUES (?, ?, ?, ?, 'trainee', ?, ?, ?, ?, 'approved', 1, NOW())
            ");
            $insStmt->execute([
                $email,
                $username,
                $hash,
                $fullNameEn ?: $username,
                $studentId ?: null,
                $collegeKey ?: null,
                $academicYr ?: null,
                $major ?: null
            ]);
            $userId = (int)$db->lastInsertId();
            $createdCount++;
        } else {
            $userId = (int)$user['id'];
            // If user existed but was pending, auto approve because Excel imported by Trainer/Admin
            if ($user['approval_status'] === 'pending') {
                $updStmt = $db->prepare("UPDATE users SET approval_status = 'approved' WHERE id = ?");
                $updStmt->execute([$userId]);
            }
        }

        // Add to enrollments
        $enrStmt = $db->prepare("
            INSERT INTO trainee_enrollments (trainee_id, course_id, source)
            VALUES (?, ?, 'excel_import')
            ON DUPLICATE KEY UPDATE course_id = VALUES(course_id)
        ");
        $enrStmt->execute([$userId, $courseId]);
        $enrolledCount++;

    } catch (Exception $e) {
        $errors[] = "Row $rowIndex ($email): " . $e->getMessage();
        $skippedCount++;
    }
}

respond([
    'success' => true,
    'message' => "Excel import complete. Enrolled: $enrolledCount, New Users Created: $createdCount, Skipped/Errors: $skippedCount",
    'created_users_count' => $createdCount,
    'enrolled_count' => $enrolledCount,
    'skipped_count' => $skippedCount,
    'errors' => $errors
]);
