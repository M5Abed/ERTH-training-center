import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import {
    Trophy, BookOpen, Filter, Loader2,
    User, Users, Vote, CheckCircle2, Lightbulb, X, Crown
} from 'lucide-react';
import './IdeaLeaderboard.css';

export default function IdeaLeaderboard() {
    const toast = useToast();
    const { lang } = useI18n();
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialCourse = searchParams.get('course_id') || searchParams.get('course') || '';

    const role = (user?.role || '').toLowerCase();
    const isTrainer = role === 'trainer' || !!(user?.is_admin);

    const [projects, setProjects] = useState([]);
    const [top5Voted, setTop5Voted] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [courseFilter, setCourseFilter] = useState(initialCourse);
    const [votingStatus, setVotingStatus] = useState('not_started');
    const [courseInfo, setCourseInfo] = useState(null);
    const [myVotes, setMyVotes] = useState([]);
    const [submittingVotes, setSubmittingVotes] = useState(false);
    const [updatingVotingStatus, setUpdatingVotingStatus] = useState(false);
    const [selectedTeamProject, setSelectedTeamProject] = useState(null);

    useEffect(() => {
        fetch('/api/training/courses/list.php', { credentials: 'include' })
            .then(r => r.json())
            .then(d => {
                const list = d.courses || [];
                setCourses(list);
            })
            .catch(() => { });
    }, []);

    useEffect(() => {
        fetchLeaderboard();
    }, [courseFilter]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const url = '/api/training/leaderboard/list.php?' + (courseFilter ? `course_id=${courseFilter}` : '');
            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (res.ok) {
                setProjects(data.projects || []);
                setTop5Voted(data.top_5_voted || []);
                setVotingStatus(data.voting_status || 'not_started');
                setCourseInfo(data.course || null);
            }

            // If a specific course is selected and user is trainer/admin, fetch their existing votes
            if (courseFilter && isTrainer) {
                try {
                    const vRes = await fetch(`/api/training/votes/course_votes.php?course_id=${courseFilter}`, { credentials: 'include' });
                    const vData = await vRes.json();
                    if (vRes.ok && vData.success) {
                        setMyVotes(vData.my_votes || []);
                    }
                } catch (err) { }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleVote = (projectId) => {
        if (votingStatus !== 'open' || !isTrainer) return;
        const pId = Number(projectId);
        setMyVotes(prev => {
            if (prev.includes(pId)) {
                return prev.filter(id => id !== pId);
            }
            if (prev.length >= 5) {
                toast?.warning(lang === 'ar' ? 'يمكنك اختيار حتى 5 مشاريع كحد أقصى.' : 'You can select up to 5 projects.');
                return prev;
            }
            return [...prev, pId];
        });
    };

    const handleSubmitVotes = async () => {
        if (!courseFilter) {
            toast?.warning(lang === 'ar' ? 'يرجى اختيار الدورة أولاً لتسجيل التصويت' : 'Please select a course to submit votes');
            return;
        }
        if (votingStatus !== 'open') {
            toast?.warning(lang === 'ar' ? 'التصويت مغلق حالياً' : 'Voting is currently closed');
            return;
        }
        setSubmittingVotes(true);
        try {
            const res = await fetch('/api/training/votes/course_votes_submit.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseFilter,
                    project_ids: myVotes
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast?.success(lang === 'ar' ? 'تم تسجيل وتأكيد تصويتك بنجاح!' : 'Your votes have been submitted successfully.');
                fetchLeaderboard();
            } else {
                toast?.error(data.error || (lang === 'ar' ? 'فشل حفظ التصويت' : 'Failed to submit votes'));
            }
        } catch (e) {
            console.error(e);
            toast?.error(lang === 'ar' ? 'حدث خطأ في الاتصال أثناء حفظ التصويت' : 'Network error submitting votes');
        } finally {
            setSubmittingVotes(false);
        }
    };

    const handleUpdateVotingStatus = async (newStatus) => {
        if (!courseFilter) return;
        setUpdatingVotingStatus(true);
        try {
            const res = await fetch('/api/training/courses/voting_status.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseFilter,
                    voting_status: newStatus
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setVotingStatus(newStatus);
                fetchLeaderboard();
                toast?.success(lang === 'ar' ? 'تم تحديث حالة التصويت بنجاح' : 'Voting status updated');
            } else {
                toast?.error(data.error || 'Failed to update voting status');
            }
        } catch (e) {
            console.error(e);
            toast?.error('Network error updating voting status');
        } finally {
            setUpdatingVotingStatus(false);
        }
    };

    const medalColors = ['#F59E0B', '#9CA3AF', '#B45309'];

    // Trainees see Top 10 only; Admins & Trainers see all
    const displayedProjects = isTrainer ? projects : projects.slice(0, 10);

    return (
        <div className="leaderboard-page">
            {/* Header */}
            <div className="lb-header">
                <div>
                    <h1>
                        <Trophy size={28} style={{ color: '#F59E0B' }} />
                        {lang === 'ar' ? 'لوحة الشرف والمتصدرين (الكارت الذهبي)' : 'Official Golden Pass Leaderboard'}
                    </h1>
                    <p>
                        {lang === 'ar'
                            ? 'لوحة الشرف الأكاديمية الرسمية الحصرية للمشاريع المتميزة الحاصلة على الكارت الذهبي (Golden Pass).'
                            : 'Official certified leaderboard showcasing exclusive standout projects awarded the Golden Pass.'}
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
                </div>
            </div>

            {loading ? (
                <div className="lb-loading"><Loader2 className="spin" size={36} /></div>
            ) : displayedProjects.length === 0 ? (
                <div className="lb-empty" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
                    <Crown size={54} strokeWidth={1.5} style={{ color: '#f59e0b', margin: '0 auto 12px auto' }} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-1)' }}>
                        {lang === 'ar' ? 'لا توجد مشاريع حاصلة على الكارت الذهبي بعد' : 'No Golden Pass Projects Yet'}
                    </h3>
                    <p style={{ maxWidth: '520px', margin: '0 auto', color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.92rem' }}>
                        {lang === 'ar' 
                            ? 'لوحة الشرف مخصصة حصرياً للمشاريع التي يتم منحها الكارت الذهبي (Golden Pass) من قِبل المشرفين والمدربين أثناء مراجعة وتقييم المشاريع.' 
                            : 'This leaderboard is strictly reserved for standout projects awarded the Golden Pass by academic supervisors.'}
                    </p>
                </div>
            ) : (
                    <div className="lb-list">
                        {/* Projects Leaderboard Table */}
                        <div className="lb-table-wrap">
                            <div className="lb-table-header-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>
                                        {lang === 'ar' ? 'لوحة ترتيب أفكار ومشاريع التخرج' : 'Projects Academic Leaderboard'}
                                    </h3>
                                </div>
                                <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                                    {displayedProjects.length} {lang === 'ar' ? 'مشروع معروض' : 'projects shown'}
                                    {isTrainer && ` (${projects.length} ${lang === 'ar' ? 'إجمالي' : 'total'})`}
                                </span>
                            </div>

                            <table className="lb-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '60px' }}>#</th>
                                        <th>{lang === 'ar' ? 'المشروع' : 'Project'}</th>
                                        <th>{lang === 'ar' ? 'المتدرب / الفريق' : 'Trainee / Team'}</th>
                                        {!courseFilter && <th>{lang === 'ar' ? 'الدورة' : 'Course'}</th>}
                                        {/* Trainees do NOT see evaluation scores */}
                                        {isTrainer && <th style={{ textAlign: 'center' }}>{lang === 'ar' ? 'الدرجة الأكاديمية' : 'Evaluation Score'}</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayedProjects.map((proj, idx) => {
                                        const hasScore = proj.evaluation_score !== null;
                                        // Highlight in gold if in top 5
                                        const isGoldTop5 = idx < 5;

                                        return (
                                            <tr key={proj.id} className={`${idx < 3 ? 'top-row' : ''} ${isGoldTop5 ? 'is-top5-row' : ''}`}>
                                                <td>
                                                    <span
                                                        className="rank-badge"
                                                        style={{
                                                            background: idx < 3 ? medalColors[idx] : isGoldTop5 ? '#f59e0b' : 'var(--surface-2, #f1f5f9)',
                                                            color: (idx < 3 || isGoldTop5) ? '#ffffff' : 'var(--text-1, #1e293b)'
                                                        }}
                                                    >
                                                        {proj.academic_rank || (idx + 1)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className="project-title-cell">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <strong style={{ fontSize: '0.98rem' }}>{proj.title}</strong>
                                                            {Number(proj.is_golden_pass) === 1 && (
                                                                <span className="golden-pass-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', color: '#ffffff', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, boxShadow: '0 2px 8px rgba(245, 158, 11, 0.4)', border: '1px solid rgba(251, 191, 36, 0.6)' }}>
                                                                    <Crown size={12} /> {lang === 'ar' ? 'الكارت الذهبي' : 'Golden Pass'}
                                                                </span>
                                                            )}
                                                            {isGoldTop5 && (
                                                                <span className="top5-badge" title="Top 5 Project" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Trophy size={12} /> Top {idx + 1}
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
                                                        {proj.team_members && proj.team_members.length > 1 ? (
                                                            <button
                                                                type="button"
                                                                className="team-members-btn"
                                                                onClick={() => setSelectedTeamProject(proj)}
                                                                title={lang === 'ar' ? 'عرض كافة أعضاء الفريق' : 'View all team members'}
                                                            >
                                                                <Users size={13} />
                                                                <span>
                                                                    {proj.team_members.length} {lang === 'ar' ? 'أعضاء في الفريق (انقر للعرض)' : 'team members (click to view)'}
                                                                </span>
                                                            </button>
                                                        ) : (
                                                            proj.team_members && proj.team_members.length === 1 && (
                                                                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                    {lang === 'ar' ? 'مشروع فردي' : 'Individual Project'}
                                                                </span>
                                                            )
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
                                                {/* Trainees do NOT see evaluation scores */}
                                                {isTrainer && (
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
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
            )}

            {/* ═══════════════════════════════════════════════════════
               RESPONSIVE TEAM MEMBERS MODAL POPUP
               ═══════════════════════════════════════════════════════ */}
            {selectedTeamProject && (
                <div className="team-modal-backdrop" onClick={() => setSelectedTeamProject(null)}>
                    <div className="team-modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="team-modal-header">
                            <h3>
                                <Users size={20} style={{ color: 'var(--primary, #002D56)' }} />
                                {lang === 'ar' ? 'أعضاء فريق المشروع' : 'Project Team Members'}
                            </h3>
                            <button
                                type="button"
                                className="team-modal-close-btn"
                                onClick={() => setSelectedTeamProject(null)}
                                title={lang === 'ar' ? 'إغلاق' : 'Close'}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="team-modal-body">
                            <div className="team-project-info">
                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-0, #0f172a)', marginBottom: '0.25rem' }}>
                                    {selectedTeamProject.title}
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    <BookOpen size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px', marginLeft: '4px' }} />
                                    {selectedTeamProject.course_name}
                                </div>
                            </div>

                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-1, #1e293b)' }}>
                                {lang === 'ar' ? 'قائمة أعضاء الفريق المسجلين:' : 'Registered Team Members:'} ({selectedTeamProject.team_members?.length || 0})
                            </div>

                            <div className="team-members-list-grid">
                                {(selectedTeamProject.team_members || []).map((member, mIdx) => {
                                    const isLeader = member.role === 'leader' || member.full_name === selectedTeamProject.trainee_name;
                                    return (
                                        <div key={member.user_id || mIdx} className={`team-member-card ${isLeader ? 'is-leader' : ''}`}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{
                                                    width: '36px',
                                                    height: '36px',
                                                    borderRadius: '50%',
                                                    background: isLeader ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 45, 86, 0.08)',
                                                    color: isLeader ? '#b45309' : 'var(--primary, #002D56)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 800,
                                                    fontSize: '0.88rem'
                                                }}>
                                                    {isLeader ? <Crown size={18} /> : <User size={18} />}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-0, #0f172a)' }}>
                                                        {member.full_name}
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                        {member.student_id ? `ID: ${member.student_id}` : (member.email || '')}
                                                    </div>
                                                </div>
                                            </div>

                                            <span className={`member-role-badge ${isLeader ? 'leader' : 'member'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                {isLeader ? <Crown size={12} /> : <User size={12} />}
                                                <span>{isLeader ? (lang === 'ar' ? 'قائد الفريق' : 'Team Leader') : (lang === 'ar' ? 'عضو' : 'Member')}</span>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
