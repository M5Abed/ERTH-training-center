import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, Award, Calendar, Clock, BookOpen, User, CheckCircle2, FileText, Download, AlertTriangle, ArrowLeft } from 'lucide-react';
import './CertificateVerification.css';

export default function CertificateVerification() {
  const [searchParams] = useSearchParams();
  const certCode = searchParams.get('code') || '';
  const courseId = searchParams.get('course_id') || '';
  const traineeId = searchParams.get('trainee_id') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    async function verifyCert() {
      const isPlaceholder = ['VERIFY-BEFORE-ISSUE', 'NMU-CERT-2026-PENDING', 'NMU-VERIFY-PREVIEW'].includes(certCode.toUpperCase());
      const realCertCode = (!isPlaceholder && certCode) ? certCode : null;

      if (!realCertCode && (!courseId || !traineeId)) {
        setError('Missing verification code or course/trainee parameters.');
        setLoading(false);
        return;
      }

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
          
        const res = await fetch(`/api/training/certificates/verify.php?${params.toString()}`);
        let json = null;
        try {
          json = await res.json();
        } catch (parseErr) {
          // Non-JSON response
        }

        if (res.ok && json && (json.valid || json.certificate)) {
          setData(json);
        } else {
          setError(json?.error || json?.message || 'Certificate could not be verified or is invalid.');
        }
      } catch (err) {
        setError('Network error verifying certificate. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    verifyCert();
  }, [certCode, courseId, traineeId]);

  if (loading) {
    return (
      <div className="verify-page-container">
        <div className="verify-card loading-card">
          <div className="verify-spinner"></div>
          <h3>Verifying Official NMU Credential...</h3>
          <p>Connecting to New Mansoura University Verification Registry</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="verify-page-container">
        <div className="verify-card error-card">
          <div className="error-icon-box">
            <AlertTriangle size={36} />
          </div>
          <h2>Invalid or Unverified Credential</h2>
          <p className="error-desc">{error || 'The certificate code provided is not valid in our records.'}</p>
          <div className="error-actions">
            <Link to="/" className="btn btn-outline">
              <ArrowLeft size={16} /> Return to Portal Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { certificate, trainee, course, topics, trainers } = data;

  return (
    <div className="verify-page-container">
      {/* Top Header */}
      <header className="verify-header">
        <div className="verify-header-content">
          <div className="verify-brand-logos">
            <img src="/assets/university_logo.png" alt="New Mansoura University" className="verify-logo-img" />
            <div className="verify-univ-text">
              <h2>NEW MANSOURA UNIVERSITY</h2>
              <h3>Faculty of Computer Science & Engineering</h3>
            </div>
            <img src="/assets/faculty_logo.png" alt="Faculty of Computer Science" className="verify-logo-img" />
          </div>
        </div>
      </header>

      {/* Main Verification Portal Content */}
      <main className="verify-main">
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
            <h1>Certificate of Academic & Technical Completion</h1>
            <p>Issued by New Mansoura University - Faculty of Computer Science & Engineering</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="verify-grid">
          {/* Card 1: Trainee & Credential Information */}
          <div className="verify-card trainee-card">
            <div className="card-header">
              <User className="card-icon" />
              <h3>Recipient & Credential Metadata</h3>
            </div>
            <div className="info-list">
              <div className="info-item">
                <span className="info-label">Trainee Full Name:</span>
                <span className="info-value highlight-name">{trainee.full_name_en}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Student ID:</span>
                <span className="info-value">{trainee.student_id || 'N/A'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Trainee Email:</span>
                <span className="info-value">{trainee.email}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Verification Code:</span>
                <code className="info-code">{certificate.cert_code}</code>
              </div>
              <div className="info-item">
                <span className="info-label">Official Issue Date:</span>
                <span className="info-value">{certificate.issued_date}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Issuing Authority:</span>
                <span className="info-value">{certificate.issuer_name || 'Prof. Khaled Fouad (Dean of Faculty)'}</span>
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
                <span className="info-label">Course Title (English):</span>
                <span className="info-value course-title-en">{course.name_en}</span>
              </div>
              {course.name_ar && (
                <div className="info-item full-width">
                  <span className="info-label">اسم البرنامج التدريبي:</span>
                  <span className="info-value course-title-ar">{course.name_ar}</span>
                </div>
              )}
              <div className="info-item">
                <span className="info-label">Track / Category:</span>
                <span className="info-value badge-pill">{course.category || 'Computer Science'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Skill Level:</span>
                <span className="info-value badge-pill gold">{course.level || 'Intermediate'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Total Duration:</span>
                <span className="info-value icon-text">
                  <Clock size={15} /> {course.duration_hours || 40} Training Hours
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Training Period:</span>
                <span className="info-value icon-text">
                  <Calendar size={15} /> 
                  {course.start_date ? `${course.start_date} to ${course.end_date || 'Present'}` : 'Summer 2026 Season'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Curriculum & Topics Section */}
        {topics && topics.length > 0 && (
          <div className="verify-card topics-card">
            <div className="card-header">
              <BookOpen className="card-icon" />
              <h3>Course Curriculum & Mastery Topics</h3>
            </div>
            <p className="topics-intro">
              The recipient successfully demonstrated proficiency across the following official core training modules:
            </p>
            <div className="topics-grid">
              {topics.map((tp, idx) => (
                <div key={tp.id || idx} className="topic-item-box">
                  <div className="topic-badge">{idx + 1}</div>
                  <div className="topic-details">
                    <h4>{tp.title_en} {tp.title_ar ? `(${tp.title_ar})` : ''}</h4>
                    {tp.description_en && <p>{tp.description_en}</p>}
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
        {trainers && trainers.length > 0 && (
          <div className="verify-card trainers-card">
            <div className="card-header">
              <User className="card-icon" />
              <h3>Instructors & Supervisors</h3>
            </div>
            <div className="trainers-row">
              {trainers.map((tr, idx) => (
                <div key={idx} className="trainer-chip">
                  <CheckCircle2 size={16} className="text-gold" />
                  <div>
                    <strong>{tr.trainer_name}</strong>
                    <span>{tr.department || 'Computer Science & Engineering'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Download & Share Action Bar */}
        <div className="verify-footer-actions">
          <a 
            href={certificate.cert_code && certificate.cert_code !== 'NMU-VERIFY-PREVIEW'
              ? `/api/training/certificates/download.php?code=${encodeURIComponent(certificate.cert_code)}`
              : `/api/training/certificates/download.php?course_id=${course.id}&trainee_id=${trainee.id}`}
            target="_blank" 
            rel="noopener noreferrer" 
            className="verify-btn-primary"
          >
            <Download size={18} /> Download Verified PDF Certificate
          </a>
          <Link to="/" className="verify-btn-secondary">
            Return to Portal
          </Link>
        </div>
      </main>
    </div>
  );
}
