<?php
// =========================================================
// ArabicGlyphs — Full Arabic Text Reshaper & BiDi Renderer for PHP
// =========================================================

class ArabicGlyphs {

    private static $glyphs = [
        // [Unshaped, Isolated, Final, Initial, Medial]
        0x0621 => [0xFE80, 0xFE80, 0xFE80, 0xFE80], // Hamza (Non-connecting)
        0x0622 => [0xFE81, 0xFE82, 0xFE81, 0xFE82], // Alef with Madda (Right-connecting)
        0x0623 => [0xFE83, 0xFE84, 0xFE83, 0xFE84], // Alef with Hamza Above (Right-connecting)
        0x0624 => [0xFE85, 0xFE86, 0xFE85, 0xFE86], // Waw with Hamza (Right-connecting)
        0x0625 => [0xFE87, 0xFE88, 0xFE87, 0xFE88], // Alef with Hamza Below (Right-connecting)
        0x0626 => [0xFE89, 0xFE8A, 0xFE8B, 0xFE8C], // Yeh with Hamza (Dual-connecting)
        0x0627 => [0xFE8D, 0xFE8E, 0xFE8D, 0xFE8E], // Alef (Right-connecting)
        0x0628 => [0xFE8F, 0xFE90, 0xFE91, 0xFE92], // Beh (Dual-connecting)
        0x0629 => [0xFE93, 0xFE94, 0xFE93, 0xFE94], // Teh Marbuta (Right-connecting)
        0x062A => [0xFE95, 0xFE96, 0xFE97, 0xFE98], // Teh (Dual-connecting)
        0x062B => [0xFE99, 0xFE9A, 0xFE9B, 0xFE9C], // Theh (Dual-connecting)
        0x062C => [0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0], // Jeem (Dual-connecting)
        0x062D => [0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4], // Hah (Dual-connecting)
        0x062E => [0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8], // Khah (Dual-connecting)
        0x062F => [0xFEA9, 0xFEAA, 0xFEA9, 0xFEAA], // Dal (Right-connecting)
        0x0630 => [0xFEAB, 0xFEAC, 0xFEAB, 0xFEAC], // Thal (Right-connecting)
        0x0631 => [0xFEAD, 0xFEAE, 0xFEAD, 0xFEAE], // Reh (Right-connecting)
        0x0632 => [0xFEAF, 0xFEB0, 0xFEAF, 0xFEB0], // Zain (Right-connecting)
        0x0633 => [0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4], // Seen (Dual-connecting)
        0x0634 => [0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8], // Sheen (Dual-connecting)
        0x0635 => [0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC], // Sad (Dual-connecting)
        0x0636 => [0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0], // Dad (Dual-connecting)
        0x0637 => [0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4], // Tah (Dual-connecting)
        0x0638 => [0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8], // Zah (Dual-connecting)
        0x0639 => [0xFEC9, 0xFECA, 0xFECB, 0xFECC], // Ain (Dual-connecting)
        0x063A => [0xFECD, 0xFECE, 0xFECF, 0xFED0], // Ghain (Dual-connecting)
        0x0640 => [0x0640, 0x0640, 0x0640, 0x0640], // Tatweel
        0x0641 => [0xFED1, 0xFED2, 0xFED3, 0xFED4], // Feh (Dual-connecting)
        0x0642 => [0xFED5, 0xFED6, 0xFED7, 0xFED8], // Qaf (Dual-connecting)
        0x0643 => [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC], // Kaf (Dual-connecting)
        0x0644 => [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0], // Lam (Dual-connecting)
        0x0645 => [0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4], // Meem (Dual-connecting)
        0x0646 => [0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8], // Noon (Dual-connecting)
        0x0647 => [0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC], // Heh (Dual-connecting)
        0x0648 => [0xFEED, 0xFEEE, 0xFEED, 0xFEEE], // Waw (Right-connecting)
        0x0649 => [0xFEEF, 0xFEF0, 0xFE8B, 0xFE8C], // Alef Maksura
        0x064A => [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4], // Yeh (Dual-connecting)
        0x067E => [0xFB56, 0xFB57, 0xFB58, 0xFB59], // Peh
        0x0686 => [0xFB7A, 0xFB7B, 0xFB7C, 0xFB7D], // Tcheh
        0x0698 => [0xFB8A, 0xFB8B, 0xFB8A, 0xFB8B], // Jeh
        0x06AF => [0xFB92, 0xFB93, 0xFB94, 0xFB95], // Gaf
    ];

