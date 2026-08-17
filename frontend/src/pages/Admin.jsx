import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { getAdminStats, adminDeleteUser, adminDeleteProject, adminCreateStaff } from '../services/api';
import { COLLEGES, SKILLS_CATALOG } from '../data/constants';
import { Users, FolderKanban, Star, Activity, BarChart3, TrendingUp, Download, Search, Trash2, AlertTriangle, UserPlus, Loader2, Lock, Settings, BookOpen, Plus } from 'lucide-react';
import { formatDate } from '../services/api';
import './Admin.css';

export default function Admin() {
    const { t, lang } = useI18n();
    const { user, profile } = useAuth();
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [userSearch, setUserSearch] = useState('');
    const [deleting, setDeleting] = useState(null); // { type: 'user'|'project', id, name }
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);

    // Staff creation form
    const [showStaffForm, setShowStaffForm] = useState(false);
    const [staffName, setStaffName] = useState('');
    const [staffEmail, setStaffEmail] = useState('');
    const [staffPassword, setStaffPassword] = useState('');
    const [staffRole, setStaffRole] = useState('ta');
    const [staffCollege, setStaffCollege] = useState('');
    const [staffLoading, setStaffLoading] = useState(false);
    const [staffMsg, setStaffMsg] = useState({ text: '', type: '' });

    // Course creation form
    const [showCourseForm, setShowCourseForm] = useState(false);
    const [courseName, setCourseName] = useState('');
    const [courseDesc, setCourseDesc] = useState('');
    const [courseCategory, setCourseCategory] = useState('Software / AI');
    const [courseLevel, setCourseLevel] = useState('Intermediate');
    const [courseDuration, setCourseDuration] = useState(40);
    const [courseLoading, setCourseLoading] = useState(false);
    const [courseMsg, setCourseMsg] = useState({ text: '', type: '' });

    const reload = () => {
        setLoading(true);
        getAdminStats().then(s => {
            setStats(s || {});
            setUsers(s?.users || []);
            setProjects(s?.projects || []);
            setLoading(false);
        });
    };

    useEffect(() => { reload(); }, []);

    const isAdmin = !!(user?.is_admin || user?.role === 'admin' || profile?.is_admin || profile?.role === 'admin');

    if (!isAdmin) {
        return (
            <div className="empty-state">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--text-muted)' }}>
                    <Lock size={48} />
                </div>
                <h3>{lang === 'ar' ? 'غير مصرح' : 'Unauthorized'}</h3>
                <p>{lang === 'ar' ? 'هذه الصفحة للمسؤولين فقط' : 'This page is for admins only'}</p>
            </div>
        );
    }

    if (loading) return <div className="loading-state"><div className="spinner" /></div>;

    const statCards = [
        { icon: <Users size={24} />, label: lang === 'ar' ? 'إجمالي المستخدمين' : 'Total Users', value: stats.totalUsers ?? stats.total_students ?? 0, color: 'var(--indigo)' },
        { icon: <FolderKanban size={24} />, label: lang === 'ar' ? 'إجمالي المشاريع' : 'Total Projects', value: stats.totalProjects ?? stats.total_projects ?? 0, color: 'var(--teal)' },
        { icon: <Activity size={24} />, label: lang === 'ar' ? 'مشاريع منتهية' : 'Completed', value: stats.completedProjects ?? stats.teams_formed ?? 0, color: 'var(--green)' },
        { icon: <Star size={24} />, label: lang === 'ar' ? 'متوسط التقييم' : 'Avg Rating', value: Number(stats.avgRating ?? stats.avg_rating ?? 0).toFixed(1), color: 'var(--amber)' },
    ];

    const filteredUsers = userSearch
        ? users.filter(u => (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase()) ||

            (u.email || '').toLowerCase().includes(userSearch.toLowerCase()))
        : users;

    const getCollegeName = (key) => {
        const c = COLLEGES.find(col => col.key === key);
        return c ? (lang === 'ar' ? c.ar : c.en) : '—';
    };

    const handleExport = () => {
        const data = { exported_at: new Date().toISOString(), users, projects };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nmu-matching-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const confirmDelete = (type, id, name) => setDeleting({ type, id, name });
    const cancelDelete = () => setDeleting(null);

    const executeDelete = async () => {
        if (!deleting) return;
        const { type, id } = deleting;
        setDeleting(prev => ({ ...prev, loading: true }));
        let ok = false;
        if (type === 'user') {
            ok = await adminDeleteUser(id);
            if (ok) setUsers(prev => prev.filter(u => u.id !== id));
        } else {
            ok = await adminDeleteProject(id);
            if (ok) setProjects(prev => prev.filter(p => p.id !== id));
        }
        if (!ok) {
            setDeleting(prev => ({
                ...prev,
                loading: false,
                error: lang === 'ar'
                    ? 'فشل الحذف. تأكد من تحميل الملفات الجديدة على السيرفر.'
                    : 'Delete failed. Make sure the new backend files are uploaded to the server.',
            }));
        } else {
            setDeleting(null);
        }
    };

    const handleCreateStaff = async () => {
        if (!staffName.trim() || !staffEmail.trim() || !staffPassword.trim()) {
            setStaffMsg({ text: lang === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields are required', type: 'error' });
            return;
        }
        setStaffLoading(true);
        setStaffMsg({ text: '', type: '' });
        const result = await adminCreateStaff({
            email: staffEmail.trim(),
            password: staffPassword.trim(),
            full_name: staffName.trim(),
            role: staffRole,
            college_key: staffCollege || null,
        });
        setStaffLoading(false);
        if (result?.error) {
            setStaffMsg({ text: typeof result.error === 'string' ? result.error : 'Creation failed', type: 'error' });
        } else {
            setStaffMsg({ text: lang === 'ar' ? 'تم إنشاء الحساب بنجاح!' : 'Account created successfully!', type: 'success' });
            setStaffName(''); setStaffEmail(''); setStaffPassword(''); setStaffRole('ta'); setStaffCollege('');
            reload();
        }
    };

    const handleCreateCourse = async (e) => {
        e?.preventDefault?.();
        if (!courseName.trim()) {
            setCourseMsg({ text: lang === 'ar' ? 'اسم الدورة التدريبية مطلوب' : 'Course name is required', type: 'error' });
            return;
        }
        setCourseLoading(true);
        setCourseMsg({ text: '', type: '' });
        try {
            const res = await fetch('/api/training/courses/create.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: courseName.trim(),
                    description: courseDesc.trim(),
                    category: courseCategory,
                    level: courseLevel,
                    duration_hours: parseInt(courseDuration) || 40
                })
            });
            let data = {};
            try {
                data = await res.json();
            } catch (jsonErr) {
                // non-JSON response
            }
            if (res.ok && data.success) {
                setCourseMsg({ text: lang === 'ar' ? 'تم إنشاء الدورة التدريبية بنجاح!' : 'Course created successfully!', type: 'success' });
                setCourseName('');
                setCourseDesc('');
                setCourseDuration(40);
                setTimeout(() => {
                    setShowCourseForm(false);
                    setCourseMsg({ text: '', type: '' });
                }, 2000);
            } else {
                setCourseMsg({ text: data.error || (lang === 'ar' ? 'فشل إنشاء الدورة التدريبية' : 'Failed to create course'), type: 'error' });
            }
        } catch (err) {
            console.error('Course creation error:', err);
            setCourseMsg({ text: lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Connection error. Please try again.', type: 'error' });
        } finally {
            setCourseLoading(false);
        }
    };

    const typeLabels = { project: lang === 'ar' ? 'مشروع' : 'Project', research: lang === 'ar' ? 'بحث' : 'Research', graduation: lang === 'ar' ? 'تخرج' : 'Graduation' };
    const statusColors = { open: 'var(--green)', in_progress: 'var(--amber)', completed: 'var(--muted)' };

    return (
        <div className="admin-page">
            {/* Delete Confirm Modal */}
            {deleting && (
                <div className="admin-modal-overlay" onClick={cancelDelete}>
                    <div className="admin-modal" onClick={e => e.stopPropagation()}>
                        <div className="admin-modal-icon"><AlertTriangle size={32} color="var(--rose)" /></div>
                        <h3>{lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Deletion'}</h3>
                        <p>
                            {lang === 'ar'
                                ? `هل أنت متأكد أنك تريد حذف "${deleting.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`
                                : `Are you sure you want to permanently delete "${deleting.name}"? This cannot be undone.`}
                        </p>
                        {deleting.error && (
                            <div className="admin-modal-error" style={{ color: 'var(--rose)', background: 'rgba(244, 63, 94, 0.1)', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.875rem' }}>
                                {deleting.error}
                            </div>
                        )}
                        <div className="admin-modal-actions">
                            <button className="btn btn-ghost btn-sm" onClick={cancelDelete}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                            <button className="btn btn-danger btn-sm" onClick={executeDelete} disabled={deleting.loading}>
                                <Trash2 size={14} /> {deleting.loading ? '...' : (lang === 'ar' ? 'حذف نهائي' : 'Delete Permanently')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Settings size={24} className="text-primary" />
                        {lang === 'ar' ? 'لوحة التحكم' : 'Admin Dashboard'}
                    </h1>
                    <p className="page-subtitle">{t('admin_subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Link to="/courses" className="btn btn-primary btn-sm">
                        <BookOpen size={16} /> {lang === 'ar' ? 'عرض الدورات التدريبية' : 'Manage Courses'}
                    </Link>
                    <button className="btn btn-secondary btn-sm" onClick={handleExport}>
                        <Download size={16} /> {lang === 'ar' ? 'تصدير البيانات' : 'Export Data'}
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="admin-stats">
                {statCards.map((s, i) => (
                    <div key={i} className="admin-stat-card animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                        <div className="admin-stat-icon" style={{ color: s.color, background: `${s.color}15` }}>{s.icon}</div>
                        <div className="admin-stat-value">{s.value}</div>
                        <div className="admin-stat-label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Manage Training Courses */}
            <div className="admin-section">
                <div className="admin-section-header">
                    <h3><BookOpen size={18} /> {lang === 'ar' ? 'الدورات التدريبية الصيفية' : 'Summer Training Courses'}</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Link to="/courses" className="btn btn-outline btn-sm">
                            {lang === 'ar' ? 'الدورات النشطة' : 'View All'}
                        </Link>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowCourseForm(!showCourseForm)}>
                            <Plus size={15} />
                            {showCourseForm ? (lang === 'ar' ? 'إغلاق' : 'Close') : (lang === 'ar' ? 'إضافة دورة جديدة' : 'Add Course')}
                        </button>
                    </div>
                </div>
                {showCourseForm && (
                    <form onSubmit={handleCreateCourse} className="admin-staff-form animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>{lang === 'ar' ? 'عنوان الدورة التدريبية' : 'Course Title'} *</label>
                            <input
                                type="text"
                                required
                                value={courseName}
                                onChange={e => setCourseName(e.target.value)}
                                placeholder={lang === 'ar' ? 'مثال: الذكاء الاصطناعي وتعلم الآلة' : 'e.g. AI & Machine Learning'}
                            />
                        </div>
                        <div className="form-group">
                            <label>{lang === 'ar' ? 'المسار / التصنيف' : 'Track / Category'}</label>
                            <select value={courseCategory} onChange={e => setCourseCategory(e.target.value)}>
                                <option value="Software / AI">Software / AI</option>
                                <option value="Robotics">Robotics</option>
                                <option value="Embedded Systems">Embedded Systems</option>
                                <option value="Data Science">Data Science</option>
                                <option value="Web & Mobile">Web & Mobile</option>
                                <option value="Cybersecurity">Cybersecurity</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{lang === 'ar' ? 'المستوى' : 'Level'}</label>
                            <select value={courseLevel} onChange={e => setCourseLevel(e.target.value)}>
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                                <option value="All Levels">All Levels</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{lang === 'ar' ? 'الساعات المعتمدة' : 'Duration Hours'}</label>
                            <input
                                type="number"
                                min="10"
                                max="200"
                                value={courseDuration}
                                onChange={e => setCourseDuration(e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>{lang === 'ar' ? 'وصف الدورة وأهدافها' : 'Course Description'}</label>
                            <textarea
                                rows={2}
                                value={courseDesc}
                                onChange={e => setCourseDesc(e.target.value)}
                                placeholder={lang === 'ar' ? 'شرح مختصر لأهداف الدورة والمخرجات التعليمية...' : 'Brief description of learning objectives...'}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCourseForm(false)}>
                                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button type="submit" className="btn btn-primary btn-sm" disabled={courseLoading}>
                                {courseLoading ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                                {' '}{lang === 'ar' ? 'إنشاء وحفظ الدورة' : 'Create Course'}
                            </button>
                        </div>
                        {courseMsg.text && (
                            <div style={{ gridColumn: '1 / -1', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', background: courseMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)', color: courseMsg.type === 'success' ? 'var(--green)' : 'var(--rose)' }}>
                                {courseMsg.text}
                            </div>
                        )}
                    </form>
                )}
            </div>

            {/* Skill Distribution */}
            {
                ((stats.skill_distribution && stats.skill_distribution.length > 0) || (stats.skillCounts && Object.keys(stats.skillCounts).length > 0)) && (
                    <div className="admin-section">
                        <h3><BarChart3 size={18} /> {lang === 'ar' ? 'أكثر المهارات شيوعًا' : 'Most Common Skills'}</h3>
                        <div className="admin-bars">
                            {(stats.skill_distribution || Object.entries(stats.skillCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([sid, count]) => {
                                const sk = SKILLS_CATALOG.find(s => s.id === sid);
                                return { skill_name: sk ? (lang === 'ar' ? sk.ar : sk.en) : sid, count };
                            })).slice(0, 15).map((sk, i) => {
                                const maxCount = (stats.skill_distribution || [])[0]?.count || Object.values(stats.skillCounts || {})[0] || 1;
                                const pct = Math.round(((sk.count || 0) / maxCount) * 100);
                                return (
                                    <div key={i} className="admin-bar-row">
                                        <span className="admin-bar-name">{sk.skill_name || sk.skill_id}</span>
                                        <div className="admin-bar-track"><div className="admin-bar-fill" style={{ width: `${pct}%` }} /></div>
                                        <span className="admin-bar-val">{sk.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )
            }

            {/* College Breakdown */}
            {
                ((stats.college_breakdown && stats.college_breakdown.length > 0) || (stats.collegeBreakdown && Object.keys(stats.collegeBreakdown).length > 0)) && (
                    <div className="admin-section">
                        <h3><TrendingUp size={18} /> {lang === 'ar' ? 'توزيع الكليات' : 'College Distribution'}</h3>
                        <div className="admin-colleges">
                            {(stats.college_breakdown || Object.entries(stats.collegeBreakdown || {}).map(([key, count]) => ({
                                college_key: key, college_name: getCollegeName(key), count
                            }))).map((c, i) => (
                                <div key={i} className="admin-college-card">
                                    <div className="admin-college-val">{c.count || 0}</div>
                                    <div className="admin-college-name">{c.college_name || getCollegeName(c.college_key)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Add Supervisor / Teaching Member */}
            <div className="admin-section">
                <div className="admin-section-header">
                    <h3><UserPlus size={18} /> {lang === 'ar' ? 'إضافة مشرف / عضو هيئة تدريس' : 'Add Supervisor / Teaching Member'}</h3>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowStaffForm(!showStaffForm)}>
                        {showStaffForm ? (lang === 'ar' ? 'إغلاق' : 'Close') : (lang === 'ar' ? 'إضافة جديد' : 'Add New')}
                    </button>
                </div>
                {showStaffForm && (
                    <div className="admin-staff-form animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
                        <div className="form-group">
                            <label>{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'}</label>
                            <input type="text" value={staffName} onChange={e => setStaffName(e.target.value)} placeholder={lang === 'ar' ? 'الاسم' : 'Full name'} />
                        </div>
                        <div className="form-group">
                            <label>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</label>
                            <input type="email" value={staffEmail} onChange={e => setStaffEmail(e.target.value)} placeholder="email@nmu.edu.eg" />
                        </div>
                        <div className="form-group">
                            <label>{lang === 'ar' ? 'كلمة المرور' : 'Password'}</label>
                            <input type="text" value={staffPassword} onChange={e => setStaffPassword(e.target.value)} placeholder={lang === 'ar' ? '8 أحرف على الأقل' : 'Min 8 characters'} />
                        </div>
                        <div className="form-group">
                            <label>{lang === 'ar' ? 'الدور' : 'Role'}</label>
                            <select value={staffRole} onChange={e => setStaffRole(e.target.value)}>
                                <option value="ta">{lang === 'ar' ? 'معيد' : 'Teaching Assistant'}</option>
                                <option value="lecturer">{lang === 'ar' ? 'مدرس' : 'Lecturer'}</option>
                                <option value="professor">{lang === 'ar' ? 'أستاذ' : 'Professor'}</option>
                                <option value="supervisor">{lang === 'ar' ? 'مشرف' : 'Supervisor'}</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>{lang === 'ar' ? 'الكلية' : 'College'}</label>
                            <select value={staffCollege} onChange={e => setStaffCollege(e.target.value)}>
                                <option value="">{lang === 'ar' ? 'اختياري' : 'Optional'}</option>
                                {COLLEGES.map(c => <option key={c.key} value={c.key}>{lang === 'ar' ? c.ar : c.en}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button className="btn btn-primary btn-sm" onClick={handleCreateStaff} disabled={staffLoading} style={{ width: '100%' }}>
                                {staffLoading ? <Loader2 size={14} className="spin" /> : <UserPlus size={14} />}
                                {' '}{lang === 'ar' ? 'إنشاء الحساب' : 'Create Account'}
                            </button>
                        </div>
                        {staffMsg.text && (
                            <div style={{ gridColumn: '1 / -1', padding: '0.5rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', background: staffMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)', color: staffMsg.type === 'success' ? 'var(--green)' : 'var(--rose)' }}>
                                {staffMsg.text}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Users Table */}
            {
                users.length > 0 && (
                    <div className="admin-section">
                        <div className="admin-section-header">
                            <h3><Users size={18} /> {lang === 'ar' ? 'المستخدمون' : 'Users'} ({users.length})</h3>
                            <div className="search-bar" style={{ width: '220px' }}>
                                <Search size={16} className="search-icon" />
                                <input type="text" placeholder={lang === 'ar' ? 'بحث...' : 'Search...'} value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                            </div>
                        </div>
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{lang === 'ar' ? 'المستخدم' : 'User'}</th>
                                        <th>{lang === 'ar' ? 'الكلية' : 'College'}</th>
                                        <th>{lang === 'ar' ? 'السنة' : 'Year'}</th>
                                        <th>{lang === 'ar' ? 'المهارات' : 'Skills'}</th>
                                        <th>{lang === 'ar' ? 'التقييم' : 'Rating'}</th>
                                        <th>{lang === 'ar' ? 'تاريخ التسجيل' : 'Joined'}</th>
                                        <th>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.length === 0 ? (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)' }}>{lang === 'ar' ? 'لا يوجد مستخدمون' : 'No users found'}</td></tr>
                                    ) : filteredUsers.slice(0, 50).map((u, i) => (
                                        <tr key={i}>
                                            <td>
                                                <div className="admin-user-cell">
                                                    {u.avatar_url
                                                        ? <img src={u.avatar_url} className="admin-user-avatar admin-user-avatar--img" alt="" />
                                                        : <div className="admin-user-avatar">{(u.full_name || u.email || '?')[0].toUpperCase()}</div>
                                                    }
                                                    <div>
                                                        <div className="admin-user-name">{u.full_name || '—'}</div>
                                                        <div className="admin-user-email">{u.email || ''}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{getCollegeName(u.college_key)}</td>
                                            <td>{u.academic_year ? `Y${u.academic_year}` : '—'}</td>
                                            <td>{(u.user_skills || u.skills || []).length}</td>
                                            <td>{u.avg_rating ? `★ ${Number(u.avg_rating).toFixed(1)}` : '—'}</td>
                                            <td style={{ color: 'var(--muted)' }}>{u.created_at ? formatDate(u.created_at) : '—'}</td>
                                            <td>
                                                <button
                                                    className="btn-admin-delete"
                                                    title={lang === 'ar' ? 'حذف المستخدم' : 'Delete user'}
                                                    onClick={() => confirmDelete('user', u.id, u.full_name || u.email)}
                                                    disabled={u.is_admin}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* Projects Table */}
            {
                projects.length > 0 && (
                    <div className="admin-section">
                        <h3><FolderKanban size={18} /> {lang === 'ar' ? 'المشاريع المنشورة' : 'Posted Projects'} ({projects.length})</h3>
                        <div className="admin-table-wrap">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>{lang === 'ar' ? 'المشروع' : 'Project'}</th>
                                        <th>{lang === 'ar' ? 'النوع' : 'Type'}</th>
                                        <th>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                                        <th>{lang === 'ar' ? 'الفريق' : 'Team'}</th>
                                        <th>{lang === 'ar' ? 'الموعد النهائي' : 'Deadline'}</th>
                                        <th>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projects.slice(0, 30).map((p, i) => {
                                        const title = lang === 'ar' ? (p.title_ar || p.title || p.title) : (p.title || p.title);
                                        const teamCount = (p.team_members || []).length;
                                        const isExpired = p.deadline && new Date(p.deadline) < new Date();
                                        return (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{title || '—'}</td>
                                                <td><span className="admin-badge">{typeLabels[p.type] || p.type}</span></td>
                                                <td>
                                                    <span className="admin-badge" style={{ color: statusColors[p.status] || 'var(--muted)' }}>{p.status}</span>
                                                    {isExpired && <span className="admin-badge admin-badge--expired">Expired</span>}
                                                </td>
                                                <td>{teamCount}/{p.team_size_needed || p.team_size || 4}</td>
                                                <td style={{ color: 'var(--muted)' }}>{p.deadline || '—'}</td>
                                                <td>
                                                    <button
                                                        className="btn-admin-delete"
                                                        title={lang === 'ar' ? 'حذف المشروع' : 'Delete project'}
                                                        onClick={() => confirmDelete('project', p.id, title || `Project #${p.id}`)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
