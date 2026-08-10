<?php
// =========================================================
// NMU TRAINING — Delete Project Documentation or Link
// Access: Document Uploader, Trainer, or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

try {
    $user = requireRole(['trainee', 'trainer', 'admin']);
    $uid = (int)$user['id'];
    $role = strtolower($user['role'] ?? '');
    $isAdmin = (!empty($user['is_admin']) || $role === 'admin');
    $isTrainer = ($role === 'trainer');

    if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
        respondError('Method not allowed', 405);
    }

    $data = body();
    $docId = (int)($data['doc_id'] ?? $_POST['doc_id'] ?? $_GET['doc_id'] ?? 0);

    if (!$docId) {
        respondError('Document ID is required', 400);
    }

    $db = db();
    $stmt = $db->prepare("SELECT * FROM trainee_documentation WHERE id = ?");
    $stmt->execute([$docId]);
    $doc = $stmt->fetch();

    if (!$doc) {
        respondError('Document not found', 404);
    }

    $docTraineeId = (int)($doc['trainee_id'] ?? 0);
    $isOwner = ($uid > 0 && $uid === $docTraineeId);

    if (!$isOwner && !$isAdmin && !$isTrainer) {
        respondError('Unauthorized: You can only delete your own documents', 403);
    }

    // Remove local file if it exists
    if (!empty($doc['file_url']) && strpos($doc['file_url'], '/uploads/') === 0) {
        $filePath = __DIR__ . '/../../..' . $doc['file_url'];
        if (file_exists($filePath)) {
            @unlink($filePath);
        }
    }

    $del = $db->prepare("DELETE FROM trainee_documentation WHERE id = ?");
    $del->execute([$docId]);

    respond([
        'success' => true,
        'message' => 'Document deleted successfully'
    ]);
} catch (Throwable $e) {
    respondError('Server error: ' . $e->getMessage(), 500);
}
