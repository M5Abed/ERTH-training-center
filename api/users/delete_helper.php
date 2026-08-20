<?php
/**
 * Helper to fully cascade delete a user and all their associated records.
 * Since the schema does not enforce FOREIGN KEY ON DELETE CASCADE,
 * we must clean up orphaned records manually.
 */

function cascadeDeleteUser($db, $userId, $expectedRole = null) {
    if (!$userId) return false;

    try {
        $db->beginTransaction();

        if ($expectedRole) {
            $roles = is_array($expectedRole) ? $expectedRole : [$expectedRole];
            if (in_array('trainee', $roles, true) && !in_array('student', $roles, true)) {
                $roles[] = 'student';
            }
            $placeholders = implode(',', array_fill(0, count($roles), '?'));
            $chk = $db->prepare("SELECT id FROM users WHERE id = ? AND role IN ($placeholders)");
            $chk->execute(array_merge([$userId], $roles));
        } else {
            $chk = $db->prepare("SELECT id FROM users WHERE id = ?");
            $chk->execute([$userId]);
        }
        
        if (!$chk->fetch()) {
            $db->rollBack();
            return false;
        }

        // 1. Auxiliary tables
        $db->prepare("DELETE FROM notifications WHERE user_id = ?")->execute([$userId]);
        $db->prepare("DELETE FROM otp_codes WHERE user_id = ?")->execute([$userId]);
        $db->prepare("DELETE FROM registration_requests WHERE user_id = ?")->execute([$userId]);
        $db->prepare("DELETE FROM ai_user_usage WHERE user_id = ?")->execute([$userId]);
        $db->prepare("DELETE FROM trainer_assignments WHERE trainer_id = ?")->execute([$userId]);

        // 2. Trainee tables
        $db->prepare("DELETE FROM trainee_enrollments WHERE trainee_id = ?")->execute([$userId]);
        $db->prepare("DELETE FROM trainee_topic_progress WHERE trainee_id = ?")->execute([$userId]);
        $db->prepare("DELETE FROM training_evaluations WHERE trainee_id = ?")->execute([$userId]);
        $db->prepare("DELETE FROM training_certificates WHERE trainee_id = ?")->execute([$userId]);
        $db->prepare("DELETE FROM trainee_documentation WHERE trainee_id = ?")->execute([$userId]);

        // 3. Ideas they are a member of (or voted on)
        $db->prepare("DELETE FROM training_idea_members WHERE user_id = ?")->execute([$userId]);
        $db->prepare("DELETE FROM training_votes WHERE evaluator_id = ?")->execute([$userId]);
        $db->prepare("DELETE FROM course_project_votes WHERE voter_id = ?")->execute([$userId]);

        // 4. Ideas they OWN
        $myIdeas = $db->prepare("SELECT id FROM training_ideas WHERE owner_id = ?");
        $myIdeas->execute([$userId]);
        $ideaIds = $myIdeas->fetchAll(PDO::FETCH_COLUMN);
        foreach ($ideaIds as $iid) {
            $db->prepare("DELETE FROM training_idea_members WHERE idea_id = ?")->execute([$iid]);
            $db->prepare("DELETE FROM training_votes WHERE idea_id = ?")->execute([$iid]);
            $db->prepare("DELETE FROM training_documents WHERE idea_id = ?")->execute([$iid]);
            $db->prepare("DELETE FROM trainee_documentation WHERE idea_id = ?")->execute([$iid]);
            $db->prepare("DELETE FROM training_ideas WHERE id = ?")->execute([$iid]);
        }

        // 5. Finally, the user
        $db->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);

        $db->commit();
        return true;
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        error_log("Failed to cascade delete user $userId: " . $e->getMessage());
        throw $e;
    }
}
