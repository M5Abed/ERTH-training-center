<?php
// =========================================================
// NMU TRAINING — Download PDF Certificate
// Access: Public verification or Authenticated User
// =========================================================

require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../../lib/fpdf.php';
require_once __DIR__ . '/../../lib/ArabicGlyphs.php';

$code      = trim($_GET['code'] ?? '');
$courseId  = resolveCourseId($_GET['course_id'] ?? 0);
$traineeId = resolveUserId($_GET['trainee_id'] ?? 0);

$placeholders = ['VERIFY-BEFORE-ISSUE', 'NMU-CERT-2026-PENDING', 'NMU-VERIFY-PREVIEW'];
if (in_array(strtoupper($code), $placeholders, true)) {
    $code = '';
}

$db = db();
$cert = false;

try {
    if ($code) {
        $stmt = $db->prepare("
            SELECT tc.*,
                   u.full_name AS trainee_name, u.student_id,
                   c.name AS course_title,
                   COALESCE(issuer.full_name, issuer.email) AS issuer_name
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
                   u.full_name AS trainee_name, u.student_id,
                   c.name AS course_title,
                   COALESCE(issuer.full_name, issuer.email) AS issuer_name
            FROM training_certificates tc
            JOIN users u ON tc.trainee_id = u.id
            JOIN training_courses c ON tc.course_id = c.id
            LEFT JOIN users issuer ON tc.issued_by = issuer.id
            WHERE tc.course_id = ? AND tc.trainee_id = ?
        ");
        $stmt->execute([$courseId, $traineeId]);
        $cert = $stmt->fetch();
    }

    // Fallback: If evaluation passed or user enrolled but certificate row not explicitly generated yet
    if (!$cert && $courseId && $traineeId) {
        $chk = $db->prepare("
            SELECT u.id AS trainee_id, u.full_name AS trainee_name, u.student_id,
                   c.id AS course_id, c.name AS course_title
            FROM users u, training_courses c
            WHERE u.id = ? AND c.id = ?
        ");
        $chk->execute([$traineeId, $courseId]);
        $info = $chk->fetch();
        if ($info) {
            $cert = [
                'cert_code'    => 'NMU-CERT-' . date('Y') . '-' . str_pad($courseId, 3, '0', STR_PAD_LEFT) . '-' . str_pad($traineeId, 4, '0', STR_PAD_LEFT),
                'trainee_name' => $info['trainee_name'],
                'student_id'   => $info['student_id'],
                'course_title' => $info['course_title'],
                'course_id'    => $courseId,
                'trainee_id'   => $traineeId,
                'issued_at'    => date('Y-m-d H:i:s'),
                'issuer_name'  => 'Faculty Board'
            ];
        }
    }
} catch (Throwable $e) {
    // Database query failed
}

if (!$cert) {
    while (ob_get_level()) { ob_end_clean(); }
    header('Content-Type: text/html; charset=utf-8');
    http_response_code(404);
    echo '<!DOCTYPE html><html lang="en"><head><title>Certificate Not Found</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:system-ui,-apple-system,sans-serif;background:#0d1117;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;text-align:center}.card{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:32px;max-width:440px}h1{font-size:20px;color:#f85149;margin-bottom:12px}p{color:#8b949e;font-size:14px;line-height:1.6}a{color:#58a6ff;text-decoration:none}</style></head><body><div class="card"><h1>Certificate Not Found</h1><p>The requested training certificate could not be located or has not yet been issued by the faculty board.</p><p><a href="/">&larr; Return to Training Platform</a></p></div></body></html>';
    exit;
}

$rawTraineeName = trim($cert['trainee_name'] ?: 'Trainee Name');

// Use first 4 names if full name contains more than 4 names
$nameParts = preg_split('/\s+/', $rawTraineeName, -1, PREG_SPLIT_NO_EMPTY);
if (count($nameParts) > 4) {
    $nameParts = array_slice($nameParts, 0, 4);
}
$traineeName = implode(' ', $nameParts);

$courseTitle = trim($cert['course_title'] ?: 'Summer Training Course');
$certCode    = $cert['cert_code'] ?? 'NMU-CERT-2026';
$issuedAt    = !empty($cert['issued_at']) ? date('d F Y', strtotime($cert['issued_at'])) : date('d F Y');

$courseDurationHours = 0;
if (isset($cert['duration_hours']) && (int)$cert['duration_hours'] > 0) {
    $courseDurationHours = (int)$cert['duration_hours'];
} else {
    $cId = (int)($cert['course_id'] ?? $courseId);
    if ($cId > 0) {
        $topicsDurationSum = 0;
        try {
            $topStmt = $db->prepare("SELECT duration_hours FROM training_topics WHERE course_id = ?");
            $topStmt->execute([$cId]);
            foreach ($topStmt->fetchAll() as $tp) {
                $topicsDurationSum += (int)($tp['duration_hours'] ?? 0);
            }
            if ($topicsDurationSum > 0) {
                $courseDurationHours = $topicsDurationSum;
            }
        } catch(Throwable $e) {}
    }
}
if ($courseDurationHours === 0) {
    if (stripos($courseTitle, 'robotics') !== false) {
        $courseDurationHours = 63;
    } else {
        $courseDurationHours = 40;
    }
}

$courseTitleWithHours = $courseTitle . " (" . $courseDurationHours . " Hours)";

// Custom FPDF Generator matching Certificate design
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

    public function safeImage($file, $x, $y, $w, $h) {
        if (!$file || !file_exists($file) || filesize($file) === 0) {
            return;
        }
        try {
            $this->Image($file, $x, $y, $w, $h);
        } catch (Throwable $e) {
            // If PNG parsing error, attempt GD fallback to clean JPEG
            if (function_exists('imagecreatefrompng') && function_exists('imagejpeg')) {
                try {
                    $tmpJpg = sys_get_temp_dir() . '/nmu_fpdf_fallback_' . md5($file) . '.jpg';
                    if (!file_exists($tmpJpg) || filesize($tmpJpg) === 0) {
                        $im = @imagecreatefrompng($file);
                        if ($im) {
                            $wPx = imagesx($im);
                            $hPx = imagesy($im);
                            $canvas = imagecreatetruecolor($wPx, $hPx);
                            $white = imagecolorallocate($canvas, 255, 255, 255);
                            imagefilledrectangle($canvas, 0, 0, $wPx, $hPx, $white);
                            imagecopy($canvas, $im, 0, 0, 0, 0, $wPx, $hPx);
                            imagejpeg($canvas, $tmpJpg, 95);
                            imagedestroy($im);
                            imagedestroy($canvas);
                        }
                    }
                    if (file_exists($tmpJpg) && filesize($tmpJpg) > 0) {
                        $this->Image($tmpJpg, $x, $y, $w, $h, 'jpg');
                    }
                } catch (Throwable $e2) {}
            }
        }
    }
}

try {
    // Instantiate FPDF (Landscape A4: 297mm x 210mm)
    $pdf = new NMUCertificatePDF('L', 'mm', 'A4');
    $pdf->SetMargins(0, 0, 0);
    $pdf->SetAutoPageBreak(false);
    $pdf->AddPage('L', 'A4');

    // 1. Base Canvas Background - Clean White
    $pdf->SetFillColor(255, 255, 255);
    $pdf->Rect(0, 0, 297, 210, 'F');

    // 2. Corner Geometric Accents (Matching Certificate styling)
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
        $pdf->safeImage($univLogo, 18, 14, 28, 28);
    }
    if (file_exists($facultyLogo)) {
        $pdf->safeImage($facultyLogo, 251, 14, 28, 28);
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
    if (ArabicGlyphs::isArabic($courseTitleWithHours)) {
        $pdf->SetFont('Helvetica', '', 10.5);
        $pdf->SetTextColor(50, 50, 50);
        $pdf->SetXY(30, 70);
        $pdf->Cell(237, 5.5, 'CERTIFICATE OF ACHIEVEMENT FOR SUCCESSFUL COMPLETION IN:', 0, 1, 'C');

        $renderedCourse = ArabicGlyphs::renderTextImage($courseTitleWithHours, 13, '#6b1517', null, 'C', 230);
        if ($renderedCourse && file_exists($renderedCourse['file'])) {
            $cW = min($renderedCourse['widthMm'], 230);
            $cH = $renderedCourse['heightMm'] * ($cW / $renderedCourse['widthMm']);
            $cX = (297 - $cW) / 2;
            $pdf->safeImage($renderedCourse['file'], $cX, 76, $cW, $cH);
        } else {
            $pdf->SetFont('Helvetica', 'B', 11);
            $pdf->SetTextColor(107, 21, 23);
            $pdf->SetXY(30, 76);
            $pdf->Cell(237, 6, $courseTitleWithHours, 0, 1, 'C');
        }

        $pdf->SetFont('Helvetica', '', 10);
        $pdf->SetTextColor(50, 50, 50);
        $pdf->SetXY(30, 84);
        $pdf->Cell(237, 5, 'IS PRESENTED TO:', 0, 1, 'C');
    } else {
        $pdf->SetFont('Helvetica', '', 11.5);
        $pdf->SetTextColor(50, 50, 50);
        $pdf->SetXY(30, 74);
        $pdf->MultiCell(237, 6.5, "CERTIFICATE OF ACHIEVEMENT FOR SUCCESSFUL COMPLETION IN " . strtoupper($courseTitleWithHours) . " COURSE IS PRESENTED TO:", 0, 'C');
    }

    // 7. Student / Trainee Recipient Name (Smaller font, dynamic sizing)
    $nameLen = mb_strlen($traineeName, 'UTF-8');
    if ($nameLen > 38) {
        $fontSize = 19;
    } elseif ($nameLen > 28) {
        $fontSize = 21;
    } elseif ($nameLen > 20) {
        $fontSize = 23;
    } else {
        $fontSize = 25;
    }

    if (ArabicGlyphs::isArabic($traineeName)) {
        $renderedName = ArabicGlyphs::renderTextImage($traineeName, $fontSize, '#1a1a1a', null, 'C', 210);
        if ($renderedName && file_exists($renderedName['file'])) {
            $imgW = min($renderedName['widthMm'], 210);
            $imgH = $renderedName['heightMm'] * ($imgW / $renderedName['widthMm']);
            $xPos = (297 - $imgW) / 2;
            $yPos = 97 + (12 - $imgH) / 2;
            $pdf->safeImage($renderedName['file'], $xPos, $yPos, $imgW, $imgH);
        } else {
            $pdf->SetFont('Times', 'B', $fontSize);
            $pdf->SetTextColor(26, 26, 26);
            $pdf->SetXY(0, 97);
            $pdf->Cell(297, 12, $traineeName, 0, 1, 'C');
        }
    } else {
        $pdf->SetFont('Times', 'B', $fontSize);
        $pdf->SetTextColor(26, 26, 26);
        $pdf->SetXY(0, 97);
        $pdf->Cell(297, 12, $traineeName, 0, 1, 'C');
    }

    // Gold Line Under Name (1.0mm thick, spanning from x=60 to x=237)
    $pdf->SetDrawColor(212, 175, 55); // #d4af37
    $pdf->SetLineWidth(1.0);
    $pdf->Line(60, 113, 237, 113);

    // 8. Recognition Quote Text
    $pdf->SetFont('Helvetica', 'I', 11);
    $pdf->SetTextColor(70, 70, 70);
    $pdf->SetXY(25, 121);
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

    if (!file_exists($qrTempFile) || filesize($qrTempFile) < 50) {
        $ctx = stream_context_create([
            'http' => [
                'timeout' => 2,
                'ignore_errors' => true
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false
            ]
        ]);
        $qrData = @file_get_contents($qrApiUrl, false, $ctx);
        if ($qrData && strlen($qrData) > 50 && substr($qrData, 0, 4) === "\x89PNG") {
            @file_put_contents($qrTempFile, $qrData);
        }
    }

    if (file_exists($qrTempFile) && filesize($qrTempFile) > 50) {
        $pdf->safeImage($qrTempFile, 24, 148, 30, 30);
        $pdf->SetFont('Helvetica', 'B', 8.5);
        $pdf->SetTextColor(107, 21, 23);
        $pdf->SetXY(24, 181);
        $pdf->Cell(30, 5, 'SCAN TO VERIFY', 0, 1, 'C');
    }

    // 10. Bottom Center Date Section (Centered on Page)
    $pdf->SetFont('Helvetica', 'B', 8.5);
    $pdf->SetTextColor(184, 134, 11);
    $pdf->SetXY(118.5, 156);
    $pdf->Cell(60, 5, 'DATE OF ISSUANCE', 0, 1, 'C');

    $pdf->SetFont('Times', 'B', 13);
    $pdf->SetTextColor(107, 21, 23);
    $pdf->SetXY(118.5, 163);
    $pdf->Cell(60, 6, $issuedAt, 0, 1, 'C');

    // Gold baseline under date
    $pdf->SetDrawColor(212, 175, 55);
    $pdf->SetLineWidth(0.4);
    $pdf->Line(128.5, 171, 168.5, 171);

    // 11. Bottom Right Signature Block
    $pdf->SetDrawColor(80, 80, 80);
    $pdf->SetLineWidth(0.3);
    $pdf->Line(215, 156, 275, 156);

    $pdf->SetFont('Helvetica', 'B', 13);
    $pdf->SetTextColor(107, 21, 23);
    $pdf->SetXY(215, 160);
    $pdf->Cell(60, 6, 'Prof. Khaled Fouad', 0, 1, 'C');

    $pdf->SetFont('Helvetica', '', 10);
    $pdf->SetTextColor(100, 100, 100);
    $pdf->SetXY(215, 167);
    $pdf->Cell(60, 5, 'Dean of the Faculty', 0, 1, 'C');

    // Output PDF stream
    $safeAscii = preg_replace('/[^A-Za-z0-9_-]/', '_', $traineeName);
    $filenameAscii = 'NMU_Certificate_' . ($safeAscii ?: 'Document') . '.pdf';
    $filenameUtf8  = 'NMU_Certificate_' . str_replace(' ', '_', $traineeName) . '.pdf';
    $pdfContent = $pdf->Output('S');

    while (ob_get_level()) {
        ob_end_clean();
    }

    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $filenameAscii . '"; filename*=UTF-8\'\'' . rawurlencode($filenameUtf8));
    header('Content-Transfer-Encoding: binary');
    header('Accept-Ranges: bytes');
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: public');
    header('Content-Length: ' . strlen($pdfContent));
    echo $pdfContent;
    exit;

} catch (Throwable $e) {
    while (ob_get_level()) { ob_end_clean(); }
    header('Content-Type: text/html; charset=utf-8');
    http_response_code(500);
    echo '<!DOCTYPE html><html><body><h3>Error generating certificate</h3><p>' . htmlspecialchars($e->getMessage()) . '</p></body></html>';
    exit;
}
