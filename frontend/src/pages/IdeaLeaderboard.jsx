import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import {
    Trophy, BookOpen, Filter, Loader2,
    User, Users, Vote, CheckCircle2, Lightbulb, X, Crown
} from 'lucide-react';
import './IdeaLeaderboard.css';

export default function IdeaLeaderboard() {
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
                alert(lang === 'ar' ? 'يمكنك اختيار حتى 5 مشاريع كحد أقصى.' : 'You can select up to 5 projects.');
                return prev;
            }
            return [...prev, pId];
        });
    };

    const handleSubmitVotes = async () => {
        if (!courseFilter) {
            alert(lang === 'ar' ? 'يرجى اختيار الدورة أولاً لتسجيل التصويت' : 'Please select a course to submit votes');
            return;
        }
        if (votingStatus !== 'open') {
            alert(lang === 'ar' ? 'التصويت مغلق حالياً' : 'Voting is currently closed');
            return;
        }
        setSubmittingVotes(true);
        try {
            const res = await fetch('/api/training/votes/course_votes_submit.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: parseInt(courseFilter, 10),
                    project_ids: myVotes
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(lang === 'ar' ? 'تم تسجيل وتأكيد تصويتك بنجاح!' : 'Your votes have been submitted successfully.');
                fetchLeaderboard();
            } else {
                alert(data.error || (lang === 'ar' ? 'فشل حفظ التصويت' : 'Failed to submit votes'));
            }
        } catch (e) {
            console.error(e);
            alert(lang === 'ar' ? 'حدث خطأ في الاتصال أثناء حفظ التصويت' : 'Network error submitting votes');
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
                    course_id: parseInt(courseFilter, 10),
                    voting_status: newStatus
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setVotingStatus(newStatus);
                fetchLeaderboard();
            } else {
                alert(data.error || 'Failed to update voting status');
            }
        } catch (e) {
            console.error(e);
            alert('Network error updating voting status');
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
                        {lang === 'ar' ? 'لوحة الشرف والترتيب العام' : 'Official Training Leaderboard'}
                    </h1>
                    <p>
                        {lang === 'ar'
                            ? 'لوحة الترتيب الأكاديمي المعتمد للدورات التدريبية، تعرض قائمة المشروعات المتميزة وقائمة المتدربين المتصدرين.'
                            : 'Official certified leaderboard showcasing stand-out training project ideas and leading trainees.'}
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



            {/* Voting Status Banner if a specific course is selected (Trainers & Admins Only) */}
            {courseFilter && isTrainer && (
                <div className={`lb-voting-banner status-${votingStatus}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
                        <Vote size={22} />
                        <div>
                            <strong style={{ fontSize: '0.96rem' }}>
                                {votingStatus === 'open' && (lang === 'ar' ? 'التصويت مفتوح حالياً' : 'End-of-Course Voting is Currently Open')}
                                {votingStatus === 'closed' && (lang === 'ar' ? 'اكتمل التصويت النهائي — تم تحديد المشاريع الـ 5 الأفضل' : 'Voting Closed — Top 5 Projects Selected')}
                                {votingStatus === 'not_started' && (lang === 'ar' ? 'التصويت النهائي لم يبدأ بعد' : 'End-of-Course Voting Not Started Yet')}
                            </strong>
                            <p style={{ margin: 0, fontSize: '0.82rem', opacity: 0.9 }}>
                                {votingStatus === 'open' && (lang === 'ar' ? 'يحق للمشرفين والمدربين اختيار حتى 5 مشاريع متميزة من الجدول أدناه.' : 'Authorized trainers & faculty can select up to 5 preferred projects from the table below.')}
                                {votingStatus === 'closed' && (lang === 'ar' ? 'المشاريع الفائزة في تصويت الدورة تحمل شارة أفضل 5 مشاريع أدناه.' : 'Winning projects from the voting process receive the Top 5 badge below.')}
                                {votingStatus === 'not_started' && (lang === 'ar' ? 'سيبدأ التصويت على أفضل المشاريع في نهاية فترة التدريب.' : 'Voting for top projects will open at the conclusion of the training period.')}
                            </p>
                        </div>
                    </div>

                    {/* Trainer Voting & Lifecycle Action Controls */}
                    {isTrainer && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {votingStatus === 'open' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: myVotes.length === 5 ? '#16a34a' : 'inherit' }}>
                                        {lang === 'ar' ? `المحدد: ${myVotes.length} / 5` : `Selected: ${myVotes.length} / 5`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleSubmitVotes}
                                        disabled={submittingVotes || myVotes.length === 0}
                                        className="btn btn-sm btn-primary"
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}
                                    >
                                        {submittingVotes ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />}
                                        {lang === 'ar' ? 'تأكيد تصويتي' : 'Submit My Votes'}
                                    </button>
                                </div>
                            )}

                            {votingStatus !== 'open' && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    disabled={updatingVotingStatus}
                                    onClick={() => handleUpdateVotingStatus('open')}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                    {updatingVotingStatus ? <Loader2 className="spin" size={14} /> : <Vote size={14} />}
                                    {votingStatus === 'closed' ? (lang === 'ar' ? 'إعادة فتح التصويت' : 'Re-open Voting') : (lang === 'ar' ? 'فتح باب التصويت' : 'Open Voting')}
                                </button>
                            )}
                            {votingStatus === 'open' && (
                                <button
                                    type="button"
                                    className="btn btn-sm"
                                    disabled={updatingVotingStatus}
                                    onClick={() => handleUpdateVotingStatus('closed')}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: '#8B1E2F',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 700
                                    }}
                                >
                                    {updatingVotingStatus ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />}
                                    {lang === 'ar' ? 'إغلاق التصويت' : 'Close Voting'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {loading ? (
                <div className="lb-loading"><Loader2 className="spin" size={36} /></div>
            ) : displayedProjects.length === 0 ? (
                <div className="lb-empty">
                    <Lightbulb size={48} strokeWidth={1} />
                    <h3>{lang === 'ar' ? 'لا توجد مشاريع مسجلة بعد' : 'No submitted projects found'}</h3>
                    <p>{lang === 'ar' ? 'ستظهر مشاريع المتدربين والتقييمات الأكاديمية هنا فور رصدها.' : 'Trainee projects and academic scores will appear here once submitted and evaluated.'}</p>
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
                                        <th style={{ textAlign: 'center' }}>{lang === 'ar' ? 'أصوات الدورة' : 'Course Votes'}</th>
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
                                                <td style={{ textAlign: 'center' }}>
                                                    <div className="votes-cell" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                            <span className={`vote-count-badge ${proj.vote_count > 0 ? 'has-votes' : ''}`}>
                                                                <Vote size={13} /> {proj.vote_count}
                                                            </span>
                                                            {proj.is_top_5 && (
                                                                <span className="vote-rank-tag">
                                                                    #{proj.top5_rank || proj.vote_rank} in votes
                                                                </span>
                                                            )}
                                                        </div>

                                                        {votingStatus === 'open' && isTrainer && courseFilter && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleVote(proj.id)}
                                                                disabled={!myVotes.includes(Number(proj.id)) && myVotes.length >= 5}
                                                                style={{
                                                                    padding: '0.2rem 0.65rem',
                                                                    borderRadius: '6px',
                                                                    fontSize: '0.76rem',
                                                                    fontWeight: 800,
                                                                    cursor: (!myVotes.includes(Number(proj.id)) && myVotes.length >= 5) ? 'not-allowed' : 'pointer',
                                                                    border: myVotes.includes(Number(proj.id)) ? 'none' : '1px solid var(--border, #cbd5e1)',
                                                                    background: myVotes.includes(Number(proj.id)) ? '#16a34a' : 'var(--bg-0, #ffffff)',
                                                                    color: myVotes.includes(Number(proj.id)) ? '#ffffff' : 'var(--text-1, #334155)',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    boxShadow: myVotes.includes(Number(proj.id)) ? '0 2px 6px rgba(22, 163, 74, 0.3)' : 'none',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                            >
                                                                {myVotes.includes(Number(proj.id)) ? (lang === 'ar' ? 'مصوّت له' : 'Voted') : (lang === 'ar' ? '+ تصويت' : '+ Vote')}
                                                            </button>
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
