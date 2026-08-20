<?php
require_once __DIR__ . '/../config.php';
requireAdmin();

$db = db();

// ── Training KPIs ─────────────────────────────────────────────────────────────
$totalTrainees = (int)$db->query("SELECT COUNT(*) FROM users WHERE role = 'trainee'")->fetchColumn();
if ($totalTrainees === 0) {
    $totalTrainees = (int)$db->query("SELECT COUNT(DISTINCT trainee_id) FROM trainee_enrollments")->fetchColumn();
}
if ($totalTrainees === 0) {
    $totalTrainees = (int)$db->query("SELECT COUNT(*) FROM users WHERE (role IS NULL OR role = '' OR role = 'trainee') AND (is_admin = 0 OR is_admin IS NULL)")->fetchColumn();
}
$totalIdeas      = (int)$db->query("SELECT COUNT(*) FROM training_ideas WHERE status != 'draft'")->fetchColumn();
$totalDocs       = (int)$db->query("SELECT COUNT(*) FROM training_documents")->fetchColumn();
$totalCourses    = (int)$db->query("SELECT COUNT(*) FROM training_courses WHERE status='active'")->fetchColumn();

// Documentation completion rate: courses with at least 1 doc / total active courses
$coursesWithDocs = (int)$db->query("
    SELECT COUNT(DISTINCT tc.id)
    FROM training_courses tc
    JOIN training_ideas ti ON ti.course_id = tc.id
    JOIN training_documents td ON td.idea_id = ti.id
    WHERE tc.status = 'active'
")->fetchColumn();
$docCompletionRate = $totalCourses > 0 ? round(($coursesWithDocs / $totalCourses) * 100) : 0;

// ── Per-course overview ───────────────────────────────────────────────────────
$courseRows = $db->query("
    SELECT 
        tc.id, tc.name, tc.name, tc.status, tc.start_date, tc.end_date,
        COUNT(DISTINCT te.trainee_id) AS trainee_count,
        COUNT(DISTINCT ti.id)         AS idea_count,
        COUNT(DISTINCT td.id)         AS doc_count
    FROM training_courses tc
    LEFT JOIN trainee_enrollments te ON te.course_id = tc.id
    LEFT JOIN training_ideas ti      ON ti.course_id = tc.id AND ti.status != 'draft'
    LEFT JOIN training_documents td  ON td.idea_id   = ti.id
    WHERE tc.status = 'active'
    GROUP BY tc.id
    ORDER BY tc.start_date DESC
    LIMIT 20
")->fetchAll();

foreach ($courseRows as &$c) {
    $c['trainee_count'] = (int)$c['trainee_count'];
    $c['idea_count']    = (int)$c['idea_count'];
    $c['doc_count']     = (int)$c['doc_count'];
}
unset($c);

// ── Idea status breakdown ─────────────────────────────────────────────────────
$ideaStatusRows = $db->query("
    SELECT status, COUNT(*) AS cnt FROM training_ideas GROUP BY status
")->fetchAll();
$ideaStatuses = [];
foreach ($ideaStatusRows as $r) { $ideaStatuses[$r['status']] = (int)$r['cnt']; }

// ── Legacy ERTH Matching stats (kept for backward compat) ─────────────────────
$totalUsers      = (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn();
$totalProjects   = 0;
try { $totalProjects = (int)$db->query("SELECT COUNT(*) FROM projects")->fetchColumn(); } catch (Exception $e) {}

// ── Users list (admin panel users tab) ────────────────────────────────────────
$users = $db->query("
    SELECT u.id, u.full_name, u.email,
           u.academic_year, u.major, u.department,
           u.created_at, u.student_id, u.role, u.approval_status
    FROM users u
    ORDER BY u.created_at DESC
    LIMIT 200
")->fetchAll();

foreach ($users as &$u) {
    $u['user_skills'] = [];
}
unset($u);

respond([
    // Training KPIs
    'totalTrainees'       => $totalTrainees,
    'totalIdeas'          => $totalIdeas,
    'totalDocs'           => $totalDocs,
    'totalCourses'        => $totalCourses,
    'docCompletionRate'   => $docCompletionRate,
    'courseOverview'      => $courseRows,
    'ideaStatuses'        => $ideaStatuses,
    // Legacy
    'totalUsers'          => $totalUsers,
    'totalProjects'       => $totalProjects,
    'completedProjects'   => 0,
    'avgRating'           => 0,
    'collegeBreakdown'    => [],
    'projectTypes'        => [],
    'skillCounts'         => [],
    'users'               => $users,
    'projects'            => [],
]);
