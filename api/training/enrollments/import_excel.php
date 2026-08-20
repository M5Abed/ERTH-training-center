<?php
// =========================================================
// NMU TRAINING — Smart Bulk Import & Enroll Trainees
// Access: Trainer or Admin
// Supports: .xlsx, .xls, .csv with Arabic / English Headers
// Smart auto-detection of columns:
// [NO., Academic ID, Name, Academic Email, CourseCode, Program, Final Track, Training Platform Email, Password]
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
if (empty($_FILES['excel_file'])) {
    respondError('Excel/CSV file upload is required');
}

// If course_id is provided, verify access
if ($courseId > 0) {
    verifyCourseAccess($courseId, $reviewer);
}

$file = $_FILES['excel_file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    respondError('File upload failed with error code ' . $file['error']);
}

$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, ['xlsx', 'xls', 'csv', 'txt'], true)) {
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
    'academic_id'    => null,
    'name'           => null,
    'academic_email' => null,
    'course_code'    => null,
    'program'        => null,
    'final_track'    => null,
    'platform_email' => null,
    'password'       => null,
    'generic_email'  => null,
];

// Step 1: Exact / Canonical Matches by Header Titles
foreach ($headerRow as $colKey => $rawHeader) {
    $norm = normalizeColHeader($rawHeader);
    if (empty($norm)) continue;

    // Platform Email specifically
    if (str_contains($norm, 'training platform email') || str_contains($norm, 'platform email') || str_contains($norm, 'بريد المنصه') || str_contains($norm, 'بريد التدريب')) {
        $mapping['platform_email'] = $colKey;
    }
    // Academic Email specifically
    elseif (str_contains($norm, 'academic email') || str_contains($norm, 'البريد الاكاديمي') || str_contains($norm, 'البريد الجامعي')) {
        $mapping['academic_email'] = $colKey;
    }
    // Generic Email if specific not hit
    elseif (str_contains($norm, 'email') || str_contains($norm, 'بريد') || str_contains($norm, 'mail')) {
        $mapping['generic_email'] = $colKey;
    }
    // Academic / Student ID
    elseif (str_contains($norm, 'academic id') || str_contains($norm, 'student id') || str_contains($norm, 'اكاديمي') || str_contains($norm, 'جامعي') || str_contains($norm, 'كود الطالب') || str_contains($norm, 'رقم الجلوس')) {
        $mapping['academic_id'] = $colKey;
    }
    // Course Code
    elseif (str_contains($norm, 'coursecode') || str_contains($norm, 'course code') || str_contains($norm, 'كود الدوره') || str_contains($norm, 'كود المقرر') || str_contains($norm, 'رمز المقرر') || in_array($norm, ['course', 'مقرر', 'دوره'])) {
        $mapping['course_code'] = $colKey;
    }
    // Program / Major / Department
    elseif (str_contains($norm, 'program') || str_contains($norm, 'البرنامج') || str_contains($norm, 'تخصص') || str_contains($norm, 'major') || str_contains($norm, 'كليه') || str_contains($norm, 'college') || str_contains($norm, 'قسم')) {
        $mapping['program'] = $colKey;
    }
    // Final Track
    elseif (str_contains($norm, 'final track') || str_contains($norm, 'المسار النهائي') || str_contains($norm, 'المسار التدريبي') || str_contains($norm, 'مسار') || str_contains($norm, 'track')) {
        $mapping['final_track'] = $colKey;
    }
    // Full Name
    elseif (str_contains($norm, 'اسم') || str_contains($norm, 'name') || str_contains($norm, 'طالب') || str_contains($norm, 'متدرب')) {
        $mapping['name'] = $colKey;
    }
    // Password
    elseif (str_contains($norm, 'password') || str_contains($norm, 'pass') || str_contains($norm, 'مرور') || str_contains($norm, 'سر') || str_contains($norm, 'باسورد')) {
        $mapping['password'] = $colKey;
    }
    // Generic ID fallback if not row number
    elseif (in_array($norm, ['id', 'student_id', 'الرقم الجامعي']) && !$mapping['academic_id']) {
        $mapping['academic_id'] = $colKey;
    }
}

