<?php
// =========================================================
// NMU TRAINING — Update External Training Provider
// Access: Admin only
// =========================================================

require_once __DIR__ . '/../../config.php';

$adminId = requireAdmin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$providerId = (int)($data['id'] ?? $data['provider_id'] ?? 0);
$name = trim($data['name'] ?? '');
$websiteUrl = trim($data['website_url'] ?? '');
$linkedinUrl = trim($data['linkedin_url'] ?? '');
$isContracted = isset($data['is_contracted']) ? (int)(bool)$data['is_contracted'] : null;
$status = isset($data['status']) && in_array(strtolower($data['status']), ['active', 'inactive'], true) ? strtolower($data['status']) : null;

if (!$providerId) {
    respondError('Provider ID is required', 400);
}

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
    $chk = $db->prepare("SELECT id FROM external_training_providers WHERE id = ?");
    $chk->execute([$providerId]);
    if (!$chk->fetch()) {
        respondError('Provider not found', 404);
    }

    $stmt = $db->prepare("
        UPDATE external_training_providers
        SET name = ?,
            website_url = ?,
            linkedin_url = ?,
            is_contracted = COALESCE(?, is_contracted),
            status = COALESCE(?, status),
            updated_at = NOW()
        WHERE id = ?
    ");
    $stmt->execute([
        $name,
        $websiteUrl ?: null,
        $linkedinUrl ?: null,
        $isContracted,
        $status,
        $providerId
    ]);

    respond([
        'success' => true,
        'message' => 'Provider updated successfully'
    ]);
} catch (Throwable $e) {
    respondError('Failed to update provider: ' . $e->getMessage(), 500);
}
