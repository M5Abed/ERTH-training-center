<?php
// =========================================================
// NMU TRAINING — Update Trainee Details
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$reviewer = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$traineeId = (int)($data['trainee_id'] ?? 0);
$fullName  = trim(sanitizeString($data['full_name'] ?? ''));
$studentId = trim(sanitizeString($data['student_id'] ?? ''));
$email     = strtolower(trim(sanitizeString($data['email'] ?? '')));
$password  = $data['password'] ?? '';

if (!$traineeId) {
    respondError('Trainee ID is required');
}

$db = db();

// Verify user exists and is a trainee/student
$stmt = $db->prepare("SELECT id, role, email FROM users WHERE id = ?");
$stmt->execute([$traineeId]);
$trainee = $stmt->fetch();

if (!$trainee) {
    respondError('Trainee not found', 404);
}

$updates = [];
$params  = [];

if ($fullName !== '') {
    $updates[] = "full_name = ?";
    $params[]  = $fullName;
}

if ($studentId !== '') {
    $updates[] = "student_id = ?";
    $params[]  = $studentId;
}

if ($email !== '') {
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        respondError('Invalid email format');
    }
    // Check for email collision
    $chk = $db->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
    $chk->execute([$email, $traineeId]);
    if ($chk->fetch()) {
        respondError('Email is already in use by another account');
    }
    $updates[] = "email = ?";
    $params[]  = $email;
}

if (!empty($password)) {
    if (strlen($password) < 6) {
        respondError('Password must be at least 6 characters');
    }
    $updates[] = "password_hash = ?";
    $params[]  = password_hash($password, PASSWORD_DEFAULT);
}

$finalTrack         = trim(sanitizeString($data['final_track'] ?? ''));
$trainingStartDate  = trim(sanitizeString($data['training_start_date'] ?? ''));

if ($finalTrack !== '') {
    $updates[] = "final_track = ?";
    $params[]  = $finalTrack;
}

if (empty($updates) && $trainingStartDate === '') {
    respondError('No changes provided');
}

if (!empty($updates)) {
    $params[] = $traineeId;
    $updSql = "UPDATE users SET " . implode(', ', $updates) . " WHERE id = ?";
    $updStmt = $db->prepare($updSql);
    $updStmt->execute($params);
}

if ($trainingStartDate !== '' || $finalTrack !== '') {
    $eUpdates = [];
    $eParams = [];
    if ($trainingStartDate !== '') {
        $eUpdates[] = "training_start_date = ?";
        $eParams[] = $trainingStartDate;
    }
    if ($finalTrack !== '') {
        $eUpdates[] = "final_track = ?";
        $eParams[] = $finalTrack;
    }
    $eParams[] = $traineeId;
    $db->prepare("UPDATE trainee_enrollments SET " . implode(', ', $eUpdates) . " WHERE trainee_id = ?")->execute($eParams);
}

// Fetch updated trainee
$fetchStmt = $db->prepare("SELECT id, full_name, email, student_id, final_track, role FROM users WHERE id = ?");
$fetchStmt->execute([$traineeId]);
$updatedUser = $fetchStmt->fetch();

respond([
    'success' => true,
    'message' => 'Trainee details updated successfully',
    'trainee' => [
        'trainee_id' => (int)$updatedUser['id'],
        'full_name'  => $updatedUser['full_name'],
        'email'      => $updatedUser['email'],
        'student_id' => $updatedUser['student_id']
    ]
]);
