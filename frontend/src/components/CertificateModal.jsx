import React, { useState, useEffect, useRef } from 'react';
import { Award, Download, Printer, CheckCircle, ExternalLink, X, ShieldCheck, Loader2 } from 'lucide-react';
import './CertificateModal.css';

export default function CertificateModal({
  isOpen,
  onClose,
  certificate,
  trainee,
  course,
  courseId,
  traineeId,
  studentName,
  courseTitle,
  issueDate,
  certCode,
  downloadUrl,
  isPendingIssuance = false,
  onConfirmIssuance,
  issuing = false,
  trainers = []
}) {
  const [copied, setCopied] = useState(false);
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);

  // Dynamic scaling logic
  useEffect(() => {
    if (!wrapperRef.current) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        // The certificate intrinsic size is 820x580 (aspect ratio 1.414)
        // Add some padding inside the wrapper
        const availableWidth = width - 32; 
        const availableHeight = height - 32;
        
        const scaleX = availableWidth / 820;
        const scaleY = availableHeight / 580;
        
        // Use the smaller scale to ensure it fits both horizontally and vertically
        const newScale = Math.min(scaleX, scaleY, 1); // Max scale is 1
        setScale(newScale);
      }
    });
    
    resizeObserver.observe(wrapperRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  if (!isOpen) return null;

  const finalTraineeName = studentName || certificate?.trainee_name_en || trainee?.full_name_en || trainee?.name || 'Trainee Name';
  const rawCourseTitle = courseTitle || certificate?.course_title_en || course?.title_en || course?.title || 'Summer Training Course';
  const finalCourseTitle = rawCourseTitle.toUpperCase();

  const realCertCode = (certCode && certCode !== 'VERIFY-BEFORE-ISSUE' && certCode !== 'NMU-CERT-2026-PENDING')
    ? certCode 
    : certificate?.cert_code;

  const finalCertCode = realCertCode || (isPendingIssuance ? 'VERIFY-BEFORE-ISSUE' : 'NMU-CERT-2026-PENDING');

  const finalIssuedDate = issueDate || (certificate?.issued_at
    ? new Date(certificate.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }));

  const courseIdVal  = courseId || course?.id || certificate?.course_id;
  const traineeIdVal = traineeId || trainee?.id || certificate?.trainee_id;

  const finalDownloadUrl = downloadUrl || `/api/training/certificates/download.php?${
    realCertCode
      ? `code=${realCertCode}`
      : `course_id=${courseIdVal || ''}&trainee_id=${traineeIdVal || ''}`
  }&_t=${Date.now()}`;

  const queryParams = new URLSearchParams();
  if (realCertCode) queryParams.set('code', realCertCode);
  if (courseIdVal) queryParams.set('course_id', courseIdVal);
  if (traineeIdVal) queryParams.set('trainee_id', traineeIdVal);

  const verifyUrl = `${window.location.origin}/verify-certificate?${queryParams.toString()}`;
  const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;

  const handleCopyLink = () => {
    if (isPendingIssuance) return;
    navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    if (isPendingIssuance || !finalDownloadUrl) return;
    const printWindow = window.open(finalDownloadUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  return (
    <div className="cert-modal-backdrop" onClick={onClose}>
      <div className="cert-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Top Header Bar */}
        <div className="cert-modal-header">
          <div className="cert-modal-title">
            <Award className="cert-header-icon" />
            <div>
              <h3>{isPendingIssuance ? 'Certificate Verification & Preview' : 'Official Completion Certificate'}</h3>
              <p className="cert-subtitle">Issued by New Mansoura University - Faculty of Computer Science & Engineering</p>
            </div>
          </div>
          <button className="cert-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Verification Alert Banner for Admin/Trainer */}
        {isPendingIssuance && (
          <div className="cert-verification-banner">
            <ShieldCheck className="banner-icon" />
            <div>
              <strong>Verification Mode / وضع التدقيق والمعاينة:</strong>
              <span>
                Please verify the student name, course title, and details below before issuing and sending the official certificate to the student.
              </span>
            </div>
          </div>
        )}

        {/* Certificate Graphic Canvas Preview */}
        <div className="cert-preview-wrapper" ref={wrapperRef}>
          <div className="cert-canvas" style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}>
            {/* Top Corner Geometric Accents */}
            <div className="cert-corner-tl-red"></div>
            <div className="cert-corner-tl-gold"></div>
            <div className="cert-corner-tr-red"></div>
            <div className="cert-corner-tr-gold"></div>

            {/* University & Faculty Logos Header */}
            <div className="cert-seals-header">
              <img src="/assets/university_logo.png" alt="New Mansoura University" className="cert-logo-img" />
              <div className="cert-header-titles">
                <h3 className="cert-univ-title">NEW MANSOURA UNIVERSITY</h3>
                <h4 className="cert-faculty-title">Faculty of Computer Science & Engineering</h4>
              </div>
              <img src="/assets/faculty_logo.png" alt="Faculty of CS & Engineering" className="cert-logo-img" />
            </div>

            {/* Certificate Header */}
            <h1 className="cert-main-title">CERTIFICATE</h1>
            <p className="cert-achievement-text">
              CERTIFICATE OF ACHIEVEMENT FOR <strong>SUCCESSFUL COMPLETION</strong> IN {finalCourseTitle} COURSE IS PRESENTED TO:
            </p>

            {/* Student Name */}
            <div className="cert-name-container">
              <h2 className="cert-recipient-name">{finalTraineeName}</h2>
              <div className="cert-name-underline"></div>
            </div>

            {/* Recognition Text */}
            <p className="cert-recognition-quote">
              Awarded with distinction in recognition of exceptional technical competence, innovative problem-solving, and outstanding academic performance throughout the specialized university training program.
            </p>

            {/* Bottom Elements: Left QR Code, Center Date Ribbon, Right Signatures */}
            <div className="cert-bottom-row">
              {/* Left QR Code Block */}
              <div className="cert-qr-block">
                <img src={qrCodeImageUrl} alt="Scan to Verify" className="cert-qr-img" />
                <span className="qr-scan-text">SCAN TO VERIFY</span>
              </div>

              {/* Center Date Section */}
              <div className="cert-date-ribbon">
                <span className="date-label">DATE OF ISSUANCE</span>
                <span className="date-value">{finalIssuedDate}</span>
              </div>

              {/* Signatures Block Container */}
              <div style={{ display: 'flex', gap: '3cqi', justifySelf: 'end' }}>
                {/* Supervisor Block */}
                {trainers && trainers.length > 0 && (
                  <div className="cert-signature-block">
                    <div className="signature-line"></div>
                    <strong className="signatory-name">{trainers[0].full_name_en || trainers[0].name || trainers[0].username || 'Trainer'}</strong>
                    <span className="signatory-title">Course Supervisor</span>
                  </div>
                )}
                
                {/* Dean Signature Block */}
                <div className="cert-signature-block">
                  <div className="signature-line"></div>
                  <strong className="signatory-name">Prof. Khaled Fouad</strong>
                  <span className="signatory-title">Dean of the Faculty</span>
                </div>
              </div>
            </div>

            {/* Bottom Geometric Corner Accents */}
            <div className="cert-corner-bl-red"></div>
            <div className="cert-corner-br-red"></div>
          </div>
        </div>

        {/* Modal Action Bar */}
        <div className="cert-modal-actions">
          <div className="cert-code-pill">
            <span className="pill-label">Verification Code:</span>
            <code className="pill-code">{finalCertCode}</code>
          </div>

          <div className="cert-action-buttons">
            {isPendingIssuance ? (
              <>
                <button className="cert-btn secondary" onClick={onClose}>
                  Cancel / إلغاء
                </button>
                <button className="cert-btn confirm-issuance-btn" onClick={onConfirmIssuance} disabled={issuing}>
                  {issuing ? <Loader2 className="spin" size={16} /> : <CheckCircle size={16} />}
                  Confirm & Send Certificate to Student / تأكيد وإرسال الشهادة للطالب
                </button>
              </>
            ) : (
              <>
                <button className="cert-btn secondary" onClick={handleCopyLink}>
                  {copied ? <CheckCircle size={16} /> : <ExternalLink size={16} />}
                  {copied ? 'Link Copied!' : 'Share Link'}
                </button>
                <button className="cert-btn secondary" onClick={handlePrint}>
                  <Printer size={16} />
                  Print
                </button>
                <a
                  href={finalDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cert-btn primary"
                  download={`NMU_Certificate_${finalTraineeName.replace(/\s+/g, '_')}.pdf`}
                >
                  <Download size={16} />
                  Download PDF Certificate
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
