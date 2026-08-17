<?php
// =========================================================
// NMU TRAINING — Smart Bulk Import & Enroll Trainees
// Access: Trainer or Admin
// Supports: .xlsx, .xls, .csv with Arabic / English Headers
// Smart auto-detection of columns (Academic ID, Name, Email, Password, etc.)
// =========================================================

require_once __DIR__ . '/../../config.php';

$vendorAutoload = __DIR__ . '/../../../vendor/autoload.php';
if (file_exists($vendorAutoload)) {
    require_once $vendorAutoload;
}

$reviewer = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$courseId = (int)($_POST['course_id'] ?? 0);
if (!$courseId || empty($_FILES['excel_file'])) {
    respondError('Course ID and Excel/CSV file upload are required');
}

// Verify trainer assignment to this course (or admin)
verifyCourseAccess($courseId, $reviewer);

$file = $_FILES['excel_file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    respondError('File upload failed with error code ' . $file['error']);
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['xlsx', 'xls', 'csv'], true)) {
    respondError('Invalid file format. Please upload an Excel (.xlsx, .xls) or CSV file.');
}

// ── Multi-Engine Spreadsheet Parser ──────────────────────────────────────────
$rows = [];

// Method 1: PhpSpreadsheet if available
if (class_exists('PhpOffice\PhpSpreadsheet\IOFactory')) {
    try {
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file['tmp_name']);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true);
    } catch (Throwable $e) {
        $rows = [];
    }
}

// Method 2: Native CSV Parser
if (empty($rows) && in_array($ext, ['csv', 'txt'], true)) {
    $handle = fopen($file['tmp_name'], 'r');
    if ($handle) {
        // Strip UTF-8 BOM if present
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }
        $rNum = 1;
        while (($data = fgetcsv($handle, 10000, ',')) !== false) {
            $colLetter = 'A';
            $rowObj = [];
            foreach ($data as $val) {
                $rowObj[$colLetter] = trim((string)$val);
                $colLetter++;
            }
            $rows[$rNum] = $rowObj;
            $rNum++;
        }
        fclose($handle);
    }
}

// Method 3: Native Zero-Dependency XLSX Parser
if (empty($rows) && $ext === 'xlsx') {
    $zip = new ZipArchive();
    if ($zip->open($file['tmp_name']) === true) {
        $sharedStrings = [];
        $ssXml = $zip->getFromName('xl/sharedStrings.xml');
        if ($ssXml) {
            $xml = @simplexml_load_string($ssXml);
            if ($xml) {
                foreach ($xml->si as $si) {
                    if (isset($si->t)) {
                        $sharedStrings[] = (string)$si->t;
                    } elseif (isset($si->r)) {
                        $text = '';
                        foreach ($si->r as $r) {
                            $text .= (string)$r->t;
                        }
                        $sharedStrings[] = $text;
                    } else {
                        $sharedStrings[] = '';
                    }
                }
            }
        }

        $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');
        if (!$sheetXml) {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = $zip->getNameIndex($i);
                if (strpos($name, 'xl/worksheets/sheet') !== false) {
                    $sheetXml = $zip->getFromIndex($i);
                    break;
                }
            }
        }

        if ($sheetXml) {
            $xml = @simplexml_load_string($sheetXml);
            if ($xml && isset($xml->sheetData->row)) {
                foreach ($xml->sheetData->row as $r) {
                    $rIdx = (int)$r['r'];
                    $rowObj = [];
                    foreach ($r->c as $c) {
                        $cellRef = (string)$c['r'];
                        $colLetter = preg_replace('/[0-9]/', '', $cellRef);
                        $type = (string)$c['t'];
                        $val = isset($c->v) ? (string)$c->v : '';

                        if ($type === 's' && isset($sharedStrings[(int)$val])) {
                            $val = $sharedStrings[(int)$val];
                        } elseif ($type === 'inlineStr' && isset($c->is->t)) {
                            $val = (string)$c->is->t;
                        }
                        $rowObj[$colLetter] = trim((string)$val);
                    }
                    $rows[$rIdx] = $rowObj;
                }
            }
        }
        $zip->close();
    }
}

if (count($rows) <= 1) {
    respondError('Uploaded file is empty or could not be parsed.');
}

