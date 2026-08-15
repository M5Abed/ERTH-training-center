<?php
// =========================================================
// NMU TRAINING — Delete Trainee Document
// Access: Document owner, Trainer, or Admin
// =========================================================

require_once __DIR__ . '/../../config.php';

try {
    $user = requireRole(['trainee', 'trainer', 'admin']);
    $uid = (int)$user['id'];
    $role = strtolower($user['role'] ?? '');
    $isAdmin = (bool)($user['is_admin'] || $role === 'admin');
    $isTrainer = $role === 'trainer' || $isAdmin;

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respondError('Method not allowed', 405);
    }

    $data = body();
    $docId = (int)($data['id'] ?? 0);

    if (!$docId) {
        respondError('Document ID is required');
    }

    $db = db();

    // Verify ownership or trainer/admin role
    $stmt = $db->prepare("SELECT id, trainee_id, file_url FROM trainee_documentation WHERE id = ?");
    $stmt->execute([$docId]);
    $doc = $stmt->fetch();

    if (!$doc) {
        respondError('Document not found', 404);
    }

    if (!$isTrainer && (int)$doc['trainee_id'] !== $uid) {
        respondError('Forbidden: You can only delete your own documents', 403);
    }

    // Safely remove local file from disk if applicable
    if (!empty($doc['file_url']) && str_starts_with($doc['file_url'], '/uploads/docs/')) {
        $filePath = realpath(__DIR__ . '/../../../' . ltrim($doc['file_url'], '/'));
        $uploadsBase = realpath(__DIR__ . '/../../../uploads/docs');
        if ($filePath && $uploadsBase && str_starts_with($filePath, $uploadsBase) && file_exists($filePath)) {
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
    error_log('Error deleting trainee doc: ' . $e->getMessage());
    respondError('Server error while deleting document', 500);
}
