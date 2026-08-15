import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { 
    X, Mail, Hash, User, Crown, Check, Copy, BookOpen, 
    GraduationCap, Building2, ExternalLink 
} from 'lucide-react';
import './MemberDetailModal.css';

export default function MemberDetailModal({ member, onClose }) {
    const { lang } = useI18n();
    const isAr = lang === 'ar';

    const [copiedField, setCopiedField] = useState(null);

    if (!member) return null;

    const fullName = member.full_name || member.username || member.email || (isAr ? 'عضو فريق' : 'Team Member');
    const email = member.email || '';
    const studentId = member.student_id || member.academic_id || '';
    const role = member.role || 'member';
    const isLeader = role === 'leader';
    const username = member.username || '';
    const major = member.major || '';
    const academicYear = member.academic_year || '';
    const department = member.department || '';

    const handleCopy = (text, fieldName) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldName);
        setTimeout(() => setCopiedField(null), 2000);
    };

    return (
        <div className="modal-overlay member-modal-overlay" onClick={onClose}>
            <div className="modal-box member-detail-modal-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="member-modal-header">
                    <div className="member-modal-header-title">
                        {isLeader ? <Crown size={20} className="text-amber" /> : <User size={20} className="text-primary" />}
                        <h3>{isAr ? 'بيانات عضو الفريق' : 'Team Member Profile'}</h3>
                    </div>
                    <button className="btn-close-modal" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Profile Hero */}
                <div className="member-hero-section">
                    <div className={`member-hero-avatar ${isLeader ? 'is-leader' : ''}`}>
                        {member.avatar_url ? (
                            <img src={member.avatar_url} alt={fullName} />
                        ) : (
                            <span>{fullName.charAt(0).toUpperCase()}</span>
                        )}
                        <span className={`member-role-icon-badge ${isLeader ? 'badge-leader-icon' : 'badge-member-icon'}`}>
                            {isLeader ? '👑' : '👤'}
                        </span>
                    </div>

                    <h2 className="member-hero-name">{fullName}</h2>
                    
                    <div className="member-hero-role-pill">
                        <span className={`role-tag ${isLeader ? 'tag-leader' : 'tag-member'}`}>
                            {isLeader ? (isAr ? 'قائد الفريق' : 'Team Leader') : (isAr ? 'عضو فريق' : 'Team Member')}
                        </span>
                        {username && <span className="member-username-tag">@{username}</span>}
                    </div>
                </div>

                {/* Data Fields */}
                <div className="member-data-grid">
                    {/* Academic Student ID */}
                    <div className="member-data-card highlight-card">
                        <div className="member-data-icon">
                            <Hash size={18} />
                        </div>
                        <div className="member-data-content">
                            <span className="data-label">{isAr ? 'الرقم الجامعي (Student ID)' : 'Academic Student ID'}</span>
                            <span className="data-value student-id-text">
                                {studentId || (isAr ? 'غير مسجل' : 'Not Provided')}
                            </span>
                        </div>
                        {studentId && (
                            <button 
                                className="btn-copy-data" 
                                onClick={() => handleCopy(studentId, 'id')}
                                title={isAr ? 'نسخ الرقم الجامعي' : 'Copy Student ID'}
                            >
                                {copiedField === 'id' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                            </button>
                        )}
                    </div>

                    {/* Email */}
                    <div className="member-data-card">
                        <div className="member-data-icon mail-icon">
                            <Mail size={18} />
                        </div>
                        <div className="member-data-content">
                            <span className="data-label">{isAr ? 'البريد الإلكتروني' : 'Email Address'}</span>
                            <a href={`mailto:${email}`} className="data-value email-link" title={email}>
                                {email || (isAr ? 'غير متوفر' : 'N/A')}
                            </a>
                        </div>
                        {email && (
                            <button 
                                className="btn-copy-data" 
                                onClick={() => handleCopy(email, 'email')}
                                title={isAr ? 'نسخ البريد الإلكتروني' : 'Copy Email'}
                            >
                                {copiedField === 'email' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                            </button>
                        )}
                    </div>

                    {/* Major & Specialization */}
                    {major && (
                        <div className="member-data-card">
                            <div className="member-data-icon major-icon">
                                <GraduationCap size={18} />
                            </div>
                            <div className="member-data-content">
                                <span className="data-label">{isAr ? 'التخصص / البرنامج' : 'Major / Program'}</span>
                                <span className="data-value">{major}</span>
                            </div>
                        </div>
                    )}

                    {/* Academic Year */}
                    {academicYear && (
                        <div className="member-data-card">
                            <div className="member-data-icon year-icon">
                                <BookOpen size={18} />
                            </div>
                            <div className="member-data-content">
                                <span className="data-label">{isAr ? 'المستوى / السنة الدراسية' : 'Academic Year'}</span>
                                <span className="data-value">
                                    {isAr ? `السنة ${academicYear}` : `Year ${academicYear}`}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Department */}
                    {department && (
                        <div className="member-data-card">
                            <div className="member-data-icon dept-icon">
                                <Building2 size={18} />
                            </div>
                            <div className="member-data-content">
                                <span className="data-label">{isAr ? 'القسم / الكلية' : 'Department / College'}</span>
                                <span className="data-value">{department}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="member-modal-footer">
                    {email && (
                        <a 
                            href={`mailto:${email}`} 
                            className="btn btn-primary btn-send-mail"
                        >
                            <Mail size={16} />
                            <span>{isAr ? 'مراسلة عبر البريد' : 'Send Email'}</span>
                        </a>
                    )}
                    <button type="button" className="btn btn-ghost" onClick={onClose}>
                        {isAr ? 'إغلاق' : 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}
