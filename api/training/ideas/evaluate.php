<?php
// =========================================================
// NMU TRAINING — Evaluate Trainee Idea / Send to Voting
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

try {
    $reviewer = requireTrainer();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respondError('Method not allowed', 405);
    }

    $data = body();
    $ideaId   = (int)($data['idea_id'] ?? 0);
    $status   = trim(strtolower($data['status'] ?? 'under_review')); // approved, rejected, changes_requested, voting, under_review
    $feedback = sanitizeString($data['feedback'] ?? '');

    $allowedStatuses = ['approved', 'rejected', 'changes_requested', 'voting', 'under_review', 'submitted'];

    if (!$ideaId || !in_array($status, $allowedStatuses, true)) {
        respondError('Valid idea ID and status (approved, rejected, changes_requested, voting) are required');
    }

    $db = db();

    // Ensure status column supports 'voting'
    try {
        $db->exec("ALTER TABLE training_ideas MODIFY status VARCHAR(50) NOT NULL DEFAULT 'submitted'");
    } catch (Exception $e) {
        // Column might already be updated
    }

    // Ensure training_votes table exists
    $db->exec("
        CREATE TABLE IF NOT EXISTS training_votes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            idea_id INT NOT NULL,
            evaluator_id INT NOT NULL,
            vote ENUM('approve', 'reject') NOT NULL DEFAULT 'approve',
            rating TINYINT DEFAULT 5,
            notes TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY idx_idea_evaluator (idea_id, evaluator_id),
            KEY idx_idea (idea_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // Ensure required columns exist if table was created under an older schema
    try {
        $db->exec("ALTER TABLE training_votes ADD COLUMN vote ENUM('approve', 'reject') NOT NULL DEFAULT 'approve'");
    } catch (Exception $e) {}

    try {
        $db->exec("ALTER TABLE training_votes ADD COLUMN notes TEXT DEFAULT NULL");
    } catch (Exception $e) {}

    try {
        $db->exec("ALTER TABLE training_votes ADD COLUMN idea_id INT NOT NULL");
    } catch (Exception $e) {}

    try {
        $db->exec("ALTER TABLE training_votes ADD COLUMN evaluator_id INT NOT NULL");
    } catch (Exception $e) {}

    try {
        $db->exec("ALTER TABLE training_votes ADD COLUMN rating TINYINT DEFAULT 5");
    } catch (Exception $e) {}

    try {
        $db->exec("ALTER TABLE training_votes MODIFY rating TINYINT DEFAULT 5");
    } catch (Exception $e) {}

    try {
        $db->exec("ALTER TABLE training_votes ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
    } catch (Exception $e) {}

    // Fetch idea to know course_id, trainee_id & title
    $stmt = $db->prepare("SELECT owner_id AS trainee_id, course_id, title FROM training_ideas WHERE id = ?");
    $stmt->execute([$ideaId]);
    $idea = $stmt->fetch();

    if (!$idea) {
        respondError('Idea not found', 404);
    }

    // Verify trainer is assigned to this course (or admin)
    verifyCourseAccess((int)$idea['course_id'], $reviewer);

    // Update idea status & feedback
    $upd = $db->prepare("
        UPDATE training_ideas 
        SET status = ?, feedback = ?, reviewed_by = ?, reviewed_at = NOW()
        WHERE id = ?
    ");
    $upd->execute([$status, $feedback ?: null, $reviewer['id'], $ideaId]);

    // Send notification based on status
    if ($status === 'voting') {
        // Notify all trainers and admins about open vote
        $evaluators = $db->query("SELECT id FROM users WHERE role IN ('trainer', 'admin') OR is_admin = 1")->fetchAll(PDO::FETCH_COLUMN);
        $nStmt = $db->prepare("
            INSERT INTO notifications (user_id, type, message_en, message_ar)
            VALUES (?, 'idea_voting', ?, ?)
        ");
        $msgEn = "Project Idea '{$idea['title']}' is now open for Trainer & Admin voting!";
        $msgAr = "فكرة المشروع '{$idea['title']}' متاحة الآن للتصويت بين المدربين والمسؤولين!";
        foreach ($evaluators as $eId) {
            $nStmt->execute([(int)$eId, $msgEn, $msgAr]);
        }
    } else {
        // Notify trainee about evaluation decision
        if ($idea['trainee_id']) {
            $nStmt = $db->prepare("
                INSERT INTO notifications (user_id, type, message_en, message_ar)
                VALUES (?, 'idea_evaluated', ?, ?)
            ");
            $statusDisplay = str_replace('_', ' ', $status);
            $msgEn = "Your training idea '{$idea['title']}' status has been updated to: " . strtoupper($statusDisplay) . ".";
            $msgAr = "تم تحديث حالة فكرة التدريب الخاص بك إلى: $statusDisplay.";
            $nStmt->execute([(int)$idea['trainee_id'], $msgEn, $msgAr]);
        }
    }

    // Fetch vote summary for this idea
    $votesStmt = $db->prepare("
        SELECT tv.*, COALESCE(u.full_name, u.username, u.email) AS evaluator_name, u.role AS evaluator_role
        FROM training_votes tv
        JOIN users u ON tv.evaluator_id = u.id
        WHERE tv.idea_id = ?
        ORDER BY tv.id DESC
    ");
    $votesStmt->execute([$ideaId]);
    $allVotes = $votesStmt->fetchAll();

    $approveCount = 0;
    $rejectCount = 0;
    $myVote = null;
    $myNotes = null;

    foreach ($allVotes as $v) {
        if ($v['vote'] === 'approve') $approveCount++;
        if ($v['vote'] === 'reject') $rejectCount++;
        if ((int)$v['evaluator_id'] === (int)$reviewer['id']) {
            $myVote = $v['vote'];
            $myNotes = $v['notes'];
        }
    }

    respond([
        'success' => true,
        'message' => $status === 'voting' ? 'Project idea sent to community voting' : 'Idea evaluation saved successfully',
        'status' => $status,
        'vote_summary' => [
            'total_votes' => count($allVotes),
            'approve_count' => $approveCount,
            'reject_count' => $rejectCount,
            'my_vote' => $myVote,
            'my_notes' => $myNotes,
            'votes_list' => $allVotes
        ]
    ]);
} catch (Throwable $e) {
    respondError('Server error: ' . $e->getMessage(), 500);
}
