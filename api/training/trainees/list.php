<?php
// =========================================================
// NMU TRAINING — List All Trainees (Admin/Trainer view)
// Access: Admin or Trainer
// =========================================================

require_once __DIR__ . '/../../config.php';

requireTrainer();

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$db       = db();
$courseId = isset($_GET['course_id']) && $_GET['course_id'] !== '' ? resolveCourseId($_GET['course_id']) : null;
$search   = sanitizeString($_GET['search'] ?? '');
$page     = max(1, (int)($_GET['page'] ?? 1));
$perPage  = min(200, max(10, (int)($_GET['per_page'] ?? 50)));
$offset   = ($page - 1) * $perPage;

// Ensure required columns exist on trainee_enrollments
try { $db->exec("ALTER TABLE trainee_enrollments ADD COLUMN training_start_date DATE NULL"); } catch (Throwable $e) {}
try { $db->exec("ALTER TABLE trainee_enrollments ADD COLUMN custom_provider_name VARCHAR(255) NULL"); } catch (Throwable $e) {}
try { $db->exec("ALTER TABLE trainee_enrollments ADD COLUMN custom_provider_website VARCHAR(255) NULL"); } catch (Throwable $e) {}
try { $db->exec("ALTER TABLE trainee_enrollments ADD COLUMN custom_provider_linkedin VARCHAR(255) NULL"); } catch (Throwable $e) {}
try { $db->exec("ALTER TABLE trainee_enrollments ADD COLUMN training_type ENUM('internal','external') NOT NULL DEFAULT 'internal'"); } catch (Throwable $e) {}
try { $db->exec("ALTER TABLE trainee_enrollments ADD COLUMN provider_id INT NULL"); } catch (Throwable $e) {}

$where  = "WHERE 1=1";
$params = [];

if ($courseId) {
    $where   .= " AND u.id IN (SELECT trainee_id FROM trainee_enrollments WHERE course_id = ?)";
    $params[] = $courseId;
}
if ($search) {
    $where   .= " AND (u.full_name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ? OR u.academic_id LIKE ?)";
    $like     = "%$search%";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$trainees = [];
$total    = 0;

try {
    // Total distinct trainees count
    $countStmt = $db->prepare("
        SELECT COUNT(DISTINCT u.id)
        FROM users u
        $where AND (TRIM(LOWER(COALESCE(u.role, ''))) IN ('trainee', 'student') OR u.id IN (SELECT trainee_id FROM trainee_enrollments))
          AND (u.approval_status != 'rejected' OR u.approval_status IS NULL)
    ");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // Fetch page of trainees with enriched details
    $sql = "
        SELECT
            u.id AS trainee_id,
            u.full_name,
            u.email,
            COALESCE(u.student_id, u.academic_id) AS student_id,
            COALESCE(te.final_track, u.final_track) AS final_track,
            te.training_start_date,
            COALESCE(te.training_type, 'internal') AS training_type,
            COALESCE(p.name, te.custom_provider_name) AS provider_name,
            COALESCE(p.website_url, te.custom_provider_website) AS provider_website,
            COALESCE(p.linkedin_url, te.custom_provider_linkedin) AS provider_linkedin,
            te.enrolled_at,
            (
                SELECT GROUP_CONCAT(CONCAT(tc.id, ':::', tc.name) SEPARATOR '|||')
                FROM trainee_enrollments te2
                JOIN training_courses tc ON te2.course_id = tc.id
                WHERE te2.trainee_id = u.id
            ) AS courses_raw,
            (SELECT COUNT(*) FROM training_ideas WHERE owner_id = u.id) AS idea_count,
            (SELECT COUNT(*) FROM trainee_topic_progress WHERE trainee_id = u.id) AS topics_viewed
        FROM users u
        LEFT JOIN trainee_enrollments te ON te.trainee_id = u.id
        LEFT JOIN external_training_providers p ON te.provider_id = p.id
        $where AND (TRIM(LOWER(COALESCE(u.role, ''))) IN ('trainee', 'student') OR u.id IN (SELECT trainee_id FROM trainee_enrollments))
          AND (u.approval_status != 'rejected' OR u.approval_status IS NULL)
        GROUP BY u.id
        ORDER BY u.full_name ASC
        LIMIT ? OFFSET ?
    ";

    $fetchParams = array_merge($params, [$perPage, $offset]);
    $stmt = $db->prepare($sql);
    $stmt->execute($fetchParams);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rows as $row) {
        $coursesList = [];
        if (!empty($row['courses_raw'])) {
            $pairs = explode('|||', $row['courses_raw']);
            foreach ($pairs as $p) {
                $parts = explode(':::', $p, 2);
                if (count($parts) === 2) {
                    $coursesList[] = [
                        'id'   => getCourseUuid((int)$parts[0]),
                        'name' => $parts[1]
                    ];
                }
            }
        }

        $firstCourseName = !empty($coursesList) ? $coursesList[0]['name'] : '';
        $tUuid = getUserUuid((int)$row['trainee_id']);

        $trainees[] = [
            'enrollment_id'       => $tUuid,
            'trainee_id'          => $tUuid,
            'id'                  => $tUuid,
            'full_name'           => $row['full_name'],
            'email'               => $row['email'],
            'student_id'          => $row['student_id'],
            'final_track'         => $row['final_track'],
            'training_start_date' => $row['training_start_date'] ?? null,
            'training_type'       => $row['training_type'] ?? null,
            'provider_name'       => $row['provider_name'] ?? null,
            'provider_website'    => $row['provider_website'] ?? null,
            'provider_linkedin'   => $row['provider_linkedin'] ?? null,
            'enrolled_at'         => $row['enrolled_at'],
            'courses'             => $coursesList,
            'course_name'         => $firstCourseName,
            'idea_count'          => (int)($row['idea_count'] ?? 0),
            'topics_viewed'       => (int)($row['topics_viewed'] ?? 0)
        ];
    }

} catch (Throwable $e) {
    error_log('Trainees list query failed: ' . $e->getMessage());

    try {
        $countStmt = $db->prepare("
            SELECT COUNT(DISTINCT u.id) 
            FROM users u
            $where AND TRIM(LOWER(COALESCE(u.role, ''))) IN ('trainee', 'student')
        ");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $db->prepare("
            SELECT
                u.id AS trainee_id,
                u.full_name,
                u.email,
                COALESCE(u.student_id, u.academic_id) AS student_id,
                u.created_at AS enrolled_at
            FROM users u
            $where AND TRIM(LOWER(COALESCE(u.role, ''))) IN ('trainee', 'student')
            ORDER BY u.full_name ASC
            LIMIT ? OFFSET ?
        ");
        $stmt->execute(array_merge($params, [$perPage, $offset]));
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as $row) {
            $tUuid = getUserUuid((int)$row['trainee_id']);
            $trainees[] = [
                'enrollment_id'       => $tUuid,
                'trainee_id'          => $tUuid,
                'id'                  => $tUuid,
                'full_name'           => $row['full_name'],
                'email'               => $row['email'],
                'student_id'          => $row['student_id'],
                'enrolled_at'         => $row['enrolled_at'],
                'courses'             => [],
                'course_name'         => '',
                'idea_count'          => 0,
                'topics_viewed'       => 0
            ];
        }
    } catch (Throwable $e2) {
        $trainees = [];
        $total = 0;
    }
}

respond([
    'trainees'    => $trainees,
    'total'       => $total,
    'page'        => $page,
    'per_page'    => $perPage,
    'total_pages' => max(1, (int)ceil($total / $perPage))
]);
