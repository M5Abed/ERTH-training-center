import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, Award, Calendar, Clock, BookOpen, User, 
  CheckCircle2, Download, AlertTriangle, ArrowLeft, Search, 
  Check, QrCode, Sparkles, RefreshCw
} from 'lucide-react';
import './CertificateVerification.css';

export default function CertificateVerification() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const certCode = searchParams.get('code') || '';
  const courseId = searchParams.get('course_id') || '';
  const traineeId = searchParams.get('trainee_id') || '';

  const [inputCode, setInputCode] = useState(certCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  // Sync input field when URL code changes
  useEffect(() => {
    setInputCode(certCode);
  }, [certCode]);

  useEffect(() => {
    const isPlaceholder = ['VERIFY-BEFORE-ISSUE', 'NMU-CERT-2026-PENDING', 'NMU-VERIFY-PREVIEW'].includes(certCode.toUpperCase());
    const realCertCode = (!isPlaceholder && certCode) ? certCode.trim() : null;

    if (!realCertCode && (!courseId || !traineeId)) {
      // Standalone search / portal mode
      setData(null);
      setError('');
      setLoading(false);
      return;
    }

    async function verifyCert() {
      setLoading(true);
      setError('');
      setData(null);

      try {
        const params = new URLSearchParams();
        if (realCertCode) {
          params.set('code', realCertCode);
        }
        if (courseId) {
          params.set('course_id', courseId);
        }
        if (traineeId) {
          params.set('trainee_id', traineeId);
        }
          
        const res = await fetch(`/api/training/certificates/verify.php?${params.toString()}`, { credentials: 'include' });
        let json = null;
        try {
          json = await res.json();
        } catch (parseErr) {
          // Non-JSON response
        }

        if (res.ok && json && (json.valid || json.certificate)) {
          setData(json);
        } else {
          setError(json?.error || json?.message || 'The specified certificate code was not found in the official registry.');
        }
      } catch (err) {
        setError('Network error connecting to verification registry. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    verifyCert();
  }, [certCode, courseId, traineeId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const clean = inputCode.trim();
    if (!clean) return;
    setSearchParams({ code: clean });
  };

  const handleClear = () => {
    setInputCode('');
    setData(null);
    setError('');
    setSearchParams({});
  };

  return (
    <div className="verify-page-container">
      {/* Top Brand Header */}
      <header className="verify-header">
        <div className="verify-header-content">
          <Link to="/" className="verify-brand-logos" style={{ textDecoration: 'none' }}>
            <img src="/assets/university_logo.png" alt="New Mansoura University" className="verify-logo-img" />
            <div className="verify-univ-text">
              <h2>NEW MANSOURA UNIVERSITY</h2>
              <h3>Faculty of Computer Science &amp; Engineering</h3>
            </div>
            <img src="/assets/faculty_logo.png" alt="Faculty of Computer Science" className="verify-logo-img" />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="verify-main">
        
        {/* If loading */}
        {loading && (
          <div className="verify-card loading-card">
            <div className="verify-spinner"></div>
            <h3>Verifying Official NMU Credential...</h3>
            <p>Connecting to New Mansoura University Verification Registry</p>
          </div>
        )}

        {/* If Error: show error banner + search form to re-try */}
        {!loading && error && (
          <div className="verify-card error-card">
            <div className="error-icon-box">
              <AlertTriangle size={36} />
            </div>
            <h2>Invalid or Unverified Credential</h2>
            <p className="error-desc">{error}</p>

            {/* Re-try search form */}
            <form onSubmit={handleSearchSubmit} className="verify-lookup-form" style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="lookup-input-wrap">
                <Search size={18} className="lookup-icon" />
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Enter Certificate Code (e.g. NMU-CERT-...)"
                  className="lookup-input"
                  autoFocus
                />
                <button type="submit" className="lookup-submit-btn">
                  Verify Again
                </button>
              </div>
            </form>

            <div className="error-actions">
              <button onClick={handleClear} className="btn verify-btn-secondary">
                <RefreshCw size={16} /> Search Another Code
              </button>
              <Link to="/" className="btn verify-btn-secondary">
                <ArrowLeft size={16} /> Return to Portal Home
              </Link>
            </div>
          </div>
        )}

        {/* If Standalone Search Mode (No code in URL and no data) */}
        {!loading && !error && !data && (
          <div className="verify-lookup-hero">
            <div className="lookup-hero-header">
              <div className="lookup-shield-badge">
                <ShieldCheck size={28} />
              </div>
              <h1>Official Credential Verification Registry</h1>
              <p>
                Verify the authenticity and academic accreditation of diplomas and certificates issued by 
                New Mansoura University Faculty of Computer Science &amp; Engineering and ERTH Platform.
              </p>
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="verify-lookup-form">
              <div className="lookup-input-wrap">
                <Search size={20} className="lookup-icon" />
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Enter Certificate ID or Code (e.g. NMU-CERT-2026-...)"
                  className="lookup-input"
                  required
                  autoFocus
                />
                <button type="submit" className="lookup-submit-btn">
                  Verify Credential
                </button>
              </div>
              <div className="lookup-helper-text">
                <Sparkles size={13} />
                <span>Format: <strong>NMU-CERT-YYYY-XXXX</strong> or scanned QR Code link</span>
              </div>
            </form>

            {/* Trust Highlights */}
            <div className="verify-features-grid">
              <div className="vf-card">
                <div className="vf-icon-wrap"><CheckCircle2 size={20} /></div>
                <h4>Instant Validation</h4>
                <p>Real-time lookup against the official university academic training database.</p>
              </div>
              <div className="vf-card">
                <div className="vf-icon-wrap"><ShieldCheck size={20} /></div>
                <h4>Cryptographic Proof</h4>
                <p>Tamper-proof verifiable hashes matching the physical and digital PDF diplomas.</p>
              </div>
              <div className="vf-card">
                <div className="vf-icon-wrap"><Award size={20} /></div>
                <h4>Accredited Records</h4>
                <p>Complete curriculum breakdown, instructor records, and contact hour verification.</p>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
              <Link to="/" className="verify-btn-secondary">
                <ArrowLeft size={16} /> Return to Portal Home
              </Link>
            </div>
          </div>
        )}

        {/* If Verified Certificate Found */}
        {!loading && !error && data && data.certificate && (
          <>
            {/* Verification Status Banner */}
            <div className="verified-badge-banner">
              <div className="badge-pulse-icon">
                <ShieldCheck size={32} />
              </div>
              <div className="badge-text-content">
                <div className="badge-title-row">
                  <span className="official-pill">OFFICIAL VERIFIED CREDENTIAL</span>
                  <span className="verify-date">Verified on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
                <h1>Certificate of Academic &amp; Technical Completion</h1>
                <p>Issued by New Mansoura University - Faculty of Computer Science &amp; Engineering</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="verify-grid">
              {/* Card 1: Trainee & Credential Information */}
              <div className="verify-card trainee-card">
                <div className="card-header">
                  <User className="card-icon" />
                  <h3>Recipient &amp; Credential Metadata</h3>
                </div>
                <div className="info-list">
                  <div className="info-item">
                    <span className="info-label">Trainee Full Name:</span>
                    <span className="info-value highlight-name">{data.trainee?.full_name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Student ID:</span>
                    <span className="info-value">{data.trainee?.student_id || 'N/A'}</span>
                  </div>
                  {data.trainee?.major && (
                    <div className="info-item">
                      <span className="info-label">Academic Program / Major:</span>
                      <span className="info-value">{data.trainee.major}</span>
                    </div>
                  )}
                  {data.trainee?.department && (
                    <div className="info-item">
                      <span className="info-label">Department:</span>
                      <span className="info-value">{data.trainee.department}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">Verification Code:</span>
                    <code className="info-code">{data.certificate.cert_code}</code>
                  </div>
                  {data.certificate.final_score !== null && data.certificate.final_score !== undefined && (
                    <div className="info-item">
                      <span className="info-label">Academic Evaluation:</span>
                      <span className="info-value" style={{ fontWeight: 700, color: 'var(--primary, #002D56)' }}>
                        {data.certificate.final_score} / 100 (Passed)
                      </span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">Official Issue Date:</span>
                    <span className="info-value">{data.certificate.issued_date || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Issuing Authority:</span>
                    <span className="info-value">{data.certificate.issuer_name || 'Prof. Khaled Fouad (Dean of Faculty)'}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Training Course Overview */}
              <div className="verify-card course-card">
                <div className="card-header">
                  <Award className="card-icon" />
                  <h3>Training Course Overview</h3>
                </div>
                <div className="info-list">
                  <div className="info-item full-width">
                    <span className="info-label">Course Title:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="info-value course-title-en">{data.course?.name || data.certificate.course_title || 'Field Training Course'}</span>
                      {data.course?.course_code && (
                        <span className="badge-pill" style={{ background: 'rgba(0, 45, 86, 0.1)', color: 'var(--primary, #002D56)', fontWeight: 700, fontSize: '0.78rem' }}>
                          {data.course.course_code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Category / Domain:</span>
                    <span className="info-value badge-pill">{data.course?.category || 'Computer Science & Engineering'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Skill Level:</span>
                    <span className="info-value badge-pill gold">{data.course?.level || 'Advanced'}</span>
                  </div>
                  {data.course?.track_name && (
                    <div className="info-item">
                      <span className="info-label">Specialized Track:</span>
                      <span className="info-value badge-pill" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#b45309', fontWeight: 700 }}>
                        {data.course.track_name}
                      </span>
                    </div>
                  )}
                  {data.course?.provider_name && (
                    <div className="info-item">
                      <span className="info-label">Training Partner / Provider:</span>
                      <span className="info-value" style={{ fontWeight: 600 }}>
                        {data.course.provider_name}
                      </span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">Total Duration:</span>
                    <span className="info-value icon-text">
                      <Clock size={15} /> {data.course?.duration_hours || 40} Training Hours
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Training Period:</span>
                    <span className="info-value icon-text">
                      <Calendar size={15} /> 
                      {data.course?.start_date ? `${data.course.start_date} to ${data.course.end_date || 'Present'}` : 'Summer Cohort 2026'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Curriculum & Topics Section */}
            {data.topics && data.topics.length > 0 && (
              <div className="verify-card topics-card">
                <div className="card-header">
                  <BookOpen className="card-icon" />
                  <h3>Course Curriculum &amp; Mastery Topics</h3>
                </div>
                <p className="topics-intro">
                  The recipient successfully demonstrated proficiency across the following official core training modules:
                </p>
                <div className="topics-grid">
                  {data.topics.map((tp, idx) => (
                    <div key={tp.id || idx} className="topic-item-box">
                      <div className="topic-badge">{idx + 1}</div>
                      <div className="topic-details">
                        <h4>{tp.title}</h4>
                        {tp.description && <p>{tp.description}</p>}
                        {tp.duration_hours > 0 && (
                          <span className="topic-hours"><Clock size={12} /> {tp.duration_hours} Hours</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assigned Trainers */}
            {data.trainers && data.trainers.length > 0 && (
              <div className="verify-card trainers-card">
                <div className="card-header">
                  <User className="card-icon" />
                  <h3>Instructors &amp; Supervisors</h3>
                </div>
                <div className="trainers-row">
                  {data.trainers.map((tr, idx) => (
                    <div key={idx} className="trainer-chip">
                      <CheckCircle2 size={16} className="text-gold" />
                      <div>
                        <strong>{tr.trainer_name}</strong>
                        <span>{tr.department || 'Faculty of CS & Engineering'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Download & Search Another Action Bar */}
            <div className="verify-footer-actions">
              <a 
                href={data.certificate.cert_code && data.certificate.cert_code !== 'NMU-VERIFY-PREVIEW'
                  ? `/api/training/certificates/download.php?code=${encodeURIComponent(data.certificate.cert_code)}`
                  : `/api/training/certificates/download.php?course_id=${data.course?.id}&trainee_id=${data.trainee?.id}`}
                target="_blank" 
                rel="noopener noreferrer" 
                className="verify-btn-primary"
              >
                <Download size={18} /> Download Verified PDF Diploma
              </a>
              <button onClick={handleClear} className="verify-btn-secondary">
                <Search size={16} /> Verify Another Code
              </button>
              <Link to="/" className="verify-btn-secondary">
                <ArrowLeft size={16} /> Return to Portal
              </Link>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
