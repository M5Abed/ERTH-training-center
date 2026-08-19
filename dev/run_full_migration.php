<?php
// =========================================================
// NMU ERTH — Comprehensive Database Migration & Repair
// =========================================================
require_once __DIR__ . '/../api/config.php';

$db = db();

echo "Starting DB Migration & Conflict Resolution...\n";

// 1. Repair training_ideas columns (title, description)
try {
    $cols = $db->query("SHOW COLUMNS FROM training_ideas")->fetchAll(PDO::FETCH_COLUMN);
    
    // Ensure title column exists
    if (!in_array('title', $cols, true)) {
        if (in_array('title_en', $cols, true)) {
            $db->exec("ALTER TABLE training_ideas ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '' AFTER owner_id");
            $db->exec("UPDATE training_ideas SET title = COALESCE(NULLIF(title_en, ''), 'Untitled Project')");
        } else {
            $db->exec("ALTER TABLE training_ideas ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '' AFTER owner_id");
        }
        echo "✓ Added 'title' column to training_ideas\n";
    }

    // Ensure description column exists
    if (!in_array('description', $cols, true)) {
        if (in_array('description_en', $cols, true)) {
            $db->exec("ALTER TABLE training_ideas ADD COLUMN description TEXT NULL AFTER title");
            $db->exec("UPDATE training_ideas SET description = description_en");
        } else {
            $db->exec("ALTER TABLE training_ideas ADD COLUMN description TEXT NULL AFTER title");
        }
        echo "✓ Added 'description' column to training_ideas\n";
    }

    // Ensure catalog_project_id exists
    if (!in_array('catalog_project_id', $cols, true)) {
        $db->exec("ALTER TABLE training_ideas ADD COLUMN catalog_project_id INT NULL AFTER course_id");
        $db->exec("ALTER TABLE training_ideas ADD INDEX idx_ti_catalog_proj (catalog_project_id)");
        echo "✓ Added 'catalog_project_id' to training_ideas\n";
    }

    // Ensure proposal_json exists
    if (!in_array('proposal_json', $cols, true)) {
        $db->exec("ALTER TABLE training_ideas ADD COLUMN proposal_json LONGTEXT NULL");
        echo "✓ Added 'proposal_json' to training_ideas\n";
    }
} catch (Exception $e) {
    echo "training_ideas error: " . $e->getMessage() . "\n";
}

// 2. Repair training_courses columns (name, description)
try {
    $cols = $db->query("SHOW COLUMNS FROM training_courses")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('name', $cols, true)) {
        if (in_array('name_en', $cols, true)) {
            $db->exec("ALTER TABLE training_courses ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT '' AFTER id");
            $db->exec("UPDATE training_courses SET name = name_en");
        } else {
            $db->exec("ALTER TABLE training_courses ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT '' AFTER id");
        }
        echo "✓ Added 'name' to training_courses\n";
    }
    if (!in_array('description', $cols, true)) {
        if (in_array('description_en', $cols, true)) {
            $db->exec("ALTER TABLE training_courses ADD COLUMN description TEXT NULL AFTER name");
            $db->exec("UPDATE training_courses SET description = description_en");
        } else {
            $db->exec("ALTER TABLE training_courses ADD COLUMN description TEXT NULL AFTER name");
        }
        echo "✓ Added 'description' to training_courses\n";
    }
} catch (Exception $e) {
    echo "training_courses error: " . $e->getMessage() . "\n";
}

