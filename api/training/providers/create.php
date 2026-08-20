<?php
// =========================================================
// NMU TRAINING — Create External Training Provider
// Access: Admin only
// =========================================================

require_once __DIR__ . '/../../config.php';

$adminId = requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$name = trim($data['name'] ?? '');
$websiteUrl = trim($data['website_url'] ?? '');
$linkedinUrl = trim($data['linkedin_url'] ?? '');
$isContracted = isset($data['is_contracted']) ? (int)(bool)$data['is_contracted'] : 1;
$status = in_array(strtolower($data['status'] ?? ''), ['active', 'inactive'], true) ? strtolower($data['status']) : 'active';
$courseId = isset($data['course_id']) ? (int)$data['course_id'] : 0;

if (empty($name)) {
    respondError('Provider name is required', 400);
}

if (!empty($websiteUrl) && !filter_var($websiteUrl, FILTER_VALIDATE_URL)) {
    respondError('Invalid website URL format', 400);
}

if (!empty($linkedinUrl) && !filter_var($linkedinUrl, FILTER_VALIDATE_URL)) {
    respondError('Invalid LinkedIn URL format', 400);
}

$db = db();

try {
    $stmt = $db->prepare("
        INSERT INTO external_training_providers (name, website_url, linkedin_url, is_contracted, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $name,
        $websiteUrl ?: null,
        $linkedinUrl ?: null,
        $isContracted,
        $status,
        $adminId
    ]);
    $providerId = (int)$db->lastInsertId();

    // If a course_id was provided, link it to the course immediately
    if ($courseId > 0) {
        $cStmt = $db->prepare("
            INSERT IGNORE INTO course_external_providers (course_id, provider_id)
            VALUES (?, ?)
        ");
        $cStmt->execute([$courseId, $providerId]);
    }

    respond([
        'success' => true,
        'message' => 'External training provider created successfully',
        'provider_id' => $providerId
    ], 201);
} catch (Throwable $e) {
    respondError('Failed to create provider: ' . $e->getMessage(), 500);
}
