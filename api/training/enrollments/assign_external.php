<?php
// =========================================================
// NMU TRAINING — Assign/Update Trainee External Training Type & Provider
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$caller = requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$courseId = resolveCourseId($data['course_id'] ?? 0);
$traineeId = resolveUserId($data['trainee_id'] ?? 0);
$trainingType = strtolower(trim($data['training_type'] ?? 'internal'));
$providerId = isset($data['provider_id']) && (int)$data['provider_id'] > 0 ? (int)$data['provider_id'] : null;
$trackId = isset($data['track_id']) && (int)$data['track_id'] > 0 ? (int)$data['track_id'] : null;
$customName = trim($data['custom_provider_name'] ?? '');
$customWebsite = trim($data['custom_provider_website'] ?? '');
$customLinkedin = trim($data['custom_provider_linkedin'] ?? '');

if (!$courseId || !$traineeId) {
    respondError('Course ID and Trainee ID are required', 400);
}

if (!in_array($trainingType, ['internal', 'external'], true)) {
    respondError("Invalid training type. Must be 'internal' or 'external'", 400);
}

verifyCourseAccess($courseId, $caller);

$db = db();

try {
    // 1. Verify enrollment exists
    $enrStmt = $db->prepare("SELECT id, verification_doc_url, verification_status FROM trainee_enrollments WHERE trainee_id = ? AND course_id = ?");
    $enrStmt->execute([$traineeId, $courseId]);
    $enrollment = $enrStmt->fetch();
    if (!$enrollment) {
        respondError('Trainee is not enrolled in this course', 404);
    }

    if ($trainingType === 'internal') {
        // Reset to internal
        $upd = $db->prepare("
            UPDATE trainee_enrollments
            SET training_type = 'internal',
                provider_id = NULL,
                track_id = ?,
                custom_provider_name = NULL,
                custom_provider_website = NULL,
                custom_provider_linkedin = NULL,
                verification_status = 'none'
            WHERE trainee_id = ? AND course_id = ?
        ");
        $upd->execute([$trackId, $traineeId, $courseId]);
    } else {
        // External
        if ($providerId !== null) {
            // Contracted provider validation: must exist and be linked to course
            $provCheck = $db->prepare("
                SELECT p.id, p.name 
                FROM external_training_providers p
                JOIN course_external_providers cep ON cep.provider_id = p.id
                WHERE p.id = ? AND cep.course_id = ?
            ");
            $provCheck->execute([$providerId, $courseId]);
            if (!$provCheck->fetch()) {
                // Also check if provider exists globally — if so, auto-associate with course
                $gCheck = $db->prepare("SELECT id FROM external_training_providers WHERE id = ?");
                $gCheck->execute([$providerId]);
                if (!$gCheck->fetch()) {
                    respondError('Selected external provider not found', 404);
                }
                $db->prepare("INSERT IGNORE INTO course_external_providers (course_id, provider_id) VALUES (?, ?)")->execute([$courseId, $providerId]);
            }

            // Track validation if specified: must belong to course & provider
            if ($trackId !== null) {
                $trCheck = $db->prepare("
                    SELECT id FROM training_topics 
                    WHERE id = ? AND course_id = ? AND (provider_id = ? OR provider_id IS NULL)
                ");
                $trCheck->execute([$trackId, $courseId, $providerId]);
                if (!$trCheck->fetch()) {
                    respondError('Selected track does not belong to this provider/course combination', 400);
                }
            }

            $upd = $db->prepare("
                UPDATE trainee_enrollments
                SET training_type = 'external',
                    provider_id = ?,
                    track_id = ?,
                    custom_provider_name = NULL,
                    custom_provider_website = NULL,
                    custom_provider_linkedin = NULL,
                    verification_status = 'none'
                WHERE trainee_id = ? AND course_id = ?
            ");
            $upd->execute([$providerId, $trackId, $traineeId, $courseId]);
        } else {
            // Non-contracted / Custom provider
            if (empty($customName)) {
                respondError('Custom organization / provider name is required for non-contracted external training', 400);
            }

            $verifStatus = $enrollment['verification_doc_url'] ? 'pending' : 'pending';

            $upd = $db->prepare("
                UPDATE trainee_enrollments
                SET training_type = 'external',
                    provider_id = NULL,
                    track_id = ?,
                    custom_provider_name = ?,
                    custom_provider_website = ?,
                    custom_provider_linkedin = ?,
                    verification_status = ?
                WHERE trainee_id = ? AND course_id = ?
            ");
            $upd->execute([
                $trackId,
                $customName,
                $customWebsite ?: null,
                $customLinkedin ?: null,
                $verifStatus,
                $traineeId,
                $courseId
            ]);
        }
    }

    respond([
        'success' => true,
        'message' => 'Trainee training track and provider updated successfully'
    ]);
} catch (Throwable $e) {
    respondError('Failed to update trainee assignment: ' . $e->getMessage(), 500);
}
