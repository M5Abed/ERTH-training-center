import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { getEligibleStudents, getProject, createNotification, isProjectExpired } from '../services/api';
import { SKILLS_CATALOG } from '../data/constants';
import { ArrowLeft, Brain, Star, Clock, Users, Zap, UserPlus, Check, AlertTriangle, Info, Search, Filter, X } from 'lucide-react';
import './Matches.css';

// ── Matching Engine v2.2 ──────────────────────────────────────────────────
// The scoring logic has been fully ported to the server side (eligible.php).
// The backend now returns students that are already scored across 5 factors
// and sorted by their total score.

export default function Matches() {
    const { id } = useParams();
    const { t, lang } = useI18n();
    const [project, setProject] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [invitedIds, setInvitedIds] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSkills, setSelectedSkills] = useState([]);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const filterRef = useRef(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const result = await getEligibleStudents(id);
            const p = result?.project;
            const s = result?.students || [];
            setProject(p);
            if (p && s.length > 0) {
                // The backend already calculates the 'score' object and sorts the students. 
                // We just use the data as provided.
                setStudents(s);
            }
            setLoading(false);
        }
        load();
    }, [id]);

    const getSkillName = (sid) => { const s = SKILLS_CATALOG.find(x => x.id === sid); return s ? (lang === 'ar' ? s.ar : s.en) : sid; };

    // Build list of all project skills for the filter panel
    const projectSkillIds = useMemo(() => {
        if (!project) return [];
        const projSkills = project.project_skills || project.skills || [];
        return [...new Set(projSkills.map(s => s.skill_id))];
    }, [project]);

    const toggleSkillFilter = (sid) => {
        setSelectedSkills(prev =>
            prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid]
        );
    };

    const clearFilters = () => {
        setSelectedSkills([]);
        setShowFilterPanel(false);
    };

    // Close filter panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setShowFilterPanel(false);
            }
        };
        if (showFilterPanel) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showFilterPanel]);

    // Invite a student (#33)
    const handleInvite = async (studentId, studentName) => {
        await createNotification(
            studentId,
            'invite',
            `You've been invited to join project "${project?.title || ''}"`,
            `تم دعوتك للانضمام لمشروع "${project?.title_ar || project?.title || ''}"`,
            project?.id
        );
        setInvitedIds(prev => new Set([...prev, studentId]));
    };

    const expired = project?.deadline ? isProjectExpired(project.deadline) : false;
    const teamFull = project ? (project.current_members || 0) >= (project.team_size || 999) : false;

    if (loading) return <div className="loading-state"><div className="spinner" /></div>;

    return (
        <div className="matches-page">
            <Link to={`/project/${id}`} className="btn btn-ghost btn-sm back-btn"><ArrowLeft size={16} /> {t('back_to_projects')}</Link>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('matches_title')}</h1>
                    <p className="page-subtitle">{t('matches_subtitle')}</p>
                </div>
            </div>

            {/* Project info bar - Integrated Search Bar (#34) */}
            {project && (
                <div className="match-project-bar" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '1rem', alignItems: 'center' }}>
                    <div className="match-project-info">
                        <Link to={`/project/${id}`} className="match-project-title" style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>
                            {lang === 'ar' ? (project.title_ar || project.title) : project.title}
                        </Link>
                        <div className="match-project-badges">
                            {expired && <span className="match-badge match-badge--expired"><AlertTriangle size={14} /> {lang === 'ar' ? 'منتهي' : 'Expired'}</span>}
                            {teamFull && <span className="match-badge match-badge--full"><Users size={14} /> {lang === 'ar' ? 'الفريق مكتمل' : 'Team Full'}</span>}
                        </div>
                    </div>

                    <div className="match-search-filter-row">
                        <div className="match-search-bar" style={{ marginBottom: 0, padding: '0.5rem 0.75rem', flex: 1 }}>
                            <Search size={16} className="match-search-icon" />
                            <input
                                type="text"
                                className="match-search-input"
                                placeholder={lang === 'ar' ? 'ابحث عن طالب بالاسم...' : 'Search students by name...'}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ fontSize: '0.85rem' }}
                            />
                            {searchQuery && (
                                <button className="match-search-clear" onClick={() => setSearchQuery('')} type="button">&times;</button>
                            )}
                        </div>
                        <div className="match-filter-wrap" ref={filterRef}>
                            <button
                                className={`btn btn-filter ${selectedSkills.length > 0 ? 'btn-filter--active' : ''}`}
                                onClick={() => setShowFilterPanel(prev => !prev)}
                                type="button"
                                id="filter-skills-btn"
                            >
                                <Filter size={16} />
                                {lang === 'ar' ? 'تصفية' : 'Filter'}
                                {selectedSkills.length > 0 && (
                                    <span className="filter-badge">{selectedSkills.length}</span>
                                )}
                            </button>
                            {showFilterPanel && (
                                <div className="filter-panel">
                                    <div className="filter-panel-header">
                                        <span className="filter-panel-title">
                                            <Filter size={14} />
                                            {lang === 'ar' ? 'تصفية بالمهارات' : 'Filter by Skills'}
                                        </span>
                                        {selectedSkills.length > 0 && (
                                            <button className="filter-clear-btn" onClick={clearFilters} type="button">
                                                <X size={12} /> {lang === 'ar' ? 'مسح' : 'Clear'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="filter-panel-body">
                                        {projectSkillIds.length === 0 ? (
                                            <p className="filter-empty">{lang === 'ar' ? 'لا مهارات متاحة' : 'No skills available'}</p>
                                        ) : (
                                            projectSkillIds.map(sid => (
                                                <button
                                                    key={sid}
                                                    className={`filter-skill-chip ${selectedSkills.includes(sid) ? 'filter-skill-chip--active' : ''}`}
                                                    onClick={() => toggleSkillFilter(sid)}
                                                    type="button"
                                                >
                                                    {selectedSkills.includes(sid) && <Check size={12} />}
                                                    {getSkillName(sid)}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Score methodology (#32) */}
            <div className="match-legend">
                <div className="match-legend-header">
                    <h4><Brain size={16} /> {lang === 'ar' ? 'منهجية التقييم' : 'Scoring Methodology'}</h4>
                    <p className="match-legend-desc">
                        {lang === 'ar'
                            ? 'يتم تقييم كل مرشح بناءً على خمسة معايير مرتبطة بمتطلبات مشروعك'
                            : 'Each candidate is evaluated across five criteria weighted by their impact on team success'}
                    </p>
                </div>
                <div className="methodology-grid">
                    <div className="methodology-card">
                        <div className="methodology-icon" style={{ background: 'var(--indigo)' }}><Zap size={14} /></div>
                        <div className="methodology-content">
                            <div className="methodology-label">{lang === 'ar' ? 'المهارات المطلوبة' : 'Required Skills'} <span className="methodology-weight">45%</span></div>
                            <p>{lang === 'ar'
                                ? 'مدى تطابق مهارات المرشح مع المهارات المطلوبة في مشروعك'
                                : 'How well the candidate\'s skills match your project\'s required and preferred skills'}</p>
                        </div>
                    </div>
                    <div className="methodology-card">
                        <div className="methodology-icon" style={{ background: 'var(--teal)' }}><Users size={14} /></div>
                        <div className="methodology-content">
                            <div className="methodology-label">{lang === 'ar' ? 'التكامل' : 'Skill Complement'} <span className="methodology-weight">25%</span></div>
                            <p>{lang === 'ar'
                                ? 'المهارات الإضافية التي يجلبها المرشح ولا يملكها الفريق الحالي'
                                : 'Extra skills the candidate brings that your current team lacks — filling gaps, not duplicating'}</p>
                        </div>
                    </div>
                    <div className="methodology-card">
                        <div className="methodology-icon" style={{ background: 'var(--amber)' }}><Clock size={14} /></div>
                        <div className="methodology-content">
                            <div className="methodology-label">{lang === 'ar' ? 'أسلوب العمل' : 'Work Style'} <span className="methodology-weight">15%</span></div>
                            <p>{lang === 'ar'
                                ? 'مدى توافق أسلوب عمل المرشح مع ثقافة فريقك (قائد، متعاون، مستقل)'
                                : 'Balance of work preferences — leaders, collaborators, and independent workers for a well-rounded team'}</p>
                        </div>
                    </div>
                    <div className="methodology-card">
                        <div className="methodology-icon" style={{ background: 'var(--rose)' }}><Clock size={14} /></div>
                        <div className="methodology-content">
                            <div className="methodology-label">{lang === 'ar' ? 'توافق الأوقات' : 'Schedule Alignment'} <span className="methodology-weight">10%</span></div>
                            <p>{lang === 'ar'
                                ? 'مدى تقاطع أوقات تفرغ المرشح مع أوقات فريقك'
                                : 'Intersection of free hours across the team to ensure smooth collaboration'}</p>
                        </div>
                    </div>
                    <div className="methodology-card">
                        <div className="methodology-icon" style={{ background: 'var(--blue)' }}><Star size={14} /></div>
                        <div className="methodology-content">
                            <div className="methodology-label">{lang === 'ar' ? 'السمعة' : 'Reputation'} <span className="methodology-weight">5%</span></div>
                            <p>{lang === 'ar'
                                ? 'متوسط تقييمات الزملاء مع مقياس ثقة مبني على عدد التقييمات'
                                : 'Calculated from peer reviews with mathematical confidence scaling based on the number of reviews'}</p>
                        </div>
                    </div>
                </div>
            </div>


            {(() => {
                const q = searchQuery.toLowerCase().trim();
                let filtered = q ? students.filter(st => {
                    const name = (st.full_name || st.full_name || st.email || '').toLowerCase();
                    const stId = (st.student_id || '').toString().toLowerCase();
                    return name.includes(q) || stId.includes(q);
                }) : students;

                // Apply skill filter
                if (selectedSkills.length > 0) {
                    filtered = filtered.filter(st => {
                        const candSkillIds = (st.user_skills || st.skills || []).map(s => s.skill_id || s.id || s);
                        return selectedSkills.every(sid => candSkillIds.includes(sid));
                    });
                }

                return filtered.length === 0 ? (
                    <div className="empty-state"><Users size={48} /><h3>{q ? (lang === 'ar' ? 'لا توجد نتائج للبحث' : 'No results found') : t('no_matches')}</h3></div>
                ) : (
                    <div className="matches-list">
                        {filtered.map((st, i) => (
                            <div key={st.id || i} className="match-card animate-fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
                                {i === 0 && !q && <div className="match-best">{t('best_match')}</div>}
                                <div className="match-card-main">
                                    <div className="match-avatar">
                                        {st.avatar_url
                                            ? <img src={st.avatar_url} alt={st.full_name} className="match-avatar-img" />
                                            : <span className="match-avatar-initial">{(st.full_name || st.email || '?')[0].toUpperCase()}</span>
                                        }
                                    </div>
                                    <div className="match-score-ring">
                                        <svg viewBox="0 0 80 80">
                                            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="5" />
                                            <circle cx="40" cy="40" r="34" fill="none" stroke={st.score.total >= 70 ? 'var(--green)' : st.score.total >= 40 ? 'var(--amber)' : 'var(--rose)'}
                                                strokeWidth="5" strokeLinecap="round" strokeDasharray={`${st.score.total * 2.14} 214`} transform="rotate(-90 40 40)" />
                                        </svg>
                                        <span className="match-score-val">{st.score.total}%</span>
                                    </div>
                                    <div className="match-info">
                                        <Link to={`/profile/${st.id}`} className="match-name">{st.full_name || st.email}</Link>
                                        <div className="match-college">{[st.college_name, st.major, st.academic_year ? `Year ${st.academic_year}` : null].filter(Boolean).join(' · ')}</div>
                                        <div className="match-skills-row">
                                            <span className="ms-label">{t('matched_skills')}:</span>
                                            {st.score.matched.slice(0, 5).map(sid => <span key={sid} className="skill-tag skill-tag--req">{getSkillName(sid)}</span>)}
                                            {st.score.matched.length === 0 && <span className="ms-label" style={{ color: 'var(--muted)' }}>{lang === 'ar' ? 'لا توجد مهارات مطابقة' : 'No matched skills'}</span>}
                                        </div>
                                    </div>
                                    {/* Invite button (#33) */}
                                    <div className="match-card-action">
                                        {invitedIds.has(st.id) ? (
                                            <span className="match-invited"><Check size={14} /> {lang === 'ar' ? 'تم الدعوة' : 'Invited'}</span>
                                        ) : (
                                            <button className="btn btn-primary btn-sm" onClick={() => handleInvite(st.id, st.full_name)} disabled={expired || teamFull}>
                                                <UserPlus size={14} /> {lang === 'ar' ? 'دعوة' : 'Invite'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="match-bars">
                                    <div className="match-bar"><span className="match-bar-label">{lang === 'ar' ? 'المهارات' : 'Skills'}</span><div className="match-bar-track"><div className="match-bar-fill" style={{ width: `${st.score.skillScore}%`, background: 'var(--indigo)' }} /></div><span className="match-bar-val">{st.score.skillScore}%</span></div>
                                    <div className="match-bar"><span className="match-bar-label">{lang === 'ar' ? 'التكامل' : 'Complement'}</span><div className="match-bar-track"><div className="match-bar-fill" style={{ width: `${st.score.complementScore}%`, background: 'var(--teal)' }} /></div><span className="match-bar-val">{st.score.complementScore}%</span></div>
                                    <div className="match-bar"><span className="match-bar-label">{lang === 'ar' ? 'أسلوب العمل' : 'Work Style'}</span><div className="match-bar-track"><div className="match-bar-fill" style={{ width: `${st.score.styleScore}%`, background: 'var(--amber)' }} /></div><span className="match-bar-val">{st.score.styleScore}%</span></div>
                                    <div className="match-bar"><span className="match-bar-label">{lang === 'ar' ? 'توافق الأوقات' : 'Schedule'}</span><div className="match-bar-track"><div className="match-bar-fill" style={{ width: `${st.score.scheduleScore}%`, background: 'var(--rose)' }} /></div><span className="match-bar-val">{st.score.scheduleScore}%</span></div>
                                    <div className="match-bar"><span className="match-bar-label">{lang === 'ar' ? 'السمعة' : 'Reputation'}</span><div className="match-bar-track"><div className="match-bar-fill" style={{ width: `${st.score.reputationScore}%`, background: 'var(--blue)' }} /></div><span className="match-bar-val">{st.score.reputationScore}%</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </div>
    );
}
