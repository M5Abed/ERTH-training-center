<?php
// =========================================================
// NMU TRAINING — Upload / Add Project Documentation & Links
// Access: Trainee (Upload own project docs/links), Trainer/Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

try {
    $user = requireRole(['trainee', 'trainer', 'admin']);
    $uid = (int) $user['id'];

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respondError('Method not allowed', 405);
    }

    $db = db();

    // Ensure trainee_documentation table exists with idea_id column
    $db->exec("
        CREATE TABLE IF NOT EXISTS trainee_documentation (
            id INT AUTO_INCREMENT PRIMARY KEY,
            idea_id INT DEFAULT NULL,
            trainee_id INT NOT NULL,
            course_id INT DEFAULT NULL,
            doc_type VARCHAR(50) NOT NULL DEFAULT 'report',
            file_name VARCHAR(255) NOT NULL,
            file_url TEXT NOT NULL,
            file_size INT DEFAULT 0,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY idx_td_idea (idea_id),
            KEY idx_td_trainee (trainee_id),
            KEY idx_td_course (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    try {
        $cols = $db->query("SHOW COLUMNS FROM trainee_documentation LIKE 'idea_id'")->fetchAll();
        if (empty($cols)) {
            $db->exec("ALTER TABLE trainee_documentation ADD COLUMN idea_id INT DEFAULT NULL AFTER id");
        }
    } catch (Throwable $e) {
    }

    $ideaId = (int) ($_POST['idea_id'] ?? 0);
    $courseId = (int) ($_POST['course_id'] ?? 0);
    $docType = trim(strtolower($_POST['doc_type'] ?? 'report')); // report, code_zip, presentation, link, github, demo, figma
    $linkUrl = trim($_POST['url'] ?? $_POST['file_url'] ?? '');
    $linkTitle = trim($_POST['title'] ?? $_POST['file_name'] ?? '');

    // If idea_id provided, fetch idea to auto-fill course_id
    if ($ideaId) {
        $iStmt = $db->prepare("SELECT course_id, trainee_id, owner_id FROM training_ideas WHERE id = ?");
        $iStmt->execute([$ideaId]);
        $ideaRow = $iStmt->fetch();
        if ($ideaRow) {
            $ideaId = (int) $ideaRow['id'];
            if (!$courseId)
                $courseId = (int) $ideaRow['course_id'];
        }
    }

    if (!$courseId && $uid) {
        try {
            $eStmt = $db->prepare("SELECT course_id FROM trainee_enrollments WHERE trainee_id = ? ORDER BY id DESC LIMIT 1");
            $eStmt->execute([$uid]);
            $eRow = $eStmt->fetch();
            if ($eRow) {
                $courseId = (int) $eRow['course_id'];
            }
        } catch (Throwable $ignored) {
        }
    }

    $fileName = '';
    $fileUrl = '';
    $fileSize = 0;

    // Option A: Link Submission
    if (!empty($linkUrl)) {
        if (!filter_var($linkUrl, FILTER_VALIDATE_URL) && !preg_match('#^https?://#i', $linkUrl)) {
            $linkUrl = 'https://' . $linkUrl;
        }
        $fileUrl = $linkUrl;
        if (!empty($linkTitle)) {
            $fileName = $linkTitle;
        } else {
            switch ($docType) {
                case 'github':
                    $fileName = 'GitHub Repository';
                    break;
                case 'figma':
                    $fileName = 'Figma UI Design';
                    break;
                case 'demo':
                    $fileName = 'Live Demo';
                    break;
                default:
                    $fileName = parse_url($linkUrl, PHP_URL_HOST) ?: 'External Link';
                    break;
            }
        }
        $fileSize = 0;
    }
    // Option B: File Upload
    else if (!empty($_FILES['file'])) {
        $file = $_FILES['file'];

        if ($file['error'] !== UPLOAD_ERR_OK) {
            switch ($file['error']) {
                case UPLOAD_ERR_INI_SIZE:
                case UPLOAD_ERR_FORM_SIZE:
                    respondError('Uploaded file size exceeds maximum server limit.');
                case UPLOAD_ERR_PARTIAL:
                    respondError('File was only partially uploaded. Please try again.');
                case UPLOAD_ERR_NO_FILE:
                    respondError('No file was selected for upload.');
                case UPLOAD_ERR_NO_TMP_DIR:
                    respondError('Server error: Temporary upload directory is missing.', 500);
                case UPLOAD_ERR_CANT_WRITE:
                    respondError('Server error: Failed to write file to disk.', 500);
                default:
                    respondError('File upload error code: ' . $file['error']);
            }
        }

        // Max 50MB limit
        if ($file['size'] > 50 * 1024 * 1024) {
            respondError('File size exceeds 50MB limit');
        }

        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $validExts = ['pdf', 'doc', 'docx', 'zip', 'rar', '7z', 'pptx', 'ppt', 'txt', 'png', 'jpg', 'jpeg'];
        if (!in_array($ext, $validExts, true)) {
            respondError('Invalid file type. Allowed: PDF, Word, ZIP, RAR, PowerPoint, Images, Text.');
        }

        $uploadDir = __DIR__ . '/../../../uploads/docs/' . $uid . '/';
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
        }

        $uniqueName = uniqid('doc_' . $docType . '_', true) . '.' . $ext;
        $targetPath = $uploadDir . $uniqueName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            respondError('Failed to save document on server. Please check folder permissions.', 500);
        }

        $fileUrl = '/uploads/docs/' . $uid . '/' . $uniqueName;
        $fileName = $file['name'];
        $fileSize = (int) $file['size'];
    } else {
        respondError('Either a file upload or a valid URL link is required');
    }

    $stmt = $db->prepare("
        INSERT INTO trainee_documentation (idea_id, trainee_id, course_id, doc_type, file_name, file_url, file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([
        $ideaId ?: null,
        $uid,
        $courseId ?: null,
        $docType,
        $fileName,
        $fileUrl,
        $fileSize
    ]);

    $docId = (int) $db->lastInsertId();

    respond([
        'success' => true,
        'message' => 'Document / link added successfully',
        'doc' => [
            'id' => $docId,
            'idea_id' => $ideaId,
            'trainee_id' => $uid,
            'course_id' => $courseId,
            'doc_type' => $docType,
            'file_name' => $fileName,
            'file_url' => $fileUrl,
            'file_size' => $fileSize,
            'uploaded_at' => date('Y-m-d H:i:s')
        ]
    ], 201);
} catch (Throwable $e) {
    respondError('Server error: ' . $e->getMessage(), 500);
}
