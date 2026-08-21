<?php
/**
 * Helper to fully cascade delete a user and all their associated records.
 * Since the schema does not enforce FOREIGN KEY ON DELETE CASCADE,
 * we must clean up orphaned records manually.
 */

function cascadeDeleteUser($db, $userId, $expectedRole = null) {
    if (!$userId) return false;

    $ownTransaction = false;
    if (!$db->inTransaction()) {
        $db->beginTransaction();
        $ownTransaction = true;
    }

    try {
        if ($expectedRole) {
            $chk = $db->prepare("
                SELECT id FROM users 
                WHERE id = ? 
                  AND (
                      TRIM(LOWER(COALESCE(role, ''))) IN ('trainee', 'student', 'user', '')
                      OR role IS NULL
                      OR is_admin = 0
                      OR is_admin IS NULL
                  )
            ");
            $chk->execute([$userId]);
        } else {
            $chk = $db->prepare("SELECT id FROM users WHERE id = ?");
            $chk->execute([$userId]);
        }
        
        if (!$chk->fetch()) {
            if ($ownTransaction && $db->inTransaction()) {
                $db->rollBack();
            }
            return false;
        }

        // Disable foreign key checks for this connection
        try { $db->exec("SET FOREIGN_KEY_CHECKS = 0;"); } catch (Throwable $e) {}

        // Helper function for safe query execution (ignores table-not-found errors)
        $safeExec = function($sql, $params = []) use ($db) {
            try {
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
            } catch (Throwable $ignore) {
                // Table might not exist in all environments
            }
        };

        // 1. Auxiliary tables
        $safeExec("DELETE FROM notifications WHERE user_id = ?", [$userId]);
        $safeExec("DELETE FROM otp_codes WHERE user_id = ?", [$userId]);
        $safeExec("DELETE FROM registration_requests WHERE user_id = ?", [$userId]);
        $safeExec("DELETE FROM ai_user_usage WHERE user_id = ?", [$userId]);
        $safeExec("DELETE FROM trainer_assignments WHERE trainer_id = ?", [$userId]);
        $safeExec("DELETE FROM activity_log WHERE user_id = ?", [$userId]);

        // 2. Trainee training records
        $safeExec("DELETE FROM trainee_enrollments WHERE trainee_id = ?", [$userId]);
        $safeExec("DELETE FROM trainee_topic_progress WHERE trainee_id = ?", [$userId]);
        $safeExec("DELETE FROM training_evaluations WHERE trainee_id = ?", [$userId]);
        $safeExec("DELETE FROM training_certificates WHERE trainee_id = ?", [$userId]);
        $safeExec("DELETE FROM trainee_documentation WHERE trainee_id = ?", [$userId]);
        $safeExec("DELETE FROM training_verifications WHERE trainee_id = ?", [$userId]);

        // 3. Ideas / Team Invitations & Memberships
        $safeExec("DELETE FROM training_idea_members WHERE user_id = ?", [$userId]);
        $safeExec("DELETE FROM training_idea_invitations WHERE inviter_id = ? OR invitee_id = ?", [$userId, $userId]);
        $safeExec("DELETE FROM training_votes WHERE evaluator_id = ?", [$userId]);
        $safeExec("DELETE FROM course_project_votes WHERE voter_id = ?", [$userId]);

        // 4. Projects & Reviews
        $safeExec("DELETE FROM reviews WHERE reviewer_id = ? OR reviewee_id = ?", [$userId, $userId]);
        $safeExec("DELETE FROM project_applications WHERE applicant_id = ? OR user_id = ?", [$userId, $userId]);
        $safeExec("DELETE FROM project_members WHERE user_id = ?", [$userId]);
        $safeExec("DELETE FROM project_tasks WHERE assignee_id = ? OR created_by = ?", [$userId, $userId]);
        $safeExec("DELETE FROM project_messages WHERE sender_id = ? OR user_id = ?", [$userId, $userId]);

        // 5. Ideas they OWN
        try {
            $myIdeas = $db->prepare("SELECT id FROM training_ideas WHERE owner_id = ?");
            $myIdeas->execute([$userId]);
            $ideaIds = $myIdeas->fetchAll(PDO::FETCH_COLUMN);
            foreach ($ideaIds as $iid) {
                $safeExec("DELETE FROM training_idea_members WHERE idea_id = ?", [$iid]);
                $safeExec("DELETE FROM training_idea_invitations WHERE idea_id = ?", [$iid]);
                $safeExec("DELETE FROM training_votes WHERE idea_id = ?", [$iid]);
                $safeExec("DELETE FROM training_documents WHERE idea_id = ?", [$iid]);
                $safeExec("DELETE FROM trainee_documentation WHERE idea_id = ?", [$iid]);
                $safeExec("DELETE FROM course_project_votes WHERE idea_id = ? OR project_id = ?", [$iid, $iid]);
                $safeExec("DELETE FROM training_ideas WHERE id = ?", [$iid]);
            }
        } catch (Throwable $ignore) {}

        // 6. Finally, the user record itself
        $safeExec("DELETE FROM users WHERE id = ?", [$userId]);

        if ($ownTransaction && $db->inTransaction()) {
            $db->commit();
        }
        return true;
    } catch (Throwable $e) {
        if ($ownTransaction && $db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Failed to cascade delete user $userId: " . $e->getMessage());
        throw $e;
    }
}

