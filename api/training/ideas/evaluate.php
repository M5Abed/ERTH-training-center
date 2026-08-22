<?php
// =========================================================
// NMU TRAINING — Evaluate Trainee Idea / Send to Voting / Golden Pass
// Access: Trainer or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

try {
    $reviewer = requireTrainer();

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respondError('Method not allowed', 405);
    }

    $data = body();
    $ideaId   = resolveIdeaId($data['idea_id'] ?? 0);
    $status   = trim(strtolower($data['status'] ?? 'under_review')); // approved, completed, rejected, changes_requested, voting, under_review, golden_pass
    $feedback = sanitizeString($data['feedback'] ?? '');
    $isGoldenPass = !empty($data['golden_pass']) || $status === 'golden_pass';

    $allowedStatuses = ['approved', 'completed', 'rejected', 'changes_requested', 'voting', 'under_review', 'submitted', 'golden_pass'];

    if (!$ideaId || !in_array($status, $allowedStatuses, true)) {
        respondError('Valid idea ID and status (approved, completed, rejected, changes_requested, voting, golden_pass) are required');
    }

    if ($isGoldenPass) {
        $status = 'approved';
    }

    $db = db();

    // Ensure status column supports 'voting'
    try {
        $db->exec("ALTER TABLE training_ideas MODIFY status VARCHAR(50) NOT NULL DEFAULT 'submitted'");
    } catch (Exception $e) {}

    // Ensure is_golden_pass column exists
    try {
        $db->exec("ALTER TABLE training_ideas ADD COLUMN is_golden_pass TINYINT(1) NOT NULL DEFAULT 0");
    } catch (Exception $e) {}

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

    // Ensure training_ideas has required columns
    try {
        $db->exec("ALTER TABLE training_ideas ADD COLUMN feedback TEXT DEFAULT NULL");
    } catch (Exception $e) {}
    try {
        $db->exec("ALTER TABLE training_ideas ADD COLUMN reviewed_by INT DEFAULT NULL");
    } catch (Exception $e) {}
    try {
        $db->exec("ALTER TABLE training_ideas ADD COLUMN reviewed_at DATETIME DEFAULT NULL");
    } catch (Exception $e) {}

    // Fetch idea to know course_id, trainee_id & title
    $stmt = $db->prepare("SELECT owner_id AS trainee_id, course_id, title, is_golden_pass FROM training_ideas WHERE id = ?");
    $stmt->execute([$ideaId]);
    $idea = $stmt->fetch();

    if (!$idea) {
        respondError('Idea not found', 404);
    }

    // Verify trainer is assigned to this course (or admin)
    verifyCourseAccess((int)$idea['course_id'], $reviewer);

    if ($isGoldenPass) {
        // Verify owner has evaluation
        $evalStmt = $db->prepare("
            SELECT COUNT(*) 
            FROM training_evaluations 
            WHERE trainee_id = ? AND course_id = ? AND final_score IS NOT NULL
        ");
        $evalStmt->execute([$idea['trainee_id'], $idea['course_id']]);
        $ownerEvaluated = (int)$evalStmt->fetchColumn() > 0;
        
        // Check team members if any
        $memStmt = $db->prepare("SELECT user_id FROM training_idea_members WHERE idea_id = ?");
        $memStmt->execute([$ideaId]);
        $memberIds = $memStmt->fetchAll(PDO::FETCH_COLUMN);
        
        // Auto-seed high-distinction evaluations for owner and members if trainer awards Golden Pass
        if (!$ownerEvaluated && !empty($idea['trainee_id'])) {
            try {
                $autoEv = $db->prepare("
                    INSERT INTO training_evaluations (trainee_id, course_id, evaluator_id, status, final_score, feedback, evaluated_at)
                    VALUES (?, ?, ?, 'pass', 95.00, 'Excellent project performance awarded Golden Pass', NOW())
                    ON DUPLICATE KEY UPDATE status = 'pass', final_score = COALESCE(final_score, 95.00), evaluated_at = NOW()
                ");
                $autoEv->execute([(int)$idea['trainee_id'], (int)$idea['course_id'], (int)$reviewer['id']]);
            } catch (Throwable $e) {}
        }
        
        if (!empty($memberIds)) {
            $autoEvMember = $db->prepare("
                INSERT INTO training_evaluations (trainee_id, course_id, evaluator_id, status, final_score, feedback, evaluated_at)
                VALUES (?, ?, ?, 'pass', 95.00, 'Excellent project performance awarded Golden Pass', NOW())
                ON DUPLICATE KEY UPDATE status = 'pass', final_score = COALESCE(final_score, 95.00), evaluated_at = NOW()
            ");
            foreach ($memberIds as $mId) {
                try {
                    $evalStmt->execute([$mId, $idea['course_id']]);
                    if ((int)$evalStmt->fetchColumn() === 0) {
                        $autoEvMember->execute([(int)$mId, (int)$idea['course_id'], (int)$reviewer['id']]);
                    }
                } catch (Throwable $e) {}
            }
        }
    }

    // Update idea status, feedback, & golden_pass flag
    $targetGoldenPass = $isGoldenPass ? 1 : (int)($idea['is_golden_pass'] ?? 0);
    $upd = $db->prepare("
        UPDATE training_ideas 
        SET status = ?, feedback = ?, reviewed_by = ?, reviewed_at = NOW(), is_golden_pass = ?
        WHERE id = ?
    ");
    $upd->execute([$status, $feedback ?: null, $reviewer['id'], $targetGoldenPass, $ideaId]);

    // Send notification based on status
    if ($isGoldenPass) {
        if ($idea['trainee_id']) {
            $nStmt = $db->prepare("
                INSERT INTO notifications (user_id, type, message_en, message_ar, project_id, is_read, created_at)
                VALUES (?, 'golden_pass', ?, ?, ?, 0, NOW())
            ");
            $msgEn = "🌟 Congratulations! Your project \"{$idea['title']}\" has been awarded the Golden Pass and directly qualified to the Official Leaderboard!";
            $msgAr = "🌟 تهانينا! حصل مشروعك \"{$idea['title']}\" على الكارت الذهبي (Golden Pass) وتأهل مباشرةً للوحة الشرف والمتصدرين!";
            $nStmt->execute([(int)$idea['trainee_id'], $msgEn, $msgAr, $ideaId]);
        }
    } elseif ($status === 'voting') {
        // Notify all trainers and admins about open vote
        $evaluators = $db->query("SELECT id FROM users WHERE role IN ('trainer', 'admin') OR is_admin = 1")->fetchAll(PDO::FETCH_COLUMN);
        $nStmt = $db->prepare("
            INSERT INTO notifications (user_id, type, message_en, message_ar, project_id, is_read, created_at)
            VALUES (?, 'idea_voting', ?, ?, ?, 0, NOW())
        ");
        $msgEn = "Project Idea '{$idea['title']}' is now open for Trainer & Admin voting!";
        $msgAr = "فكرة المشروع '{$idea['title']}' متاحة الآن للتصويت بين المدربين والمسؤولين!";
        foreach ($evaluators as $eId) {
            $nStmt->execute([(int)$eId, $msgEn, $msgAr, $ideaId]);
        }
    } else {
        // Notify trainee about evaluation decision
        if ($idea['trainee_id']) {
            $nStmt = $db->prepare("
                INSERT INTO notifications (user_id, type, message_en, message_ar, project_id, is_read, created_at)
                VALUES (?, 'idea_evaluated', ?, ?, ?, 0, NOW())
            ");
            $statusDisplay = str_replace('_', ' ', $status);
            $msgEn = "Your training idea '{$idea['title']}' status has been updated to: " . strtoupper($statusDisplay) . ".";
            $msgAr = "تم تحديث حالة فكرة التدريب الخاص بك إلى: $statusDisplay.";
            $nStmt->execute([(int)$idea['trainee_id'], $msgEn, $msgAr, $ideaId]);
        }
    }

    // Fetch vote summary for this idea
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

    foreach ($allVotes as &$v) {
        if ($v['vote'] === 'approve') $approveCount++;
        if ($v['vote'] === 'reject') $rejectCount++;
        if ((int)$v['evaluator_id'] === (int)$reviewer['id']) {
            $myVote = $v['vote'];
            $myNotes = $v['notes'];
        }
        if (!empty($v['evaluator_id']) && is_numeric($v['evaluator_id'])) {
            $v['evaluator_id'] = getUserUuid((int)$v['evaluator_id']);
        }
        if (!empty($v['idea_id']) && is_numeric($v['idea_id'])) {
            $v['idea_id'] = getIdeaUuid((int)$v['idea_id']);
        }
    }
    unset($v);

    respond([
        'success' => true,
        'message' => $isGoldenPass ? 'Golden Pass awarded! Project added directly to Leaderboard.' : ($status === 'voting' ? 'Project idea sent to community voting' : 'Idea evaluation saved successfully'),
        'status' => $status,
        'is_golden_pass' => (bool)$targetGoldenPass,
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
