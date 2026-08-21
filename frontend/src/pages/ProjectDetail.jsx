import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm, useToast } from '../components/Toast';
import {
    getProject, getApplications, applyToProject, updateApplicationStatus,
    getTeamMembers, checkExistingApplication, deleteProject,
    updateProject, updateProjectStatus, removeTeamMember,
    formatDate, isProjectExpired, getNotifications, respondToInvitation,
    leaveProject, getTasks, searchStaff, createNotification
} from '../services/api';
import { SKILLS_CATALOG, COLLEGES, COURSES_BY_FACULTY, MAJORS_BY_FACULTY, COURSES_BY_MAJOR } from '../data/constants';
import { Search, Users, Calendar, Clock, Send, Check, X, Trash2, UserPlus, Brain, Edit3, Save, Loader2, Play, CheckCircle, AlertTriangle, ClipboardList, Zap, BookOpen, ListTodo, MessageCircle, Download } from 'lucide-react';
import './ProjectDetail.css';

export default function ProjectDetail() {
    const confirm = useConfirm();
    const toast = useToast();
    const { id } = useParams();
    const { t, lang } = useI18n();
    const { user, profile: myProfile } = useAuth();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [applications, setApplications] = useState([]);
    const [team, setTeam] = useState([]);
    const [existingApp, setExistingApp] = useState(null);
    const [message, setMessage] = useState('');
    const [showApply, setShowApply] = useState(false);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);

    // Invitation state
    const [hasInvite, setHasInvite] = useState(false);
    const [responding, setResponding] = useState(false);

    // Edit project modal (#16)
    const [showEditModal, setShowEditModal] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editType, setEditType] = useState('');
    const [editTeamSize, setEditTeamSize] = useState('');
    const [editDeadline, setEditDeadline] = useState('');
    const [editCollege, setEditCollege] = useState('');
    const [editCustomCollege, setEditCustomCollege] = useState('');
    const [editMajor, setEditMajor] = useState('');
    const [editCourse, setEditCourse] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    // Status modals (#17, #18)
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Supervisor search state
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [staffQuery, setStaffQuery] = useState('');
    const [staffResults, setStaffResults] = useState([]);
    const [searchingStaff, setSearchingStaff] = useState(false);
    const [invitingStaffIds, setInvitingStaffIds] = useState(new Set());

    const reload = async () => {
        setLoading(true);
        const p = await getProject(id);
        setProject(p);
        if (p) {
            const [apps, members, myApp] = await Promise.all([
                String(p.owner_id) === String(user?.id) ? getApplications(id) : Promise.resolve([]),
                getTeamMembers(id),
                user ? checkExistingApplication(id) : Promise.resolve(null),
            ]);
            setApplications(apps || []);
            setTeam(members || []);
            setExistingApp(myApp);

            // Check if invited
            if (user && String(p.owner_id) !== String(user.id) && !members.some(m => String(m.user_id || m.id) === String(user.id))) {
                const notifs = await getNotifications();
                const inv = notifs.some(n => n.type === 'invite' && n.project_id == id);
                setHasInvite(inv);
            }
        }
        setLoading(false);
    };

    const handleInviteResponse = async (action) => {
        setResponding(true);
        const success = await respondToInvitation(id, action);
        if (success) {
            setHasInvite(false);
            if (action === 'accept') {
                reload();
            }
        }
        setResponding(false);
    };

    useEffect(() => { reload(); }, [id, user]);

    const isOwner = String(project?.owner_id) === String(user?.id);
    const isMember = team.some(m => String(m.user_id || m.id) === String(user?.id));
    const expired = project?.deadline ? isProjectExpired(project.deadline) : false;

    const handleApply = async () => {
        setApplying(true);
        try {
            await applyToProject(id, message);
            setExistingApp({ status: 'pending' });
            setShowApply(false);
        } catch (e) { }
        setApplying(false);
    };

    const handleAppStatus = async (appId, status) => {
        await updateApplicationStatus(appId, status);
        setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
        if (status === 'accepted') {
            const members = await getTeamMembers(id);
            setTeam(members || []);
        }
    };

    const handleDeleteClick = () => {
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        setDeleting(true);
        await deleteProject(id);
        navigate('/projects');
    };

    // Mark in-progress (#17)
    const handleMarkInProgress = async () => {
        await updateProjectStatus(id, 'in_progress');
        setProject(prev => ({ ...prev, status: 'in_progress' }));
    };

    // Mark complete (#18)
    const handleMarkComplete = async () => {
        await updateProjectStatus(id, 'completed');
        setProject(prev => ({ ...prev, status: 'completed' }));
        setShowCompleteModal(false);
    };

    // Remove team member (#19)
    const handleRemoveMember = async (memberId) => {
        const ok = await confirm({
            title: lang === 'ar' ? 'إزالة عضو' : 'Remove Member',
            message: lang === 'ar' ? 'هل أنت متأكد من إزالة هذا العضو من الفريق؟' : 'Remove this team member?',
            variant: 'danger',
            confirmText: lang === 'ar' ? 'إزالة' : 'Remove'
        });
        if (!ok) return;
        await removeTeamMember(id, memberId);
        toast?.success(lang === 'ar' ? 'تمت إزالة العضو' : 'Team member removed');
        setTeam(prev => prev.filter(m => (m.user_id || m.id) !== memberId));
    };

    // Request to leave project
    const handleLeaveProject = async () => {
        const confirmMsg = lang === 'ar'
            ? 'هل أنت متأكد أنك تريد مغادرة هذا المشروع؟'
            : 'Are you sure you want to leave this project?';
        const ok = await confirm({
            title: lang === 'ar' ? 'مغادرة المشروع' : 'Leave Project',
            message: confirmMsg,
            variant: 'warning',
            confirmText: lang === 'ar' ? 'مغادرة' : 'Leave'
        });
        if (!ok) return;

        const success = await leaveProject(id);
        if (success) {
            toast?.success(lang === 'ar' ? 'تمت مغادرة المشروع' : 'Left project successfully');
            reload();
        }
    };

    // Supervisor Search Logic
    const handleSearchStaff = async (e) => {
        e.preventDefault();
        if (!staffQuery.trim()) return;
        setSearchingStaff(true);
        const results = await searchStaff(staffQuery);
        setStaffResults(results);
        setSearchingStaff(false);
    };

    const handleInviteStaff = async (staffId) => {
        setInvitingStaffIds(prev => new Set(prev).add(staffId));
        await createNotification(staffId, 'invite', null, id);

        // Optimistic UI update for the button
        setTimeout(() => {
            setInvitingStaffIds(prev => {
                const next = new Set(prev);
                next.delete(staffId);
                return next;
            });
        }, 1500);
    };

    // Open edit modal (#16)
    const openEditModal = () => {
        setEditTitle(project.title || '');
        setEditDesc(project.description || '');
        setEditType(project.type || '');
        setEditTeamSize(project.team_size_needed || project.team_size || '');
        setEditDeadline(project.deadline ? project.deadline.split('T')[0] : '');
        const colKey = project.college_key || '';
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
        setEditMajor(project.major || '');
        setEditCourse(project.course_name || '');
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        const collegeKeyFinal = editCollege === 'other' ? editCustomCollege.trim() : editCollege;
        setEditSaving(true);
        await updateProject(id, {
            title: editTitle,
            description: editDesc,
            type: editType,
            team_size: parseInt(editTeamSize) || 4,
            deadline: editDeadline || null,
            college_key: collegeKeyFinal || null,
            major: editMajor || null,
            course_name: editCourse || null,
        });
        setEditSaving(false);
        setShowEditModal(false);
        reload();
    };

    // Course options for edit modal
    const editCoursesAvail = (editMajor && COURSES_BY_MAJOR && COURSES_BY_MAJOR[editMajor])
        ? COURSES_BY_MAJOR[editMajor]
        : COURSES_BY_FACULTY[editCollege] || [];

    const editMajorOptions = MAJORS_BY_FACULTY[editCollege] || [];

    if (loading) return <div className="loading-state"><div className="spinner" /></div>;
    if (!project) return <div className="empty-state"><h3>{t('error_not_found')}</h3></div>;

    const getStatusLabel = (s) => ({ open: t('status_open'), in_progress: t('status_in_progress'), completed: t('status_completed') }[s] || s);
    const getStatusColor = (s) => ({ open: 'var(--green)', in_progress: 'var(--amber)', completed: 'var(--muted)' }[s] || 'var(--muted)');

    // Application status label for non-owners (#21)
    const getAppStatusBadge = () => {
        if (!existingApp) return null;
        const st = existingApp.status;
        if (st === 'accepted') return <div className="pd-app-badge pd-app-badge--accepted"><CheckCircle size={16} /> You're on this team!</div>;
        if (st === 'rejected') return <div className="pd-app-badge pd-app-badge--rejected"><X size={16} /> Application declined</div>;
        return <div className="pd-app-badge pd-app-badge--pending"><Clock size={16} /> Application pending review</div>;
    };

    return (
        <div className="project-detail" data-print-date={new Date().toLocaleDateString()}>

            <div className="pd-layout">
                <div className="pd-main">
                    <div className="pd-header">
                        <div className="pd-title-row">
                            <h1>{project.title}</h1>
                            <div className="pd-badges">
                                <span className="project-status" style={{ color: getStatusColor(project.status) }}>
                                    <span className="status-dot" style={{ background: getStatusColor(project.status) }} />
                                    {getStatusLabel(project.status)}
                                </span>
                                {expired && <span className="pd-expired-badge"><AlertTriangle size={14} /> Expired</span>}
                            </div>
                        </div>
                        <div className="pd-meta">
                            <span className="meta-item"><Users size={14} /> {team.length}/{project.team_size_needed || project.team_size || '?'}</span>
                            {project.deadline && <span className="meta-item"><Calendar size={14} /> {new Date(project.deadline).toLocaleDateString()}</span>}
                            <span className="meta-item">{t('posted_by')} <Link to={`/profile/${project.owner_id}`} className="pd-owner-link">{project.owner_name || project.owner_name || 'Unknown'}</Link></span>
                            {project.course_name && <span className="meta-item"><BookOpen size={14} /> {project.course_name}</span>}
                        </div>

                        {/* Project Status Timeline */}
                        {(() => {
                            const steps = [
                                { key: 'posted', label: lang === 'ar' ? 'تم النشر' : 'Posted', icon: <ClipboardList size={16} /> },
                                { key: 'team_building', label: lang === 'ar' ? 'بناء الفريق' : 'Team Building', icon: <Users size={16} /> },
                                { key: 'in_progress', label: lang === 'ar' ? 'قيد التنفيذ' : 'In Progress', icon: <Zap size={16} /> },
                                { key: 'completed', label: lang === 'ar' ? 'مكتمل' : 'Completed', icon: <CheckCircle size={16} /> },
                            ];
                            const statusIndex = project.status === 'completed' ? 3 : project.status === 'in_progress' ? 2 : team.length > 1 ? 1 : 0;
                            return (
                                <div className="pd-timeline">
                                    {steps.map((step, i) => (
                                        <div key={step.key} className={`pd-timeline-step ${i <= statusIndex ? 'pd-timeline-step--done' : ''} ${i === statusIndex ? 'pd-timeline-step--current' : ''}`}>
                                            <div className="pd-timeline-dot">{step.icon}</div>
                                            <span className="pd-timeline-label">{step.label}</span>
                                            {i < steps.length - 1 && <div className={`pd-timeline-line ${i < statusIndex ? 'pd-timeline-line--done' : ''}`} />}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>

                    <div className="pd-desc">
                        <p>{project.description}</p>
                        {project.project_skills?.length > 0 && (
                            <div className="pd-desc-skills" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <h4 style={{ marginBottom: '0.75rem', fontSize: '0.9rem', color: 'var(--text-2)' }}>{t('required_skills')}</h4>
                                <div className="pd-skills" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    {project.project_skills.map(s => <span key={s.skill_id} className="skill-tag">{s.skill_name || s.skill_id}</span>)}
                                </div>
                            </div>
                        )}
                    </div>

                    {team.length > 0 && (
                        <div className="pd-section">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0 }}>{t('current_team')}</h3>
                                {isOwner && (
                                    <button className="btn btn-outline btn-sm" onClick={() => setShowStaffModal(true)}>
                                        <UserPlus size={14} /> {lang === 'ar' ? 'إضافة مشرف' : 'Add Supervisor'}
                                    </button>
                                )}
                            </div>
                            <div className="pd-team">
                                {team.map(m => (
                                    <div key={m.user_id || m.id} className="pd-member">
                                        <Link to={`/profile/${m.user_id || m.id}`} className="pd-member-info">
                                            <div className="pd-member-avatar">
                                                {m.avatar_url
                                                    ? <img src={m.avatar_url} alt={m.full_name || ''} />
                                                    : (m.full_name || m.email || '?')[0].toUpperCase()
                                                }
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span>{m.full_name || m.email}</span>
                                                {m.role === 'Supervisor' && (
                                                    <span style={{ fontSize: '0.65rem', color: 'var(--amber)', fontWeight: 'bold' }}>
                                                        {lang === 'ar' ? 'مشرف' : 'Supervisor'}
                                                    </span>
                                                )}
                                            </div>
                                        </Link>
                                        {isOwner && (m.user_id || m.id) != user?.id && (
                                            <button className="pd-remove-member" onClick={() => handleRemoveMember(m.user_id || m.id)} title="Remove member">
                                                <X size={12} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Application status badge (#21) */}
                    {!isOwner && existingApp && getAppStatusBadge()}

                    {/* Invitation Response Box */}
                    {hasInvite && !isOwner && !isMember && (
                        <div className="pd-section animate-fade-in" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--primary-l)' }}>
                            <h3 style={{ color: 'var(--primary-l)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <CheckCircle size={20} /> {lang === 'ar' ? 'لقد تمت دعوتك!' : "You've been invited!"}
                            </h3>
                            <p style={{ color: 'var(--text-2)' }}>{lang === 'ar' ? 'قائد الفريق دعاك للانضمام إلى هذا الفريق.' : "The team leader has invited you to join this team."}</p>
                            <div className="pd-apply-actions" style={{ marginTop: '1rem' }}>
                                <button className="btn btn-primary btn-md" onClick={() => handleInviteResponse('accept')} disabled={responding}>
                                    <Check size={18} /> {lang === 'ar' ? 'قبول الدعوة' : 'Accept Invitation'}
                                </button>
                                <button className="btn btn-ghost btn-md" onClick={() => handleInviteResponse('decline')} disabled={responding}>
                                    <X size={18} /> {lang === 'ar' ? 'رفض' : 'Decline'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Leave project button — shown to members only */}
                    {!isOwner && isMember && (
                        <div className="pd-section">
                            <button className="btn btn-danger btn-md" onClick={handleLeaveProject} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <X size={18} /> {lang === 'ar' ? 'مغادرة المشروع' : 'Leave Project'}
                            </button>
                        </div>
                    )}

                    {!isOwner && !isMember && !existingApp && !hasInvite && project.status === 'open' && !expired && (
                        <div className="pd-section">
                            {showApply ? (
                                <div className="pd-apply-form animate-fade-in">
                                    <textarea placeholder={t('apply_message')} value={message} onChange={e => setMessage(e.target.value)} rows={3} />
                                    <div className="pd-apply-actions">
                                        <button className="btn btn-ghost btn-sm" onClick={() => setShowApply(false)}>{t('cancel')}</button>
                                        <button className="btn btn-primary btn-sm" onClick={handleApply} disabled={applying}>
                                            <Send size={16} /> {t('submit')}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button className="btn btn-primary btn-md" onClick={() => setShowApply(true)}>
                                    <UserPlus size={18} /> {t('apply_to_project')}
                                </button>
                            )}
                        </div>
                    )}
                    {isOwner && <div className="pd-notice">{t('you_own_this')}</div>}
                </div>

                {/* Sidebar — visible to all members (owner OR team member) */}
                {(isOwner || isMember) && (
                    <div className="pd-sidebar">
                        {/* Quick Action Buttons — Task Board, Discussion */}
                        <div className="pd-sidebar-card">
                            {isOwner && (project.status === 'completed' ? (
                                <div className="pd-completed-banner">
                                    <CheckCircle size={20} style={{ color: 'var(--green)' }} />
                                    <span>{lang === 'ar' ? 'تم اكتمال هذا المشروع' : 'This project has been completed.'}</span>
                                </div>
                            ) : (
                                <Link to={`/matches/${id}`} className="btn btn-teal btn-md pd-match-btn">
                                    <Brain size={18} /> {t('view_matches')}
                                </Link>
                            ))}
                            <Link
                                to={`/project/${id}/tasks`}
                                className="btn btn-primary btn-md"
                                style={{ width: '100%', marginTop: isOwner ? '0.5rem' : '0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                <ListTodo size={18} /> {lang === 'ar' ? 'لوحة المهام' : 'Task Board'}
                            </Link>
                            <Link
                                to={`/project/${id}/chat`}
                                className="btn btn-secondary btn-md"
                                style={{ width: '100%', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                            >
                                <MessageCircle size={18} /> {lang === 'ar' ? 'نقاش الفريق' : 'Discussion'}
                            </Link>
                        </div>

                        {/* Owner-only controls */}
                        {isOwner && (
                            <>
                                <div className="pd-sidebar-card pd-owner-actions">
                                    <button className="btn btn-ghost btn-sm" onClick={openEditModal}>
                                        <Edit3 size={14} /> {lang === 'ar' ? 'تعديل المشروع' : 'Edit Project'}
                                    </button>
                                    {project.status === 'open' && (
                                        <button className="btn btn-amber btn-sm" onClick={handleMarkInProgress}>
                                            <Play size={14} /> {lang === 'ar' ? 'بدء العمل' : 'Mark In Progress'}
                                        </button>
                                    )}
                                    {(project.status === 'open' || project.status === 'in_progress') && (
                                        <button className="btn btn-success btn-sm" onClick={() => setShowCompleteModal(true)}>
                                            <CheckCircle size={14} /> {lang === 'ar' ? 'مكتمل' : 'Mark Complete'}
                                        </button>
                                    )}
                                    <button className="btn btn-danger btn-sm" onClick={handleDeleteClick}>
                                        <Trash2 size={14} /> {t('delete_project')}
                                    </button>

                                </div>

                                {applications.length > 0 && (
                                    <div className="pd-sidebar-card">
                                        <h3>{t('applications_title')} ({applications.length})</h3>
                                        <div className="pd-apps">
                                            {applications.map(a => (
                                                <div key={a.id} className="pd-app">
                                                    <div className="pd-app-top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                        <Link to={`/profile/${a.applicant_id}`} style={{ width: '24px', height: '24px', borderRadius: '50%', overflow: 'hidden', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                            {a.avatar_url
                                                                ? <img src={a.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                : <span style={{ fontSize: '10px', color: 'var(--primary-l)', fontWeight: 'bold' }}>{(a.full_name || a.email || '?')[0].toUpperCase()}</span>
                                                            }
                                                        </Link>
                                                        <Link to={`/profile/${a.applicant_id}`} className="pd-app-name" style={{ flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{a.full_name || a.email}</Link>
                                                        <span className={`pd-app-status pd-app-status--${a.status}`}>{a.status}</span>
                                                    </div>
                                                    {a.message && <p className="pd-app-msg">{a.message}</p>}
                                                    {a.status === 'pending' && (
                                                        <div className="pd-app-actions">
                                                            <button className="btn btn-success btn-sm" onClick={() => handleAppStatus(a.id, 'accepted')}><Check size={14} /> {t('accept')}</button>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => handleAppStatus(a.id, 'rejected')}><X size={14} /> {t('reject')}</button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Edit Project Modal (#16) */}
            {showEditModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>{lang === 'ar' ? 'تعديل المشروع' : 'Edit Project'}</h3>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'عنوان المشروع' : 'Project Title'}</label>
                                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'الوصف' : 'Description'}</label>
                                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={4} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'النوع' : 'Type'}</label>
                                    <select value={editType} onChange={e => setEditType(e.target.value)}>
                                        <option value="project">{t('type_project')}</option>
                                        <option value="research">{t('type_research')}</option>
                                        <option value="graduation">{t('type_graduation')}</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'حجم الفريق' : 'Team Size'}</label>
                                    <input type="number" min={2} max={20} value={editTeamSize} onChange={e => setEditTeamSize(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'الموعد النهائي' : 'Deadline'}</label>
                                    <input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'الكلية' : 'College'}</label>
                                    <select value={editCollege} onChange={e => { setEditCollege(e.target.value); setEditCourse(''); setEditMajor(''); setEditCustomCollege(''); }}>
                                        <option value="">{t('all')}</option>
                                        {COLLEGES.map(c => <option key={c.key} value={c.key}>{lang === 'ar' ? c.ar : c.en}</option>)}
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
                                    <label>{lang === 'ar' ? 'التخصص (اختياري)' : 'Major (optional)'}</label>
                                    {!editCollege ? (
                                        <input type="text" disabled placeholder={lang === 'ar' ? 'اختر الكلية أولاً' : 'Select a college first'} className="pp-disabled" />
                                    ) : editMajorOptions.length > 0 ? (
                                        <select value={editMajor} onChange={e => { setEditMajor(e.target.value); setEditCourse(''); }}>
                                            <option value="">{lang === 'ar' ? 'جميع التخصصات' : 'All majors'}</option>
                                            {editMajorOptions.map(m => <option key={m.value} value={m.value}>{lang === 'ar' ? m.label_ar : m.label}</option>)}
                                        </select>
                                    ) : (
                                        <input type="text" value={editMajor} onChange={e => setEditMajor(e.target.value)} placeholder={lang === 'ar' ? 'مثال: هندسة مدنية' : 'e.g. Civil Engineering'} />
                                    )}
                                </div>
                            </div>
                            {editType !== 'graduation' && editCoursesAvail.length > 0 && (
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'المقرر' : 'Course Name'}</label>
                                    <select value={editCourse} onChange={e => setEditCourse(e.target.value)}>
                                        <option value="">{lang === 'ar' ? 'اختر' : 'Select'}</option>
                                        {editCoursesAvail.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost btn-md" onClick={() => setShowEditModal(false)}>{t('cancel')}</button>
                            <button className="btn btn-primary btn-md" onClick={handleSaveEdit} disabled={editSaving}>
                                {editSaving ? <Loader2 size={16} className="spin" /> : <><Save size={16} /> {t('save')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}>
                    <div className="modal-box modal-box--sm">
                        <div className="modal-header">
                            <h3 style={{ color: 'var(--rose, #f43f5e)' }}>{lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}</h3>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center' }}>
                            <AlertTriangle size={48} style={{ color: 'var(--rose, #f43f5e)', marginBottom: '1rem' }} />
                            <p>{t('confirm_delete')}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost btn-md" onClick={() => setShowDeleteModal(false)} disabled={deleting}>{t('cancel')}</button>
                            <button className="btn btn-danger btn-md" onClick={confirmDelete} disabled={deleting}>
                                {deleting ? <Loader2 size={16} className="spin" /> : <><Trash2 size={16} /> {lang === 'ar' ? 'حذف النهائى' : 'Delete Permanently'}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Complete Confirmation Modal (#18) */}
            {showCompleteModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowCompleteModal(false); }}>
                    <div className="modal-box modal-box--sm">
                        <div className="modal-header">
                            <h3>{lang === 'ar' ? 'تأكيد الإكمال' : 'Confirm Completion'}</h3>
                            <button className="modal-close" onClick={() => setShowCompleteModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body" style={{ textAlign: 'center' }}>
                            <CheckCircle size={48} style={{ color: 'var(--green)', marginBottom: '1rem' }} />
                            <p>{lang === 'ar' ? 'هل أنت متأكد أنك تريد تحديد هذا المشروع كمكتمل؟ لن يتمكن أي شخص من التقديم بعد ذلك.' : 'Are you sure you want to mark this project as completed? No one will be able to apply afterwards.'}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost btn-md" onClick={() => setShowCompleteModal(false)}>{t('cancel')}</button>
                            <button className="btn btn-success btn-md" onClick={handleMarkComplete}>
                                <CheckCircle size={16} /> {lang === 'ar' ? 'تأكيد' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Add Supervisor Modal */}
            {showStaffModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowStaffModal(false); }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>{lang === 'ar' ? 'إضافة مشرف أطروحة' : 'Add Academic Supervisor'}</h3>
                            <button className="modal-close" onClick={() => setShowStaffModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSearchStaff} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', alignItems: 'center' }}>
                                <div className="search-bar" style={{ flex: 1 }}>
                                    <Search size={16} className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder={lang === 'ar' ? 'ابحث عن بالاسم...' : 'Search staff by name...'}
                                        value={staffQuery}
                                        onChange={e => setStaffQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={searchingStaff} style={{ flexShrink: 0 }}>
                                    {searchingStaff ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
                                </button>
                            </form>

                            <div className="staff-results-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                                {staffResults.length === 0 && staffQuery && !searchingStaff ? (
                                    <div className="empty-state" style={{ padding: '2rem 0' }}>
                                        <p>{lang === 'ar' ? 'لا توجد نتائج' : 'No staff found matching your search.'}</p>
                                    </div>
                                ) : (
                                    staffResults.map(staff => (
                                        <div key={staff.id} className="pd-member" style={{ border: '1px solid var(--border)', padding: '0.75rem', borderRadius: 'var(--radius-md)' }}>
                                            <div className="pd-member-info">
                                                <div className="pd-member-avatar">
                                                    {staff.avatar_url
                                                        ? <img src={staff.avatar_url} alt={staff.full_name} />
                                                        : (staff.full_name || '?')[0].toUpperCase()
                                                    }
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontWeight: 600 }}>{staff.full_name}</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', textTransform: 'capitalize' }}>
                                                        {staff.role}
                                                    </span>
                                                </div>
                                            </div>

                                            {team.some(m => m.user_id == staff.id || m.id == staff.id) ? (
                                                <span style={{ fontSize: '0.75rem', color: 'var(--green)', fontWeight: 600 }}><Check size={14} style={{ verticalAlign: 'middle' }} /> {lang === 'ar' ? 'يوجد' : 'In Team'}</span>
                                            ) : (
                                                <button
                                                    className="btn btn-outline btn-sm"
                                                    onClick={() => handleInviteStaff(staff.id)}
                                                    disabled={invitingStaffIds.has(staff.id)}
                                                >
                                                    {invitingStaffIds.has(staff.id) ? <Check size={14} /> : <UserPlus size={14} />}
                                                    {lang === 'ar' ? 'دعوة' : 'Invite'}
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
