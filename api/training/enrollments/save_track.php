<?php
// =========================================================
// NMU TRAINING — Save Trainee External Technical Track & Details
// Access: Trainee (Self) or Trainer / Admin
// POST /api/training/enrollments/save_track.php
// Body: { course_id?: int, track_name: string, provider_id?: int, custom_provider?: string, custom_provider_website?: string, custom_provider_linkedin?: string, training_start_date?: string }
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid  = (int)$user['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$trackName         = trim($data['track_name'] ?? '');
$providerId        = !empty($data['provider_id']) ? (int)$data['provider_id'] : null;
$customProvider    = trim($data['custom_provider'] ?? $data['custom_provider_name'] ?? '');
$customWebsite     = trim($data['custom_provider_website'] ?? $data['website_url'] ?? '');
$customLinkedin    = trim($data['custom_provider_linkedin'] ?? $data['linkedin_url'] ?? '');
$trainingStartDate = trim($data['training_start_date'] ?? $data['start_date'] ?? '');
$courseId          = resolveCourseId($data['course_id'] ?? 0);
$targetTraineeId   = isset($data['trainee_id']) && (!empty($user['is_admin']) || ($user['role'] ?? '') === 'trainer')
                    ? resolveUserId($data['trainee_id'])
                    : $uid;

if (empty($trackName)) {
    respondError('Please select or specify a technical track', 400);
}

$db = db();

try {
    // 1. If course_id is not provided, locate the student's active external course enrollment
    if ($courseId <= 0) {
        $findCourse = $db->prepare("
            SELECT te.course_id 
            FROM trainee_enrollments te
            JOIN training_courses c ON c.id = te.course_id
            WHERE te.trainee_id = ? AND (te.training_type = 'external' OR c.course_type = 'external' OR c.course_type = 'both')
            ORDER BY te.id DESC
            LIMIT 1
        ");
        $findCourse->execute([$targetTraineeId]);
        $courseId = (int)$findCourse->fetchColumn();
    }

    if ($courseId <= 0) {
        // Fallback to any enrollment
        $findCourse = $db->prepare("SELECT course_id FROM trainee_enrollments WHERE trainee_id = ? ORDER BY id DESC LIMIT 1");
        $findCourse->execute([$targetTraineeId]);
        $courseId = (int)$findCourse->fetchColumn();
    }

    // 2. If provider_id is selected from contracted providers, auto-populate details if empty
    if ($providerId && $providerId > 0) {
        $pStmt = $db->prepare("SELECT name, website_url, linkedin_url FROM external_training_providers WHERE id = ?");
        $pStmt->execute([$providerId]);
        $provRow = $pStmt->fetch();
        if ($provRow) {
            if (empty($customProvider)) {
                $customProvider = $provRow['name'];
            }
            if (empty($customWebsite) && !empty($provRow['website_url'])) {
                $customWebsite = $provRow['website_url'];
            }
            if (empty($customLinkedin) && !empty($provRow['linkedin_url'])) {
                $customLinkedin = $provRow['linkedin_url'];
            }
        }
    }

    // 3. Find or create a matching topic in training_topics for this course
    $topicId = null;
    if ($courseId > 0) {
        $tStmt = $db->prepare("SELECT id FROM training_topics WHERE course_id = ? AND LOWER(title) = LOWER(?) LIMIT 1");
        $tStmt->execute([$courseId, $trackName]);
        $topicId = $tStmt->fetchColumn();

        if (!$topicId) {
            $ordStmt = $db->prepare("SELECT COALESCE(MAX(order_index), 0) + 1 FROM training_topics WHERE course_id = ?");
            $ordStmt->execute([$courseId]);
            $nextOrder = (int)$ordStmt->fetchColumn();

            $insTopic = $db->prepare("INSERT INTO training_topics (course_id, provider_id, title, order_index, created_at) VALUES (?, ?, ?, ?, NOW())");
            $insTopic->execute([$courseId, $providerId, $trackName, $nextOrder]);
            $topicId = (int)$db->lastInsertId();
        }
    }

    // 4. Update user profile
    $updUser = $db->prepare("UPDATE users SET final_track = ? WHERE id = ?");
    $updUser->execute([$trackName, $targetTraineeId]);

    // 5. Update trainee_enrollments
    if ($courseId > 0) {
        $enrUpdates = [
            "final_track = ?",
            "training_type = 'external'",
            "technical_track_confirmed = 1"
        ];
        $params = [$trackName];

        if ($topicId) {
            $enrUpdates[] = "track_id = ?";
            $params[] = (int)$topicId;
        }

        if ($providerId !== null) {
            $enrUpdates[] = "provider_id = ?";
            $params[] = $providerId;
        }

        if (!empty($customProvider)) {
            $enrUpdates[] = "custom_provider_name = ?";
            $params[] = $customProvider;
        }

        if (!empty($customWebsite)) {
            $enrUpdates[] = "custom_provider_website = ?";
            $params[] = $customWebsite;
        }

        if (!empty($customLinkedin)) {
            $enrUpdates[] = "custom_provider_linkedin = ?";
            $params[] = $customLinkedin;
        }

        if (!empty($trainingStartDate)) {
            $enrUpdates[] = "training_start_date = ?";
            $params[] = $trainingStartDate;
        }

        $params[] = $targetTraineeId;
        $params[] = $courseId;

        $db->prepare("
            UPDATE trainee_enrollments 
            SET " . implode(', ', $enrUpdates) . " 
            WHERE trainee_id = ? AND course_id = ?
        ")->execute($params);
    }

    respond([
        'success'             => true,
        'message'             => 'Technical track and training details saved successfully',
        'final_track'         => $trackName,
        'course_id'           => $courseId,
        'track_id'            => $topicId,
        'provider_id'         => $providerId,
        'custom_provider'     => $customProvider,
        'training_start_date' => $trainingStartDate
    ]);
} catch (Throwable $e) {
    error_log("Save technical track error: " . $e->getMessage());
    respondError('Failed to save technical track: ' . $e->getMessage(), 500);
}
