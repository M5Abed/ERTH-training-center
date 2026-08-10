<?php
// =========================================================
// NMU TRAINING — Download PDF Certificate
// Access: Public verification or Authenticated User
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../lib/fpdf.php';

$code      = trim($_GET['code'] ?? '');
$courseId  = (int)($_GET['course_id'] ?? 0);
$traineeId = (int)($_GET['trainee_id'] ?? 0);

$placeholders = ['VERIFY-BEFORE-ISSUE', 'NMU-CERT-2026-PENDING', 'NMU-VERIFY-PREVIEW'];
if (in_array(strtoupper($code), $placeholders)) {
    $code = '';
}

$db = db();
$cert = false;

if ($code) {
    $stmt = $db->prepare("
        SELECT tc.*,
               COALESCE(u.full_name_en, u.username) AS trainee_name_en, u.student_id,
               c.name_en AS course_title_en,
               COALESCE(issuer.full_name_en, issuer.username) AS issuer_name
        FROM training_certificates tc
        JOIN users u ON tc.trainee_id = u.id
        JOIN training_courses c ON tc.course_id = c.id
        LEFT JOIN users issuer ON tc.issued_by = issuer.id
        WHERE tc.cert_code = ?
    ");
    $stmt->execute([$code]);
    $cert = $stmt->fetch();
}

if (!$cert && $courseId && $traineeId) {
    $stmt = $db->prepare("
        SELECT tc.*,
               COALESCE(u.full_name_en, u.username) AS trainee_name_en, u.student_id,
               c.name_en AS course_title_en,
               COALESCE(issuer.full_name_en, issuer.username) AS issuer_name
        FROM training_certificates tc
        JOIN users u ON tc.trainee_id = u.id
        JOIN training_courses c ON tc.course_id = c.id
        LEFT JOIN users issuer ON tc.issued_by = issuer.id
        WHERE tc.course_id = ? AND tc.trainee_id = ?
    ");
    $stmt->execute([$courseId, $traineeId]);
    $cert = $stmt->fetch();
}

if (!$cert && $courseId && $traineeId) {
    $chk = $db->prepare("
        SELECT COALESCE(u.full_name_en, u.username) AS trainee_name_en,
               c.name_en AS course_title_en
        FROM users u, training_courses c
        WHERE u.id = ? AND c.id = ?
    ");
    $chk->execute([$traineeId, $courseId]);
    $info = $chk->fetch();
    if ($info) {
        $cert = [
            'cert_code'       => 'NMU-VERIFY-PREVIEW',
            'issued_at'       => date('Y-m-d H:i:s'),
            'trainee_name_en' => $info['trainee_name_en'],
            'course_title_en' => $info['course_title_en'],
            'issuer_name'     => 'Prof. Khaled Fouad'
        ];
    }
}

if (!$cert) {
    respondError('Certificate not found or not yet issued', 404);
}

$traineeName = trim($cert['trainee_name_en'] ?: 'Trainee Name');
$courseTitle = trim($cert['course_title_en'] ?: 'Summer Training Course');
$certCode    = $cert['cert_code'];
$issuedAt    = $cert['issued_at'] ? date('d F Y', strtotime($cert['issued_at'])) : date('d F Y');

// Custom FPDF Generator matching CertificateModal.jsx layout & CSS corner triangles exactly
class NMUCertificatePDF extends FPDF {
    public function drawFilledPolygon($points, $r, $g, $b) {
        $this->SetFillColor($r, $g, $b);
        $h = 210; // Page height in mm (A4 Landscape: 297mm x 210mm)
        $k = $this->k;
        $s = '';
        $op = 'm';
        foreach ($points as $p) {
            $x = $p[0] * $k;
            $y = ($h - $p[1]) * $k;
            $s .= sprintf('%.2F %.2F %s ', $x, $y, $op);
            $op = 'l';
        }
        $s .= 'f';
        $this->_out($s);
    }
}

// Instantiate FPDF (Landscape A4: 297mm x 210mm)
$pdf = new NMUCertificatePDF('L', 'mm', 'A4');
$pdf->SetMargins(0, 0, 0);
$pdf->SetAutoPageBreak(false);
$pdf->AddPage('L', 'A4');

// 1. Base Canvas Background - Clean White
$pdf->SetFillColor(255, 255, 255);
$pdf->Rect(0, 0, 297, 210, 'F');

// 2. Corner Geometric Accents (Matching CertificateModal.css border-triangles exactly)
// Top-Left Red Triangle (Underneath)
$pdf->drawFilledPolygon([[0,0], [78,0], [0,28]], 107, 21, 23); // #6b1517

// Top-Left Gold Triangle (On Top)
$pdf->drawFilledPolygon([[0,0], [96,0], [0,12]], 230, 173, 18); // #e6ad12

// Top-Right Red Triangle (Underneath)
$pdf->drawFilledPolygon([[297,0], [219,0], [297,28]], 107, 21, 23); // #6b1517

// Top-Right Gold Triangle (On Top)
$pdf->drawFilledPolygon([[297,0], [201,0], [297,12]], 230, 173, 18); // #e6ad12

// Bottom-Left Red Triangle
$pdf->drawFilledPolygon([[0,210], [68,210], [0,201]], 107, 21, 23); // #6b1517

// Bottom-Right Red Triangle
$pdf->drawFilledPolygon([[297,210], [229,210], [297,201]], 107, 21, 23); // #6b1517

// 3. University & Faculty Logos
$univLogo = __DIR__ . '/../../assets/university_logo.png';
if (!file_exists($univLogo)) {
    $univLogo = __DIR__ . '/../../assets/nmu_logo.png';
}
$facultyLogo = __DIR__ . '/../../assets/faculty_logo.png';

if (file_exists($univLogo)) {
    $pdf->Image($univLogo, 18, 14, 28, 28);
}
if (file_exists($facultyLogo)) {
    $pdf->Image($facultyLogo, 251, 14, 28, 28);
}

// 4. Header Titles (Center - Clean White Area)
$pdf->SetFont('Times', 'B', 22);
$pdf->SetTextColor(107, 21, 23); // #6b1517
$pdf->SetXY(0, 18);
$pdf->Cell(297, 10, 'NEW MANSOURA UNIVERSITY', 0, 1, 'C');

$pdf->SetFont('Helvetica', 'B', 13);
$pdf->SetTextColor(184, 134, 11); // #b8860b
$pdf->SetXY(0, 29);
$pdf->Cell(297, 7, 'Faculty of Computer Science & Engineering', 0, 1, 'C');

// 5. Main Certificate Title (42pt)
$pdf->SetFont('Times', 'B', 42);
$pdf->SetTextColor(107, 21, 23); // #6b1517
$pdf->SetXY(0, 50);
$pdf->Cell(297, 16, 'CERTIFICATE', 0, 1, 'C');

// 6. Achievement Subtitle Line
$pdf->SetFont('Helvetica', '', 11.5);
$pdf->SetTextColor(50, 50, 50);
$pdf->SetXY(30, 74);
$pdf->MultiCell(237, 6.5, "CERTIFICATE OF ACHIEVEMENT FOR SUCCESSFUL COMPLETION IN " . strtoupper($courseTitle) . " COURSE IS PRESENTED TO:", 0, 'C');

// 7. Student / Trainee Recipient Name (38pt Bold)
$pdf->SetFont('Times', 'B', 38);
$pdf->SetTextColor(26, 26, 26);
$pdf->SetXY(0, 98);
$pdf->Cell(297, 15, $traineeName, 0, 1, 'C');

// Gold Line Under Name (1.0mm thick, spanning from x=50 to x=247)
$pdf->SetDrawColor(212, 175, 55); // #d4af37
$pdf->SetLineWidth(1.0);
$pdf->Line(50, 117, 247, 117);

// 8. Recognition Quote Text (Elevated Formal Academic Wording)
$pdf->SetFont('Helvetica', 'I', 11.5);
$pdf->SetTextColor(70, 70, 70);
$pdf->SetXY(25, 126);
$pdf->MultiCell(247, 5.5, 'Awarded with distinction in recognition of exceptional technical competence, innovative problem-solving, and outstanding academic performance throughout the specialized university training program.', 0, 'C');

// 9. Bottom Left Verification QR Code
$scheme      = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https://' : 'http://';
$host        = $_SERVER['HTTP_HOST'] ?? 'localhost:5173';
$verifyQuery = ($certCode && $certCode !== 'NMU-VERIFY-PREVIEW')
    ? ('code=' . urlencode($certCode))
    : ("course_id={$courseId}&trainee_id={$traineeId}");

$verifyUrl   = $scheme . $host . '/verify-certificate?' . $verifyQuery;
$qrApiUrl    = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode($verifyUrl);
$qrTempFile  = sys_get_temp_dir() . '/nmu_qr_' . md5($verifyQuery) . '.png';

if (!file_exists($qrTempFile)) {
    $qrData = @file_get_contents($qrApiUrl);
    if ($qrData) {
        file_put_contents($qrTempFile, $qrData);
    }
}

if (file_exists($qrTempFile)) {
    $pdf->Image($qrTempFile, 24, 148, 30, 30);
    $pdf->SetFont('Helvetica', 'B', 8.5);
    $pdf->SetTextColor(107, 21, 23);
    $pdf->SetXY(24, 181);
    $pdf->Cell(30, 5, 'SCAN TO VERIFY', 0, 1, 'C');
}

// 10. Bottom Center Date Section
$pdf->SetFont('Helvetica', 'B', 8.5);
$pdf->SetTextColor(184, 134, 11);
$pdf->SetXY(108.5, 156);
$pdf->Cell(80, 5, 'DATE OF ISSUANCE', 0, 1, 'C');

$pdf->SetFont('Times', 'B', 13);
$pdf->SetTextColor(107, 21, 23);
$pdf->SetXY(108.5, 163);
$pdf->Cell(80, 6, $issuedAt, 0, 1, 'C');

// Gold baseline under date
$pdf->SetDrawColor(212, 175, 55);
$pdf->SetLineWidth(0.4);
$pdf->Line(118.5, 171, 178.5, 171);

// 11. Bottom Right Signature Block
$pdf->SetDrawColor(80, 80, 80);
$pdf->SetLineWidth(0.3);
$pdf->Line(200, 156, 270, 156);

$pdf->SetFont('Helvetica', 'B', 13);
$pdf->SetTextColor(107, 21, 23);
$pdf->SetXY(200, 160);
$pdf->Cell(70, 6, 'Prof. Khaled Fouad', 0, 1, 'C');

$pdf->SetFont('Helvetica', '', 10);
$pdf->SetTextColor(100, 100, 100);
$pdf->SetXY(200, 167);
$pdf->Cell(70, 5, 'Dean of the Faculty', 0, 1, 'C');

// Output PDF
$filename = 'NMU_Certificate_' . preg_replace('/[^A-Za-z0-9_-]/', '_', $traineeName) . '.pdf';
$pdfContent = $pdf->Output('S');

while (ob_get_level()) {
    ob_end_clean();
}
header_remove();
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Content-Type: application/pdf');
header('Content-Disposition: inline; filename="' . $filename . '"');
header('Content-Length: ' . strlen($pdfContent));
echo $pdfContent;
exit;
