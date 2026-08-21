<?php
// =========================================================
// NMU TRAINING â€” Search Teammates for Course Project
// Access: Trainee, Trainer, Admin
// Checks existing team status & 1 project per course rule
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid = (int) $user['id'];

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = resolveCourseId($_GET['course_id'] ?? 0);
if (!$courseId) {
    respondError('Course ID is required');
}

$q = trim($_GET['q'] ?? '');
$currentIdeaId = resolveIdeaId($_GET['current_idea_id'] ?? 0);
$limit = min(50, max(1, (int) ($_GET['limit'] ?? 30)));
$offset = max(0, (int) ($_GET['offset'] ?? 0));

$db = db();

// Verify course exists
$cStmt = $db->prepare("SELECT id, name, course_type FROM training_courses WHERE id = ?");
$cStmt->execute([$courseId]);
$course = $cStmt->fetch();
if (!$course) {
    respondError('Course not found', 404);
}
if (($course['course_type'] ?? '') === 'external') {
    respond([
        'success' => true,
        'course_id' => $courseId,
        'candidates' => []
    ]);
}

$where = "u.id != ? AND (u.role IN ('trainee', 'student') OR u.role IS NULL OR u.role = '') AND (u.is_admin = 0 OR u.is_admin IS NULL) AND LOWER(COALESCE(u.role, '')) NOT IN ('admin', 'trainer', 'professor', 'ta', 'supervisor', 'evaluator') AND (u.approval_status IS NULL OR u.approval_status != 'rejected')";
$params = [$courseId, $courseId, $courseId, $currentIdeaId, $uid];

if ($q !== '') {
    $like = '%' . $q . '%';
    $where .= " AND (u.full_name LIKE ? OR u.student_id LIKE ? OR u.email LIKE ? OR CAST(u.id AS CHAR) = ?)";
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $q;
}

// Query all eligible students, checking enrollment & existing team membership in this course
$sql = "
    SELECT 
        u.id, 
        u.full_name, 
        u.email, 
        u.student_id, 
        u.major, 
        u.academic_year,
        CASE WHEN te.id IS NOT NULL THEN 1 ELSE 0 END AS is_enrolled,
        active_team.idea_id AS existing_idea_id,
        active_team.project_title AS existing_project_title,
        active_team.member_role AS existing_role,
        tii.id AS pending_invitation_id
    FROM users u
    LEFT JOIN trainee_enrollments te 
        ON te.trainee_id = u.id AND te.course_id = ?
    LEFT JOIN (
        SELECT 
            tim.user_id, 
            tim.idea_id, 
            tim.role AS member_role,
            ti.title AS project_title
        FROM training_idea_members tim
        JOIN training_ideas ti ON tim.idea_id = ti.id
        WHERE ti.course_id = ? AND ti.status != 'rejected'
        UNION
        SELECT 
            ti_owner.owner_id AS user_id,
            ti_owner.id AS idea_id,
            'leader' AS member_role,
            ti_owner.title AS project_title
        FROM training_ideas ti_owner
        WHERE ti_owner.course_id = ? AND ti_owner.status != 'rejected'
    ) AS active_team ON active_team.user_id = u.id
    LEFT JOIN training_idea_invitations tii 
        ON tii.idea_id = ? AND tii.invitee_id = u.id AND tii.status = 'pending'
    WHERE $where
    ORDER BY 
        is_enrolled DESC,
        (active_team.idea_id IS NULL) DESC,
        u.full_name ASC
    LIMIT $limit OFFSET $offset
";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

// Deduplicate rows (if any user matched both UNION branches) and map response
$candidatesMap = [];
foreach ($rows as $row) {
    $cId = (int) $row['id'];
    $existingIdeaId = $row['existing_idea_id'] ? (int) $row['existing_idea_id'] : null;
    $isInOtherTeam = $existingIdeaId !== null && ($currentIdeaId === 0 || $existingIdeaId !== $currentIdeaId);
    $hasPendingInv = !empty($row['pending_invitation_id']);

    if (!isset($candidatesMap[$cId])) {
        $candUuid = getUserUuid($cId);
        $candidatesMap[$cId] = [
            'id' => $candUuid,
            'user_id' => $candUuid,
            'full_name' => $row['full_name'] ?: $row['email'],
            'email' => $row['email'],
            'student_id' => $row['student_id'],
            'avatar_url' => null,
            'major' => $row['major'],
            'academic_year' => $row['academic_year'],
            'is_enrolled' => (bool) $row['is_enrolled'],
            'is_in_team' => $isInOtherTeam,
            'is_in_other_team' => $isInOtherTeam,
            'existing_idea_id' => $isInOtherTeam ? ($existingIdeaId ? getIdeaUuid((int)$existingIdeaId) : null) : null,
            'existing_project_title' => $isInOtherTeam ? $row['existing_project_title'] : null,
            'existing_role' => $isInOtherTeam ? $row['existing_role'] : null,
            'has_pending_invitation' => $hasPendingInv,
            'pending_invitation_id' => $hasPendingInv ? (int) $row['pending_invitation_id'] : null
        ];
    }
}

respond([
    'success' => true,
    'course_id' => getCourseUuid($courseId),
    'candidates' => array_values($candidatesMap)
]);

