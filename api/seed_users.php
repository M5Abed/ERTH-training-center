<?php
if (php_sapi_name() !== 'cli') {
    require_once __DIR__ . '/config.php';
    requireRole('admin');
} else {
    require_once __DIR__ . '/config.php';
}

$db = db();

$adminPass = password_hash('Admin123!', PASSWORD_BCRYPT);
$trainerPass = password_hash('Trainer123!', PASSWORD_BCRYPT);
$traineePass = password_hash('Trainee123!', PASSWORD_BCRYPT);

// 1. Admin Accounts
$stmt = $db->prepare("
    INSERT INTO users (username, email, password_hash, role, is_admin, email_verified, approval_status, full_name, department) 
    VALUES ('admin', 'admin@nmu.edu.eg', ?, 'admin', 1, 1, 'approved', 'System Administrator', 'Training Administration')
    ON DUPLICATE KEY UPDATE 
        password_hash = VALUES(password_hash), 
        role = 'admin', 
        is_admin = 1, 
        email_verified = 1, 
        approval_status = 'approved',
        full_name = 'System Administrator'
");
$stmt->execute([$adminPass]);

$stmt = $db->prepare("
    INSERT INTO users (username, email, password_hash, role, is_admin, email_verified, approval_status, full_name, department) 
    VALUES ('mohamed', 'mohamed223101290@nmu.edu.eg', ?, 'admin', 1, 1, 'approved', 'Mohamed Admin', 'Training Administration')
    ON DUPLICATE KEY UPDATE 
        password_hash = VALUES(password_hash), 
        role = 'admin', 
        is_admin = 1, 
        email_verified = 1, 
        approval_status = 'approved',
        full_name = 'Mohamed Admin'
");
$stmt->execute([$adminPass]);

// 2. Trainer Account
$stmt = $db->prepare("
    INSERT INTO users (username, email, password_hash, role, is_admin, email_verified, approval_status, full_name, department) 
    VALUES ('trainer', 'trainer@nmu.edu.eg', ?, 'trainer', 0, 1, 'approved', 'Dr. Ahmed Trainer', 'Computer Science')
    ON DUPLICATE KEY UPDATE 
        password_hash = VALUES(password_hash), 
        role = 'trainer', 
        is_admin = 0, 
        email_verified = 1, 
        approval_status = 'approved',
        full_name = 'Dr. Ahmed Trainer'
");
$stmt->execute([$trainerPass]);

// 3. Trainee Account
$stmt = $db->prepare("
    INSERT INTO users (username, email, password_hash, role, is_admin, email_verified, approval_status, full_name, student_id, academic_year, major) 
    VALUES ('trainee', 'trainee@nmu.edu.eg', ?, 'trainee', 0, 1, 'approved', 'Omar Student', '20230001', 3, 'Software Engineering')
    ON DUPLICATE KEY UPDATE 
        password_hash = VALUES(password_hash), 
        role = 'trainee', 
        is_admin = 0, 
        email_verified = 1, 
        approval_status = 'approved',
        full_name = 'Omar Student'
");
$stmt->execute([$traineePass]);

// Clear rate limits
$db->query("DELETE FROM otp_rate_limits");

// Ensure trainer is assigned to active courses and NOT in trainee_enrollments
$trainerId = $db->query("SELECT id FROM users WHERE email='trainer@nmu.edu.eg'")->fetchColumn();
if ($trainerId) {
    $db->query("DELETE FROM trainee_enrollments WHERE trainee_id = {$trainerId}");
    $courses = $db->query("SELECT id FROM training_courses")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($courses as $cId) {
        $db->query("INSERT IGNORE INTO trainer_assignments (trainer_id, course_id) VALUES ({$trainerId}, {$cId})");
    }
}

echo "ACCOUNTS_SEEDED_SUCCESSFULLY\n";
