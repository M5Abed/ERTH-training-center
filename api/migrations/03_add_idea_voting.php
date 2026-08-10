<?php
// =========================================================
// NMU TRAINING — Migration 03: Add Idea Voting & Update Status
// =========================================================

require_once __DIR__ . '/../config.php';

try {
    $db = db();

    // 1. Ensure training_votes table exists
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

    // 2. Ensure status column in training_ideas can store 'voting'
    // Modify column type if needed to VARCHAR(50) for maximum flexibility
    $db->exec("ALTER TABLE training_ideas MODIFY status VARCHAR(50) NOT NULL DEFAULT 'submitted'");

    echo "Migration 03 successful: training_votes table created & training_ideas.status updated.\n";
} catch (Exception $e) {
    echo "Migration 03 error: " . $e->getMessage() . "\n";
}
