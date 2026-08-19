<?php
require_once __DIR__ . '/../api/config.php';

$passwordPlain = 'Trainee@2026';
$passwordHash = password_hash($passwordPlain, PASSWORD_BCRYPT);

$trainees = [
    [
        'full_name' => 'Ahmed Al-Mansoor',
        'full_name_en' => 'Ahmed Al-Mansoor',
        'email' => 'trainee1@erth.edu',
        'username' => 'trainee1',
        'student_id' => 'TR-2026-001',
        'major' => 'Computer Science',
        'college_key' => 'nmu_engineering',
        'academic_year' => 4
    ],
    [
        'full_name' => 'Sara Al-Otaibi',
        'full_name_en' => 'Sara Al-Otaibi',
        'email' => 'trainee2@erth.edu',
        'username' => 'trainee2',
        'student_id' => 'TR-2026-002',
        'major' => 'Software Engineering',
        'college_key' => 'nmu_engineering',
        'academic_year' => 4
    ],
    [
        'full_name' => 'Omar Al-Zahrani',
        'full_name_en' => 'Omar Al-Zahrani',
        'email' => 'trainee3@erth.edu',
        'username' => 'trainee3',
        'student_id' => 'TR-2026-003',
        'major' => 'Artificial Intelligence',
        'college_key' => 'nmu_engineering',
        'academic_year' => 3
    ],
    [
        'full_name' => 'Noura Al-Dosari',
        'full_name_en' => 'Noura Al-Dosari',
        'email' => 'trainee4@erth.edu',
        'username' => 'trainee4',
        'student_id' => 'TR-2026-004',
        'major' => 'Cybersecurity',
        'college_key' => 'nmu_engineering',
        'academic_year' => 4
    ],
    [
        'full_name' => 'Khalid Al-Ghamdi',
        'full_name_en' => 'Khalid Al-Ghamdi',
        'email' => 'trainee5@erth.edu',
        'username' => 'trainee5',
        'student_id' => 'TR-2026-005',
        'major' => 'Information Technology',
        'college_key' => 'nmu_engineering',
        'academic_year' => 3
    ],
    [
        'full_name' => 'Layla Al-Harbi',
        'full_name_en' => 'Layla Al-Harbi',
        'email' => 'trainee6@erth.edu',
        'username' => 'trainee6',
        'student_id' => 'TR-2026-006',
        'major' => 'Data Science',
        'college_key' => 'nmu_engineering',
        'academic_year' => 4
    ],
    [
        'full_name' => 'Fahad Al-Shehri',
        'full_name_en' => 'Fahad Al-Shehri',
        'email' => 'trainee7@erth.edu',
        'username' => 'trainee7',
        'student_id' => 'TR-2026-007',
        'major' => 'Robotics & Control',
        'college_key' => 'nmu_engineering',
        'academic_year' => 4
    ],
    [
        'full_name' => 'Maryam Al-Mutairi',
        'full_name_en' => 'Maryam Al-Mutairi',
        'email' => 'trainee8@erth.edu',
        'username' => 'trainee8',
        'student_id' => 'TR-2026-008',
        'major' => 'Computer Engineering',
        'college_key' => 'nmu_engineering',
        'academic_year' => 3
    ],
    [
        'full_name' => 'Youssef Al-Qarni',
        'full_name_en' => 'Youssef Al-Qarni',
        'email' => 'trainee9@erth.edu',
        'username' => 'trainee9',
        'student_id' => 'TR-2026-009',
        'major' => 'Network Engineering',
        'college_key' => 'nmu_engineering',
        'academic_year' => 4
    ],
    [
        'full_name' => 'Reem Al-Qahtani',
        'full_name_en' => 'Reem Al-Qahtani',
        'email' => 'trainee10@erth.edu',
        'username' => 'trainee10',
        'student_id' => 'TR-2026-010',
        'major' => 'Artificial Intelligence',
        'college_key' => 'nmu_engineering',
        'academic_year' => 4
    ]
];

$pdo = db();

echo "Creating/Updating 10 Trainee Accounts...\n";

foreach ($trainees as $t) {
    // Check if user exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?");
    $stmt->execute([strtolower($t['email']), strtolower($t['username'])]);
    $existing = $stmt->fetch();

    if ($existing) {
        $userId = $existing['id'];
        $update = $pdo->prepare("UPDATE users SET 
            password_hash = ?, 
            full_name = ?, 
            full_name_en = ?, 
            role = 'trainee', 
            student_id = ?, 
            major = ?, 
            college_key = ?, 
            academic_year = ?, 
            email_verified = 1, 
            approval_status = 'approved' 
            WHERE id = ?");
        $update->execute([
            $passwordHash,
            $t['full_name'],
            $t['full_name_en'],
            $t['student_id'],
            $t['major'],
            $t['college_key'],
            $t['academic_year'],
            $userId
        ]);
        echo "Updated user ID: $userId ({$t['email']})\n";
    } else {
        $insert = $pdo->prepare("INSERT INTO users (
            username, email, password_hash, full_name, full_name_en, role, student_id, major, college_key, academic_year, email_verified, approval_status
        ) VALUES (?, ?, ?, ?, ?, 'trainee', ?, ?, ?, ?, 1, 'approved')");
        $insert->execute([
            $t['username'],
            $t['email'],
            $passwordHash,
            $t['full_name'],
            $t['full_name_en'],
            $t['student_id'],
            $t['major'],
            $t['college_key'],
            $t['academic_year']
        ]);
        $userId = $pdo->lastInsertId();
        echo "Created user ID: $userId ({$t['email']})\n";
    }

    // Enroll in Course 1 if not enrolled
    $eStmt = $pdo->prepare("
        INSERT INTO trainee_enrollments (trainee_id, course_id, source)
        VALUES (?, 1, 'manual')
        ON DUPLICATE KEY UPDATE course_id = VALUES(course_id)
    ");
    $eStmt->execute([$userId]);
    echo " -> Enrolled in Course 1\n";
}

echo "\n--- ALL 10 TRAINEE ACCOUNTS CREATED & ENROLLED IN COURSE 1 SUCCESSFULLY! ---\n";
