<?php
// =========================================================
// NMU TRAINING â€” Academic Leaderboard & End-of-Course Voting Results
// GET /api/training/leaderboard/list.php?course_id=X
// Access: Trainee, Trainer, or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

$user = requireRole(['trainee', 'trainer', 'admin']);
$uid  = (int)$user['id'];
$userRole = strtolower($user['role'] ?? 'trainee');
$isAdmin = !empty($user['is_admin']) || $userRole === 'admin';
$isTrainer = $userRole === 'trainer' || $isAdmin;

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    respondError('Method not allowed', 405);
}

$courseId = isset($_GET['course_id']) && $_GET['course_id'] !== '' ? resolveCourseId($_GET['course_id']) : null;
$limit    = min((int)($_GET['limit'] ?? 200), 500);

$db = db();

$courseInfo = null;
if ($courseId) {
    $cStmt = $db->prepare("SELECT id, name, voting_status FROM training_courses WHERE id = ?");
    $cStmt->execute([$courseId]);
    $courseInfo = $cStmt->fetch();
}

$whereConditions = ["COALESCE(ti.is_golden_pass, 0) = 1"];
$params = [];
if ($courseId) {
    $whereConditions[] = "ti.course_id = ?";
    $params[] = $courseId;
}
$where = "WHERE " . implode(" AND ", $whereConditions);

// 1. Projects Leaderboard Query (Golden Pass Only)
$sql = "
    SELECT 
        ti.id,
        COALESCE(ti.title, 'Untitled Project') AS title,
        COALESCE(ti.description, '') AS description,
        ti.tech_stack,
        ti.status,
        COALESCE(ti.is_golden_pass, 0) AS is_golden_pass,
        ti.course_id,
        tc.name AS course_name,
        tc.voting_status,
        ti.owner_id AS trainee_id,
        u.full_name AS trainee_name,
        u.student_id,
        u.email AS trainee_email,
        te.final_score AS evaluation_score,
        te.status AS evaluation_status,
        te.evaluated_at,
        COUNT(DISTINCT cpv.id) AS vote_count,
        ti.created_at
    FROM training_ideas ti
    JOIN training_courses tc ON tc.id = ti.course_id
    JOIN users u ON u.id = ti.owner_id
    LEFT JOIN training_evaluations te ON (te.trainee_id = ti.owner_id AND te.course_id = ti.course_id)
    LEFT JOIN course_project_votes cpv ON (cpv.project_id = ti.id AND cpv.course_id = ti.course_id)
    $where
    GROUP BY ti.id
    ORDER BY 
        CASE WHEN te.final_score IS NOT NULL THEN 0 ELSE 1 END,
        te.final_score DESC,
        vote_count DESC,
        ti.id ASC
    LIMIT $limit
";

$stmt = $db->prepare($sql);
$stmt->execute($params);
$projects = $stmt->fetchAll();

