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

    $del = $db->prepare("DELETE FROM trainee_documentation WHERE id = ?");
    $del->execute([$docId]);

    respond([
        'success' => true,
        'message' => 'Document deleted successfully'
    ]);
} catch (Throwable $e) {
    respondError('Server error: ' . $e->getMessage(), 500);
}
