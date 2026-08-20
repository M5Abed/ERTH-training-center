import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import {
    Activity, Users, Trophy, FolderOpen, FileText,
    Zap, ArrowRight, BookOpen, Lightbulb, CheckCircle2, Shield,
    Clock, Upload, ExternalLink, TrendingUp,
    Cpu, ChevronRight, Download, BarChart3, Award,
    UserCheck, Crown, User, ThumbsUp, Sparkles, AlertCircle, Check,
    Building2, Calendar
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
    const { user, profile } = useAuth();
    const { lang } = useI18n();
    const [stats, setStats]             = useState(null);
    const [myProject, setMyProject]     = useState(null);
    const [myDocs, setMyDocs]           = useState([]);
    const [loading, setLoading]         = useState(true);
    const [projLoading, setProjLoading] = useState(true);

    const role        = (user?.role || profile?.role || '').toLowerCase();
    const isAdmin     = !!(user?.is_admin || profile?.is_admin || role === 'admin');
    const isTrainer   = role === 'trainer' || isAdmin;
    const isTrainee   = !isTrainer;
    const displayName = profile?.full_name || user?.full_name || user?.username || user?.email?.split('@')[0] || 'Student';

    useEffect(() => {
        let isMounted = true;
        async function loadStats() {
            try {
                const res = await fetch('/api/training/dashboard_stats.php', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) setStats(data);
                }
            } catch (e) {
                console.error('Stats loading error:', e);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadStats();
        return () => { isMounted = false; };
    }, [user?.id]);

    useEffect(() => {
        let isMounted = true;
        if (!isTrainee) {
            setProjLoading(false);
            return;
        }

        async function loadProjectData() {
            try {
                const res = await fetch('/api/training/ideas/list.php', { credentials: 'include' });
                if (!res.ok) {
                    if (isMounted) setProjLoading(false);
                    return;
                }
                const data = await res.json();
                if (!isMounted) return;

                if (data.ideas && data.ideas.length > 0) {
                    const proj = data.ideas[0];
                    setMyProject(proj);

                    try {
                        const docsRes = await fetch(`/api/training/docs/list.php?idea_id=${proj.id}`, { credentials: 'include' });
                        if (docsRes.ok) {
                            const docsData = await docsRes.json();
                            if (isMounted && docsData.docs) {
                                setMyDocs(docsData.docs);
                            }
                        }
                    } catch (e) {
                        console.error('Docs error:', e);
                    }
                } else {
                    setMyProject(null);
                    setMyDocs([]);
                }
            } catch (e) {
                console.error('Project data error:', e);
            } finally {
                if (isMounted) setProjLoading(false);
            }
        }

        loadProjectData();
        return () => { isMounted = false; };
    }, [isTrainee, user?.id]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':  return { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)' };
            case 'completed': return { bg: 'rgba(99,102,241,0.12)', color: '#6366f1', border: 'rgba(99,102,241,0.3)' };
            case 'rejected':  return { bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.3)'  };
            case 'voting':    return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' };
            case 'changes_requested': return { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' };
            default:          return { bg: 'rgba(59,130,246,0.12)', color: '#3b82f6', border: 'rgba(59,130,246,0.3)'  };
        }
    };

    const getStatusLabel = (status) => ({
        submitted:          lang === 'ar' ? 'قيد المراجعة'    : 'Under Review',
        approved:           lang === 'ar' ? 'معتمد رسمياً'     : 'Approved',
        completed:          lang === 'ar' ? 'مكتمل وناجح'     : 'Completed',
        rejected:           lang === 'ar' ? 'مرفوض'           : 'Rejected',
        voting:             lang === 'ar' ? 'قيد التصويت'     : 'In Voting',
        changes_requested:  lang === 'ar' ? 'مطلوب تعديلات'   : 'Changes Requested',
    }[status] || status || (lang === 'ar' ? 'قيد المراجعة' : 'Under Review'));

    const getMilestones = (proj, docs) => [
        { step: 1, titleEn: 'Idea Registered', titleAr: 'تسجيل الفكرة', descEn: 'Project selected & registered', descAr: 'تم تسجيل واختيار الفكرة', done: true },
        { step: 2, titleEn: 'Academic Review', titleAr: 'المراجعة الأكاديمية', descEn: 'Trainer review & feedback', descAr: 'مراجعة وتقييم المشرف', done: ['approved','completed','voting','changes_requested'].includes(proj?.status) },
        { step: 3, titleEn: 'Approved & Active', titleAr: 'الاعتماد والتنفيذ', descEn: 'Officially approved', descAr: 'اعتماد رسمي وبدء التنفيذ', done: proj?.status === 'approved' || proj?.status === 'completed' },
        { step: 4, titleEn: 'Documentation', titleAr: 'التوثيق والتقارير', descEn: 'Deliverables & links uploaded', descAr: 'رفع التقارير وروابط الكود', done: docs && docs.length > 0 },
        { step: 5, titleEn: 'Certification', titleAr: 'التقييم والشهادة', descEn: 'Graded & certified', descAr: 'التقييم النهائي والشهادة', done: proj?.status === 'completed' },
    ];

    const milestones = getMilestones(myProject, myDocs);
    const completedMilestonesCount = milestones.filter(m => m.done).length;

    return (
        <div className="dashboard-page container">
            {/* ── Welcome Banner ── */}
            <div className="dash-banner">
                <div className="dash-banner-content">
                    <div className="dash-banner-avatar">{displayName.charAt(0).toUpperCase()}</div>
                    <div>
                        <h1>
                            {lang === 'ar' ? 'مرحباً، ' : 'Welcome back, '}
                            <strong>{displayName}</strong>
                            {isAdmin   ? <span className="dash-role-badge admin">ADMINISTRATOR</span>
                            : isTrainer ? <span className="dash-role-badge trainer">INSTRUCTOR</span>
                            :             <span className="dash-role-badge trainee">TRAINEE</span>}
                        </h1>
                        <p>
                            {lang === 'ar'
                                ? 'نظام إدارة التدريب الميداني — جامعة المنصورة الجديدة'
                                : 'NMU Field Training Management System — ERTH Program'}
                        </p>
                        {(profile?.final_track || user?.final_track) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.45rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '3px 9px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}>
                                    <Sparkles size={12} /> {lang === 'ar' ? 'المسار المعتمد:' : 'Track:'} {profile?.final_track || user?.final_track}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <Link to={isTrainee ? '/submitted-projects' : '/courses'} className="dash-banner-btn">
                    {isTrainee ? <FolderOpen size={18}/> : <BookOpen size={18}/>}
                    {isTrainee ? (lang === 'ar' ? 'مشروعي وفكرتي' : 'My Project & Idea') : (lang === 'ar' ? 'الدورات التدريبية' : 'Browse Courses')}
                </Link>
            </div>

            {/* ══════════ TRAINEE VIEW ══════════ */}
            {isTrainee && (
                <div className="dash-trainee-container">
                    {/* Project Status Hero */}
                    <div className="dash-project-hero">
                        {projLoading ? (
                            <div className="dash-hero-loading">
                                <div className="dash-hero-spinner"/>
                                <span>{lang === 'ar' ? 'جاري تحميل بيانات مشروعك...' : 'Loading your project...'}</span>
                            </div>
                        ) : myProject ? (
                            <>
                                <div className="dash-hero-left">
                                    <div className="dash-hero-label">
                                        <Cpu size={13}/>
                                        {lang === 'ar' ? 'مشروع التدريب الميداني المعتمد' : 'Official Field Training Project'}
                                    </div>
                                    <h2 className="dash-hero-title">{myProject.title}</h2>
                                    <div className="dash-hero-meta">
                                        <span><BookOpen size={13}/> {myProject.course_name}</span>
                                        <span><UserCheck size={13}/> {myProject.reviewer_name || myProject.effective_trainer_name || (lang === 'ar' ? 'مشرف الدورة' : 'Course Trainer')}</span>
                                        <span style={(() => { const s = getStatusColor(myProject.status); return { background: s.bg, color: s.color, border: `1px solid ${s.border}`, padding: '2px 10px', borderRadius: '12px', fontWeight: 700, fontSize: '0.78rem' }; })()}>
                                            {getStatusLabel(myProject.status)}
                                        </span>
                                    </div>
                                    <div className="dash-hero-actions">
                                        <Link to="/submitted-projects" className="dash-cta-btn primary">
                                            <FolderOpen size={15}/>
                                            <span>{lang === 'ar' ? 'فتح لوحة المشروع والتوثيق' : 'Open Project & Proposal'}</span>
                                            <ChevronRight size={14}/>
                                        </Link>
                                    </div>
                                </div>

                                <div className="dash-hero-right">
                                    <div className="dash-milestones-mini">
                                        <div className="dash-milestones-header">
                                            <TrendingUp size={14}/>
                                            <span>{lang === 'ar' ? 'مراحل تقدم المشروع' : 'Project Lifecycle Milestones'}</span>
                                        </div>

                                        <div className="dash-progress-bar-wrap">
                                            <div className="dash-progress-bar-fill" style={{ width: `${(completedMilestonesCount / 5) * 100}%` }}/>
                                        </div>
                                        <div className="dash-progress-label">
                                            <strong>{completedMilestonesCount} / 5</strong> {lang === 'ar' ? 'مراحل مكتملة' : 'milestones completed'} ({Math.round((completedMilestonesCount / 5) * 100)}%)
                                        </div>

                                        <div className="dash-milestone-items-list">
                                            {milestones.map(ms => (
                                                <div key={ms.step} className={`dash-milestone-row ${ms.done ? 'done' : ''}`}>
                                                    <div className={`dash-ms-dot ${ms.done ? 'done' : ''}`}>
                                                        {ms.done ? <CheckCircle2 size={12}/> : <span>{ms.step}</span>}
                                                    </div>
                                                    <div className="dash-ms-text">
                                                        <strong>{lang === 'ar' ? ms.titleAr : ms.titleEn}</strong>
                                                        <span>{lang === 'ar' ? ms.descAr : ms.descEn}</span>
                                                    </div>
                                                    <div className={`dash-ms-status ${ms.done ? 'done' : ''}`}>
                                                        {ms.done ? <Check size={11}/> : <Clock size={11}/>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="dash-no-project">
                                <div className="dash-no-proj-icon"><Sparkles size={32}/></div>
                                <div>
                                    <h3>{lang === 'ar' ? 'لم تختر فكرة مشروعك للتدريب الميداني بعد' : 'No Field Training Project Selected Yet'}</h3>
                                    <p>{lang === 'ar'
                                        ? 'تصفح دليل المشاريع الـ 64 المعتمدة مع المقترح الأكاديمي الكامل أو قدم فكرتك الخاصة.'
                                        : 'Select from 64 official catalog ideas or create your own custom project idea.'}</p>
                                    <Link to="/submitted-projects" className="dash-cta-btn primary" style={{ display: 'inline-flex', marginTop: '0.85rem' }}>
                                        <Zap size={15}/> {lang === 'ar' ? 'تصفح المشاريع' : 'Browse Projects'} <ChevronRight size={14}/>
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Academic Evaluation Summary (If reviewed / feedback present) */}
                    {myProject && (myProject.feedback || myProject.status === 'approved' || myProject.status === 'completed' || myProject.status === 'changes_requested') && (
                        <div className="dash-eval-card">
                            <div className="dash-eval-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Award size={18} className="text-primary" />
                                    <h4>{lang === 'ar' ? 'التقييم الأكاديمي وملاحظات المشرف' : 'Academic Evaluation & Trainer Feedback'}</h4>
                                </div>
                                <span className={`dash-eval-status-pill ${myProject.status}`}>
                                    {getStatusLabel(myProject.status)}
                                </span>
                            </div>
                            {myProject.feedback && (
                                <p className="dash-eval-feedback-text">
                                    "{myProject.feedback}"
                                </p>
                            )}
                            {myProject.vote_summary && myProject.vote_summary.total_votes > 0 && (
                                <div className="dash-eval-votes-row">
                                    <span><ThumbsUp size={13}/> {myProject.vote_summary.approve_count} {lang === 'ar' ? 'موافقة' : 'Approvals'}</span>
                                    <span><Users size={13}/> {myProject.vote_summary.total_votes} {lang === 'ar' ? 'مقيمين' : 'Evaluators'}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Trainee Row: Team + Quick Actions */}
                    <div className="dash-trainee-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                        {/* Team Summary */}
                        <div className="dash-card">
                            <div className="dash-card-header">
                                <h2><Users size={16}/> {lang === 'ar' ? 'فريق العمل والزملاء' : 'Project Team'}</h2>
                                {myProject && <Link to="/submitted-projects" className="dash-card-link">{lang === 'ar' ? 'إدارة الفريق' : 'Manage Team'} <ArrowRight size={12}/></Link>}
                            </div>
                            {(!myProject?.team_members || myProject.team_members.length === 0) ? (
                                <div className="dash-empty">
                                    <Users size={26} strokeWidth={1.5}/>
                                    <p>{lang === 'ar' ? 'أنت تعمل بشكل فردي أو لم تقم بدعوة زملاء بعد.' : 'Working individually or no teammates invited yet.'}</p>
                                </div>
                            ) : (
                                <div className="dash-team-mini-list">
                                    {myProject.team_members.map((m, idx) => (
                                        <div key={m.user_id || m.id || idx} className="dash-team-mini-row">
                                            <div className="dash-team-mini-avatar">
                                                {m.role === 'leader' ? <Crown size={14} color="#d97706" /> : <User size={14} color="#2563eb" />}
                                            </div>
                                            <div className="dash-team-mini-info">
                                                <strong>{m.full_name || m.username || m.email}</strong>
                                                <span>{m.role === 'leader' ? (lang === 'ar' ? 'قائد الفريق' : 'Team Leader') : (lang === 'ar' ? 'عضو' : 'Member')} {m.student_id ? `• ${m.student_id}` : ''}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Action Shortcuts */}
                        <div className="dash-card dash-actions-card">
                            <div className="dash-card-header">
                                <h2><Zap size={16}/> {lang === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}</h2>
                            </div>
                            <div className="dash-quick-actions">
                                <Link to="/submitted-projects" className="dash-action-btn">
                                    <div className="dash-action-icon" style={{ background: 'rgba(0,45,86,0.08)', color: '#002D56' }}><FolderOpen size={16}/></div>
                                    <span>{myProject ? (lang === 'ar' ? 'مشروعي ومقترحي' : 'My Project & Proposal') : (lang === 'ar' ? 'تصفح المشاريع' : 'Browse Projects')}</span>
                                    <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--mute)' }}/>
                                </Link>
                                <Link to="/courses" className="dash-action-btn">
                                    <div className="dash-action-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}><BookOpen size={16}/></div>
                                    <span>{lang === 'ar' ? 'الدورات والموضوعات' : 'Courses & Topics'}</span>
                                    <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--mute)' }}/>
                                </Link>
                                <Link to="/leaderboard" className="dash-action-btn">
                                    <div className="dash-action-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><Trophy size={16}/></div>
                                    <span>{lang === 'ar' ? 'لوحة الترتيب' : 'Ideas Leaderboard'}</span>
                                    <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--mute)' }}/>
                                </Link>
                                <Link to="/profile" className="dash-action-btn">
                                    <div className="dash-action-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}><Shield size={16}/></div>
                                    <span>{lang === 'ar' ? 'ملفي الشخصي' : 'My Profile'}</span>
                                    <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--mute)' }}/>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ══════════ TRAINER / ADMIN VIEW ══════════ */}
            {!isTrainee && (
                <>
                    {!loading && stats && (
                        <div className="dash-stats-row">
                            {[
                                { icon: Users,     num: stats.totalTrainees ?? '—', label_ar: 'إجمالي المتدربين', label_en: 'Total Trainees',      c: '#2563eb' },
                                { icon: Lightbulb, num: stats.totalIdeas    ?? '—', label_ar: 'المشاريع المقدمة', label_en: 'Submitted Projects',  c: '#10b981' },
                                { icon: BookOpen,  num: stats.totalCourses  ?? '—', label_ar: 'الدورات النشطة',  label_en: 'Active Courses',       c: '#f59e0b' },
                                { icon: FileText,  num: stats.totalDocs     ?? '—', label_ar: 'مستندات وتوثيق',  label_en: 'Documents Uploaded',   c: '#a855f7' },
                            ].map((s, i) => (
                                <div key={i} className="dash-stat-card">
                                    <div className="dash-stat-icon" style={{ background: `${s.c}14`, border: `1px solid ${s.c}28`, color: s.c }}>
                                        <s.icon size={20}/>
                                    </div>
                                    <div className="dash-stat-info">
                                        <div className="dash-stat-num">{s.num}</div>
                                        <div className="dash-stat-label">{lang === 'ar' ? s.label_ar : s.label_en}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="dash-main-grid">
                        <div className="dash-card">
                            <div className="dash-card-header">
                                <h2><BarChart3 size={16}/> {lang === 'ar' ? 'نظرة عامة على الدورات التدريبية' : 'Course Overview'}</h2>
                                <Link to="/courses" className="dash-card-link">{lang === 'ar' ? 'عرض الكل' : 'View All'} <ArrowRight size={13}/></Link>
                            </div>
                            {loading ? (
                                <div className="dash-empty"><div className="dash-hero-spinner"/></div>
                            ) : stats?.courseOverview?.length > 0 ? (
                                <div className="dash-course-table">
                                    {stats.courseOverview.slice(0, 6).map((c, i) => (
                                        <div key={i} className="dash-course-row">
                                            <div className="dash-course-name">
                                                <div className="dash-course-dot"/>
                                                <strong>{c.name}</strong>
                                            </div>
                                            <div className="dash-course-chips">
                                                <span className="dash-chip blue"><Users size={11}/> {c.trainee_count}</span>
                                                <span className="dash-chip green"><Lightbulb size={11}/> {c.idea_count}</span>
                                                <span className="dash-chip purple"><FileText size={11}/> {c.doc_count}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="dash-empty"><BookOpen size={28} strokeWidth={1.5}/><p>{lang === 'ar' ? 'لا توجد دورات نشطة.' : 'No active courses.'}</p></div>
                            )}
                        </div>

                        <div className="dash-card dash-actions-card">
                            <div className="dash-card-header">
                                <h2><Zap size={16}/> {lang === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}</h2>
                            </div>
                            <div className="dash-quick-actions">
                                <Link to="/submitted-projects" className="dash-action-btn">
                                    <div className="dash-action-icon" style={{ background: 'rgba(0,45,86,0.08)', color: '#002D56' }}><FileText size={16}/></div>
                                    <span>{lang === 'ar' ? 'مراجعة وتقييم المشاريع' : 'Review Projects'}</span>
                                    <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--mute)' }}/>
                                </Link>
                                <Link to="/courses" className="dash-action-btn">
                                    <div className="dash-action-icon" style={{ background: 'rgba(59,130,246,0.1)', color: '#2563eb' }}><BookOpen size={16}/></div>
                                    <span>{lang === 'ar' ? 'إدارة الدورات' : 'Manage Courses'}</span>
                                    <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--mute)' }}/>
                                </Link>
                                <Link to="/leaderboard" className="dash-action-btn">
                                    <div className="dash-action-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}><Trophy size={16}/></div>
                                    <span>{lang === 'ar' ? 'لوحة الترتيب' : 'Leaderboard'}</span>
                                    <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--mute)' }}/>
                                </Link>
                                {isAdmin && (
                                    <Link to="/admin" className="dash-action-btn">
                                        <div className="dash-action-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}><Shield size={16}/></div>
                                        <span>{lang === 'ar' ? 'لوحة الإدارة' : 'Admin Panel'}</span>
                                        <ChevronRight size={14} style={{ marginLeft: 'auto', color: 'var(--mute)' }}/>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
