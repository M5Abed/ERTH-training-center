import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getUserProfile, getCompletedProjectsForUser, formatDate, formatMonthYear } from '../services/api';
import { SKILLS_CATALOG } from '../data/constants';
import { useI18n } from '../contexts/I18nContext';
import { Star, GraduationCap, Briefcase, Lock, Calendar, Wrench, CheckCircle2 } from 'lucide-react';
import './PublicProfile.css';

export default function PublicProfile() {
    const { id } = useParams();
    const { t, lang } = useI18n();
    const [profile, setProfile] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function load() {
            setLoading(true);
            setError('');
            const data = await getUserProfile(id);
            if (!data) {
                setError('Profile not found.');
            } else {
                setProfile(data);
                const projs = await getCompletedProjectsForUser(data.id);
                setProjects(projs || []);
            }
            setLoading(false);
        }
        load();
    }, [id]);

    const groupedSkills = useMemo(() => {
        if (!profile?.user_skills?.length) return {};
        const grouped = {};
        profile.user_skills.forEach(s => {
            const catalog = SKILLS_CATALOG.find(x => x.id === s.skill_id);
            const catKey = catalog ? catalog.cat_en : 'Other';
            const catLabel = catalog ? (lang === 'ar' ? catalog.cat_ar : catalog.cat_en) : 'Other';
            const name = catalog ? (lang === 'ar' ? catalog.ar : catalog.en) : s.skill_id;
            if (!grouped[catKey]) grouped[catKey] = { label: catLabel, skills: [] };
            grouped[catKey].skills.push({ name, level: s.proficiency || 0 });
        });
        return grouped;
    }, [profile?.user_skills, lang]);

    const levelLabel = (lvl) => {
        if (!lvl || lvl < 2) return lang === 'ar' ? 'مبتدئ' : 'Beginner';
        if (lvl < 4) return lang === 'ar' ? 'متوسط' : 'Intermediate';
        return lang === 'ar' ? 'متقدم' : 'Advanced';
    };

    const levelClass = (lvl) => {
        if (!lvl || lvl < 2) return 'level-beginner';
        if (lvl < 4) return 'level-intermediate';
        return 'level-advanced';
    };

    const getInitials = (name) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    if (loading) return (
        <div className="gv-shell">
            <div className="gv-spinner-wrap"><div className="gv-spinner" /></div>
        </div>
    );

    if (error || !profile) return (
        <div className="gv-shell">
            <div className="gv-not-found">
                <Lock size={40} className="gv-lock-icon" />
                <h2>{error || 'Profile not found'}</h2>
                <p>{lang === 'ar' ? 'هذا الملف غير موجود أو تم إزالته.' : 'This profile does not exist or has been removed.'}</p>
                <Link to="/" className="gv-home-btn">{lang === 'ar' ? 'الرئيسية' : 'Go to Home'}</Link>
            </div>
        </div>
    );

    const name = profile.full_name || profile.full_name || '';
    const hasSkills = Object.keys(groupedSkills).length > 0;

    return (
        <div className="gv-shell">
            {/* Minimal header — brand only, no nav links */}
            <header className="gv-topbar">
                <span className="gv-brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src="/assets/university_logo.png" alt="NMU" style={{ height: '28px', width: 'auto' }} />
                    <span>ERTH Training Center</span>
                </span>
                <Link to="/auth" className="gv-login-btn">
                    <Lock size={14} />
                    {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                </Link>
            </header>

            <main className="gv-main">
                {/* Profile Card */}
                <div className="gv-card gv-hero">
                    <div className="gv-avatar-wrap">
                        {profile.avatar_url
                            ? <img src={profile.avatar_url} alt={name} className="gv-avatar" />
                            : <div className="gv-avatar gv-avatar-placeholder">{getInitials(name)}</div>
                        }
                    </div>
                    <div className="gv-hero-info">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            <h1 className="gv-name" style={{ margin: 0 }}>{name}</h1>
                            {profile.username && (
                                <span className="gv-username" style={{ fontSize: '0.95rem', color: 'var(--primary)', background: 'rgba(79, 70, 229, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                                    @{profile.username}
                                </span>
                            )}
                        </div>
                        <div className="gv-meta">
                            {profile.role && profile.role !== 'student' && (
                                <span className="gv-badge gv-badge-role">{profile.role}</span>
                            )}
                            {profile.college_name && (
                                <span className="gv-meta-item"><GraduationCap size={14} /> {profile.college_name}</span>
                            )}
                            {profile.major && (
                                <span className="gv-meta-item"><Briefcase size={14} /> {profile.major}</span>
                            )}
                            {profile.academic_year && profile.role === 'student' && (
                                <span className="gv-meta-item">
                                    {lang === 'ar' ? `السنة ${profile.academic_year}` : `Year ${profile.academic_year}`}
                                </span>
                            )}
                            {profile.created_at && (
                                <span className="gv-meta-item">
                                    <Calendar size={14} /> {t('member_since')} {formatMonthYear(profile.created_at)}
                                </span>
                            )}
                        </div>
                        {profile.bio && <p className="gv-bio">{profile.bio}</p>}
                    </div>
                </div>

                <div className="gv-columns">
                    {/* Skills */}
                    <div className="gv-card gv-section">
                        <h2 className="gv-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Wrench size={18} className="text-primary" />
                            {lang === 'ar' ? 'المهارات والخبرات' : 'Skills & Proficiencies'}
                        </h2>
                        {!hasSkills ? (
                            <p className="gv-muted">{lang === 'ar' ? 'لا توجد مهارات مُضافة.' : 'No skills listed yet.'}</p>
                        ) : (
                            Object.entries(groupedSkills).map(([catKey, { label, skills }]) => (
                                <div key={catKey} className="gv-skill-group">
                                    <h3 className="gv-skill-cat">{label}</h3>
                                    <div className="gv-skill-tags">
                                        {skills.map((sk, i) => (
                                            <span key={i} className={`gv-skill-tag ${levelClass(sk.level)}`}>
                                                {sk.name}
                                                {sk.level > 0 && <em>{levelLabel(sk.level)}</em>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                </div>

                {/* Completed Projects — only shown when there are any */}
                {projects.length > 0 && (
                    <div className="gv-card gv-section">
                        <h2 className="gv-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                            {lang === 'ar' ? 'المشاريع المكتملة' : 'Completed Projects'}
                            <span className="gv-proj-count">{projects.length}</span>
                        </h2>
                        <div className="gv-project-list">
                            {projects.map((p, i) => {
                                const title = p.title || 'Untitled';
                                const desc = p.description || '';
                                return (
                                    <div key={p.id ?? i} className="gv-project-item">
                                        <div className="gv-project-dot" />
                                        <div>
                                            <p className="gv-project-title">{title}</p>
                                            {desc && <p className="gv-project-desc">{desc}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Peer Reviews — always shown, locked */}
                <div className="gv-card gv-section">
                    <h2 className="gv-section-title">
                        {lang === 'ar' ? '⭐ التقييمات' : '⭐ Peer Reviews'}
                    </h2>
                    <div className="gv-locked-notice">
                        <Lock size={18} />
                        <p>{lang === 'ar' ? 'سجّل الدخول لرؤية التقييمات الكاملة.' : 'Sign in to view full ratings.'}</p>
                        <Link to="/auth" className="gv-login-btn gv-login-btn--inline">
                            {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="gv-footer">
                ERTH Training Center — Smart Team Formation &nbsp;·&nbsp; Developed by{' '}
                <a href="https://erth.dev" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                    ERTH
                </a>
            </footer>
        </div>
    );
}