// Fallback email determination
if (!$mapping['platform_email'] && !$mapping['academic_email'] && $mapping['generic_email']) {
    $mapping['platform_email'] = $mapping['generic_email'];
}

// Step 2: Content-Based Auto-Detection Fallback
if ((!$mapping['platform_email'] && !$mapping['academic_email']) || !$mapping['academic_id'] || !$mapping['name']) {
    foreach ($rows as $rIdx => $r) {
        if ($rIdx <= $headerRowIdx) continue;
        foreach ($r as $cKey => $val) {
            $val = trim((string)$val);
            if (!$val) continue;

            // Detect Email by @
            if (!$mapping['platform_email'] && !$mapping['academic_email'] && filter_var($val, FILTER_VALIDATE_EMAIL)) {
                $mapping['platform_email'] = $cKey;
            }
            // Detect Student ID by 6-12 digit numbers
            elseif (!$mapping['academic_id'] && preg_match('/^[0-9]{6,12}$/', $val)) {
                $mapping['academic_id'] = $cKey;
            }
            // Detect Name by Arabic / Multi-word text
            elseif (!$mapping['name'] && preg_match('/[\x{0600}-\x{06FF}]/u', $val) && strpos($val, ' ') !== false) {
                $mapping['name'] = $cKey;
            }
        }
        if (($mapping['platform_email'] || $mapping['academic_email']) && $mapping['academic_id'] && $mapping['name']) break;
    }
}

$primaryEmailCol = $mapping['platform_email'] ?: ($mapping['academic_email'] ?: $mapping['generic_email']);

if (!$primaryEmailCol) {
    respondError('Could not identify Email column. Please ensure your file includes Academic Email or Training Platform Email column.');
}

$db = db();

// Ensure users.academic_email column exists
try {
    $db->exec("ALTER TABLE users ADD COLUMN academic_email VARCHAR(255) NULL AFTER email");
} catch (Throwable $e) {}

// Ensure UNIQUE index on trainee_enrollments(trainee_id, course_id) to prevent duplicates
try {
    $db->exec("ALTER TABLE trainee_enrollments ADD UNIQUE INDEX idx_te_unique (trainee_id, course_id)");
} catch (Throwable $e) {
    // Index already exists — safe to ignore
}

$createdCount    = 0;
$enrolledCount   = 0;
$updatedCount    = 0;
$skippedCount    = 0;
$duplicateCount  = 0;
$errors          = [];

// Cache courses lookup to resolve CourseCode quickly
$coursesList = $db->query("SELECT id, name, category, course_type FROM training_courses")->fetchAll();

