import { useState, useEffect, useMemo } from 'react';
import { 
    UserPlus, Users, Loader2, X, Search, Filter, Mail, Building, 
    BookOpen, ShieldCheck, CheckCircle2, Award, Sparkles, Phone, Plus
} from 'lucide-react';
import './TrainersManagement.css';

export default function TrainersManagement() {
    const [trainers, setTrainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [deptFilter, setDeptFilter] = useState('all');

    // New trainer form state
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [department, setDepartment] = useState('');
    const [role, setRole] = useState('trainer');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchTrainers();
    }, []);

    const fetchTrainers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/training/trainers/list.php', { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.trainers && data.trainers.length > 0) {
                setTrainers(data.trainers);
            } else {
                const uRes = await fetch('/api/admin/users.php', { credentials: 'include' });
                const uData = await uRes.json();
                if (uRes.ok && uData.users) {
                    setTrainers(uData.users.filter(u => u.role === 'trainer' || u.role === 'ta' || u.role === 'professor' || u.is_admin));
                }
            }
        } catch (e) {
            console.error(e);
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    full_name: fullName,
                    password,
                    role,
                    department: department || 'Faculty of Computer Science and Engineering'
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSuccess('Trainer account created successfully!');
                setEmail(''); 
                setFullName(''); 
                setPassword(''); 
                setDepartment('');
                setRole('trainer');
                fetchTrainers();
                setTimeout(() => {
                    setShowModal(false);
                    setSuccess('');
                }, 1400);
            } else {
                setError(data.error || 'Failed to create trainer');
            }
        } catch (e) {
            setError('Connection error. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    // Filtered trainers list
    const filteredTrainers = useMemo(() => {
        return trainers.filter(t => {
            const nameMatch = (t.full_name || t.username || '').toLowerCase().includes(searchQuery.toLowerCase());
            const emailMatch = (t.email || '').toLowerCase().includes(searchQuery.toLowerCase());
            const deptMatch = (t.department || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesQuery = nameMatch || emailMatch || deptMatch;

            if (deptFilter === 'all') return matchesQuery;
            return matchesQuery && (t.department || '').toLowerCase().includes(deptFilter.toLowerCase());
        });
    }, [trainers, searchQuery, deptFilter]);

    // Unique departments
    const departments = useMemo(() => {
        const set = new Set();
        trainers.forEach(t => {
            if (t.department) set.add(t.department);
        });
        return Array.from(set);
    }, [trainers]);

    const totalAssignedCourses = useMemo(() => {
        return trainers.reduce((acc, t) => acc + (parseInt(t.assigned_courses_count, 10) || 1), 0);
    }, [trainers]);

    return (
        <div className="trainers-page container">
            {/* ══ Page Header ══ */}
            <div className="trainers-header">
                <div>
                    <div className="trainers-badge-row">
                        <span className="trainers-kicker">Faculty &amp; Supervision</span>
                    </div>
                    <h1>Trainers Management</h1>
                    <p>Supervise, onboard, and manage faculty instructors and field training supervisors at New Mansoura University.</p>
                </div>
                <button className="btn btn-primary btn-add-trainer" onClick={() => setShowModal(true)}>
                    <UserPlus size={18} />
                    <span>Add New Trainer</span>
                </button>
            </div>

            {/* ══ Metric Overview Cards ══ */}
            <div className="trainers-metrics-grid">
                <div className="t-metric-card">
                    <div className="t-metric-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
                        <Users size={22} />
                    </div>
                    <div className="t-metric-content">
                        <span className="t-metric-num">{trainers.length}</span>
                        <span className="t-metric-label">Total Faculty Trainers</span>
                    </div>
                </div>

                <div className="t-metric-card">
                    <div className="t-metric-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <BookOpen size={22} />
                    </div>
                    <div className="t-metric-content">
                        <span className="t-metric-num">{totalAssignedCourses}</span>
                        <span className="t-metric-label">Course Assignments</span>
                    </div>
                </div>

                <div className="t-metric-card">
                    <div className="t-metric-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        <Building size={22} />
                    </div>
                    <div className="t-metric-content">
                        <span className="t-metric-num">{departments.length > 0 ? departments.length : 1}</span>
                        <span className="t-metric-label">Departments</span>
                    </div>
                </div>
            </div>

            {/* ══ Filter & Search Bar ══ */}
            <div className="trainers-filter-bar">
                <div className="trainers-search-box">
                    <Search size={18} className="search-icon" />
                    <input 
                        type="text"
                        placeholder="Search trainer by name, email, or department..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {departments.length > 0 && (
                    <div className="trainers-dept-filter">
                        <Filter size={16} />
                        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                            <option value="all">All Departments</option>
                            {departments.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* ══ Results Count ══ */}
            <div className="trainers-meta-count">
                Showing <strong>{filteredTrainers.length}</strong> of {trainers.length} trainer{trainers.length === 1 ? '' : 's'}
            </div>

            {/* ══ Trainers Table / Content ══ */}
            {loading ? (
                <div className="trainers-loading">
                    <Loader2 className="spin" size={32} />
                    <p>Loading faculty roster...</p>
                </div>
            ) : filteredTrainers.length === 0 ? (
                <div className="trainers-empty-box">
                    <Users size={44} strokeWidth={1.5} />
                    <h3>No Trainers Found</h3>
                    <p>
                        {searchQuery || deptFilter !== 'all' 
                            ? 'No trainers match the selected filter criteria.' 
                            : 'No trainers have been registered yet. Click "Add New Trainer" to create one.'}
                    </p>
                    {(searchQuery || deptFilter !== 'all') ? (
                        <button className="btn btn-outline btn-sm" onClick={() => { setSearchQuery(''); setDeptFilter('all'); }}>
                            Clear Filters
                        </button>
                    ) : (
                        <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> Add First Trainer
                        </button>
                    )}
                </div>
            ) : (
                <div className="trainers-table-wrapper">
                    <table className="trainers-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Instructor / Supervisor</th>
                                <th>University Email</th>
                                <th>Department / Faculty</th>
                                <th>Track Assignments</th>
                                <th>Role</th>
                                <th>Status</th>
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
                                                    <span className="t-sub">{t.username ? `@${t.username}` : 'Faculty Member'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="t-col-email">
                                            <div className="t-email-pill">
                                                <Mail size={14} />
                                                <span>{t.email}</span>
                                            </div>
                                        </td>
                                        <td className="t-col-dept">
                                            <div className="t-dept-cell">
                                                <Building size={14} className="t-dept-icon" />
                                                <span>{t.department || 'Faculty of CS & Engineering'}</span>
                                            </div>
                                        </td>
                                        <td className="t-col-courses">
                                            <span className="t-course-pill">
                                                <BookOpen size={13} />
                                                {t.assigned_courses_count ?? 1} Course(s)
                                            </span>
                                        </td>
                                        <td className="t-col-role">
                                            <span className={`t-role-badge ${t.is_admin ? 'admin' : 'trainer'}`}>
                                                {t.is_admin ? 'ADMIN' : (t.role ? t.role.toUpperCase() : 'TRAINER')}
                                            </span>
                                        </td>
                                        <td className="t-col-status">
                                            <span className="t-status-badge active">
                                                <CheckCircle2 size={13} />
                                                Active
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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
                                    Add New Faculty Trainer
                                </h2>
                                <p>Create a verified faculty instructor account for training courses and student supervision.</p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        {error && <div className="trainers-alert error">{error}</div>}
                        {success && <div className="trainers-alert success"><CheckCircle2 size={16} />{success}</div>}

                        <form onSubmit={handleCreateTrainer} className="trainers-modal-form">
                            <div className="form-group">
                                <label>Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder="e.g. Dr. Ahmed Hassan"
                                />
                            </div>

                            <div className="form-group">
                                <label>University Email Address *</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="trainer@nmu.edu.eg"
                                />
                            </div>

                            <div className="form-group">
                                <label>Initial Password *</label>
                                <input
                                    type="password"
                                    required
                                    minLength="8"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Minimum 8 characters"
                                />
                            </div>

                            <div className="form-group">
                                <label>Department / Academic Specialty</label>
                                <input
                                    type="text"
                                    value={department}
                                    onChange={e => setDepartment(e.target.value)}
                                    placeholder="e.g. Computer Science & AI"
                                />
                            </div>

                            <div className="form-group">
                                <label>Academic & Supervision Role *</label>
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
                                    <option value="trainer">Trainer / Summer Course Instructor (مدرب دورة تدريبية)</option>
                                    <option value="professor">Professor / Faculty Doctor (أستاذ دكتور / عضو هيئة تدريس)</option>
                                    <option value="ta">Teaching Assistant - TA (معيد / مساعد تدريس)</option>
                                    <option value="supervisor">Academic / Field Supervisor (مشرف أكاديمي / ميداني)</option>
                                    <option value="admin">System Administrator (مسؤول نظام)</option>
                                </select>
                            </div>

                            <div className="trainers-modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>
                                    {creating ? <Loader2 className="spin" size={16} /> : 'Create Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