    // Lam-Alef Ligatures
    private static $lamAlef = [
        0x0622 => [0xFEF5, 0xFEF6], // Madda: Isolated, Final
        0x0623 => [0xFEF7, 0xFEF8], // Hamza Above: Isolated, Final
        0x0625 => [0xFEF9, 0xFEFA], // Hamza Below: Isolated, Final
        0x0627 => [0xFEFB, 0xFEFC], // Plain Alef: Isolated, Final
    ];

    // Non-left-connecting characters (only connect to the right)
    private static $rightOnly = [
        0x0621, 0x0622, 0x0623, 0x0624, 0x0625, 0x0627, 0x0629, 0x062F, 0x0630, 0x0631, 0x0632, 0x0648, 0x0649
    ];

    public static function isArabic($str) {
        return (bool)preg_match('/[\x{0600}-\x{06FF}\x{FB50}-\x{FDFF}\x{FE70}-\x{FEFF}]/u', $str);
    }

    private static function charToCode($char) {
        $k = mb_convert_encoding($char, 'UCS-2LE', 'UTF-8');
        $k1 = ord($k[0]);
        $k2 = ord($k[1]);
        return $k2 * 256 + $k1;
    }

    private static function codeToChar($code) {
        return mb_convert_encoding(chr($code % 256) . chr(floor($code / 256)), 'UTF-8', 'UCS-2LE');
    }

    public static function shape($text) {
        if (!self::isArabic($text)) {
            return $text;
        }

        // Remove tashkeel/harakat for clean rendering
        $clean = preg_replace('/[\x{064B}-\x{065F}\x{0670}]/u', '', $text);
        $len = mb_strlen($clean, 'UTF-8');
        $codes = [];
        for ($i = 0; $i < $len; $i++) {
            $codes[] = self::charToCode(mb_substr($clean, $i, 1, 'UTF-8'));
        }

        $shaped = [];
        $i = 0;
        $total = count($codes);

        while ($i < $total) {
            $curr = $codes[$i];
            $prev = ($i > 0) ? $codes[$i - 1] : 0;
            $next = ($i < $total - 1) ? $codes[$i + 1] : 0;

            // Check Lam-Alef Ligature
            if ($curr === 0x0644 && $next && isset(self::$lamAlef[$next])) {
                $prevConnects = $prev && isset(self::$glyphs[$prev]) && !in_array($prev, self::$rightOnly);
                $ligatureForm = $prevConnects ? self::$lamAlef[$next][1] : self::$lamAlef[$next][0];
                $shaped[] = $ligatureForm;
                $i += 2;
                continue;
            }

            if (!isset(self::$glyphs[$curr])) {
                $shaped[] = $curr;
                $i++;
                continue;
            }

            $prevConnects = $prev && isset(self::$glyphs[$prev]) && !in_array($prev, self::$rightOnly);
            $nextConnects = $next && isset(self::$glyphs[$next]);

            if ($curr === 0x0621) {
                // Hamza is always isolated
                $form = 0;
            } elseif (!$prevConnects && !$nextConnects) {
                $form = 0; // Isolated
            } elseif ($prevConnects && !$nextConnects) {
                $form = 1; // Final
            } elseif (!$prevConnects && $nextConnects) {
                $form = in_array($curr, self::$rightOnly) ? 0 : 2; // Initial (or Isolated if right-only)
            } else {
                $form = in_array($curr, self::$rightOnly) ? 1 : 3; // Medial (or Final if right-only)
            }

            $shaped[] = self::$glyphs[$curr][$form];
            $i++;
        }

        // Convert back to string
        $result = '';
        foreach ($shaped as $c) {
            $result .= self::codeToChar($c);
        }

        return $result;
    }

    /**
     * Reshape and reorder for BiDi (Right-to-Left) rendering in GD / PDF
     */
    public static function bidiReorder($text) {
        $shaped = self::shape($text);
        
        // Split by lines or process words
        // For GD rendering, reverse Arabic tokens so they draw Right-to-Left
        $words = preg_split('/(\s+)/u', $shaped, -1, PREG_SPLIT_DELIM_CAPTURE);
        $outputWords = [];

        foreach ($words as $word) {
            if (self::isArabic($word)) {
                // Reverse characters of the Arabic word
                $chars = [];
                $wLen = mb_strlen($word, 'UTF-8');
                for ($k = $wLen - 1; $k >= 0; $k--) {
                    $chars[] = mb_substr($word, $k, 1, 'UTF-8');
                }
                $outputWords[] = implode('', $chars);
            } else {
                $outputWords[] = $word;
            }
        }

        // Reverse overall word order for RTL sentence flow
        return implode('', array_reverse($outputWords));
    }

