import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { getProjects, isProjectExpired } from '../services/api';
import { COLLEGES } from '../data/constants';
import { Search, SlidersHorizontal, Plus, Users, Calendar, Clock, ChevronRight, FolderKanban, Brain, AlertTriangle } from 'lucide-react';
import './Projects.css';

export default function Projects() {
    const { t, lang } = useI18n();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [college, setCollege] = useState('');
    const [type, setType] = useState('');
    const [status, setStatus] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const data = await getProjects({ search, college_key: college, type, status });
        setProjects(data);
        setLoading(false);
    }, [search, college, type, status]);

    useEffect(() => { load(); }, [load]);

    const getStatusColor = (s) => ({ open: 'var(--green)', in_progress: 'var(--amber)', completed: 'var(--muted)' }[s] || 'var(--muted)');
    const getStatusLabel = (s) => ({ open: t('status_open'), in_progress: t('status_in_progress'), completed: t('status_completed') }[s] || s);
    const getTypeLabel = (tp) => ({ project: t('type_project'), research: t('type_research'), graduation: t('type_graduation') }[tp] || tp);

    return (
        <div className="projects-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('projects_title')}</h1>
                    <p className="page-subtitle">{t('projects_subtitle')}</p>
                </div>
                <Link to="/post-project" className="btn btn-primary btn-md">
                    <Plus size={18} /> {t('post_project')}
                </Link>
            </div>

            {/* Search & Filters */}
            <div className="projects-toolbar">
                <div className="search-bar">
                    <Search size={18} className="search-icon" />
                    <input type="text" placeholder={t('search_projects')} value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowFilters(!showFilters)}>
                    <SlidersHorizontal size={16} /> {t('filter')}
                </button>
            </div>

            {showFilters && (
                <div className="projects-filters animate-fade-in">
                    <select value={college} onChange={e => setCollege(e.target.value)}>
                        <option value="">{t('all')} {t('filter_college')}</option>
                        {COLLEGES.map(c => <option key={c.key} value={c.key}>{lang === 'ar' ? c.ar : c.en}</option>)}
                    </select>
                    <select value={type} onChange={e => setType(e.target.value)}>
                        <option value="">{t('all')} {t('filter_type')}</option>
                        <option value="project">{t('type_project')}</option>
                        <option value="research">{t('type_research')}</option>
                        <option value="graduation">{t('type_graduation')}</option>
                    </select>
                    <select value={status} onChange={e => setStatus(e.target.value)}>
                        <option value="">{t('all')} {t('filter_status')}</option>
                        <option value="open">{t('status_open')}</option>
                        <option value="in_progress">{t('status_in_progress')}</option>
                        <option value="completed">{t('status_completed')}</option>
                    </select>
                </div>
            )}

            {/* Projects Grid */}
            {loading ? (
                <div className="loading-state"><div className="spinner" /> <span>{t('loading')}</span></div>
            ) : projects.length === 0 ? (
                <div className="empty-state">
                    <FolderKanban size={48} />
                    <h3>{t('no_projects_found')}</h3>
                </div>
            ) : (
                <div className="projects-grid">
                    {projects.map((p, i) => (
                        <div key={p.id} className="project-card animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}
                            onClick={() => navigate(`/project/${p.id}`)}>
                            <div className="project-card-top">
                                <span className="project-type-badge">{getTypeLabel(p.type)}</span>
                                <div className="project-card-top-right">
                                    {p.deadline && isProjectExpired(p.deadline) && (
                                        <span className="project-expired-badge"><AlertTriangle size={12} /> Expired</span>
                                    )}
                                    <span className="project-status" style={{ color: getStatusColor(p.status) }}>
                                        <span className="status-dot" style={{ background: getStatusColor(p.status) }} />
                                        {getStatusLabel(p.status)}
                                    </span>
                                </div>
                            </div>
                            <h3 className="project-card-title">{p.title}</h3>
                            <p className="project-card-desc">{p.description}</p>
                            <div className="project-card-skills">
                                {(p.project_skills || []).slice(0, 4).map(s => (
                                    <span key={s.skill_id || s} className="skill-tag">{s.skill_name || s.skill_id || s}</span>
                                ))}
                                {(p.project_skills || []).length > 4 && <span className="skill-tag skill-tag--more">+{p.project_skills.length - 4}</span>}
                            </div>
                            <div className="project-card-meta">
                                <span className="meta-item"><Users size={14} /> {p.current_members || p.team_count || 1}/{p.team_size_needed || p.team_size || '?'}</span>
                                {p.deadline && <span className="meta-item"><Calendar size={14} /> {new Date(p.deadline).toLocaleDateString()}</span>}
                            </div>
                            <div className="project-card-footer">
                                <div className="project-card-owner">
                                    <span className="project-owner-avatar">{(p.owner_name || p.owner_name || '?')[0].toUpperCase()}</span>
                                    <span className="meta-item">{t('posted_by')} {p.owner_name || p.owner_name || '—'}</span>
                                </div>
                                <div className="project-card-footer-right">
                                    {p.owner_id == user?.id && (
                                        <button className="btn btn-teal btn-xs" onClick={e => { e.stopPropagation(); navigate(`/matches/${p.id}`); }}>
                                            <Brain size={12} /> Find Team
                                        </button>
                                    )}
                                    <ChevronRight size={16} className="card-arrow" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
