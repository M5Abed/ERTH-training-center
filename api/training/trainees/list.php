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
$courseId = isset($_GET['course_id']) && $_GET['course_id'] !== '' ? (int)$_GET['course_id'] : null;
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
    $where   .= " AND (u.full_name LIKE ? OR u.email LIKE ? OR u.student_id LIKE ?)";
    $like     = "%$search%";
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
        LEFT JOIN trainee_enrollments te ON u.id = te.trainee_id
        $where AND u.role = 'trainee'
    ");
    $countStmt->execute($params);
    $total = (int)$countStmt->fetchColumn();

    // Paginated distinct trainees results — full query with all JOINs
    $stmt = $db->prepare("
        SELECT
            u.id                AS trainee_id,
            u.full_name,
            u.email,
            u.student_id,
            u.final_track,
            MIN(te.enrolled_at) AS enrolled_at,
            MIN(te.training_start_date) AS training_start_date,
            MAX(te.training_type) AS training_type,
            MAX(COALESCE(p.name, te.custom_provider_name)) AS provider_name,
            MAX(COALESCE(p.website_url, te.custom_provider_website)) AS provider_website,
            MAX(COALESCE(p.linkedin_url, te.custom_provider_linkedin)) AS provider_linkedin,
            GROUP_CONCAT(DISTINCT CONCAT(tc.id, ':::', tc.name) SEPARATOR '|||') AS courses_raw,
            (SELECT COUNT(*) FROM training_ideas ti WHERE ti.owner_id = u.id) AS idea_count,
            (SELECT COUNT(*) FROM trainee_topic_progress ttp WHERE ttp.trainee_id = u.id) AS topics_viewed
        FROM users u
        LEFT JOIN trainee_enrollments te ON te.trainee_id = u.id
        LEFT JOIN external_training_providers p ON p.id = te.provider_id
        LEFT JOIN training_courses tc ON tc.id = te.course_id
        $where AND u.role = 'trainee'
        GROUP BY u.id
        ORDER BY u.full_name ASC
        LIMIT $perPage OFFSET $offset
    ");
    $stmt->execute($params);
    $rawTrainees = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach ($rawTrainees as $row) {
        $coursesList = [];
        if (!empty($row['courses_raw'])) {
            $pairs = explode('|||', $row['courses_raw']);
            foreach ($pairs as $p) {
                $parts = explode(':::', $p, 2);
                if (count($parts) === 2) {
                    $coursesList[] = [
                        'id'   => (int)$parts[0],
                        'name' => $parts[1]
                    ];
                }
            }
        }

        $firstCourseName = !empty($coursesList) ? $coursesList[0]['name'] : '';

        $trainees[] = [
            'enrollment_id'       => (int)$row['trainee_id'],
            'trainee_id'          => (int)$row['trainee_id'],
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
    // Fallback: simpler query using only users table + enrollments
    error_log('Trainees list full query failed: ' . $e->getMessage());

    try {
        $countStmt = $db->prepare("
            SELECT COUNT(DISTINCT u.id) 
            FROM users u
            $where AND u.role = 'trainee'
        ");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $db->prepare("
            SELECT
                u.id AS trainee_id,
                u.full_name,
                u.email,
                u.student_id,
                u.final_track
            FROM users u
            $where AND u.role = 'trainee'
            ORDER BY u.full_name ASC
            LIMIT $perPage OFFSET $offset
        ");
        $stmt->execute($params);
        $rawTrainees = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $trainees = [];
        foreach ($rawTrainees as $row) {
            $trainees[] = [
                'enrollment_id'       => (int)$row['trainee_id'],
                'trainee_id'          => (int)$row['trainee_id'],
                'full_name'           => $row['full_name'],
                'email'               => $row['email'],
                'student_id'          => $row['student_id'] ?? null,
                'final_track'         => $row['final_track'] ?? null,
                'training_start_date' => null,
                'training_type'       => null,
                'provider_name'       => null,
                'provider_website'    => null,
                'provider_linkedin'   => null,
                'enrolled_at'         => null,
                'courses'             => [],
                'course_name'         => '',
                'idea_count'          => 0,
                'topics_viewed'       => 0
            ];
        }
    } catch (Throwable $e2) {
        error_log('Trainees list fallback query also failed: ' . $e2->getMessage());
        respondError('Server error loading trainees: ' . $e2->getMessage(), 500);
    }
}

respond([
    'trainees' => $trainees,
    'total'    => $total,
    'page'     => $page,
    'per_page' => $perPage,
]);

