import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, Plus, Calendar, Users, FileText, ChevronRight, Loader2, Search, X, UserPlus, Clock, Trash2 } from 'lucide-react';
import AddStudentModal from '../components/AddStudentModal';
import ConfirmModal from '../components/ConfirmModal';
import './TrainingCourses.css';

export default function TrainingCourses() {
    const { lang } = useI18n();
    const { user } = useAuth();
    const role = (user?.role || '').toLowerCase();
    const isAdmin = !!(user?.is_admin || role === 'admin');
    const isTrainer = role === 'trainer' || isAdmin;

    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedCourseForAdd, setSelectedCourseForAdd] = useState(null);
    const [courseToDelete, setCourseToDelete] = useState(null);
    const [isDeletingCourse, setIsDeletingCourse] = useState(false);

    // Create Course form state
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [category, setCategory] = useState('');
    const [level, setLevel] = useState('');
    const [courseType, setCourseType] = useState('both');
    const [durationHours, setDurationHours] = useState(40);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/training/courses/list.php');
            const data = await res.json();
            if (res.ok && data.courses) {
                setCourses(data.courses);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        if (!name) return;
        setCreating(true);
        setError('');

        try {
            const res = await fetch('/api/training/courses/create.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    description: desc,
                    start_date: startDate,
                    end_date: endDate,
                    category: category,
                    level: level,
                    course_type: courseType,
                    duration_hours: parseInt(durationHours) || 40
                })
            });
            let data = {};
            try {
                data = await res.json();
            } catch (err) {
                // non-JSON response from server
            }
            if (res.ok && data.success) {
                setShowCreateModal(false);
                setName(''); setDesc('');
                setStartDate(''); setEndDate('');
                setCategory(''); setLevel('');
                setCourseType('both');
                setDurationHours(40);
                fetchCourses();
            } else {
                setError(data.error || (lang === 'ar' ? 'فشل إنشاء الدورة التدريبية' : 'Failed to create course'));
            }
        } catch (e) {
            console.error('Course creation error:', e);
            setError(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Connection error. Please try again.');
        } finally {
            setCreating(false);
        }
    };

    const handleConfirmDeleteCourse = async () => {
        if (!courseToDelete) return;
        setIsDeletingCourse(true);
        try {
            const res = await fetch('/api/training/courses/delete.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: courseToDelete.id })
            });
            let data = {};
            try {
                data = await res.json();
            } catch (err) {}

            if (res.ok && data.success) {
                setCourseToDelete(null);
                fetchCourses();
            } else {
                alert(data.error || (lang === 'ar' ? 'فشل حذف الدورة التدريبية' : 'Failed to delete course'));
            }
        } catch (err) {
            console.error('Delete course error:', err);
            alert(lang === 'ar' ? 'خطأ في الاتصال أثناء حذف الدورة' : 'Connection error while deleting course');
        } finally {
            setIsDeletingCourse(false);
        }
    };

    const filteredCourses = courses.filter(c => {
        const query = search.toLowerCase();
        return (c.name || '').toLowerCase().includes(query) ||
               (c.name_ar || '').includes(query) ||
               (c.description || '').toLowerCase().includes(query);
    });

    return (
        <div className="courses-page container">
            <div className="courses-header">
                <div>
                    <h1>{lang === 'ar' ? 'الدورات التدريبية الصيفية' : 'Summer Training Courses'}</h1>
                    <p className="subtitle">
                        {lang === 'ar' 
                            ? 'إدارة وحضور الدورات التدريبية المعتمدة لجامعة نيو جيزة' 
                            : 'Manage and attend official NMU summer training courses'}
                    </p>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} />
                        {lang === 'ar' ? 'إضافة دورة جديدة' : 'New Course'}
                    </button>
                )}
            </div>

            <div className="courses-toolbar">
                <div className="search-box">
                    <Search size={18} className="search-icon" />
                    <input 
                        type="text" 
                        placeholder={lang === 'ar' ? 'بحث عن دورة...' : 'Search courses...'} 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loader-container">
                    <Loader2 className="spin" size={32} />
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="empty-state">
                    <BookOpen size={48} />
                    <h3>{lang === 'ar' ? 'لا توجد دورات تدريبية' : 'No Training Courses Found'}</h3>
                    <p>{lang === 'ar' ? 'لم يتم إضافة دورات بعد أو لا تطابق البحث.' : 'No training courses have been created or match your query.'}</p>
                </div>
            ) : (
                <div className="courses-grid">
                    {filteredCourses.map(course => (
                        <div key={course.id} className="course-card">
                            <div className="course-card-header">
                                <h3>{course.name}</h3>
                                <span className={`status-badge status-${course.status}`}>
                                    {course.status}
                                </span>
                            </div>
                            <p className="course-desc">
                                {course.description}
                            </p>

                            <div className="course-meta">
                                <div className="meta-item">
                                    <Clock size={16} />
                                    <span>{course.duration_hours || 40} {lang === 'ar' ? 'ساعة' : 'Hours'}</span>
                                </div>
                                <div className="meta-item">
                                    <FileText size={16} />
                                    <span>{course.total_topics || 0} {lang === 'ar' ? 'مواضيع' : 'Topics'}</span>
                                </div>
                                <div className="meta-item">
                                    <Users size={16} />
                                    <span>{course.total_trainees || 0} {lang === 'ar' ? 'متدربين' : 'Trainees'}</span>
                                </div>
                                {course.start_date && (
                                    <div className="meta-item">
                                        <Calendar size={16} />
                                        <span>{course.start_date}</span>
                                    </div>
                                )}
                            </div>

                            <div className="course-card-footer" style={{ display: 'flex', gap: '0.5rem' }}>
                                <Link to={`/courses/${course.id}`} className="btn btn-outline" style={{ flex: 1 }}>
                                    {lang === 'ar' ? 'التفاصيل' : 'View Course'}
                                    <ChevronRight size={16} />
                                </Link>
                                {isTrainer && (
                                    <>
                                        <button 
                                            className="btn btn-primary"
                                            style={{ padding: '0.6rem 0.85rem' }}
                                            title={lang === 'ar' ? 'إضافة متدرب' : 'Add Student'}
                                            onClick={() => setSelectedCourseForAdd(course)}
                                        >
                                            <UserPlus size={16} />
                                        </button>
                                        <button 
                                            className="btn btn-danger"
                                            style={{ padding: '0.6rem 0.85rem' }}
                                            title={lang === 'ar' ? 'حذف الدورة التدريبية' : 'Delete Course'}
                                            onClick={() => setCourseToDelete(course)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add Student Modal */}
            <AddStudentModal 
                isOpen={!!selectedCourseForAdd}
                onClose={() => setSelectedCourseForAdd(null)}
                courseId={selectedCourseForAdd?.id}
                courseName={selectedCourseForAdd ? (selectedCourseForAdd.name) : ''}
                onStudentAdded={() => fetchCourses()}
            />

            {/* Delete Course Confirmation Modal */}
            <ConfirmModal 
                isOpen={!!courseToDelete}
                onClose={() => setCourseToDelete(null)}
                onConfirm={handleConfirmDeleteCourse}
                title={lang === 'ar' ? 'حذف الدورة التدريبية' : 'Delete Training Course'}
                message={lang === 'ar' 
                    ? `هل أنت متأكد من رغبتك في حذف الدورة "${courseToDelete?.name}"؟ سيتم حذف جميع المواضيع والملفات والمشاريع والتقييمات المرتبطة بها نهائياً.` 
                    : `Are you sure you want to delete "${courseToDelete?.name}"? All associated topics, learning materials, student enrollments, project ideas, and certificates will be permanently deleted.`}
                confirmText={lang === 'ar' ? 'نعم، احذف الدورة' : 'Yes, Delete Course'}
                cancelText={lang === 'ar' ? 'إلغاء' : 'Cancel'}
                isLoading={isDeletingCourse}
                variant="danger"
            />

            {/* Create Course Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-row">
                            <h2>{lang === 'ar' ? 'إنشاء دورة تدريبية جديدة' : 'Create New Training Course'}</h2>
                            <button className="modal-close-btn" onClick={() => setShowCreateModal(false)} aria-label="Close modal">
                                <X size={20} />
                            </button>
                        </div>
                        {error && <div className="alert alert-error">{error}</div>}
                        <form onSubmit={handleCreateCourse}>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'اسم الدورة *' : 'Course Name *'}</label>
                                <input 
                                    type="text" 
                                    required 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    placeholder={lang === 'ar' ? 'مثال: التدريب الصيفي لتطوير الويب' : 'e.g. Web Development Summer Training'} 
                                />
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'وصف الدورة' : 'Course Description'}</label>
                                <textarea 
                                    rows="3" 
                                    value={desc} 
                                    onChange={e => setDesc(e.target.value)} 
                                    placeholder={lang === 'ar' ? 'أهداف ومواضيع التدريب...' : 'Course goals and topics...'} 
                                />
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'عدد الساعات التدريبية (Duration in Hours)' : 'Total Duration (Hours)'}</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="1000"
                                    required
                                    value={durationHours} 
                                    onChange={e => setDurationHours(e.target.value)} 
                                    placeholder="40" 
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'التصنيف / المسار *' : 'Track / Category *'}</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={category} 
                                        onChange={e => setCategory(e.target.value)} 
                                        placeholder="e.g. Computer Science" 
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'مستوى المهارة *' : 'Skill Level *'}</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={level} 
                                        onChange={e => setLevel(e.target.value)} 
                                        placeholder="e.g. Intermediate" 
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'نوع التدريب المتاح بالدورة:' : 'Supported Training Mode:'}</label>
                                <select
                                    className="form-control"
                                    value={courseType}
                                    onChange={e => setCourseType(e.target.value)}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px' }}
                                >
                                    <option value="both">{lang === 'ar' ? 'تدريب داخلي وخارجي معاً (Internal & External)' : 'Both Internal & External'}</option>
                                    <option value="internal">{lang === 'ar' ? 'تدريب داخلي فقط (Internal Training Only)' : 'Internal Training Only'}</option>
                                    <option value="external">{lang === 'ar' ? 'تدريب خارجي فقط (External Training Only)' : 'External Training Only'}</option>
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}</label>
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>
                                    {creating ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'حفظ الدورة' : 'Save Course')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
