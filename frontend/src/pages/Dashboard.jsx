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
    Building2, Calendar, Plus, Star
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
    const { user, profile } = useAuth();
    const { lang } = useI18n();
    const [stats, setStats]             = useState(null);
    const [myProject, setMyProject]     = useState(null);
    const [myDocs, setMyDocs]           = useState([]);
    const [topProjects, setTopProjects] = useState([]);
    const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
    const [loading, setLoading]         = useState(true);
    const [projLoading, setProjLoading] = useState(true);

    const role        = (user?.role || profile?.role || '').toLowerCase();
    const isAdmin     = !!(user?.is_admin || profile?.is_admin || role === 'admin');
    const isTrainer   = role === 'trainer' || isAdmin;
    const isTrainee   = !isTrainer;
    const displayName = profile?.full_name || user?.full_name || user?.username || user?.email?.split('@')[0] || 'Student';

    const isExternalStudent = Boolean(
        user?.is_external === true ||
        user?.is_external === 1 ||
        profile?.is_external === true ||
        profile?.is_external === 1 ||
        user?.training_type === 'external' ||
        profile?.training_type === 'external' ||
        myProject?.course_type === 'external' ||
        myProject?.training_type === 'external' ||
        (user?.external_enrollment && user?.external_enrollment?.training_type === 'external') ||
        (profile?.external_enrollment && profile?.external_enrollment?.training_type === 'external')
    );

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

    useEffect(() => {
        let isMounted = true;
        async function loadLeaderboard() {
            try {
                const res = await fetch('/api/training/leaderboard/list.php?limit=5', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (isMounted) {
                        const list = (data.top_5_voted && data.top_5_voted.length > 0) 
                            ? data.top_5_voted 
                            : (data.projects || []).slice(0, 5);
                        setTopProjects(list);
                    }
                }
            } catch (e) {
                console.error('Leaderboard load error:', e);
            } finally {
                if (isMounted) setLoadingLeaderboard(false);
            }
        }
        loadLeaderboard();
        return () => { isMounted = false; };
    }, []);

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
                                : 'NMU Field Training Management System — New Mansoura University'}
                        </p>
                        {(isExternalStudent && (profile?.final_track || user?.final_track)) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.45rem' }}>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '3px 9px', borderRadius: '10px', fontSize: '0.78rem', fontWeight: 600 }}>
                                    <Sparkles size={12} /> {lang === 'ar' ? 'المسار المعتمد:' : 'Track:'} {profile?.final_track || user?.final_track}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
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
                                        <Link to="/projects" className="dash-cta-btn primary">
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
                                    <p>
                                        {isExternalStudent
                                            ? (lang === 'ar'
                                                ? 'قم بتسجيل مقترح مشروع التدريب الميداني الخاص بك وتحديد جهة التدريب والمسار المعتمد.'
                                                : 'Register your official field training project proposal and set up your training provider and track.')
                                            : (lang === 'ar'
                                                ? 'تصفح دليل المشاريع الـ 64 المعتمدة مع المقترح الأكاديمي الكامل أو قدم فكرتك الخاصة.'
                                                : 'Select from 64 official catalog ideas or create your own custom project idea.')
                                        }
                                    </p>
                                    <Link to="/projects" className="dash-cta-btn primary" style={{ display: 'inline-flex', marginTop: '0.85rem' }}>
                                        <Plus size={15}/> {lang === 'ar' ? 'إضافة مشروع' : 'Add Project'} <ChevronRight size={14}/>
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

                    {/* Trainee Row: External Training Hub / Team Summary + Quick Actions */}
                    <div className="dash-trainee-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                        {isExternalStudent ? (
                            <div className="dash-card">
                                <div className="dash-card-header">
                                    <h2><Building2 size={16}/> {lang === 'ar' ? 'جهة ومسار التدريب الميداني' : 'External Training & Provider'}</h2>
                                    <Link to="/projects" className="dash-card-link">
                                        {lang === 'ar' ? 'لوحة التدريب' : 'Training Hub'} <ArrowRight size={12}/>
                                    </Link>
                                </div>
                                <div className="dash-external-info-box">
                                    <div className="dash-external-item">
                                        <div className="dash-ext-icon"><Building2 size={16}/></div>
                                        <div className="dash-ext-details">
                                            <span className="dash-ext-label">{lang === 'ar' ? 'جهة التدريب الميداني:' : 'Training Company / Provider:'}</span>
                                            <strong className="dash-ext-val">
                                                {user?.external_enrollment?.provider_name || user?.external_enrollment?.custom_provider_name || myProject?.provider_name || myProject?.custom_provider_name || (lang === 'ar' ? 'جهة تدريب خارجي معتمدة' : 'Official External Provider')}
                                            </strong>
                                        </div>
                                    </div>

                                    {(profile?.final_track || user?.final_track || user?.external_enrollment?.final_track || myProject?.track_name) && (
                                        <div className="dash-external-item">
                                            <div className="dash-ext-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}><Sparkles size={16}/></div>
                                            <div className="dash-ext-details">
                                                <span className="dash-ext-label">{lang === 'ar' ? 'المسار التخصصي المعتمد:' : 'Technical Track:'}</span>
                                                <strong className="dash-ext-val" style={{ color: '#2563eb' }}>
                                                    {profile?.final_track || user?.final_track || user?.external_enrollment?.final_track || myProject?.track_name}
                                                </strong>
                                            </div>
                                        </div>
                                    )}

                                    <div className="dash-external-meta-row">
                                        {(user?.external_enrollment?.training_start_date) && (
                                            <span className="dash-ext-pill">
                                                <Calendar size={12}/>
                                                <span>{lang === 'ar' ? 'البدء:' : 'Start:'} {user.external_enrollment.training_start_date}</span>
                                            </span>
                                        )}
                                        <span className={`dash-ext-verif-pill ${(user?.external_enrollment?.verification_status || myProject?.verification_status || 'not_uploaded')}`}>
                                            <Shield size={12}/>
                                            <span>
                                                {(() => {
                                                    const st = user?.external_enrollment?.verification_status || myProject?.verification_status || 'not_uploaded';
                                                    if (st === 'approved') return lang === 'ar' ? 'إفادة التدريب: معتمدة' : 'Verification: Approved';
                                                    if (st === 'under_review') return lang === 'ar' ? 'إفادة التدريب: قيد المراجعة' : 'Verification: Under Review';
                                                    if (st === 'rejected') return lang === 'ar' ? 'إفادة التدريب: مرفوضة' : 'Verification: Rejected';
                                                    return lang === 'ar' ? 'إفادة التدريب: غير مرفوعة' : 'Verification: Not Uploaded';
                                                })()}
                                            </span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Team Summary for Internal Robotics Trainees */
                            <div className="dash-card">
                                <div className="dash-card-header">
                                    <h2><Users size={16}/> {lang === 'ar' ? 'فريق العمل والزملاء' : 'Project Team'}</h2>
                                    {myProject && <Link to="/projects" className="dash-card-link">{lang === 'ar' ? 'إدارة الفريق' : 'Manage Team'} <ArrowRight size={12}/></Link>}
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
                        )}

                        {/* Top 5 Projects Leaderboard Widget */}
                        <div className="dash-card dash-leaderboard-card">
                            <div className="dash-card-header">
                                <h2>
                                    <Trophy size={16} style={{ color: '#f59e0b' }} />
                                    <span>{lang === 'ar' ? 'أفضل 5 مشاريع متميزة (لوحة المتصدرين)' : 'Top 5 Projects Leaderboard'}</span>
                                </h2>
                                <Link to="/leaderboard" className="dash-card-link">
                                    {lang === 'ar' ? 'عرض الكل' : 'View All'} <ArrowRight size={13} />
                                </Link>
                            </div>

                            <div className="dash-leaderboard-body">
                                {loadingLeaderboard ? (
                                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                                        <div className="dash-hero-spinner" style={{ margin: '0 auto 8px auto' }} />
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            {lang === 'ar' ? 'جاري تحميل لوحة المتصدرين...' : 'Loading leaderboard...'}
                                        </span>
                                    </div>
                                ) : topProjects.length === 0 ? (
                                    <div className="dash-empty" style={{ padding: '2.5rem 1rem' }}>
                                        <Trophy size={28} style={{ color: '#94a3b8', margin: '0 auto 6px auto' }} />
                                        <p style={{ margin: 0, fontSize: '0.85rem' }}>
                                            {lang === 'ar' ? 'لم يتم تقييم أو تصدّر مشاريع بعد.' : 'No ranked projects yet.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="dash-top-projects-list">
                                        {topProjects.map((p, idx) => {
                                            const rank = idx + 1;
                                            const rankStyles = {
                                                1: { bg: 'linear-gradient(135deg, #ffd700, #f59e0b)', color: '#fff', icon: <Crown size={13} /> },
                                                2: { bg: 'linear-gradient(135deg, #cbd5e1, #94a3b8)', color: '#0f172a', icon: <Award size={13} /> },
                                                3: { bg: 'linear-gradient(135deg, #fed7aa, #ea580c)', color: '#fff', icon: <Award size={13} /> },
                                            };
                                            const badge = rankStyles[rank] || { bg: 'var(--bg-subtle, #f1f5f9)', color: 'var(--mute, #64748b)', icon: <span>#{rank}</span> };

                                            return (
                                                <div key={p.id || idx} className="dash-top-project-row">
                                                    <div className="dash-rank-badge" style={{ background: badge.bg, color: badge.color }}>
                                                        {badge.icon}
                                                    </div>
                                                    <div className="dash-top-project-info">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <strong className="dash-top-project-title">{p.title}</strong>
                                                            {Number(p.is_golden_pass) === 1 && (
                                                                <span title="Golden Pass" style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: 'linear-gradient(135deg, #f59e0b, #b45309)', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                                                    <Sparkles size={9} /> GP
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="dash-top-project-meta">
                                                            <span><User size={11} /> {p.trainee_name}</span>
                                                            {p.course_name && <span><BookOpen size={11} /> {p.course_name}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="dash-top-project-score">
                                                        {p.evaluation_score ? (
                                                            <span className="dash-score-pill">
                                                                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                                                                {p.evaluation_score}%
                                                            </span>
                                                        ) : (
                                                            <span className="dash-score-pill votes">
                                                                <ThumbsUp size={11} />
                                                                {p.vote_count || 0}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
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

                        {/* Top 5 Projects Leaderboard Widget for Instructors / Admins */}
                        <div className="dash-card dash-leaderboard-card">
                            <div className="dash-card-header">
                                <h2>
                                    <Trophy size={16} style={{ color: '#f59e0b' }} />
                                    <span>{lang === 'ar' ? 'أفضل 5 مشاريع متميزة (لوحة المتصدرين)' : 'Top 5 Projects Leaderboard'}</span>
                                </h2>
                                <Link to="/leaderboard" className="dash-card-link">
                                    {lang === 'ar' ? 'عرض الكل' : 'View All'} <ArrowRight size={13} />
                                </Link>
                            </div>

                            <div className="dash-leaderboard-body">
                                {loadingLeaderboard ? (
                                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
                                        <div className="dash-hero-spinner" style={{ margin: '0 auto 8px auto' }} />
                                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                            {lang === 'ar' ? 'جاري تحميل لوحة المتصدرين...' : 'Loading leaderboard...'}
                                        </span>
                                    </div>
                                ) : topProjects.length === 0 ? (
                                    <div className="dash-empty" style={{ padding: '2.5rem 1rem' }}>
                                        <Trophy size={28} style={{ color: '#94a3b8', margin: '0 auto 6px auto' }} />
                                        <p style={{ margin: 0, fontSize: '0.85rem' }}>
                                            {lang === 'ar' ? 'لم يتم تقييم أو تصدّر مشاريع بعد.' : 'No ranked projects yet.'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="dash-top-projects-list">
                                        {topProjects.map((p, idx) => {
                                            const rank = idx + 1;
                                            const rankStyles = {
                                                1: { bg: 'linear-gradient(135deg, #ffd700, #f59e0b)', color: '#fff', icon: <Crown size={13} /> },
                                                2: { bg: 'linear-gradient(135deg, #cbd5e1, #94a3b8)', color: '#0f172a', icon: <Award size={13} /> },
                                                3: { bg: 'linear-gradient(135deg, #fed7aa, #ea580c)', color: '#fff', icon: <Award size={13} /> },
                                            };
                                            const badge = rankStyles[rank] || { bg: 'var(--bg-subtle, #f1f5f9)', color: 'var(--mute, #64748b)', icon: <span>#{rank}</span> };

                                            return (
                                                <div key={p.id || idx} className="dash-top-project-row">
                                                    <div className="dash-rank-badge" style={{ background: badge.bg, color: badge.color }}>
                                                        {badge.icon}
                                                    </div>
                                                    <div className="dash-top-project-info">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <strong className="dash-top-project-title">{p.title}</strong>
                                                            {Number(p.is_golden_pass) === 1 && (
                                                                <span title="Golden Pass" style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: 'linear-gradient(135deg, #f59e0b, #b45309)', color: '#fff', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                                                                    <Sparkles size={9} /> GP
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="dash-top-project-meta">
                                                            <span><User size={11} /> {p.trainee_name}</span>
                                                            {p.course_name && <span><BookOpen size={11} /> {p.course_name}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="dash-top-project-score">
                                                        {p.evaluation_score ? (
                                                            <span className="dash-score-pill">
                                                                <Star size={11} fill="#f59e0b" color="#f59e0b" />
                                                                {p.evaluation_score}%
                                                            </span>
                                                        ) : (
                                                            <span className="dash-score-pill votes">
                                                                <ThumbsUp size={11} />
                                                                {p.vote_count || 0}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