// ── Smart Header Normalization & Dynamic Column Detection ────────────────────
function normalizeColHeader($h) {
    $h = mb_strtolower(trim((string)$h), 'UTF-8');
    $h = str_replace(['أ', 'إ', 'آ'], 'ا', $h);
    $h = str_replace('ة', 'ه', $h);
    $h = str_replace('ى', 'ي', $h);
    $h = preg_replace('/[()_\-\[\]\.\#]/', ' ', $h);
    return preg_replace('/\s+/', ' ', trim($h));
}

// Find header row (first row with at least 2 non-empty columns)
$headerRow = null;
$headerRowIdx = null;
foreach ($rows as $idx => $r) {
    $nonEmpty = array_filter($r, fn($v) => strlen(trim((string)$v)) > 0);
    if (count($nonEmpty) >= 2) {
        $headerRow = $r;
        $headerRowIdx = $idx;
        break;
    }
}

if (!$headerRow) {
    respondError('Could not identify a valid table header in the uploaded file.');
}

$mapping = [
    'id'       => null,
    'name'     => null,
    'email'    => null,
    'password' => null,
    'college'  => null,
    'year'     => null,
    'major'    => null,
];

// Step 1: Match by Header Titles
foreach ($headerRow as $colKey => $rawHeader) {
    $norm = normalizeColHeader($rawHeader);
    if (empty($norm)) continue;

    // Email
    if (str_contains($norm, 'بريد') || str_contains($norm, 'email') || str_contains($norm, 'mail')) {
        $mapping['email'] = $colKey;
    }
    // Student / Academic ID
    elseif (str_contains($norm, 'جامعي') || str_contains($norm, 'اكاديمي') || str_contains($norm, 'academic id') || str_contains($norm, 'student id') || str_contains($norm, 'كود') || str_contains($norm, 'جلوس')) {
        $mapping['id'] = $colKey;
    }
    // Full Name
    elseif (str_contains($norm, 'اسم') || str_contains($norm, 'name') || str_contains($norm, 'طالب')) {
        $mapping['name'] = $colKey;
    }
    // Password
    elseif (str_contains($norm, 'password') || str_contains($norm, 'pass') || str_contains($norm, 'مرور') || str_contains($norm, 'سر')) {
        $mapping['password'] = $colKey;
    }
    // College
    elseif (str_contains($norm, 'كليه') || str_contains($norm, 'college')) {
        $mapping['college'] = $colKey;
    }
    // Major
    elseif (str_contains($norm, 'تخصص') || str_contains($norm, 'major') || str_contains($norm, 'برنامج')) {
        $mapping['major'] = $colKey;
    }
    // Academic Year
    elseif (str_contains($norm, 'فرقه') || str_contains($norm, 'سنه') || str_contains($norm, 'year') || str_contains($norm, 'مستوي') || str_contains($norm, 'level')) {
        $mapping['year'] = $colKey;
    }
    // Generic ID if not assigned yet and not Row Number
    elseif (in_array($norm, ['id', 'student_id', 'الرقم الجامعي']) && !$mapping['id']) {
        $mapping['id'] = $colKey;
    }
}

// Step 2: Content-Based Auto-Detection Fallback
if (!$mapping['email'] || !$mapping['id'] || !$mapping['name']) {
    foreach ($rows as $rIdx => $r) {
        if ($rIdx <= $headerRowIdx) continue;
        foreach ($r as $cKey => $val) {
            $val = trim((string)$val);
            if (!$val) continue;

            // Detect Email by @
            if (!$mapping['email'] && filter_var($val, FILTER_VALIDATE_EMAIL)) {
                $mapping['email'] = $cKey;
            }
            // Detect Student ID by 6-12 digit numbers
            elseif (!$mapping['id'] && preg_match('/^[0-9]{6,12}$/', $val)) {
                $mapping['id'] = $cKey;
            }
            // Detect Name by Arabic / Multi-word text
            elseif (!$mapping['name'] && preg_match('/[\x{0600}-\x{06FF}]/u', $val) && strpos($val, ' ') !== false) {
                $mapping['name'] = $cKey;
            }
        }
        if ($mapping['email'] && $mapping['id'] && $mapping['name']) break;
    }
}

if (!$mapping['email']) {
    respondError('Could not identify the Academic Email column. Please ensure your file includes an Academic Email / البريد الأكاديمي column.');
}

$db = db();

$createdCount  = 0;
$enrolledCount = 0;
$updatedCount  = 0;
$skippedCount  = 0;
$errors        = [];