    /**
     * Render crisp high-resolution text onto a transparent PNG image using GD + FreeType
     * Returns the path to the temp PNG file.
     */
    public static function renderTextImage($text, $fontSizePt, $fontColorHex, $fontFile = null, $align = 'C', $maxWidthMm = 297) {
        if (!function_exists('imagecreatetruecolor')) {
            return null;
        }

        // Detect or choose font
        if (!$fontFile || !file_exists($fontFile)) {
            $candidates = [
                __DIR__ . '/../assets/fonts/arialbd.ttf',
                __DIR__ . '/../assets/fonts/arial.ttf',
                __DIR__ . '/../assets/fonts/tahomabd.ttf',
                __DIR__ . '/../assets/fonts/tahoma.ttf',
                'C:/Windows/Fonts/arialbd.ttf',
                'C:/Windows/Fonts/arial.ttf',
                'C:/Windows/Fonts/tahoma.ttf',
                'C:/Windows/Fonts/segoeuib.ttf',
                'C:/Windows/Fonts/segoeui.ttf',
            ];
            foreach ($candidates as $c) {
                if (file_exists($c)) {
                    $fontFile = $c;
                    break;
                }
            }
        }

        if (!$fontFile || !file_exists($fontFile)) {
            return null;
        }

        $isAr = self::isArabic($text);
        $renderText = $isAr ? self::bidiReorder($text) : $text;

        // Render at 300 DPI (approx 4.16x standard 72 DPI points) for vector-sharp clarity
        $scale = 4.0;
        $fontSizePx = (int)round($fontSizePt * $scale * 0.95);

        // Calculate bounding box
        $bbox = @imagettfbbox($fontSizePx, 0, $fontFile, $renderText);
        if (!$bbox) {
            return null;
        }

        $minX = min($bbox[0], $bbox[2], $bbox[4], $bbox[6]);
        $maxX = max($bbox[0], $bbox[2], $bbox[4], $bbox[6]);
        $minY = min($bbox[1], $bbox[3], $bbox[5], $bbox[7]);
        $maxY = max($bbox[1], $bbox[3], $bbox[5], $bbox[7]);

        $padX = (int)(20 * $scale);
        $padY = (int)(20 * $scale);
        $widthPx  = ($maxX - $minX) + ($padX * 2);
        $heightPx = ($maxY - $minY) + ($padY * 2);

        $img = imagecreatetruecolor($widthPx, $heightPx);
        imagealphablending($img, false);
        imagesavealpha($img, true);

        $transparent = imagecolorallocatealpha($img, 255, 255, 255, 127);
        imagefilledrectangle($img, 0, 0, $widthPx, $heightPx, $transparent);
        imagealphablending($img, true);

        // Parse hex color
        $hex = ltrim($fontColorHex, '#');
        if (strlen($hex) === 3) {
            $r = hexdec(str_repeat(substr($hex, 0, 1), 2));
            $g = hexdec(str_repeat(substr($hex, 1, 1), 2));
            $b = hexdec(str_repeat(substr($hex, 2, 1), 2));
        } else {
            $r = hexdec(substr($hex, 0, 2));
            $g = hexdec(substr($hex, 2, 2));
            $b = hexdec(substr($hex, 4, 2));
        }

        $textColor = imagecolorallocate($img, $r, $g, $b);

        $drawX = $padX - $minX;
        $drawY = $padY - $minY;

        imagettftext($img, $fontSizePx, 0, $drawX, $drawY, $textColor, $fontFile, $renderText);

        $tempFile = sys_get_temp_dir() . '/nmu_text_' . md5($text . $fontSizePt . $fontColorHex) . '.png';
        imagepng($img, $tempFile, 9);
        imagedestroy($img);

        // Return image details and mm dimensions for FPDF
        // In FPDF mm: 1 pt = 0.352778 mm
        $widthMm = ($widthPx / $scale) * 0.352778;
        $heightMm = ($heightPx / $scale) * 0.352778;

        return [
            'file'     => $tempFile,
            'widthMm'  => $widthMm,
            'heightMm' => $heightMm,
            'widthPx'  => $widthPx,
            'heightPx' => $heightPx
        ];
    }
}
