<?php
// =========================================================
// NMU TRAINING — AI Proposal Generator Helper
// Access: Trainee or Trainer
// =========================================================

require_once __DIR__ . '/../../config.php';

requireRole(['trainee', 'trainer', 'admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respondError('Method not allowed', 405);
}

$data = body();
$keywords = sanitizeString($data['keywords'] ?? '');
$domain   = sanitizeString($data['domain'] ?? 'Software Engineering');

if (!$keywords) {
    respondError('Please provide keywords or a short summary for AI generation');
}

// Built-in intelligent template generator for university summer training projects
$titleEn = "Smart System for " . ucwords($keywords);
$titleAr = "نظام ذكي لـ " . $keywords;

$problemEn = "Current manual processes in $domain lack real-time visibility, automated tracking, and data integrity. Trainees will design a web solution for " . $keywords . " to optimize workflow efficiency.";
$problemAr = "تفتقر العمليات اليدوية الحالية في $domain إلى الشفافية والتتبع الفوري. سيقوم المتدربون بتصميم حل تقني لـ $keywords لرفع كفاءة العمل.";

$descriptionEn = "This university summer training project focuses on building a full-stack web application tailored for " . $keywords . ". It includes user authentication, role-based access control, responsive dashboards, and automated report generation.";
$descriptionAr = "يركز هذا المشروع التدريبي على بناء تطبيق ويب متكامل مخصص لـ " . $keywords . ". ويتضمن نظام توثيق للمستخدمين، وصلاحيات حسب الأدوار، ولوحات تحكم تفاعلية، وتوليد تقارير آلياً.";

$techStack = "React.js / Vite, PHP 8 (REST API), MySQL 8.0, HTML5/CSS3, Docker";
$expectedOutput = "1. Fully functional Web Application\n2. Database Schema (ERD)\n3. Technical Documentation & User Guide\n4. Final Presentation Slides";

respond([
    'success' => true,
    'proposal' => [
        'title_en'           => $titleEn,
        'title_ar'           => $titleAr,
        'description_en'     => $descriptionEn,
        'description_ar'     => $descriptionAr,
        'problem_statement' => $problemEn,
        'tech_stack'        => $techStack,
        'expected_output'   => $expectedOutput
    ]
]);
