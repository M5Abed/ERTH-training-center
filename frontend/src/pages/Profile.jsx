import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import {
    getUserProfile, getUserReviews, upsertUserProfile, uploadAvatar,
    getProjects, getMyProjects, getUserProjects, getApplicationsForUser, getReceivedApplications,
    updateApplicationStatus, getWrittenReviews, deleteReview, updateReview,
    formatDate, formatMonthYear
} from '../services/api';
import { SKILLS_CATALOG, COLLEGES, MAJORS_BY_FACULTY } from '../data/constants';
import { Edit3, Camera, Star, FolderKanban, MessageSquare, Save, X, Loader2, Mail, PenLine, Trash2, Check, RotateCcw, ClipboardCheck, Handshake, Clock, Share2, Award, Download, BookOpen } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';
import CertificateModal from '../components/CertificateModal';
import './Profile.css';

export default function Profile() {
    const { id } = useParams();
    const location = useLocation();
    const { t, lang } = useI18n();
    const { user, profile: myProfile, refreshProfile } = useAuth();
    const cleanId = (id && id !== 'undefined' && id !== 'null') ? id : null;
    const isOwnProfile = !cleanId || cleanId == user?.id || cleanId == user?.academic_id || cleanId == user?.student_id || cleanId == user?.username;
    const isStaff = (user?.role === 'ta' || user?.role === 'lecturer' || user?.role === 'professor' || user?.role === 'supervisor');
    const [profile, setProfile] = useState(null);
    const profileIsStaff = (profile?.role === 'ta' || profile?.role === 'lecturer' || profile?.role === 'professor' || profile?.role === 'supervisor');
    const [reviews, setReviews] = useState([]);
    const [projects, setProjects] = useState([]);
    const [userCerts, setUserCerts] = useState([]);
    const [selectedCertData, setSelectedCertData] = useState(null);
    const [showCertModal, setShowCertModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(location.state?.tab || 'overview');
    const [saving, setSaving] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);

    // Edit profile modal (#9)
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState('');
    const [editBio, setEditBio] = useState('');
    const [editYear, setEditYear] = useState('');
    const [editCollege, setEditCollege] = useState('');
    const [editCustomCollege, setEditCustomCollege] = useState('');
    const [editMajor, setEditMajor] = useState('');
    const [editUsername, setEditUsername] = useState('');
    const [editError, setEditError] = useState('');

    // Avatar cropper
    const [imageToCrop, setImageToCrop] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isCropping, setIsCropping] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Availability time
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const TIME_SLOTS = ['morning', 'afternoon', 'evening'];
    const TIME_LABELS = { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' };
    const TIME_LABELS_AR = { morning: 'صباحًا', afternoon: 'ظهرًا', evening: 'مساءً' };
    const TIME_HOURS = { morning: '8AM-12PM', afternoon: '12PM-5PM', evening: '5PM-10PM' };
    const [availability, setAvailability] = useState({});
    const [editingAvailability, setEditingAvailability] = useState(false);
    const [savingAvailability, setSavingAvailability] = useState(false);

    // Invitations tab (#13)
    const [sentApps, setSentApps] = useState([]);
    const [receivedApps, setReceivedApps] = useState([]);
    const [invLoading, setInvLoading] = useState(false);
    const [invLoaded, setInvLoaded] = useState(false);

    const availableMajors = useMemo(() => {
        return MAJORS_BY_FACULTY[profile?.college_key] || [];
    }, [profile?.college_key]);

    const editAvailableMajors = useMemo(() => {
        return MAJORS_BY_FACULTY[editCollege] || [];
    }, [editCollege]);

    const load = useCallback(async () => {
        setLoading(true);
        let p = isOwnProfile ? myProfile : null;
        if (!p) {
            p = await getUserProfile(cleanId);
        }
        setProfile(p);
        if (p) {
            const targetId = p.id || p.user_id;
            const [revs, projs] = await Promise.all([
                targetId ? getUserReviews(targetId) : [],
                isOwnProfile ? getMyProjects() : (targetId ? getUserProjects(targetId) : []),
            ]);
            setReviews(revs || []);
            setProjects(projs || []);
            // Fetch certificates
            try {
                const certRes = await fetch(`/api/training/certificates/list_user.php${targetId ? `?user_id=${targetId}` : ''}`);
                const certData = await certRes.json();
                if (certRes.ok) setUserCerts(certData.certificates || []);
            } catch (e) { console.error(e); }
            // Load availability from profile
            try {
                const avail = p.availability ? (typeof p.availability === 'string' ? JSON.parse(p.availability) : p.availability) : {};
                setAvailability(avail);
            } catch { setAvailability({}); }
        }
        setLoading(false);
    }, [id, myProfile, isOwnProfile]);

    useEffect(() => { load(); }, [load]);

    // Load invitations when tab switches
    useEffect(() => {
        if (location.state?.tab && location.state.tab !== tab) {
            setTab(location.state.tab);
        }
    }, [location.state?.tab]);

    useEffect(() => {
        if (tab === 'invitations' && isOwnProfile && !invLoading && !invLoaded) {
            loadInvitations();
        }
    }, [tab, invLoaded]);

    const loadInvitations = async () => {
        setInvLoading(true);
        const [sent, received] = await Promise.all([
            getApplicationsForUser(),
            getReceivedApplications(),
        ]);
        setSentApps(sent || []);
        setReceivedApps(received || []);
        setInvLoading(false);
        setInvLoaded(true);
    };

    const loadWrittenReviews = async () => {
        setWrittenLoading(true);
        const wr = await getWrittenReviews();
        setWrittenReviews(wr || []);
        setWrittenLoading(false);
        setWrittenLoaded(true);
    };

    const handleInviteAction = async (appId, status) => {
        await updateApplicationStatus(appId, status);
        loadInvitations();
    };

    // Edit profile modal handlers
    const openEditModal = () => {
        setEditName(profile?.full_name || profile?.full_name || '');
        setEditBio(profile?.bio || '');
        setEditYear(profile?.academic_year || '');
        const colKey = profile?.college_key || '';
        const isPredefined = COLLEGES.some(c => c.key === colKey);
        if (colKey) {
            if (isPredefined) {
                setEditCollege(colKey);
                setEditCustomCollege('');
            } else {
                setEditCollege('other');
                setEditCustomCollege(colKey);
            }
        } else {
            setEditCollege('');
            setEditCustomCollege('');
        }
        setEditMajor(profile?.major || '');
        setEditUsername(profile?.username || '');
        setEditError('');
        setShowEditModal(true);
    };

    const handleSaveProfile = async () => {
        setEditError('');

        // Validate Username client-side
        if (editUsername) {
            const trimmed = editUsername.trim();
            if (trimmed.length < 3 || trimmed.length > 16) {
                setEditError(t('error_username_invalid'));
                return;
            }
            if (!/^[a-zA-Z0-9_\.]+$/.test(trimmed)) {
                setEditError(t('error_username_invalid'));
                return;
            }
        } else {
            setEditError(lang === 'ar' ? 'اسم المستخدم مطلوب' : 'Username is required');
            return;
        }

        const collegeKeyFinal = editCollege === 'other' ? editCustomCollege.trim() : editCollege;
        if (editCollege === 'other' && !editCustomCollege.trim()) {
            setEditError(lang === 'ar' ? 'يرجى كتابة اسم الكلية المخصصة' : 'Please type your custom college name');
            return;
        }

        setSaving(true);
        const res = await upsertUserProfile({
            full_name: editName,
            bio: editBio,
            academic_year: editYear || undefined,
            college_key: collegeKeyFinal || undefined,
            major: editMajor || undefined,
            username: editUsername.trim() || undefined,
        });

        if (res && !res.success) {
            setEditError(res.error?.message || (lang === 'ar' ? 'فشل حفظ الملف الشخصي' : 'Failed to save profile'));
            setSaving(false);
            return;
        }

        await refreshProfile();
        setSaving(false);
        setShowEditModal(false);
        load();
    };

    const handleAvatar = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError('');
        if (file.size > 10 * 1024 * 1024) { 
            setUploadError(lang === 'ar' ? 'الصورة كبيرة جدًا (الحد الأقصى ١٠ ميجابايت)' : 'Image too large (max 10MB)'); 
            setTimeout(() => setUploadError(''), 3000);
            return; 
        }
        const reader = new FileReader();
        reader.onload = () => {
            setImageToCrop(reader.result);
            setZoom(1);
            setCrop({ x: 0, y: 0 });
        };
        reader.readAsDataURL(file);
        e.target.value = ''; // reset input
    };

    const confirmCrop = async () => {
        try {
            setIsCropping(true);
            const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels);
            if (croppedFile) {
                await uploadAvatar(croppedFile);
                await refreshProfile();
                load();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsCropping(false);
            setImageToCrop(null);
        }
    };

    const handleRemoveAvatar = async () => {
        if (!window.confirm('Remove your profile photo?')) return;
        await upsertUserProfile({ avatar_url: null });
        await refreshProfile();
        load();
    };

    const getSkillName = (sid) => {
        const s = SKILLS_CATALOG.find(x => x.id === (sid.id || sid.skill_id || sid));
        return s ? (lang === 'ar' ? s.ar : s.en) : (sid.id || sid.skill_id || sid);
    };

    // Rating breakdown (#12) — 3 criteria
    const avgCommitment = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.commitment_rating || r.rating || 0), 0) / reviews.length).toFixed(1) : null;
    const avgQuality = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.quality_rating || r.rating || 0), 0) / reviews.length).toFixed(1) : null;
    const avgCollaboration = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.collaboration_rating || r.rating || 0), 0) / reviews.length).toFixed(1) : null;
    const overallAvg = reviews.length > 0 ? (((parseFloat(avgCommitment) + parseFloat(avgQuality) + parseFloat(avgCollaboration)) / 3).toFixed(1)) : null;

    const pendingInvCount = (sentApps.filter(a => a.status === 'pending').length + receivedApps.filter(a => a.status === 'pending').length);

    // Profile completion calculation
    const completionItems = [
        { key: 'avatar', done: !!profile?.avatar_url },
        { key: 'bio', done: !!(profile?.bio && profile.bio.trim().length > 0) },
        { key: 'skills', done: (profile?.skills || profile?.user_skills || []).length >= 3 },
        { key: 'year', done: !!profile?.academic_year },
        ...(profile?.college_key ? [{ key: 'major', done: !!profile?.major }] : []),
    ];
    const doneCount = completionItems.filter(i => i.done).length;
    const totalCount = completionItems.length;
    const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
    const completionColor = completionPct >= 100 ? 'var(--primary)' : completionPct >= 60 ? 'var(--amber)' : 'var(--accent)';

    if (loading) return <div className="loading-state"><div className="spinner" /></div>;
    if (!profile) return <div className="empty-state"><h3>{t('error_not_found')}</h3></div>;

    return (
        <div className="profile-page">
            {/* Header */}
            <div className="profile-header">
                {uploadError && (
                    <div style={{ position: 'absolute', top: '1rem', left: '1rem', right: '1rem', padding: '0.75rem', background: 'rgba(244,63,94,0.1)', color: 'var(--rose)', borderRadius: '8px', zIndex: 10, textAlign: 'center', fontSize: '0.875rem', border: '1px solid var(--border)' }}>
                        {uploadError}
                    </div>
                )}
                <div className="profile-avatar-wrap">
                    <div className="profile-avatar">
                        {profile.avatar_url ? <img src={profile.avatar_url} alt="" /> : <span>{(profile.full_name || profile.full_name || '?')[0].toUpperCase()}</span>}
                    </div>
                    {isOwnProfile && (
                        <div className="avatar-actions">
                            <label className="avatar-edit-btn" title="Change photo">
                                <Camera size={14} />
                                <input type="file" accept="image/*" onChange={handleAvatar} hidden />
                            </label>
                            {profile.avatar_url && (
                                <button className="avatar-remove-btn" onClick={handleRemoveAvatar} title="Remove photo">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
                <div className="profile-info">
                    <h1>{profile.full_name || profile.full_name || user?.email}</h1>
                    {profile.username && (
                        <span className="profile-username">@{profile.username}</span>
                    )}
                    <div className="profile-meta">
                        {(profile.is_admin || user?.is_admin || profile.role === 'admin' || user?.role === 'admin') && (
                            <>
                                <span className="profile-badge profile-badge--admin" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{lang === 'ar' ? 'مسؤول النظام' : 'ADMIN'}</span>
                                <span className="meta-dot"></span>
                            </>
                        )}
                        {profile.role && profile.role !== 'student' && profile.role !== 'admin' && (
                            <>
                                <span className="profile-badge profile-badge--staff" style={{ background: 'var(--indigo)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', textTransform: 'uppercase' }}>{profile.role}</span>
                                <span className="meta-dot"></span>
                            </>
                        )}
                        {profile.college_name && (
                            <>
                                <span>{profile.college_name}</span>
                                <span className="meta-dot"></span>
                            </>
                        )}
                        {(!profile.role || profile.role === 'student') && profile.academic_year && (
                            <>
                                <span>Year {profile.academic_year}</span>
                                <span className="meta-dot"></span>
                            </>
                        )}
                        {(!profile.role || profile.role === 'student') && profile.major && (
                            <>
                                <span>{profile.major}</span>
                                <span className="meta-dot"></span>
                            </>
                        )}
                        {overallAvg && (
                            <>
                                <span className="profile-rating"><Star size={14} /> {overallAvg}</span>
                                <span className="meta-dot"></span>
                            </>
                        )}
                        {profile.created_at && (
                            <span className="profile-joined-date">{t('member_since')} {formatMonthYear(profile.created_at)}</span>
                        )}
                    </div>
                    <p className="profile-bio">{profile.bio && profile.bio.trim() ? profile.bio : <span className="muted">{lang === 'ar' ? 'لم يُضف نبذة شخصية بعد' : 'No bio provided yet'}</span>}</p>
                    


                    {/* Profile Completion Bar */}
                    {isOwnProfile && completionPct < 100 && (
                        <div className="profile-completion">
                            <div className="profile-completion-header">
                                <span>{lang === 'ar' ? 'اكتمال الملف الشخصي' : 'Profile Completion'}</span>
                                {completionPct >= 100 ? (
                                    <span className="profile-completion-done" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <Check size={12} /> {lang === 'ar' ? 'مكتمل' : 'Complete'}
                                    </span>
                                ) : (
                                    <span style={{ color: completionColor, fontWeight: 700 }}>{completionPct}%</span>
                                )}
                            </div>
                            <div className="profile-completion-track">
                                <div className="profile-completion-fill" style={{ width: `${completionPct}%`, background: completionColor }} />
                            </div>
                            {completionPct < 100 && (
                                <div className="profile-completion-items">
                                    {completionItems.filter(i => !i.done).map(item => {
                                        const label = item.key === 'avatar' ? (lang === 'ar' ? 'أضف صورة شخصية' : 'Add a profile photo')
                                            : item.key === 'bio' ? (lang === 'ar' ? 'أضف نبذة شخصية' : 'Write a short bio')
                                                : item.key === 'skills' ? (lang === 'ar' ? 'أضف ٣ مهارات على الأقل' : 'Add 3+ skills')
                                                    : item.key === 'year' ? (lang === 'ar' ? 'حدّد سنتك الدراسية' : 'Set your academic year')
                                                        : (lang === 'ar' ? 'حدّد تخصصك' : 'Set your major');
                                        const action = item.key === 'avatar' ? () => document.querySelector('.avatar-edit-btn')?.click()
                                            : item.key === 'skills' ? () => navigate('/onboarding')
                                                : openEditModal;
                                        return (
                                            <button key={item.key} className="profile-completion-todo" onClick={action} title={label}>
                                                + {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Rating breakdown (#12) */}
                    {overallAvg && (
                        <div className="profile-rating-breakdown">
                            <div className="rating-bar-item">
                                <span className="rating-bar-label">{lang === 'ar' ? 'الالتزام' : 'Commitment'}</span>
                                <div className="rating-bar-track"><div className="rating-bar-fill" style={{ width: `${(avgCommitment / 5) * 100}%`, background: 'var(--indigo)' }} /></div>
                                <span className="rating-bar-value">{avgCommitment}</span>
                            </div>
                            <div className="rating-bar-item">
                                <span className="rating-bar-label">{lang === 'ar' ? 'الجودة' : 'Quality'}</span>
                                <div className="rating-bar-track"><div className="rating-bar-fill" style={{ width: `${(avgQuality / 5) * 100}%`, background: 'var(--teal)' }} /></div>
                                <span className="rating-bar-value">{avgQuality}</span>
                            </div>
                            <div className="rating-bar-item">
                                <span className="rating-bar-label">{lang === 'ar' ? 'التعاون' : 'Collaboration'}</span>
                                <div className="rating-bar-track"><div className="rating-bar-fill" style={{ width: `${(avgCollaboration / 5) * 100}%`, background: 'var(--amber)' }} /></div>
                                <span className="rating-bar-value">{avgCollaboration}</span>
                            </div>
                        </div>
                    )}
                </div>

                {isOwnProfile && (
                    <div className="profile-header-actions">
                        <button className="profile-action-btn" onClick={openEditModal}>
                            <Edit3 size={14} /> {t('edit_profile')}
                        </button>
                        <button
                            className={`profile-action-btn ${shareCopied ? 'profile-action-btn--copied' : ''}`}
                            onClick={() => {
                                const url = `${window.location.origin}/u/${profile.id}`;
                                navigator.clipboard.writeText(url).then(() => {
                                    setShareCopied(true);
                                    setTimeout(() => setShareCopied(false), 2500);
                                });
                            }}
                        >
                            {shareCopied
                                ? <><Check size={14} /> {lang === 'ar' ? '\u062a\u0645 \u0627\u0644\u0646\u0633\u062e!' : 'Copied!'}</>
                                : <><Share2 size={14} /> {lang === 'ar' ? '\u0645\u0634\u0627\u0631\u0643\u0629' : 'Share Profile'}</>
                            }
                        </button>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="profile-tabs">
                {[
                    ...(!profileIsStaff ? [{ key: 'overview', label: t('skills_section') }] : []),
                    { key: 'projects', label: t('projects_section') },
                    { key: 'certificates', label: `${lang === 'ar' ? 'الشهادات' : 'Certificates'}${userCerts.length > 0 ? ` (${userCerts.length})` : ''}` },
                    { key: 'reviews', label: `${t('reviews_section')} (${reviews.length})` },
                    ...(isOwnProfile ? [
                        { key: 'invitations', label: `${lang === 'ar' ? 'الطلبات' : 'Applications'}${pendingInvCount > 0 ? ` (${pendingInvCount})` : ''}` },
                    ] : []),
                ].map(tb => (
                    <button key={tb.key} className={`profile-tab ${tab === tb.key ? 'profile-tab--active' : ''}`} onClick={() => setTab(tb.key)}>
                        {tb.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && (() => {
                const rawSkills = profile.skills || profile.user_skills || [];
                // Build category-grouped map
                const grouped = {};
                rawSkills.forEach(s => {
                    const sid = s.id || s.skill_id || s;
                    const catalog = SKILLS_CATALOG.find(x => x.id === sid);
                    const catKey = catalog ? catalog.cat_en : 'Other';
                    const catLabel = catalog
                        ? (lang === 'ar' ? catalog.cat_ar : catalog.cat_en)
                        : 'Other';
                    const name = catalog ? (lang === 'ar' ? catalog.ar : catalog.en) : sid;
                    if (!grouped[catKey]) grouped[catKey] = { label: catLabel, skills: [] };
                    grouped[catKey].skills.push({ name, level: s.level || s.proficiency || 0, id: sid });
                });

                const levelLabel = (lvl) => {
                    if (!lvl || lvl < 2) return lang === 'ar' ? 'مبتدئ' : 'Beginner';
                    if (lvl < 4) return lang === 'ar' ? 'متوسط' : 'Intermediate';
                    return lang === 'ar' ? 'متقدم' : 'Advanced';
                };
                const levelColor = (lvl) => {
                    if (!lvl || lvl < 2) return 'var(--amber)';
                    if (lvl < 4) return 'var(--teal)';
                    return 'var(--primary)';
                };

                return (
                    <div className="profile-section animate-fade-in">
                        <div className="skills-section-header">
                            <h3>{t('skills_section')}</h3>
                            <div className="skills-section-meta">
                                {rawSkills.length > 0 && (
                                    <span className="skills-total-badge">{rawSkills.length} {lang === 'ar' ? 'مهارة' : 'skills'}</span>
                                )}
                                {isOwnProfile && (
                                    <Link to="/onboarding" className="btn btn-outline btn-sm">
                                        {lang === 'ar' ? 'تعديل المهارات' : 'Edit Skills'}
                                    </Link>
                                )}
                            </div>
                        </div>

                        {rawSkills.length === 0 ? (
                            <div className="skills-empty">
                                <div className="skills-empty-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BookOpen size={36} className="text-muted" />
                                </div>
                                <p>{t('no_skills')}</p>
                                {isOwnProfile && (
                                    <Link to="/onboarding" className="btn btn-primary btn-sm">
                                        {lang === 'ar' ? 'أضف مهاراتك' : 'Add your skills'}
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="skills-categories">
                                {Object.entries(grouped).map(([catKey, { label, skills: catSkills }]) => (
                                    <div key={catKey} className="skills-category-card">
                                        <div className="skills-category-header">
                                            <span className="skills-category-name">{label}</span>
                                            <span className="skills-category-count">{catSkills.length}</span>
                                        </div>
                                        <div className="skills-list">
                                            {catSkills.map((sk, i) => (
                                                <div key={i} className="skill-row">
                                                    <div className="skill-row-top">
                                                        <span className="skill-row-name">{sk.name}</span>
                                                        {sk.level > 0 && (
                                                            <span className="skill-row-level" style={{ color: levelColor(sk.level) }}>
                                                                {levelLabel(sk.level)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Availability Time Section */}
            {tab === 'overview' && (
                <div className="profile-section animate-fade-in" style={{ marginTop: '1rem' }}>
                    <div className="availability-header">
                        <h3><Clock size={16} /> {lang === 'ar' ? 'أوقات التوافر' : 'Availability Schedule'}</h3>
                        {isOwnProfile && !editingAvailability && (
                            <button className="btn btn-outline btn-sm" onClick={() => setEditingAvailability(true)}>
                                <Edit3 size={14} /> {lang === 'ar' ? 'تعديل' : 'Edit'}
                            </button>
                        )}
                        {isOwnProfile && editingAvailability && (
                            <div className="availability-edit-actions">
                                <button className="btn btn-ghost btn-sm" onClick={() => {
                                    setEditingAvailability(false);
                                    // Revert to saved
                                    try {
                                        const avail = profile.availability ? (typeof profile.availability === 'string' ? JSON.parse(profile.availability) : profile.availability) : {};
                                        setAvailability(avail);
                                    } catch { setAvailability({}); }
                                }}>
                                    <X size={14} /> {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button className="btn btn-primary btn-sm" disabled={savingAvailability} onClick={async () => {
                                    setSavingAvailability(true);
                                    await upsertUserProfile({ availability: JSON.stringify(availability) });
                                    await refreshProfile();
                                    setSavingAvailability(false);
                                    setEditingAvailability(false);
                                    load();
                                }}>
                                    {savingAvailability ? <Loader2 size={14} className="spin" /> : <Save size={14} />} {lang === 'ar' ? 'حفظ' : 'Save'}
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="availability-desc">
                        {lang === 'ar'
                            ? 'الأوقات التي يكون فيها هذا العضو متاحًا للعمل الجماعي'
                            : 'Times when this member is available for teamwork and collaboration'}
                    </p>
                    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 'var(--radius-md)' }}>
                        <div className="availability-grid">
                            <div className="availability-grid-header">
                                <div className="availability-corner"></div>
                                {DAYS.map((day, i) => (
                                    <div key={day} className="availability-day-label">
                                        {lang === 'ar' ? DAYS_AR[i] : day}
                                    </div>
                                ))}
                            </div>
                            {TIME_SLOTS.map(slot => (
                                <div key={slot} className="availability-grid-row">
                                    <div className="availability-slot-label">
                                        <span className="availability-slot-name">{lang === 'ar' ? TIME_LABELS_AR[slot] : TIME_LABELS[slot]}</span>
                                        <span className="availability-slot-hours">{TIME_HOURS[slot]}</span>
                                    </div>
                                    {DAYS.map(day => {
                                        const key = `${day}_${slot}`;
                                        const isActive = availability[key];
                                        return (
                                            <div
                                                key={key}
                                                className={`availability-cell ${isActive ? 'availability-cell--active' : ''} ${editingAvailability ? 'availability-cell--editable' : ''}`}
                                                onClick={() => {
                                                    if (!editingAvailability) return;
                                                    setAvailability(prev => ({ ...prev, [key]: !prev[key] }));
                                                }}
                                                title={`${lang === 'ar' ? DAYS_AR[DAYS.indexOf(day)] : day} - ${lang === 'ar' ? TIME_LABELS_AR[slot] : TIME_LABELS[slot]}`}
                                            >
                                                {isActive && <Check size={14} />}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                    {Object.values(availability).filter(Boolean).length === 0 && !editingAvailability && (
                        <div className="availability-empty">
                            <Clock size={20} />
                            <p>{lang === 'ar' ? 'لم يتم تحديد أوقات التوافر بعد' : 'No availability set yet'}</p>
                            {isOwnProfile && (
                                <button className="btn btn-primary btn-sm" onClick={() => setEditingAvailability(true)}>
                                    {lang === 'ar' ? 'حدد أوقاتك' : 'Set your availability'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {tab === 'projects' && (
                <div className="profile-section animate-fade-in">
                    {projects.length === 0 ? (
                        <p className="muted">{t('no_projects')}</p>
                    ) : (
                        <div className="profile-projects">
                            {projects.map(p => (
                                <Link key={p.id} to={`/project/${p.id}`} className="profile-project-card">
                                    <FolderKanban size={16} />
                                    <div>
                                        <span className="project-card-title">{p.title}</span>
                                        <span className="project-card-status" style={{ color: p.status === 'open' ? 'var(--green)' : p.status === 'completed' ? 'var(--muted)' : 'var(--amber)' }}>
                                            {p.status}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {tab === 'reviews' && (
                <div className="profile-section animate-fade-in">
                    {reviews.length === 0 ? (
                        <p className="muted">{t('no_reviews')}</p>
                    ) : (
                        <div className="profile-reviews">
                            {reviews.map((r, i) => {
                                const avg = ((r.commitment_rating || r.rating || 0) + (r.quality_rating || r.rating || 0) + (r.collaboration_rating || r.rating || 0)) / 3;
                                return (
                                    <div key={i} className="review-card">
                                        <div className="review-card-top">
                                            <span className="review-author">{r.reviewer_name || 'Anonymous'}</span>
                                            <span className="review-avg">{avg.toFixed(1)}</span>
                                        </div>
                                        <div className="review-breakdown">
                                            <span title={t('commitment')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ClipboardCheck size={14} /> {t('commitment')} {r.commitment_rating || r.rating || 0}/5</span>
                                            <span title={t('quality')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Star size={14} /> {t('quality')} {r.quality_rating || r.rating || 0}/5</span>
                                            <span title={t('collaboration')} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Handshake size={14} /> {t('collaboration')} {r.collaboration_rating || r.rating || 0}/5</span>
                                        </div>
                                        {r.comment && <p className="review-comment">"{r.comment}"</p>}
                                        {r.created_at && <span className="review-date">{formatDate(r.created_at)}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Invitations tab (#13) */}
            {tab === 'invitations' && isOwnProfile && (
                <div className="profile-section animate-fade-in">
                    {invLoading ? (
                        <div className="loading-state"><div className="spinner" /></div>
                    ) : (
                        <div className="invitations-container">
                            {/* Sent Applications */}
                            <div className="inv-section">
                                <h3>{lang === 'ar' ? 'طلبات أرسلتها' : 'Applications You Sent'}</h3>
                                {sentApps.length === 0 ? (
                                    <p className="muted">{lang === 'ar' ? 'لم تتقدم لأي مشروع بعد.' : "You haven't applied to any projects yet."}</p>
                                ) : (
                                    <div className="inv-list">
                                        {sentApps.map(a => (
                                            <div key={a.id} className="inv-card">
                                                <div className="inv-card-top">
                                                    <span className="inv-project">{lang === 'ar' ? (a.projects?.title || a.projects?.title) : (a.projects?.title || '—')}</span>
                                                    <span className={`inv-badge inv-badge--${a.status}`}>
                                                        {a.status === 'accepted' ? 'Accepted' : a.status === 'rejected' ? 'Declined' : 'Pending'}
                                                    </span>
                                                </div>
                                                {a.message && <p className="inv-message">{a.message}</p>}
                                                {a.created_at && <span className="inv-date">{formatDate(a.created_at)}</span>}
                                                {a.status === 'rejected' && (
                                                    <button className="btn btn-ghost btn-sm" onClick={() => handleInviteAction(a.id, 'pending')}>
                                                        <RotateCcw size={14} /> Re-apply
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Received Applications */}
                            <div className="inv-section">
                                <h3>{lang === 'ar' ? 'طلبات واردة' : 'Applications Received'}</h3>
                                {receivedApps.length === 0 ? (
                                    <p className="muted">{lang === 'ar' ? 'لا أحد تقدم لمشاريعك بعد.' : 'No one has applied to your projects yet.'}</p>
                                ) : (
                                    <div className="inv-list">
                                        {receivedApps.map(a => (
                                            <div key={a.id} className="inv-card">
                                                <div className="inv-card-top">
                                                    <div>
                                                        <Link to={`/profile/${a.applicant_id}`} className="inv-sender" style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                                                            {a.applicant?.full_name || 'Unknown'}
                                                        </Link>
                                                        <span className="inv-project-sm">{lang === 'ar' ? 'لمشروع: ' : 'For: '}{lang === 'ar' ? (a.projects?.title || a.projects?.title) : (a.projects?.title || '—')}</span>
                                                    </div>
                                                    <span className={`inv-badge inv-badge--${a.status}`}>
                                                        {a.status === 'accepted' ? 'Accepted' : a.status === 'rejected' ? 'Declined' : 'Pending'}
                                                    </span>
                                                </div>
                                                {a.message && <p className="inv-message">{a.message}</p>}
                                                {a.status === 'pending' && (
                                                    <div className="inv-actions">
                                                        <button className="btn btn-primary btn-sm" onClick={() => handleInviteAction(a.id, 'accepted')}>
                                                            <Check size={14} /> Accept
                                                        </button>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => handleInviteAction(a.id, 'rejected')}>
                                                            <X size={14} /> Decline
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Certificates Tab */}
            {tab === 'certificates' && (
                <div className="profile-section animate-fade-in">
                    <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Award size={20} style={{ color: 'var(--amber)' }} />
                        {lang === 'ar' ? 'الشهادات المكتسبة' : 'Earned Completion Certificates'}
                    </h3>
                    {userCerts.length === 0 ? (
                        <p className="muted">{lang === 'ar' ? 'لا توجد شهادات صيفية صادرة لك بعد.' : 'No summer training certificates issued to you yet.'}</p>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                            {userCerts.map(cert => (
                                <div key={cert.id} style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #b8860b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                                            <Award size={22} />
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-1)' }}>{cert.course_title}</h4>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Code: {cert.cert_code}</span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Issued on {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '2026'}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                                        <button
                                            className="btn btn-outline btn-sm"
                                            style={{ flex: 1, gap: '0.35rem' }}
                                            onClick={() => {
                                                setSelectedCertData({
                                                    studentName: profile?.full_name || profile?.full_name || 'Trainee',
                                                    courseTitle: cert.course_title,
                                                    issueDate: cert.issued_at ? new Date(cert.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '10 August 2026',
                                                    certCode: cert.cert_code,
                                                    downloadUrl: `/api/training/certificates/download.php?code=${cert.cert_code}`,
                                                    courseId: cert.course_id,
                                                    traineeId: cert.trainee_id
                                                });
                                                setShowCertModal(true);
                                            }}
                                        >
                                            <Award size={14} /> Preview
                                        </button>
                                        <a
                                            href={`/api/training/certificates/download.php?code=${cert.cert_code}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary btn-sm"
                                            style={{ gap: '0.35rem' }}
                                        >
                                            <Download size={14} /> Download
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Edit Profile Modal (#9) */}
            {showEditModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>{t('edit_profile')}</h3>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            {editError && (
                                <div className="form-error" style={{ color: 'var(--rose)', background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', padding: '8px 12px', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1.25rem', fontWeight: 500 }}>
                                    {editError}
                                </div>
                            )}
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>{t('username')}</label>
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <span style={{ position: 'absolute', left: lang === 'ar' ? 'unset' : '12px', right: lang === 'ar' ? '12px' : 'unset', color: 'var(--text-3)', fontWeight: 600 }}>@</span>
                                    <input
                                        type="text"
                                        value={editUsername}
                                        onChange={e => setEditUsername(e.target.value.replace(/[^a-zA-Z0-9_\.]/g, ''))}
                                        style={{ paddingLeft: lang === 'ar' ? '12px' : '28px', paddingRight: lang === 'ar' ? '28px' : '12px' }}
                                        placeholder={lang === 'ar' ? 'اسم_المستخدم' : 'username'}
                                    />
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px', display: 'block' }}>
                                    {t('username_hint')}
                                </span>
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'نبذة عنك' : 'Bio'}</label>
                                <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={3} placeholder={t('bio_placeholder')} />
                            </div>
                            {!isStaff && (
                                <>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>{lang === 'ar' ? 'الكلية' : 'College'}</label>
                                            <select value={editCollege} onChange={e => { setEditCollege(e.target.value); setEditMajor(''); }}>
                                                <option value="">{lang === 'ar' ? 'اختر الكلية...' : 'Select college...'}</option>
                                                {COLLEGES.map(c => <option key={c.key} value={c.key}>{lang === 'ar' ? c.ar : c.en}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>{lang === 'ar' ? 'السنة' : 'Academic Year'}</label>
                                            <select value={editYear} onChange={e => setEditYear(e.target.value)}>
                                                <option value=""> </option>
                                                {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{t(`year_${y}`)}</option>)}
                                                <option value="grad">{t('graduate')}</option>
                                            </select>
                                        </div>
                                    </div>
                                    {editCollege === 'other' && (
                                        <div className="form-group animate-fade-in">
                                            <label>{lang === 'ar' ? 'اسم الكلية المخصصة' : 'Custom College Name'} <span className="req">*</span></label>
                                            <input
                                                type="text"
                                                value={editCustomCollege}
                                                onChange={e => setEditCustomCollege(e.target.value)}
                                                placeholder={lang === 'ar' ? 'اكتب اسم كليتك هنا...' : 'Type your college name here...'}
                                                required
                                            />
                                        </div>
                                    )}
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>{lang === 'ar' ? 'التخصص' : 'Major'}</label>
                                            {editAvailableMajors.length > 0 ? (
                                                <>
                                                    <select
                                                        value={editAvailableMajors.some(m => m.value === editMajor) ? editMajor : (editMajor ? 'other' : '')}
                                                        onChange={e => {
                                                            if (e.target.value === 'other') setEditMajor('');
                                                            else setEditMajor(e.target.value);
                                                        }}
                                                    >
                                                        <option value="">{lang === 'ar' ? 'اختر تخصصك...' : 'Select your major...'}</option>
                                                        {editAvailableMajors.map(m => (
                                                            <option key={m.value} value={m.value}>{lang === 'ar' ? m.label_ar : m.label}</option>
                                                        ))}
                                                        <option value="other">{lang === 'ar' ? 'أخرى (كتابة يدوية)' : 'Other (Manual entry)'}</option>
                                                    </select>

                                                    {/* Show text input if "other" is selected or if existing major is not in the list */}
                                                    {(!editAvailableMajors.some(m => m.value === editMajor) && editMajor !== '') && (
                                                        <input
                                                            type="text"
                                                            style={{ marginTop: '0.5rem' }}
                                                            placeholder={lang === 'ar' ? 'اكتب تخصصك هنا...' : 'Type your major here...'}
                                                            value={editMajor}
                                                            onChange={e => setEditMajor(e.target.value)}
                                                        />
                                                    )}
                                                </>
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={editMajor}
                                                    onChange={e => setEditMajor(e.target.value)}
                                                    placeholder={lang === 'ar' ? 'مثال: علوم حاسب' : 'e.g. Computer Science'}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost btn-md" onClick={() => setShowEditModal(false)}>{t('cancel')}</button>
                            <button className="btn btn-primary btn-md" onClick={handleSaveProfile} disabled={saving}>
                                {saving ? <Loader2 size={16} className="spin" /> : <><Save size={16} /> {t('save')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Avatar Crop Modal */}
            {imageToCrop && (
                <div className="modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="modal-box" style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3>{lang === 'ar' ? 'تعديل الصورة' : 'Crop Photo'}</h3>
                            <button className="modal-close" onClick={() => setImageToCrop(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ padding: '1rem' }}>
                            <div className="crop-container" style={{ position: 'relative', width: '100%', height: 300, background: '#333' }}>
                                <Cropper
                                    image={imageToCrop}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    cropShape="round"
                                    showGrid={false}
                                    onCropChange={setCrop}
                                    onCropComplete={(cA, cAP) => setCroppedAreaPixels(cAP)}
                                    onZoomChange={setZoom}
                                />
                            </div>
                            <div className="crop-slider">
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-2)' }}>Zoom</label>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost btn-sm" onClick={() => setImageToCrop(null)}>{t('cancel')}</button>
                            <button className="btn btn-primary btn-sm" onClick={confirmCrop} disabled={isCropping}>
                                {isCropping ? <Loader2 size={16} className="spin" /> : <><Check size={16} /> {t('save')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Certificate Modal */}
            {showCertModal && selectedCertData && (
                <CertificateModal
                    isOpen={showCertModal}
                    onClose={() => setShowCertModal(false)}
                    studentName={selectedCertData.studentName}
                    courseTitle={selectedCertData.courseTitle}
                    issueDate={selectedCertData.issueDate}
                    certCode={selectedCertData.certCode}
                    downloadUrl={selectedCertData.downloadUrl}
                    courseId={selectedCertData.courseId}
                    traineeId={selectedCertData.traineeId}
                />
            )}
        </div>
    );
}
