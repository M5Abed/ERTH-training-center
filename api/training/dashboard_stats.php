<?php
require_once __DIR__ . '/../config.php';
$uid = requireSession();
$db = db();

$totalTrainees   = (int)$db->query("SELECT COUNT(DISTINCT trainee_id) FROM trainee_enrollments")->fetchColumn();
$totalIdeas      = (int)$db->query("SELECT COUNT(*) FROM training_ideas WHERE status != 'draft'")->fetchColumn();
$totalDocs       = (int)$db->query("SELECT COUNT(*) FROM training_documents")->fetchColumn();
$totalCourses    = (int)$db->query("SELECT COUNT(*) FROM training_courses WHERE status='active'")->fetchColumn();

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

respond([
    'totalTrainees'  => $totalTrainees,
    'totalIdeas'     => $totalIdeas,
    'totalDocs'      => $totalDocs,
    'totalCourses'   => $totalCourses,
    'courseOverview' => $courseRows
]);
