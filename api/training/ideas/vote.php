<?php
// =========================================================
// NMU TRAINING â€” Cast / Update Vote on Trainee Idea
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

try {
    $evaluator = requireTrainer();
    $evaluatorId = (int)$evaluator['id'];

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respondError('Method not allowed', 405);
    }

    $data = body();
    $ideaId = (int)($data['idea_id'] ?? 0);
    $vote   = trim(strtolower($data['vote'] ?? '')); // 'approve' or 'reject'
    $notes  = sanitizeString($data['notes'] ?? '');

    if (!$ideaId || !in_array($vote, ['approve', 'reject'], true)) {
        respondError('Valid idea ID and vote decision (approve or reject) are required');
    }

    $db = db();

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

    // Verify idea exists
    $stmt = $db->prepare("SELECT id, title, status FROM training_ideas WHERE id = ?");
    $stmt->execute([$ideaId]);
    $idea = $stmt->fetch();

    if (!$idea) {
        respondError('Idea not found', 404);
    }

    // Save or update vote
    $saveVote = $db->prepare("
        INSERT INTO training_votes (idea_id, evaluator_id, vote, rating, notes)
        VALUES (?, ?, ?, 5, ?)
        ON DUPLICATE KEY UPDATE vote = VALUES(vote), rating = VALUES(rating), notes = VALUES(notes)
    ");
    $saveVote->execute([$ideaId, $evaluatorId, $vote, $notes ?: null]);

    // If idea is not already in 'voting' status, update it to 'voting'
    if ($idea['status'] !== 'voting' && $idea['status'] !== 'approved' && $idea['status'] !== 'rejected') {
        $db->prepare("UPDATE training_ideas SET status = 'voting' WHERE id = ?")->execute([$ideaId]);
    }

    // Fetch updated vote summary for this idea
    $votesStmt = $db->prepare("
        SELECT tv.*, COALESCE(u.full_name, u.email) AS evaluator_name, u.role AS evaluator_role
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
        if ((int)$v['evaluator_id'] === $evaluatorId) {
            $myVote = $v['vote'];
            $myNotes = $v['notes'];
        }
    }

    respond([
        'success' => true,
        'message' => 'Vote recorded successfully',
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

