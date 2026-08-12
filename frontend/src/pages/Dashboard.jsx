import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { getActivityFeed } from '../services/api';
import {
    Activity, FolderKanban, Users, Trophy, FolderOpen, FileText,
    Zap, ArrowRight, BookOpen, Lightbulb, CheckCircle2, Shield
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
    const { lang } = useI18n();
    const { user, profile } = useAuth();
    const [feed, setFeed]       = useState([]);
    const [stats, setStats]     = useState(null);
    const [loading, setLoading] = useState(true);

    const role = (user?.role || profile?.role || '').toLowerCase();
    const isAdmin = !!(user?.is_admin || profile?.is_admin || role === 'admin');
    const isTrainer = role === 'trainer' || isAdmin;

    useEffect(() => {
        async function load() {
            try {
                const [f, s] = await Promise.all([
                    getActivityFeed(10).catch(() => []),
                    fetch('/api/training/dashboard_stats.php').then(r => r.ok ? r.json() : null).catch(() => null)
                ]);
                setFeed(f || []);
                setStats(s);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [user]);

    const displayName = profile?.full_name_en || profile?.full_name || user?.email?.split('@')[0] || '';

    return (
        <div className="dashboard-page container">
            {/* ══ Welcome Banner ══ */}
            <div className="dash-banner">
                <div className="dash-banner-content">
                    <div className="dash-banner-avatar">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1>
                            {lang === 'ar' ? 'مرحباً بعودتك' : 'Welcome back'}, <strong>{displayName}</strong>
                        </h1>
                        <p>
                            {lang === 'ar'
                                ? 'نظام إدارة التدريب الميداني الجامعي — جامعة المنصورة الجديدة'
                                : 'New Mansoura University Field Training Management System'}
                        </p>
                    </div>
                </div>
                <Link to="/courses" className="dash-banner-btn">
                    <BookOpen size={18} />
                    {lang === 'ar' ? 'تصفح الدورات التدريبية' : 'Browse Courses'}
                </Link>
            </div>

            {/* ══ Stat Cards Row ══ */}
            <div className="dash-stats-row">
                <div className="dash-stat-card">
                    <div className="dash-stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                        <BookOpen size={22} />
                    </div>
                    <div className="dash-stat-info">
                        <span className="dash-stat-num">{stats?.totalCourses ?? '—'}</span>
                        <span className="dash-stat-label">{lang === 'ar' ? 'الدورات النشطة' : 'Active Courses'}</span>
                    </div>
                </div>

                <div className="dash-stat-card">
                    <div className="dash-stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
                        <Users size={22} />
                    </div>
                    <div className="dash-stat-info">
                        <span className="dash-stat-num">{stats?.totalTrainees ?? '—'}</span>
                        <span className="dash-stat-label">{lang === 'ar' ? 'المتدربون المقيدون' : 'Enrolled Trainees'}</span>
                    </div>
                </div>

                <div className="dash-stat-card">
                    <div className="dash-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        <Lightbulb size={22} />
                    </div>
                    <div className="dash-stat-info">
                        <span className="dash-stat-num">{stats?.totalIdeas ?? '—'}</span>
                        <span className="dash-stat-label">{lang === 'ar' ? 'أفكار المشاريع' : 'Submitted Ideas'}</span>
                    </div>
                </div>

                <div className="dash-stat-card">
                    <div className="dash-stat-icon" style={{ background: 'rgba(168, 85, 247, 0.1)', color: '#a855f7' }}>
                        <FolderOpen size={22} />
                    </div>
                    <div className="dash-stat-info">
                        <span className="dash-stat-num">{stats?.totalDocs ?? '—'}</span>
                        <span className="dash-stat-label">{lang === 'ar' ? 'الوثائق والتقارير' : 'Documents Uploaded'}</span>
                    </div>
                </div>
            </div>

            {/* ══ Main Grid ══ */}
            <div className="dash-main-grid">
                {/* Left: Courses Overview */}
                <div className="dash-card dash-feed-card">
                    <div className="dash-card-header">
                        <h2><BookOpen size={18} /> {lang === 'ar' ? 'ملخص الدورات التدريبية' : 'Training Courses Overview'}</h2>
                        <Link to="/courses" className="btn btn-ghost btn-sm">
                            {lang === 'ar' ? 'عرض الكل' : 'View All'} <ArrowRight size={14} />
                        </Link>
                    </div>

                    {stats?.courseOverview?.length > 0 ? (
                        <div className="dash-feed-list">
                            {stats.courseOverview.map(c => (
                                <div key={c.id} className="dash-feed-item" style={{ gap: '1rem', alignItems: 'center' }}>
                                    <div className="dash-feed-icon" style={{ color: '#2563eb', background: 'rgba(37,99,235,0.1)' }}>
                                        <BookOpen size={16} />
                                    </div>
                                    <div className="dash-feed-content">
                                        <p className="dash-feed-text" style={{ fontWeight: 600 }}>
                                            {lang === 'ar' && c.name_ar ? c.name_ar : c.name_en}
                                        </p>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {c.trainee_count} {lang === 'ar' ? 'متدرب' : 'trainees'} • {c.idea_count} {lang === 'ar' ? 'فكرة' : 'ideas'} • {c.doc_count} {lang === 'ar' ? 'وثيقة' : 'docs'}
                                        </span>
                                    </div>
                                    <Link to={`/courses/${c.id}`} className="btn btn-ghost btn-sm">
                                        →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="dash-empty">
                            <BookOpen size={36} strokeWidth={1} />
                            <p>{lang === 'ar' ? 'لا توجد دورات نشطة حالياً.' : 'No active training courses yet.'}</p>
                            <Link to="/courses" className="dash-empty-btn">
                                {lang === 'ar' ? 'انتقل للدورات' : 'Go to Courses'} <ArrowRight size={14} />
                            </Link>
                        </div>
                    )}
                </div>

                {/* Right Column: Quick Navigation */}
                <div className="dash-right-col">
                    <div className="dash-card dash-actions-card">
                        <div className="dash-card-header">
                            <h2><Zap size={18} /> {lang === 'ar' ? 'إجراءات سريعة' : 'Quick Navigation'}</h2>
                        </div>
                        <div className="dash-quick-actions">
                            <Link to="/courses" className="dash-action-btn dash-action-btn--primary">
                                <BookOpen size={18} /> {lang === 'ar' ? 'الدورات التدريبية' : 'Training Courses'}
                            </Link>

                            <Link to="/submitted-projects" className="dash-action-btn">
                                <FileText size={18} /> {isTrainer ? (lang === 'ar' ? 'مشاريع المتدربين' : 'Trainee Projects') : (lang === 'ar' ? 'مشاريعي وأفكاري' : 'My Projects & Ideas')}
                            </Link>

                            <Link to="/leaderboard" className="dash-action-btn">
                                <Trophy size={18} /> {lang === 'ar' ? 'لوحة المتصدرين' : 'Idea Leaderboard'}
                            </Link>

                            <Link to="/docs-archive" className="dash-action-btn">
                                <FolderOpen size={18} /> {lang === 'ar' ? 'أرشيف الوثائق' : 'Documents Archive'}
                            </Link>

                            {isTrainer && (
                                <>
                                    <Link to="/trainees" className="dash-action-btn">
                                        <Users size={18} /> {lang === 'ar' ? 'إدارة المتدربين' : 'Trainees Management'}
                                    </Link>
                                    <Link to="/approvals" className="dash-action-btn">
                                        <CheckCircle2 size={18} /> {lang === 'ar' ? 'طلبات التسجيل' : 'Registrations'}
                                    </Link>
                                </>
                            )}

                            {isAdmin && (
                                <Link to="/admin" className="dash-action-btn" style={{ borderColor: 'var(--accent)' }}>
                                    <Shield size={18} /> {lang === 'ar' ? 'لوحة المسؤول' : 'Admin Panel'}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