// ── Process Data Rows ────────────────────────────────────────────────────────
foreach ($rows as $rowIndex => $row) {
    if ($rowIndex <= $headerRowIdx) {
        continue;
    }

    $email = trim(strtolower((string)($row[$mapping['email']] ?? '')));
    if (!$email) {
        continue; // Skip empty row
    }

    // Basic email sanitation
    $email = filter_var($email, FILTER_SANITIZE_EMAIL);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Row $rowIndex: Invalid email address '$email'";
        $skippedCount++;
        continue;
    }

    $studentId   = $mapping['id'] ? trim((string)($row[$mapping['id']] ?? '')) : '';
    $fullName    = $mapping['name'] ? trim((string)($row[$mapping['name']] ?? '')) : '';
    $rawPassword = $mapping['password'] ? trim((string)($row[$mapping['password']] ?? '')) : '';
    $collegeKey  = $mapping['college'] ? trim((string)($row[$mapping['college']] ?? '')) : '';
    $academicYr  = $mapping['year'] ? trim((string)($row[$mapping['year']] ?? '')) : '';
    $major       = $mapping['major'] ? trim((string)($row[$mapping['major']] ?? '')) : '';

    try {
        // Check if user already exists
        $userStmt = $db->prepare("SELECT id, username, role, approval_status, student_id, full_name FROM users WHERE email = ?");
        $userStmt->execute([$email]);
        $user = $userStmt->fetch();

        if (!$user) {
            // Auto-generate username from email
            $parts = explode('@', $email);
            $username = preg_replace('/[^a-zA-Z0-9_]/', '', $parts[0]);
            if (strlen($username) < 3) {
                $username = 'trainee_' . ($studentId ?: rand(1000, 9999));
            }

            // Ensure username uniqueness
            $chkU = $db->prepare("SELECT id FROM users WHERE username = ?");
            $chkU->execute([$username]);
            if ($chkU->fetch()) {
                $username .= '_' . rand(100, 999);
            }

            // Password from Excel or generated
            $plainPass = $rawPassword ?: ('NmuTrainee#' . rand(1000, 9999));
            $hash = password_hash($plainPass, PASSWORD_DEFAULT);

            $insStmt = $db->prepare("
                INSERT INTO users (email, username, password_hash, full_name, role, student_id, college_key, academic_year, major, approval_status, email_verified, created_at)
                VALUES (?, ?, ?, ?, 'trainee', ?, ?, ?, ?, 'approved', 1, NOW())
            ");
            $insStmt->execute([
                $email,
                $username,
                $hash,
                $fullName ?: $username,
                $studentId ?: null,
                $collegeKey ?: null,
                $academicYr ?: null,
                $major ?: null
            ]);
            $userId = (int)$db->lastInsertId();
            $createdCount++;
        } else {
            $userId = (int)$user['id'];
            $updates = [];
            $params = [];

            // Update student ID if provided and different
            if ($studentId && $user['student_id'] !== $studentId) {
                $updates[] = "student_id = ?";
                $params[] = $studentId;
            }
            // Update full name if provided and different
            if ($fullName && $user['full_name'] !== $fullName) {
                $updates[] = "full_name = ?";
                $params[] = $fullName;
            }
            // Update password if explicit password provided in Excel
            if (!empty($rawPassword)) {
                $updates[] = "password_hash = ?";
                $params[] = password_hash($rawPassword, PASSWORD_DEFAULT);
            }
            // Auto approve if pending
            if ($user['approval_status'] === 'pending') {
                $updates[] = "approval_status = 'approved'";
            }

            if (!empty($updates)) {
                $params[] = $userId;
                $updSql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
                $updStmt = $db->prepare($updSql);
                $updStmt->execute($params);
                $updatedCount++;
            }
        }

        // Ensure source column accepts any string
        try {
            $db->exec("ALTER TABLE trainee_enrollments MODIFY COLUMN source VARCHAR(50) DEFAULT 'import'");
        } catch (Throwable $e) {}

        // Enroll trainee in the course
        $enrStmt = $db->prepare("
            INSERT INTO trainee_enrollments (trainee_id, course_id, source)
            VALUES (?, ?, 'import')
            ON DUPLICATE KEY UPDATE source = 'import'
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
    'message' => "Excel import complete. Enrolled: $enrolledCount, New Trainees Created: $createdCount, Updated: $updatedCount, Skipped/Errors: $skippedCount",
    'created_users_count' => $createdCount,
    'enrolled_count' => $enrolledCount,
    'updated_count' => $updatedCount,
    'skipped_count' => $skippedCount,
    'detected_columns' => $mapping,
    'errors' => $errors
]);