// 3. Repair training_topics columns (title, description)
try {
    $cols = $db->query("SHOW COLUMNS FROM training_topics")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('title', $cols, true)) {
        if (in_array('title_en', $cols, true)) {
            $db->exec("ALTER TABLE training_topics ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '' AFTER course_id");
            $db->exec("UPDATE training_topics SET title = title_en");
        } else {
            $db->exec("ALTER TABLE training_topics ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT '' AFTER course_id");
        }
        echo "✓ Added 'title' to training_topics\n";
    }
    if (!in_array('description', $cols, true)) {
        if (in_array('description_en', $cols, true)) {
            $db->exec("ALTER TABLE training_topics ADD COLUMN description TEXT NULL AFTER title");
            $db->exec("UPDATE training_topics SET description = description_en");
        } else {
            $db->exec("ALTER TABLE training_topics ADD COLUMN description TEXT NULL AFTER title");
        }
        echo "✓ Added 'description' to training_topics\n";
    }
} catch (Exception $e) {
    echo "training_topics error: " . $e->getMessage() . "\n";
}

// 4. Repair training_documents columns (title)
try {
    $cols = $db->query("SHOW COLUMNS FROM training_documents")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('title', $cols, true)) {
        if (in_array('title_en', $cols, true)) {
            $db->exec("ALTER TABLE training_documents ADD COLUMN title VARCHAR(255) NULL AFTER type");
            $db->exec("UPDATE training_documents SET title = title_en");
        } else {
            $db->exec("ALTER TABLE training_documents ADD COLUMN title VARCHAR(255) NULL AFTER type");
        }
        echo "✓ Added 'title' to training_documents\n";
    }
} catch (Exception $e) {
    echo "training_documents error: " . $e->getMessage() . "\n";
}

// 5. Repair proposals_pregenerated section_key type
try {
    $db->exec("ALTER TABLE proposals_pregenerated MODIFY COLUMN section_key VARCHAR(100) NOT NULL");
    echo "✓ proposals_pregenerated section_key set to VARCHAR(100)\n";
} catch (Exception $e) {
    echo "proposals_pregenerated error: " . $e->getMessage() . "\n";
}

// 6. Ensure course_eval_criteria table exists
try {
    $db->exec("
        CREATE TABLE IF NOT EXISTS course_eval_criteria (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_id INT NOT NULL,
            name VARCHAR(150) NOT NULL,
            weight DECIMAL(5,2) NOT NULL,
            order_index INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_cec_course (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");
    echo "✓ course_eval_criteria table verified\n";
} catch (Exception $e) {
    echo "course_eval_criteria error: " . $e->getMessage() . "\n";
}

// 7. Ensure training_evaluations has criteria_scores
try {
    $cols = $db->query("SHOW COLUMNS FROM training_evaluations")->fetchAll(PDO::FETCH_COLUMN);
    if (!in_array('criteria_scores', $cols, true)) {
        $db->exec("ALTER TABLE training_evaluations ADD COLUMN criteria_scores JSON DEFAULT NULL");
        echo "✓ Added 'criteria_scores' to training_evaluations\n";
    }
} catch (Exception $e) {
    echo "training_evaluations error: " . $e->getMessage() . "\n";
}

// 8. Seed 64 catalog proposals
require_once __DIR__ . '/../api/training/ideas/catalog_64_data.php';
$catalog = getCatalog64();
$db->beginTransaction();
try {
    $cStmt = $db->prepare("
        INSERT INTO projects_catalog (id, title, category, level, skills, display_order)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            title         = VALUES(title),
            category      = VALUES(category),
            level         = VALUES(level),
            skills        = VALUES(skills),
            display_order = VALUES(display_order)
    ");
    $sStmt = $db->prepare("
        INSERT INTO proposals_pregenerated (catalog_project_id, section_key, content)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE content = VALUES(content)
    ");

    foreach ($catalog as $p) {
        $cStmt->execute([(int)$p['id'], $p['title'], $p['category'], $p['level'], $p['skills'], $p['display_order']]);
        foreach ($p['sections'] as $key => $content) {
            $sStmt->execute([(int)$p['id'], $key, $content]);
        }
    }
    $db->commit();
    echo "✓ Catalog 64 projects and proposals seeded successfully!\n";
} catch (Exception $e) {
    $db->rollBack();
    echo "Catalog seeding error: " . $e->getMessage() . "\n";
}

echo "=== Migration Complete ===\n";
