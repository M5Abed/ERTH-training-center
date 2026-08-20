<?php
// =========================================================
// NMU TRAINING — Single Trainee Enrollment
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$caller = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId  = (int)($data['course_id'] ?? 0);
$email     = trim(strtolower($data['email'] ?? ''));
$traineeId = (int)($data['trainee_id'] ?? 0);

if (!$courseId || (!$email && !$traineeId)) {
    respondError('Course ID and Trainee Email or ID are required');
}

// Enforce course assignment verification
verifyCourseAccess($courseId, $caller);

$db = db();

if ($traineeId > 0) {
    $stmt = $db->prepare("SELECT id FROM users WHERE id = ?");
    $stmt->execute([$traineeId]);
    $user = $stmt->fetch();
} else {
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
}

if (!$user) {
    respondError("No user found. Please ensure they are registered.", 404);
}

$traineeId = (int)$user['id'];

$cStmt = $db->prepare("SELECT course_type, name, category FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();
$isCourseExternal = ($course && (
    ($course['course_type'] ?? '') === 'external' || 
    stripos($course['name'], 'external') !== false || 
    stripos($course['name'], 'خارجي') !== false || 
    stripos($course['category'] ?? '', 'external') !== false || 
    stripos($course['category'] ?? '', 'خارجي') !== false
));

$trainingType = strtolower(trim($data['training_type'] ?? ($isCourseExternal ? 'external' : 'internal')));
if (!in_array($trainingType, ['internal', 'external'], true) || $isCourseExternal) {
    $trainingType = $isCourseExternal ? 'external' : 'internal';
}

$providerId = isset($data['provider_id']) && (int)$data['provider_id'] > 0 ? (int)$data['provider_id'] : null;
$trackId = isset($data['track_id']) && (int)$data['track_id'] > 0 ? (int)$data['track_id'] : null;
$customName = trim($data['custom_provider_name'] ?? '');
$customWebsite = trim($data['custom_provider_website'] ?? '');
$customLinkedin = trim($data['custom_provider_linkedin'] ?? '');

$verifStatus = ($trainingType === 'external' && empty($providerId) && !empty($customName)) ? 'pending' : 'none';

// Insert enrollment
$eStmt = $db->prepare("
    INSERT INTO trainee_enrollments (
        trainee_id, course_id, source, training_type, provider_id, track_id,
        custom_provider_name, custom_provider_website, custom_provider_linkedin, verification_status
    )
    VALUES (?, ?, 'manual', ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
        training_type = VALUES(training_type),
        provider_id = VALUES(provider_id),
        track_id = VALUES(track_id),
        custom_provider_name = VALUES(custom_provider_name),
        custom_provider_website = VALUES(custom_provider_website),
        custom_provider_linkedin = VALUES(custom_provider_linkedin),
        verification_status = VALUES(verification_status)
");
$eStmt->execute([
    $traineeId,
    $courseId,
    $trainingType,
    $providerId,
    $trackId,
    $customName ?: null,
    $customWebsite ?: null,
    $customLinkedin ?: null,
    $verifStatus
]);

respond([
    'success' => true,
    'message' => 'Trainee enrolled successfully',
    'trainee_id' => $traineeId,
    'training_type' => $trainingType
]);
