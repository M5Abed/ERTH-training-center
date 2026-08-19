import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import {
    Trophy, BookOpen, Filter, Loader2,
    User, Award, Users, Vote, CheckCircle2, AlertCircle, ArrowRight
} from 'lucide-react';
import './IdeaLeaderboard.css';

export default function IdeaLeaderboard() {
    const { lang } = useI18n();
    const { user } = useAuth();
    const role = (user?.role || '').toLowerCase();
    const isTrainer = role === 'trainer' || !!(user?.is_admin);

    const [projects, setProjects]       = useState([]);
    const [top5Voted, setTop5Voted]     = useState([]);
    const [courses, setCourses]         = useState([]);
    const [loading, setLoading]         = useState(true);
    const [courseFilter, setCourseFilter] = useState('');
    const [votingStatus, setVotingStatus] = useState('not_started');
    const [courseInfo, setCourseInfo]   = useState(null);

    useEffect(() => {
        fetch('/api/training/courses/list.php')
            .then(r => r.json())
            .then(d => {
                const list = d.courses || [];
                setCourses(list);
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchLeaderboard();
    }, [courseFilter]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const url = '/api/training/leaderboard/list.php?' + (courseFilter ? `course_id=${courseFilter}` : '');
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok) {
                setProjects(data.projects || []);
                setTop5Voted(data.top_5_voted || []);
                setVotingStatus(data.voting_status || 'not_started');
                setCourseInfo(data.course || null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const medalColors = ['#F59E0B', '#9CA3AF', '#B45309'];

    return (
        <div className="leaderboard-page">
            {/* Header */}
            <div className="lb-header">
                <div>
                    <h1>
                        <Trophy size={28} style={{ color: '#F59E0B' }} />
                        {lang === 'ar' ? 'لوحة الترتيب الأكاديمي للمشاريع' : 'Academic Project Leaderboard'}
                    </h1>
                    <p>
                        {lang === 'ar'
                            ? 'ترتيب المشاريع الأكاديمي المعتمد من المشرفين والدرجات المعتمدة، مع إبراز المشاريع الـ 5 الأفضل تصويتاً'
                            : 'Official academic ranking sorted by certified evaluation scores, highlighting end-of-course Top 5 selected projects.'}
                    </p>
                </div>
                <div className="lb-controls">
                    <div className="lb-filter">
                        <Filter size={16} />
                        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
                            <option value="">{lang === 'ar' ? 'جميع الدورات' : 'All Courses'}</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {courseFilter && isTrainer && (
                        <Link to={`/courses/${courseFilter}?tab=voting`} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
                            <Vote size={15} />
                            {lang === 'ar' ? 'إدارة التصويت' : 'Manage Voting'}
                        </Link>
                    )}
                </div>
            </div>

            {/* Voting Status Banner if a specific course is selected */}
            {courseFilter && (
                <div className={`lb-voting-banner status-${votingStatus}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Vote size={20} />
                        <div>
                            <strong>
                                {votingStatus === 'open' && (lang === 'ar' ? 'التصويت مفتوح حالياً' : 'End-of-Course Voting is Currently Open')}
                                {votingStatus === 'closed' && (lang === 'ar' ? 'اكتمل التصويت النهائي — تم تحديد المشاريع الـ 5 الأفضل' : 'Voting Closed — Top 5 Projects Selected')}
                                {votingStatus === 'not_started' && (lang === 'ar' ? 'التصويت النهائي لم يبدأ بعد' : 'End-of-Course Voting Not Started Yet')}
                            </strong>
                            <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.9 }}>
                                {votingStatus === 'open' && (lang === 'ar' ? 'يحق للمشرفين والمدربين اختيار حتى 5 مشاريع متميزة.' : 'Authorized trainers & faculty can select up to 5 preferred projects.')}
                                {votingStatus === 'closed' && (lang === 'ar' ? 'المشاريع الفائزة في تصويت الدورة تحمل شارة 🏆 Top 5 ادناه.' : 'Winning projects from the voting process receive the 🏆 Top 5 badge below.')}
                                {votingStatus === 'not_started' && (lang === 'ar' ? 'سيبدأ التصويت على أفضل المشاريع في نهاية فترة التدريب.' : 'Voting for top projects will open at the conclusion of the training period.')}
                            </p>
                        </div>
                    </div>
                    {isTrainer && votingStatus === 'open' && (
                        <Link to={`/courses/${courseFilter}?tab=voting`} className="btn btn-sm btn-primary" style={{ whiteSpace: 'nowrap' }}>
                            {lang === 'ar' ? 'صوّت الآن' : 'Vote Now'}
                        </Link>
                    )}
                </div>
            )}

            {loading ? (
                <div className="lb-loading"><Loader2 className="spin" size={36} /></div>
            ) : projects.length === 0 ? (
                <div className="lb-empty">
                    <Trophy size={48} strokeWidth={1} />
                    <h3>{lang === 'ar' ? 'لا توجد مشاريع مسجلة بعد' : 'No submitted projects found'}</h3>
                    <p>{lang === 'ar' ? 'ستظهر مشاريع المتدربين والتقييمات الأكاديمية هنا فور رصدها.' : 'Trainee projects and academic scores will appear here once submitted and evaluated.'}</p>
                </div>
            ) : (
                <div className="lb-list">
                    {/* Top 5 Highlight Showcase if voting is closed and Top 5 exists */}
                    {votingStatus === 'closed' && top5Voted.length > 0 && (
                        <div className="top5-showcase-card">
                            <div className="top5-header">
                                <h3>
                                    <Award size={20} style={{ color: '#F59E0B' }} />
                                    {lang === 'ar' ? '🏆 المشاريع الـ 5 الأفضل في تصويت نهاية الدورة' : '🏆 Top 5 Projects Selected by End-of-Course Voting'}
                                </h3>
                                <span className="badge badge-gold">
                                    {top5Voted.length} {lang === 'ar' ? 'مشاريع فائزة' : 'Winning Projects'}
                                </span>
                            </div>
                            <div className="top5-grid">
                                {top5Voted.map((tp) => (
                                    <div key={tp.id} className="top5-item">
                                        <div className="top5-item-rank">
                                            <span>#{tp.vote_rank}</span>
                                        </div>
                                        <div className="top5-item-body">
                                            <h4>{tp.title}</h4>
                                            <p className="top5-team">
                                                <User size={12} /> {tp.trainee_name}
                                                {tp.team_members && tp.team_members.length > 1 && (
                                                    <span> + {tp.team_members.length - 1} {lang === 'ar' ? 'أعضاء' : 'teammates'}</span>
                                                )}
                                            </p>
                                            <div className="top5-meta">
                                                <span className="votes-pill">
                                                    <Vote size={12} /> {tp.vote_count} {lang === 'ar' ? 'صوت' : 'votes'}
                                                </span>
                                                {tp.evaluation_score !== null && (
                                                    <span className="eval-pill">
                                                        {lang === 'ar' ? 'الدرجة:' : 'Score:'} {tp.evaluation_score}/100
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Academic Leaderboard Table */}
                    <div className="lb-table-wrap">
                        <div className="lb-table-header-title">
                            <h3>{lang === 'ar' ? 'الترتيب الأكاديمي العام للمشاريع (حسب درجة التقييم)' : 'General Academic Leaderboard (Ranked by Evaluation Grade)'}</h3>
                            <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                                {projects.length} {lang === 'ar' ? 'مشروع مسجل' : 'projects total'}
                            </span>
                        </div>
                        <table className="lb-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '60px' }}>#</th>
                                    <th>{lang === 'ar' ? 'المشروع' : 'Project'}</th>
                                    <th>{lang === 'ar' ? 'المتدرب / الفريق' : 'Trainee / Team'}</th>
                                    {!courseFilter && <th>{lang === 'ar' ? 'الدورة' : 'Course'}</th>}
                                    <th style={{ textAlign: 'center' }}>{lang === 'ar' ? 'الدرجة الأكاديمية' : 'Evaluation Score'}</th>
                                    <th style={{ textAlign: 'center' }}>{lang === 'ar' ? 'أصوات الدورة' : 'Course Votes'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.map((proj, idx) => {
                                    const hasScore = proj.evaluation_score !== null;
                                    return (
                                        <tr key={proj.id} className={`${idx < 3 ? 'top-row' : ''} ${proj.is_top_5 ? 'is-top5-row' : ''}`}>
                                            <td>
                                                <span 
                                                    className="rank-badge" 
                                                    style={{ 
                                                        background: idx < 3 ? medalColors[idx] : 'var(--surface-2, #f1f5f9)',
                                                        color: idx < 3 ? '#ffffff' : 'var(--text-1, #1e293b)'
                                                    }}
                                                >
                                                    {proj.academic_rank}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="project-title-cell">
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <strong style={{ fontSize: '0.98rem' }}>{proj.title}</strong>
                                                        {proj.is_top_5 && (
                                                            <span className="top5-badge" title="Selected in Top 5 projects by vote">
                                                                🏆 Top 5
                                                            </span>
                                                        )}
                                                    </div>
                                                    {proj.description && (
                                                        <p className="lb-desc">{proj.description.substring(0, 95)}…</p>
                                                    )}
                                                    {proj.tech_stack && (
                                                        <div className="tech-stack-tags">
                                                            {proj.tech_stack.split(',').slice(0, 3).map((t, i) => (
                                                                <span key={i} className="tech-tag">{t.trim()}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="trainee-cell">
                                                    <div className="trainee-lead">
                                                        <User size={14} className="text-primary" />
                                                        <strong>{proj.trainee_name}</strong>
                                                        {proj.student_id && <span className="sid">({proj.student_id})</span>}
                                                    </div>
                                                    {proj.team_members && proj.team_members.length > 1 && (
                                                        <div className="team-subtext">
                                                            <Users size={12} />
                                                            <span>
                                                                {proj.team_members.length} {lang === 'ar' ? 'أعضاء في الفريق' : 'team members'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            {!courseFilter && (
                                                <td>
                                                    <span className="course-tag-sm">
                                                        <BookOpen size={12} />
                                                        {proj.course_name}
                                                    </span>
                                                </td>
                                            )}
                                            <td style={{ textAlign: 'center' }}>
                                                {hasScore ? (
                                                    <div className="score-badge-wrap">
                                                        <strong 
                                                            style={{ 
                                                                fontSize: '1.05rem',
                                                                color: proj.evaluation_score >= 60 ? 'var(--primary, #002D56)' : '#ef4444' 
                                                            }}
                                                        >
                                                            {proj.evaluation_score}
                                                        </strong>
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>/ 100</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                        {lang === 'ar' ? 'قيد التقييم' : 'Pending Eval'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className="votes-cell">
                                                    <span className={`vote-count-badge ${proj.vote_count > 0 ? 'has-votes' : ''}`}>
                                                        <Vote size={13} /> {proj.vote_count}
                                                    </span>
                                                    {proj.is_top_5 && (
                                                        <span className="vote-rank-tag">
                                                            #{proj.vote_rank} in votes
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