// Attach team members to projects
if (!empty($projects)) {
    $projectIds = array_column($projects, 'id');
    $inClause = implode(',', array_fill(0, count($projectIds), '?'));
    
    try {
        $mStmt = $db->prepare("
            SELECT tim.idea_id, tim.user_id, tim.role, 
                   u.full_name, u.student_id, u.email
            FROM training_idea_members tim
            JOIN users u ON tim.user_id = u.id
            WHERE tim.idea_id IN ($inClause)
            ORDER BY CASE WHEN tim.role = 'leader' THEN 0 ELSE 1 END, u.full_name ASC
        ");
        $mStmt->execute($projectIds);
        $members = $mStmt->fetchAll();
        
        $membersByIdea = [];
        foreach ($members as $m) {
            $membersByIdea[$m['idea_id']][] = [
                'user_id'    => (int)$m['user_id'],
                'role'       => $m['role'],
                'full_name'  => $m['full_name'],
                'student_id' => $m['student_id'],
                'email'      => $m['email']
            ];
        }
        
        foreach ($projects as &$p) {
            $p['team_members'] = $membersByIdea[$p['id']] ?? [];
        }
        unset($p);
    } catch (Exception $e) {}
}

// Calculate Top 5 Projects by Evaluation & Votes
$projectsByCourse = [];
foreach ($projects as $p) {
    $projectsByCourse[$p['course_id']][] = $p;
}

$top5Map = [];
$top5VotedList = [];

foreach ($projectsByCourse as $cId => $cProjects) {
    // Determine Top 5: by academic score DESC, then vote_count DESC
    usort($cProjects, function($a, $b) {
        $aScore = $a['evaluation_score'] !== null ? (float)$a['evaluation_score'] : -1;
        $bScore = $b['evaluation_score'] !== null ? (float)$b['evaluation_score'] : -1;
        if ($bScore !== $aScore) return $bScore <=> $aScore;
        $vDiff = (int)$b['vote_count'] - (int)$a['vote_count'];
        if ($vDiff !== 0) return $vDiff;
        return (int)$a['id'] - (int)$b['id'];
    });
    
    $vRank = 1;
    foreach ($cProjects as $cp) {
        if ($vRank <= 5) {
            $top5Map[$cp['id']] = $vRank;
            if ($courseId === null || $courseId === (int)$cId) {
                $top5VotedList[] = [
                    'id'               => $cp['id'],
                    'title'            => $cp['title'],
                    'trainee_name'     => $cp['trainee_name'],
                    'student_id'       => $cp['student_id'],
                    'team_members'     => $cp['team_members'] ?? [],
                    'course_id'        => $cp['course_id'],
                    'course_name'      => $cp['course_name'],
                    'vote_count'       => (int)$cp['vote_count'],
                    'vote_rank'        => $vRank,
                    'evaluation_score' => $cp['evaluation_score'] !== null ? round((float)$cp['evaluation_score'], 2) : null
                ];
            }
        }
        $vRank++;
    }
}

// Format final projects output and attach is_top_5 flag
$academicRank = 1;
foreach ($projects as &$p) {
    $p['academic_rank']    = $academicRank++;
    $p['evaluation_score'] = $p['evaluation_score'] !== null ? round((float)$p['evaluation_score'], 2) : null;
    $p['vote_count']       = (int)$p['vote_count'];
    $p['is_top_5']         = isset($top5Map[$p['id']]) || $p['academic_rank'] <= 5;
    $p['top5_rank']        = $top5Map[$p['id']] ?? ($p['academic_rank'] <= 5 ? $p['academic_rank'] : null);
}
unset($p);

// 2. Students / People Leaderboard Query
$studentWhere = $courseId ? "WHERE te_enr.course_id = ?" : "";
$studentParams = $courseId ? [$courseId] : [];

$studentSql = "
    SELECT 
        u.id AS trainee_id,
        u.full_name,
        u.student_id,
        u.email,
        u.major,
        te_enr.course_id,
        tc.name AS course_name,
        te.final_score AS evaluation_score,
        te.status AS evaluation_status,
        te.feedback,
        te.evaluated_at,
        ANY_VALUE(COALESCE(ti_owned.id, ti_member.id)) AS project_id,
        ANY_VALUE(COALESCE(ti_owned.title, ti_member.title, 'No Project')) AS project_title
    FROM users u
    JOIN trainee_enrollments te_enr ON te_enr.trainee_id = u.id
    JOIN training_courses tc ON tc.id = te_enr.course_id
    LEFT JOIN training_evaluations te ON (te.trainee_id = u.id AND te.course_id = te_enr.course_id)
    LEFT JOIN training_ideas ti_owned ON (ti_owned.owner_id = u.id AND ti_owned.course_id = te_enr.course_id)
    LEFT JOIN training_idea_members tim ON (tim.user_id = u.id)
    LEFT JOIN training_ideas ti_member ON (ti_member.id = tim.idea_id AND ti_member.course_id = te_enr.course_id)
    $studentWhere
    GROUP BY u.id, te_enr.course_id, te.id
    ORDER BY 
        CASE WHEN te.final_score IS NOT NULL THEN 0 ELSE 1 END,
        te.final_score DESC,
        u.full_name ASC
    LIMIT $limit
";

$sStmt = $db->prepare($studentSql);
$sStmt->execute($studentParams);
$students = $sStmt->fetchAll();

$studentRank = 1;
foreach ($students as &$s) {
    $s['rank'] = $studentRank++;
    $s['evaluation_score'] = $s['evaluation_score'] !== null ? round((float)$s['evaluation_score'], 2) : null;
}
unset($s);

// If user is a student / trainee, sanitize all evaluation scores for privacy
if (!$isTrainer) {
    foreach ($projects as &$p) {
        $p['evaluation_score'] = null;
        $p['evaluation_status'] = null;
    }
    unset($p);

    foreach ($students as &$s) {
        $s['evaluation_score'] = null;
        $s['evaluation_status'] = null;
        $s['feedback'] = null;
    }
    unset($s);

    foreach ($top5VotedList as &$tp) {
        $tp['evaluation_score'] = null;
    }
    unset($tp);
}

foreach ($projects as &$p) {
    if (!empty($p['trainee_id']) && is_numeric($p['trainee_id'])) {
        $p['trainee_id'] = getUserUuid((int)$p['trainee_id']);
    }
    if (!empty($p['course_id']) && is_numeric($p['course_id'])) {
        $p['course_id'] = getCourseUuid((int)$p['course_id']);
    }
}
unset($p);

foreach ($students as &$s) {
    if (!empty($s['trainee_id']) && is_numeric($s['trainee_id'])) {
        $s['trainee_id'] = getUserUuid((int)$s['trainee_id']);
    }
    if (!empty($s['course_id']) && is_numeric($s['course_id'])) {
        $s['course_id'] = getCourseUuid((int)$s['course_id']);
    }
}
unset($s);

if ($courseInfo && !empty($courseInfo['id']) && is_numeric($courseInfo['id'])) {
    $courseInfo['uuid'] = getCourseUuid((int)$courseInfo['id']);
    $courseInfo['id'] = $courseInfo['uuid'];
}

respond([
    'success'       => true,
    'course'        => $courseInfo,
    'voting_status' => $courseInfo['voting_status'] ?? ($projects[0]['voting_status'] ?? 'not_started'),
    'projects'      => $projects,
    'students'      => $students,
    'top_5_voted'   => $top5VotedList
]);

