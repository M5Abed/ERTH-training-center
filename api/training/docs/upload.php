<?php
// =========================================================
// NMU TRAINING — Upload / Add Project Documentation & Links
// Access: Trainee (Upload own project docs/links), Trainer/Admin
// Supports direct file uploads and external URLs (GitHub, Demo, Figma, Video)
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
    } catch (Throwable $e) {}

    // Support both multipart form-data (for files) and JSON payloads (for links)
    $jsonBody = body();
    $inputData = array_merge(is_array($jsonBody) ? $jsonBody : [], $_POST);

    $ideaId    = (int) ($inputData['idea_id'] ?? 0);
    $courseId  = (int) ($inputData['course_id'] ?? 0);
    $docType   = trim(strtolower($inputData['doc_type'] ?? ''));
    $linkUrl   = trim($inputData['url'] ?? $inputData['file_url'] ?? $inputData['link_url'] ?? '');
    $linkTitle = trim($inputData['title'] ?? $inputData['file_name'] ?? '');

    // If idea_id provided, fetch idea to auto-fill course_id
    if ($ideaId) {
        $iStmt = $db->prepare("SELECT id, course_id, owner_id FROM training_ideas WHERE id = ?");
        $iStmt->execute([$ideaId]);
        $ideaRow = $iStmt->fetch();
        if ($ideaRow) {
            $ideaId = (int) $ideaRow['id'];
            if (!$courseId) {
                $courseId = (int) $ideaRow['course_id'];
            }
        }
    }

    // If ideaId missing but courseId exists, resolve trainee's active idea
    if (!$ideaId && $courseId && $uid) {
        try {
            $iFind = $db->prepare("
                SELECT id FROM training_ideas 
                WHERE course_id = ? AND (owner_id = ? OR id IN (SELECT idea_id FROM training_idea_members WHERE user_id = ?))
                ORDER BY id DESC LIMIT 1
            ");
            $iFind->execute([$courseId, $uid, $uid]);
            $foundIdeaId = $iFind->fetchColumn();
            if ($foundIdeaId) {
                $ideaId = (int)$foundIdeaId;
            }
        } catch (Throwable $e) {}
    }

    if (!$courseId && $uid) {
        try {
            $eStmt = $db->prepare("SELECT course_id FROM trainee_enrollments WHERE trainee_id = ? ORDER BY id DESC LIMIT 1");
            $eStmt->execute([$uid]);
            $eRow = $eStmt->fetch();
            if ($eRow) {
                $courseId = (int) $eRow['course_id'];
            }
        } catch (Throwable $ignored) {}
    }

    $fileName = '';
    $fileUrl  = '';
    $fileSize = 0;

    // Option A: Link Submission (GitHub, Demo, Figma, Video, etc.)
    if (!empty($linkUrl)) {
        if (!filter_var($linkUrl, FILTER_VALIDATE_URL) && !preg_match('#^https?://#i', $linkUrl)) {
            $linkUrl = 'https://' . $linkUrl;
        }
        $fileUrl = $linkUrl;
        $host = strtolower(parse_url($linkUrl, PHP_URL_HOST) ?? '');

        // Auto-detect doc_type if not explicitly set
        if (empty($docType) || $docType === 'link' || $docType === 'report') {
            if (strpos($host, 'github.com') !== false || strpos($host, 'gitlab.com') !== false) {
                $docType = 'github';
            } elseif (strpos($host, 'figma.com') !== false) {
                $docType = 'figma';
            } elseif (strpos($host, 'youtube.com') !== false || strpos($host, 'youtu.be') !== false || strpos($host, 'vimeo.com') !== false || strpos($host, 'loom.com') !== false) {
                $docType = 'video';
            } elseif (strpos($host, 'drive.google.com') !== false || strpos($host, 'dropbox.com') !== false) {
                $docType = 'drive';
            } else {
                $docType = 'demo';
            }
        }

        if (!empty($linkTitle)) {
            $fileName = $linkTitle;
        } else {
            switch ($docType) {
                case 'github':
                    $fileName = 'GitHub Repository';
                    break;
                case 'figma':
                    $fileName = 'Figma UI/UX Prototype';
                    break;
                case 'video':
                    $fileName = 'Project Video Demo';
                    break;
                case 'demo':
                    $fileName = 'Live System / Demo Link';
                    break;
                default:
                    $fileName = $host ?: 'External Project Link';
                    break;
            }
        }
        $fileSize = 0;
    }
    // Option B: File Upload (PDF, DOCX, ZIP, PPTX, Images)
    elseif (!empty($_FILES['file'])) {
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
        $validExts = ['pdf', 'doc', 'docx', 'zip', 'rar', '7z', 'pptx', 'ppt', 'txt', 'png', 'jpg', 'jpeg', 'webp'];
        if (!in_array($ext, $validExts, true)) {
            respondError('Invalid file type. Allowed: PDF, Word, ZIP, RAR, PowerPoint, Images, Text.');
        }

        // Auto-assign doc_type from file extension if not specified
        if (empty($docType)) {
            if (in_array($ext, ['zip', 'rar', '7z'], true)) {
                $docType = 'code_zip';
            } elseif (in_array($ext, ['ppt', 'pptx'], true)) {
                $docType = 'presentation';
            } elseif (in_array($ext, ['png', 'jpg', 'jpeg', 'webp'], true)) {
                $docType = 'image';
            } else {
                $docType = 'report';
            }
        }

        // Server-side real MIME verification
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $detectedMime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        $allowedMimes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/zip',
            'application/x-zip-compressed',
            'application/x-rar-compressed',
            'application/x-7z-compressed',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'image/png',
            'image/jpeg',
            'image/webp',
            'application/octet-stream'
        ];
        if (!in_array($detectedMime, $allowedMimes, true)) {
            respondError('Invalid file content format.');
        }

        $uploadDir = __DIR__ . '/../../../uploads/docs/' . $uid . '/';
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0755, true);
        }

        $uniqueName = 'doc_' . preg_replace('/[^a-zA-Z0-9]/', '', $docType) . '_' . bin2hex(random_bytes(10)) . '.' . $ext;
        $targetPath = $uploadDir . $uniqueName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            respondError('Failed to save document on server.', 500);
        }

        $fileUrl  = '/uploads/docs/' . $uid . '/' . $uniqueName;
        $titleInput = trim($inputData['title'] ?? $inputData['file_title'] ?? '');
        if (!empty($titleInput)) {
            $fileName = htmlspecialchars($titleInput, ENT_QUOTES, 'UTF-8');
        } else {
            $fileName = htmlspecialchars(basename($file['name']), ENT_QUOTES, 'UTF-8');
        }
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
            'trainee_name' => $user['full_name'] ?: ($user['email'] ?? 'Trainee'),
            'course_id' => $courseId,
            'doc_type' => $docType,
            'file_name' => $fileName,
            'file_url' => $fileUrl,
            'file_size' => $fileSize,
            'uploaded_at' => date('Y-m-d H:i:s')
        ]
    ], 201);
} catch (Throwable $e) {
    error_log('Error uploading trainee doc: ' . $e->getMessage());
    respondError('Server error while processing document upload: ' . $e->getMessage(), 500);
}
