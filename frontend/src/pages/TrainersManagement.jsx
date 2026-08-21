import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { 
    UserPlus, Users, Loader2, X, Search, Mail, 
    BookOpen, ShieldCheck, CheckCircle2, Award, Sparkles, Plus, Lock,
    Check, Trash2, Layers, AlertCircle, ChevronRight
} from 'lucide-react';
import './TrainersManagement.css';

export default function TrainersManagement() {
    const { user, profile } = useAuth();
    const { lang } = useI18n();
    const isAdmin = !!(user?.is_admin || user?.role === 'admin' || profile?.is_admin || profile?.role === 'admin');

    const [trainers, setTrainers] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [courseFilter, setCourseFilter] = useState('all');

    // Assign to Course Modal state
    const [assignTrainer, setAssignTrainer] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedCourseToAssign, setSelectedCourseToAssign] = useState('');
    const [assigning, setAssigning] = useState(false);
    const [removingAssignmentId, setRemovingAssignmentId] = useState(null);
    const [assignError, setAssignError] = useState('');
    const [assignSuccess, setAssignSuccess] = useState('');

    // New trainer form state
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('trainer');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const authHeaders = (extra = {}) => ({
        ...extra,
        ...(user?.id ? { 'X-User-Id': String(user.id), 'Authorization': `Bearer ${user.id}` } : {})
    });

    useEffect(() => {
        fetchTrainers();
        fetchCourses();
    }, [user?.id]);

    const fetchCourses = async () => {
        try {
            const res = await fetch('/api/training/courses/list.php', { 
                credentials: 'include',
                headers: authHeaders()
            });
            const data = await res.json();
            if (res.ok && data.courses) {
                setCourses(data.courses);
            }
        } catch (e) {
            console.error('Failed to load courses:', e);
        }
    };

    const fetchTrainers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/training/trainers/list.php', { 
                credentials: 'include',
                headers: authHeaders()
            });
            const text = await res.text();
            let data = {};
            try {
                data = JSON.parse(text);
            } catch (_) {
                console.error('[TrainersManagement] Server returned non-JSON:', text.slice(0, 500));
                setTrainers([]);
                setLoading(false);
                return;
            }
            if (res.ok && Array.isArray(data.trainers)) {
                setTrainers(data.trainers);
            } else {
                console.warn('[TrainersManagement] trainers response:', res.status, data);
                setTrainers([]);
            }
        } catch (e) {
            console.error('[TrainersManagement] Fetch error:', e);
            setTrainers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTrainer = async (e) => {
        e.preventDefault();
        setCreating(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/create_trainer.php', {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    email,
                    full_name: fullName,
                    password,
                    role
                })
            });
            const text = await res.text();
            let data = {};
            try {
                data = JSON.parse(text);
            } catch (err) {
                data = { error: text || 'Server returned invalid response' };
            }

            if (res.ok && data.success) {
                setSuccess(lang === 'ar' ? 'تم إنشاء حساب المدرب بنجاح!' : 'Trainer account created successfully!');
                setEmail(''); 
                setFullName(''); 
                setPassword(''); 
                setRole('trainer');
                fetchTrainers();
                setTimeout(() => {
                    setShowModal(false);
                    setSuccess('');
                }, 1400);
            } else {
                setError(data.error || (lang === 'ar' ? 'فشل إنشاء الحساب' : 'Failed to create trainer'));
            }
        } catch (e) {
            setError(lang === 'ar' ? 'خطأ في الاتصال بالخادم.' : 'Connection error. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const handleOpenAssignModal = (trainer) => {
        setAssignTrainer(trainer);
        setSelectedCourseToAssign('');
        setAssignError('');
        setAssignSuccess('');
        setShowAssignModal(true);
    };

    const handleAssignToCourse = async (e) => {
        e.preventDefault();
        if (!selectedCourseToAssign || !assignTrainer) return;

        setAssigning(true);
        setAssignError('');
        setAssignSuccess('');

        try {
            const res = await fetch('/api/training/courses/assign_trainer.php', {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    course_id: selectedCourseToAssign,
                    trainer_id: assignTrainer.id || assignTrainer.trainer_id
                })
            });
            const text = await res.text();
            let data = {};
            try {
                data = JSON.parse(text);
            } catch (err) {
                data = { error: text || 'Server returned invalid response' };
            }

            if (res.ok && data.success) {
                setAssignSuccess(lang === 'ar' ? 'تم تعيين المدرب للدورة بنجاح!' : 'Trainer assigned to course successfully!');
                setSelectedCourseToAssign('');
                
                // Refresh local trainers state
                const assignedCourseObj = courses.find(c => String(c.id) === String(selectedCourseToAssign));
                if (assignedCourseObj) {
                    const newAssignment = {
                        course_id: assignedCourseObj.id,
                        course_title: assignedCourseObj.name || assignedCourseObj.title,
                        assignment_id: data.assignment_id
                    };
                    setAssignTrainer(prev => ({
                        ...prev,
                        assigned_courses: [...(prev.assigned_courses || []), newAssignment],
                        assigned_courses_count: (prev.assigned_courses?.length || 0) + 1
                    }));
                }
                fetchTrainers();
                setTimeout(() => setAssignSuccess(''), 2500);
            } else {
                setAssignError(data.error || (lang === 'ar' ? 'فشل تعيين المدرب' : 'Failed to assign trainer'));
            }
        } catch (e) {
            setAssignError(lang === 'ar' ? 'خطأ في الاتصال.' : 'Connection error.');
        } finally {
            setAssigning(false);
        }
    };

    const handleRemoveAssignment = async (assignmentId) => {
        if (!assignmentId) return;
        setRemovingAssignmentId(assignmentId);
        setAssignError('');
        setAssignSuccess('');

        try {
            const res = await fetch('/api/training/courses/remove_trainer.php', {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ assignment_id: assignmentId })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setAssignTrainer(prev => ({
                    ...prev,
                    assigned_courses: (prev.assigned_courses || []).filter(ac => ac.assignment_id !== assignmentId),
                    assigned_courses_count: Math.max(0, (prev.assigned_courses?.length || 1) - 1)
                }));
                fetchTrainers();
            } else {
                setAssignError(data.error || (lang === 'ar' ? 'فشل إزالة التعيين' : 'Failed to remove assignment'));
            }
        } catch (e) {
            setAssignError(lang === 'ar' ? 'خطأ في الاتصال.' : 'Connection error.');
        } finally {
            setRemovingAssignmentId(null);
        }
    };

    // Filtered trainers list (Search + Course Filter)
    const filteredTrainers = useMemo(() => {
        return trainers.filter(t => {
            const nameMatch = (t.full_name || t.username || '').toLowerCase().includes(searchQuery.toLowerCase());
            const emailMatch = (t.email || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesQuery = nameMatch || emailMatch;

            if (!matchesQuery) return false;

            if (courseFilter === 'unassigned') {
                if (t.assigned_courses && t.assigned_courses.length > 0) return false;
            } else if (courseFilter !== 'all') {
                const hasCourse = t.assigned_courses && t.assigned_courses.some(ac => String(ac.course_id) === String(courseFilter));
                if (!hasCourse) return false;
            }

            return true;
        });
    }, [trainers, searchQuery, courseFilter]);

    const isStaff = isAdmin || ['trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'doctor', 'faculty', 'evaluator', 'teacher', 'staff', 'admin'].includes((user?.role || profile?.role || '').toLowerCase());

    const totalAssignedCourses = useMemo(() => {
        return trainers.reduce((acc, t) => acc + (t.assigned_courses?.length || (parseInt(t.assigned_courses_count, 10) || 0)), 0);
    }, [trainers]);

    return (
        <div className="trainers-page">
            {/* ══ Header Banner ══ */}
            <div className="trainers-header">
                <div className="trainers-header-text">
                    <div className="trainers-header-badge">
                        <ShieldCheck size={14} />
                        <span className="trainers-kicker">{lang === 'ar' ? 'هيئة التدريس والإشراف' : 'Faculty & Supervision'}</span>
                    </div>
                    <h1>{lang === 'ar' ? 'هيئة التدريب والإشراف' : 'Trainers & Faculty Directory'}</h1>
                    <p>{lang === 'ar' ? 'عرض وإدارة المشرفين وأعضاء هيئة التدريس للدورات التدريبية بجامعة المنصورة الجديدة.' : 'View, supervise, and manage faculty instructors for training courses at New Mansoura University.'}</p>
                </div>
                {(isAdmin || isStaff) && (
                    <button className="btn btn-primary btn-add-trainer" onClick={() => setShowModal(true)}>
                        <UserPlus size={18} />
                        <span>{lang === 'ar' ? 'إضافة مدرب جديد' : 'Add New Trainer'}</span>
                    </button>
                )}
            </div>

            {/* ══ Metric Overview Cards ══ */}
            <div className="trainers-metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                <div className="t-metric-card">
                    <div className="t-metric-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                        <Users size={22} />
                    </div>
                    <div className="t-metric-content">
                        <span className="t-metric-num">{trainers.length}</span>
                        <span className="t-metric-label">{lang === 'ar' ? 'إجمالي أعضاء هيئة التدريب' : 'Total Faculty Trainers'}</span>
                    </div>
                </div>

                <div className="t-metric-card">
                    <div className="t-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <BookOpen size={22} />
                    </div>
                    <div className="t-metric-content">
                        <span className="t-metric-num">{totalAssignedCourses}</span>
                        <span className="t-metric-label">{lang === 'ar' ? 'إجمالي التعيينات بالدورات' : 'Course Assignments'}</span>
                    </div>
                </div>
            </div>

            {/* ══ Filter & Search Bar ══ */}
            <div className="trainers-filter-bar" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <div className="trainers-search-box" style={{ flex: 1, minWidth: '260px' }}>
                    <Search size={18} className="search-icon" />
                    <input 
                        type="text"
                        placeholder={lang === 'ar' ? 'ابحث بالاسم أو البريد الجامعي...' : 'Search trainer by name or email...'}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Course Filter Dropdown */}
                <div className="trainers-dept-filter" style={{ minWidth: '220px' }}>
                    <BookOpen size={16} />
                    <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
                        <option value="all">{lang === 'ar' ? 'جميع الدورات التدريبية' : 'All Courses'}</option>
                        <option value="unassigned">{lang === 'ar' ? 'غير معين لدورة' : 'Unassigned Trainers'}</option>
                        {courses.map(c => (
                            <option key={c.id} value={String(c.id)}>{c.title || c.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* ══ Results Count ══ */}
            <div className="trainers-meta-count">
                {lang === 'ar' ? 'عرض ' : 'Showing '} 
                <strong>{filteredTrainers.length}</strong> {lang === 'ar' ? 'من أصل ' : 'of '} 
                {trainers.length} {lang === 'ar' ? 'مدربين' : 'trainer(s)'}
            </div>

            {/* ══ Trainers Table / Content ══ */}
            {loading ? (
                <div className="trainers-loading">
                    <Loader2 className="spin" size={32} />
                    <p>{lang === 'ar' ? 'جاري تحميل قائمة أعضاء هيئة التدريب...' : 'Loading faculty roster...'}</p>
                </div>
            ) : filteredTrainers.length === 0 ? (
                <div className="trainers-empty-box">
                    <Users size={44} strokeWidth={1.5} />
                    <h3>{lang === 'ar' ? 'لا يوجد مدربون مطابقون' : 'No Trainers Found'}</h3>
                    <p>
                        {searchQuery || courseFilter !== 'all'
                            ? (lang === 'ar' ? 'لا توجد نتائج تطابق معايير البحث والفلترة المحددة.' : 'No trainers match the selected filter criteria.')
                            : (lang === 'ar' ? 'لم يتم تسجيل أي مدرب بعد. اضغط على "إضافة مدرب جديد" لإضافة أول مدرب.' : 'No trainers have been registered yet. Click "Add New Trainer" to create one.')}
                    </p>
                    {(searchQuery || courseFilter !== 'all') ? (
                        <button className="btn btn-outline btn-sm" onClick={() => { setSearchQuery(''); setCourseFilter('all'); }}>
                            {lang === 'ar' ? 'إعادة ضبط الفلاتر' : 'Clear Filters'}
                        </button>
                    ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> {lang === 'ar' ? 'إضافة أول مدرب' : 'Add First Trainer'}
                        </button>
                    )}
                </div>
            ) : (
                <div className="trainers-table-wrapper">
                    <table className="trainers-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{lang === 'ar' ? 'المشرف / عضو هيئة التدريب' : 'Instructor / Supervisor'}</th>
                                <th>{lang === 'ar' ? 'البريد الجامعي' : 'University Email'}</th>
                                <th>{lang === 'ar' ? 'الدورات المعين لها' : 'Assigned Courses'}</th>
                                <th>{lang === 'ar' ? 'الدور' : 'Role'}</th>
                                <th>{lang === 'ar' ? 'التعيين والإجراءات' : 'Course Assignment'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTrainers.map((t, idx) => {
                                const initials = (t.full_name || t.username || 'T')
                                    .split(' ')
                                    .map(w => w[0])
                                    .slice(0, 2)
                                    .join('')
                                    .toUpperCase();

                                const assignedList = t.assigned_courses || [];

                                return (
                                    <tr key={t.id || t.trainer_id || idx}>
                                        <td className="t-col-idx">{idx + 1}</td>
                                        <td className="t-col-user">
                                            <div className="t-user-cell">
                                                <div className="t-avatar">
                                                    {initials}
                                                </div>
                                                <div className="t-user-details">
                                                    <span className="t-name">{t.full_name || t.username}</span>
                                                    <span className="t-sub">{t.username ? `@${t.username}` : (lang === 'ar' ? 'عضو هيئة تدريس' : 'Faculty Member')}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="t-col-email">
                                            <div className="t-email-pill">
                                                <Mail size={14} />
                                                <span>{t.email}</span>
                                            </div>
                                        </td>
                                        <td className="t-col-courses">
                                            {assignedList.length === 0 ? (
                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                    {lang === 'ar' ? 'غير معين لأي دورة' : 'Not assigned'}
                                                </span>
                                            ) : (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                    {assignedList.map(ac => (
                                                        <span 
                                                            key={ac.assignment_id || ac.course_id}
                                                            className="t-course-pill"
                                                            style={{ fontSize: '0.74rem', padding: '2px 8px', whiteSpace: 'nowrap' }}
                                                        >
                                                            <BookOpen size={11} /> {ac.course_title}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="t-col-role">
                                            <span className="t-role-badge trainer">
                                                {t.role ? t.role.toUpperCase() : 'TRAINER'}
                                            </span>
                                        </td>
                                        <td className="t-col-actions" style={{ whiteSpace: 'nowrap' }}>
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={() => handleOpenAssignModal(t)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                    fontSize: '0.78rem',
                                                    padding: '0.35rem 0.75rem',
                                                    fontWeight: 600,
                                                    borderRadius: '8px',
                                                    borderColor: 'var(--primary, #002D56)',
                                                    color: 'var(--primary, #002D56)'
                                                }}
                                            >
                                                <BookOpen size={13} />
                                                {lang === 'ar' ? 'تعيين لدورة' : 'Assign to Course'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ══ Assign to Course Modal ══ */}
            {showAssignModal && assignTrainer && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-box trainers-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
                        <div className="trainers-modal-header">
                            <div className="trainers-modal-header-text">
                                <h2>
                                    <BookOpen size={22} className="modal-title-icon" />
                                    {lang === 'ar' ? 'تعيين المدرب للدورات التدريبية' : 'Assign Trainer to Courses'}
                                </h2>
                                <p>
                                    <strong>{assignTrainer.full_name || assignTrainer.username}</strong> ({assignTrainer.email})
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowAssignModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        {assignError && <div className="trainers-alert error">{assignError}</div>}
                        {assignSuccess && <div className="trainers-alert success"><CheckCircle2 size={16} />{assignSuccess}</div>}

                        {/* Current Assigned Courses */}
                        <div style={{ marginBottom: '1.5rem', background: 'var(--bg-1, #f8fafc)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border, #e2e8f0)' }}>
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-0)' }}>
                                {lang === 'ar' ? 'الدورات المعين لها حالياً:' : 'Currently Assigned Courses:'}
                            </h4>
                            {(!assignTrainer.assigned_courses || assignTrainer.assigned_courses.length === 0) ? (
                                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                    {lang === 'ar' ? 'هذا المدرب غير معين لأي دورة تدريبية حالياً.' : 'This trainer is not assigned to any courses yet.'}
                                </p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {assignTrainer.assigned_courses.map(ac => (
                                        <div 
                                            key={ac.assignment_id} 
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: '#ffffff',
                                                padding: '0.5rem 0.75rem',
                                                borderRadius: '8px',
                                                border: '1px solid var(--border, #e2e8f0)',
                                                fontSize: '0.85rem'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                                                <BookOpen size={14} className="text-primary" />
                                                <span>{ac.course_title}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAssignment(ac.assignment_id)}
                                                disabled={removingAssignmentId === ac.assignment_id}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    fontSize: '0.78rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px',
                                                    padding: '3px 6px',
                                                    borderRadius: '4px'
                                                }}
                                                title={lang === 'ar' ? 'إلغاء التعيين' : 'Remove Assignment'}
                                            >
                                                {removingAssignmentId === ac.assignment_id ? (
                                                    <Loader2 className="spin" size={13} />
                                                ) : (
                                                    <>
                                                        <Trash2 size={13} />
                                                        <span>{lang === 'ar' ? 'إلغاء التعيين' : 'Remove'}</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add New Course Assignment Form */}
                        <form onSubmit={handleAssignToCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-0)' }}>
                                    {lang === 'ar' ? 'اختر دورة تدريبية لإضافتها للمدرب *' : 'Select Course to Assign *'}
                                </label>
                                <select
                                    value={selectedCourseToAssign}
                                    onChange={e => setSelectedCourseToAssign(e.target.value)}
                                    required
                                    className="form-control"
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: '8px',
                                        border: '1.5px solid var(--border, #cbd5e1)',
                                        background: 'var(--bg-0, #ffffff)',
                                        fontSize: '0.92rem'
                                    }}
                                >
                                    <option value="">{lang === 'ar' ? '-- اختر الدورة التدريبية --' : '-- Choose a Course --'}</option>
                                    {courses
                                        .filter(c => !(assignTrainer.assigned_courses || []).some(ac => ac.course_id === c.id))
                                        .map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.title || c.name} ({c.course_type === 'external' ? (lang === 'ar' ? 'خارجي' : 'External') : (lang === 'ar' ? 'داخلي' : 'Internal')})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="trainers-modal-actions" style={{ marginTop: '0.5rem' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAssignModal(false)}>
                                    {lang === 'ar' ? 'إغلاق' : 'Close'}
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary" 
                                    disabled={assigning || !selectedCourseToAssign}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                    {assigning ? <Loader2 className="spin" size={16} /> : <Check size={16} />}
                                    {lang === 'ar' ? 'تأكيد التعيين' : 'Assign to Course'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══ Add New Trainer Modal ══ */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box trainers-modal" onClick={e => e.stopPropagation()}>
                        <div className="trainers-modal-header">
                            <div className="trainers-modal-header-text">
                                <h2>
                                    <UserPlus size={22} className="modal-title-icon" />
                                    {lang === 'ar' ? 'إضافة مدرب جديد' : 'Add New Faculty Trainer'}
                                </h2>
                                <p>{lang === 'ar' ? 'إنشاء حساب رسمي جديد لعضو هيئة التدريس أو المشرف الميداني.' : 'Create a verified faculty instructor account for training courses and student supervision.'}</p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        {error && <div className="trainers-alert error">{error}</div>}
                        {success && <div className="trainers-alert success"><CheckCircle2 size={16} />{success}</div>}

                        <form onSubmit={handleCreateTrainer} className="trainers-modal-form">
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'الاسم الكامل *' : 'Full Name *'}</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder={lang === 'ar' ? 'مثال: د. أحمد محمد محمود' : 'e.g. Dr. Ahmed Hassan'}
                                />
                            </div>

                            <div className="form-group">
                                <label>{lang === 'ar' ? 'البريد الإلكتروني الجامعي *' : 'University Email Address *'}</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="trainer@nmu.edu.eg"
                                />
                            </div>

                            <div className="form-group">
                                <label>{lang === 'ar' ? 'كلمة المرور الأولية *' : 'Initial Password *'}</label>
                                <input
                                    type="password"
                                    required
                                    minLength="8"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder={lang === 'ar' ? '8 أحرف على الأقل' : 'Minimum 8 characters'}
                                />
                            </div>

                            <div className="form-group">
                                <label>{lang === 'ar' ? 'الصفة الأكاديمية والدور *' : 'Academic & Supervision Role *'}</label>
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    className="form-control"
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: '8px',
                                        border: '1.5px solid var(--border, #cbd5e1)',
                                        background: 'var(--bg-0, #ffffff)',
                                        color: 'var(--text-0, #0f172a)',
                                        fontSize: '0.92rem'
                                    }}
                                >
                                    <option value="trainer">{lang === 'ar' ? 'مدرب دورة تدريبية (Trainer)' : 'Trainer / Summer Course Instructor'}</option>
                                    <option value="professor">{lang === 'ar' ? 'أستاذ دكتور / عضو هيئة تدريس (Professor)' : 'Professor / Faculty Doctor'}</option>
                                    <option value="ta">{lang === 'ar' ? 'معيد / مساعد تدريس (TA)' : 'Teaching Assistant - TA'}</option>
                                    <option value="supervisor">{lang === 'ar' ? 'مشرف أكاديمي / ميداني (Supervisor)' : 'Academic / Field Supervisor'}</option>
                                </select>
                            </div>

                            <div className="trainers-modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>
                                    {creating ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'إنشاء الحساب' : 'Create Account')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