// ── Process Data Rows ────────────────────────────────────────────────────────
foreach ($rows as $rowIndex => $row) {
    if ($rowIndex <= $headerRowIdx) {
        continue;
    }

    $platformEmail = $mapping['platform_email'] ? trim(strtolower((string)($row[$mapping['platform_email']] ?? ''))) : '';
    $academicEmail = $mapping['academic_email'] ? trim(strtolower((string)($row[$mapping['academic_email']] ?? ''))) : '';
    $genericEmail  = $mapping['generic_email']  ? trim(strtolower((string)($row[$mapping['generic_email']] ?? ''))) : '';

    $loginEmail = $platformEmail ?: ($academicEmail ?: $genericEmail);
    if (!$loginEmail) {
        continue; // Skip empty row
    }

    $loginEmail = filter_var($loginEmail, FILTER_SANITIZE_EMAIL);
    if (!filter_var($loginEmail, FILTER_VALIDATE_EMAIL)) {
        $errors[] = "Row $rowIndex: Invalid email address '$loginEmail'";
        $skippedCount++;
        continue;
    }

    $studentId   = $mapping['academic_id'] ? trim((string)($row[$mapping['academic_id']] ?? '')) : '';
    $fullName    = $mapping['name'] ? trim((string)($row[$mapping['name']] ?? '')) : '';
    $rawPassword = $mapping['password'] ? trim((string)($row[$mapping['password']] ?? '')) : '';
    $program     = $mapping['program'] ? trim((string)($row[$mapping['program']] ?? '')) : '';
    $finalTrack  = $mapping['final_track'] ? trim((string)($row[$mapping['final_track']] ?? '')) : '';
    $courseCode  = $mapping['course_code'] ? trim((string)($row[$mapping['course_code']] ?? '')) : '';

    // Determine target course ID: from row CourseCode if matched, else fallback to $courseId
    $targetCourseId = $courseId;
    if ($courseCode) {
        foreach ($coursesList as $c) {
            if (
                strcasecmp((string)$c['id'], $courseCode) === 0 ||
                strcasecmp((string)$c['category'], $courseCode) === 0 ||
                strcasecmp((string)$c['name'], $courseCode) === 0 ||
                stripos($c['name'], $courseCode) !== false
            ) {
                $targetCourseId = (int)$c['id'];
                break;
            }
        }
    }

    try {
        // Check if user already exists by email or student ID
        $userStmt = $db->prepare("
            SELECT id, role, approval_status, student_id, full_name, email
            FROM users
            WHERE email = ? OR (student_id IS NOT NULL AND student_id = ? AND student_id != '')
            LIMIT 1
        ");
        $userStmt->execute([$loginEmail, $studentId ?: '___none___']);
        $user = $userStmt->fetch();

        if (!$user) {
            // Password from Excel or generated
            $plainPass = $rawPassword ?: ('NmuTrainee#' . rand(1000, 9999));
            $hash = password_hash($plainPass, PASSWORD_DEFAULT);

            $insStmt = $db->prepare("
                INSERT INTO users
                    (email, password_hash, full_name, role, student_id, academic_id, major, final_track, department, approval_status, email_verified, created_at)
                VALUES
                    (?, ?, ?, 'trainee', ?, ?, ?, ?, ?, 'approved', 1, NOW())
            ");
            $insStmt->execute([
                $loginEmail,
                $hash,
                $fullName ?: explode('@', $loginEmail)[0],
                $studentId ?: null,
                $studentId ?: null,
                $program ?: null,
                $finalTrack ?: null,
                $program ?: null
            ]);
            $userId = (int)$db->lastInsertId();
            $createdCount++;
        } else {
            $userId = (int)$user['id'];
            $updates = [];
            $params  = [];

            // Update student ID / academic ID
            if ($studentId) {
                $updates[] = "student_id = ?";
                $params[] = $studentId;
                $updates[] = "academic_id = ?";
                $params[] = $studentId;
            }
            // Update full name
            if ($fullName && $user['full_name'] !== $fullName) {
                $updates[] = "full_name = ?";
                $params[] = $fullName;
            }
            // Update major
            if ($program) {
                $updates[] = "major = ?";
                $params[] = $program;
            }
            // Update final track
            if ($finalTrack) {
                $updates[] = "final_track = ?";
                $params[] = $finalTrack;
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

        // Enroll trainee in the target course if we have a valid course ID
        if ($targetCourseId > 0) {
            // Check if this trainee is already enrolled in this course
            $dupCheck = $db->prepare("SELECT id FROM trainee_enrollments WHERE trainee_id = ? AND course_id = ? LIMIT 1");
            $dupCheck->execute([$userId, $targetCourseId]);
            $existingEnrollment = $dupCheck->fetchColumn();

            if ($existingEnrollment) {
                // Already enrolled — skip, don't create duplicate
                $duplicateCount++;
            } else {
                // Determine target course type & details
                $targetCourseType = 'internal';
                $targetCourseName = '';
                $targetCourseCat  = '';
                foreach ($coursesList as $c) {
                    if ((int)$c['id'] === $targetCourseId) {
                        $targetCourseType = $c['course_type'] ?? 'internal';
                        $targetCourseName = $c['name'] ?? '';
                        $targetCourseCat  = $c['category'] ?? '';
                        break;
                    }
                }

                $isCourseExternal = (
                    $targetCourseType === 'external' || 
                    stripos($targetCourseName, 'external') !== false || 
                    stripos($targetCourseName, 'خارجي') !== false || 
                    stripos($targetCourseCat, 'external') !== false || 
                    stripos($targetCourseCat, 'خارجي') !== false
                );

                $trainingType = $isCourseExternal ? 'external' : 'internal';

                // Auto-detect & match official contracted providers (ITI, NTI, CREATIVA, DEPI)
                $matchedProviderId = null;
                $trackLower = strtolower($finalTrack);
                if (str_contains($trackLower, 'iti') || str_contains($trackLower, 'تكنولوجيا المعلومات')) {
                    $matchedProviderId = 1;
                    $trainingType = 'external';
                } elseif (str_contains($trackLower, 'nti') || str_contains($trackLower, 'القومي للاتصالات')) {
                    $matchedProviderId = 2;
                    $trainingType = 'external';
                } elseif (str_contains($trackLower, 'creativa') || str_contains($trackLower, 'كريتيفا') || str_contains($trackLower, 'كرياتيفا')) {
                    $matchedProviderId = 3;
                    $trainingType = 'external';
                } elseif (str_contains($trackLower, 'depi') || str_contains($trackLower, 'رواد مصر الرقمية')) {
                    $matchedProviderId = 4;
                    $trainingType = 'external';
                }

                // All students added to an external course ALWAYS have training_type = 'external' even if track/name is N/A or empty
                if ($isCourseExternal) {
                    $trainingType = 'external';
                }

                // Find or associate Track ID if finalTrack was given
                $assignedTrackId = null;
                if ($finalTrack) {
                    $trStmt = $db->prepare("SELECT id FROM training_topics WHERE course_id = ? AND title LIKE ? LIMIT 1");
                    $trStmt->execute([$targetCourseId, "%{$finalTrack}%"]);
                    $assignedTrackId = $trStmt->fetchColumn() ?: null;
                }

                $enrStmt = $db->prepare("
                    INSERT INTO trainee_enrollments 
                        (trainee_id, course_id, course_code, program, final_track, provider_id, track_id, custom_provider_name, training_type, source, enrolled_at)
                    VALUES 
                        (?, ?, ?, ?, ?, ?, ?, ?, ?, 'import', NOW())
                    ON DUPLICATE KEY UPDATE 
                        course_code = COALESCE(VALUES(course_code), course_code),
                        program = COALESCE(VALUES(program), program),
                        final_track = COALESCE(VALUES(final_track), final_track),
                        provider_id = COALESCE(VALUES(provider_id), provider_id),
                        track_id = COALESCE(VALUES(track_id), track_id),
                        custom_provider_name = COALESCE(VALUES(custom_provider_name), custom_provider_name),
                        training_type = VALUES(training_type),
                        source = 'import'
                ");
                $enrStmt->execute([
                    $userId,
                    $targetCourseId,
                    $courseCode ?: null,
                    $program ?: null,
                    $finalTrack ?: null,
                    $matchedProviderId,
                    $assignedTrackId,
                    $finalTrack ?: null,
                    $trainingType
                ]);
                $enrolledCount++;
            }
        }

    } catch (Exception $e) {
        $errors[] = "Row $rowIndex ($loginEmail): " . $e->getMessage();
        $skippedCount++;
    }
}

respond([
    'success'             => true,
    'message'             => "Excel import complete. New Enrollments: $enrolledCount, Already Enrolled (skipped): $duplicateCount, New Users Created: $createdCount, Updated: $updatedCount, Skipped/Errors: $skippedCount",
    'created_users_count' => $createdCount,
    'enrolled_count'      => $enrolledCount,
    'duplicate_count'     => $duplicateCount,
    'updated_count'       => $updatedCount,
    'skipped_count'       => $skippedCount,
    'detected_columns'    => $mapping,
    'errors'              => $errors
]);
