<?php
// =========================================================
// NMU TRAINING — Issue Trainee Certificate
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$issuer = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId  = (int)($data['course_id'] ?? 0);
$traineeId = (int)($data['trainee_id'] ?? 0);

if (!$courseId || !$traineeId) {
    respondError('Course ID and Trainee ID are required');
}

$db = db();

// Ensure table exists
$db->exec("
CREATE TABLE IF NOT EXISTS training_certificates (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  cert_code     VARCHAR(64) UNIQUE NOT NULL,
  course_id     INT NOT NULL,
  trainee_id    INT NOT NULL,
  issued_by     INT NOT NULL,
  final_score   DECIMAL(5,2) DEFAULT NULL,
  status        VARCHAR(32) DEFAULT 'issued',
  pdf_path      VARCHAR(255) DEFAULT NULL,
  issued_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_tc_trainee_course (trainee_id, course_id),
  INDEX idx_tc_code (cert_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
");

$db = db();

// Ensure trainer is assigned to this course (or admin)
verifyCourseAccess($courseId, $issuer);

// 1. Fetch Trainee details
$tStmt = $db->prepare("SELECT id, full_name, student_id, email FROM users WHERE id = ?");
$tStmt->execute([$traineeId]);
$trainee = $tStmt->fetch();
if (!$trainee) {
    respondError('Trainee not found', 404);
}

// 2. Fetch Course details
$cStmt = $db->prepare("SELECT id, name FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();
if (!$course) {
    respondError('Course not found', 404);
}

// 3. Fetch Evaluation details (trainee must be evaluated)
$eStmt = $db->prepare("SELECT * FROM training_evaluations WHERE course_id = ? AND trainee_id = ?");
$eStmt->execute([$courseId, $traineeId]);
$eval = $eStmt->fetch();

// Allow issuing if evaluated or if admin/trainer explicitly issues
$finalScore = $eval ? (float)$eval['final_score'] : 100.0;

// 4. Generate unique certificate code
$randomHash = strtoupper(substr(md5(uniqid($traineeId . '_' . $courseId, true)), 0, 8));
$certCode   = "NMU-CERT-2026-" . $randomHash;

// 5. Upsert Certificate record
$stmt = $db->prepare("
    INSERT INTO training_certificates
        (cert_code, course_id, trainee_id, issued_by, final_score, status, issued_at)
    VALUES
        (?, ?, ?, ?, ?, 'issued', NOW())
    ON DUPLICATE KEY UPDATE
        issued_by = VALUES(issued_by),
        final_score = VALUES(final_score),
        status = 'issued',
        issued_at = NOW()
");
$stmt->execute([
    $certCode,
    $courseId,
    $traineeId,
    $issuer['id'],
    $finalScore
]);

// 6. Fetch inserted/updated certificate record
$certStmt = $db->prepare("SELECT * FROM training_certificates WHERE course_id = ? AND trainee_id = ?");
$certStmt->execute([$courseId, $traineeId]);
$certificate = $certStmt->fetch();

// 7. Send notification to Trainee
$nStmt = $db->prepare("
    INSERT INTO notifications (user_id, type, message_en, message_ar)
    VALUES (?, 'certificate_issued', ?, ?)
");
$courseTitleEn = $course['name'] ?? 'Summer Training Course';
$courseTitleAr = $course['name'] ?? 'دورة التدريب الصيفي';
$msgEn = "Congratulations! Your completion certificate for '{$courseTitleEn}' has been issued.";
$msgAr = "تهانينا! تم إصدار شهادة إتمام التدريب الخاصة بك لدورة '{$courseTitleAr}'.";
$nStmt->execute([$traineeId, $msgEn, $msgAr]);

respond([
    'success'     => true,
    'message'     => 'Certificate issued successfully',
    'certificate' => $certificate,
    'trainee'     => [
        'name'       => $trainee['full_name'],
        'student_id' => $trainee['student_id']
    ],
    'course'      => [
        'title' => $course['name']
    ]
]);
?>
