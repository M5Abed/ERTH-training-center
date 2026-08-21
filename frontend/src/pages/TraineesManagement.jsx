import { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import {
    Users, Search, FileSpreadsheet, Download,
    BookOpen, Lightbulb, Loader2, X, Upload, FileCheck,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Edit2, Save, Key, UserCheck, Shield, Trash2, AlertTriangle,
    Sparkles, Building2, Calendar, Globe, ExternalLink
} from 'lucide-react';
import { useToast } from '../components/Toast';
import './TraineesManagement.css';

export default function TraineesManagement() {
    const { lang } = useI18n();
    const { user, profile } = useAuth();
    const toast = useToast();
    const role = (user?.role || profile?.role || '').toLowerCase();
    const isAdmin = !!(user?.is_admin || profile?.is_admin || role === 'admin');
    const isTrainer = role === 'trainer' || isAdmin;

    const [trainees, setTrainees]   = useState([]);
    const [courses, setCourses]     = useState([]);
    const [loading, setLoading]     = useState(true);
    const [total, setTotal]         = useState(0);
    const [page, setPage]           = useState(1);
    const [perPage, setPerPage]     = useState(50);

    const [selectedCourse, setSelectedCourse] = useState('');
    const [searchQuery, setSearchQuery]       = useState('');
    const [exporting, setExporting]           = useState(false);

    // Excel import modal
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [importCourseId, setImportCourseId] = useState('');
    const [excelFile, setExcelFile]           = useState(null);
    const [importing, setImporting]           = useState(false);
    const [importResult, setImportResult]     = useState(null);

    // Edit Trainee modal
    const [editingTrainee, setEditingTrainee] = useState(null);
    const [editForm, setEditForm]             = useState({ full_name: '', student_id: '', email: '', password: '' });
    const [savingEdit, setSavingEdit]         = useState(false);
    const [editError, setEditError]           = useState('');
    const [editSuccess, setEditSuccess]       = useState(false);
    const [deletingTrainee, setDeletingTrainee] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Delete All Trainees
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [deleteAllInput, setDeleteAllInput]         = useState('');
    const [deletingAll, setDeletingAll]               = useState(false);
    const [deleteAllError, setDeleteAllError]         = useState('');

    const authHeaders = (extra = {}) => ({
        ...extra,
        ...(user?.id ? { 'X-User-Id': String(user.id), 'Authorization': `Bearer ${user.id}` } : {})
    });

    const totalPages = useMemo(() => {
        return Math.max(1, Math.ceil(total / perPage));
    }, [total, perPage]);

    useEffect(() => {
        fetch('/api/training/courses/list.php', { credentials: 'include', headers: authHeaders() })
            .then(r => r.json())
            .then(d => setCourses(d.courses || []))
            .catch(() => {});
    }, [user]);

    useEffect(() => {
        fetchTrainees();
    }, [selectedCourse, searchQuery, page, perPage, user]);

    const fetchTrainees = async () => {
        setLoading(true);
        try {
            let url = `/api/training/trainees/list.php?page=${page}&per_page=${perPage}&`;
            if (selectedCourse) url += `course_id=${selectedCourse}&`;
            if (searchQuery)    url += `search=${encodeURIComponent(searchQuery)}&`;
            const res  = await fetch(url, { credentials: 'include', headers: authHeaders() });
            const data = await res.json();
            if (res.ok) {
                setTrainees(data.trainees || []);
                setTotal(data.total || 0);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleExcelImport = async (e) => {
        e.preventDefault();
        if (!excelFile || !importCourseId) return;
        setImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append('course_id', importCourseId);
        formData.append('excel_file', excelFile);

        try {
            const res  = await fetch('/api/training/enrollments/import_excel.php', {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: authHeaders()
            });
            const data = await res.json();
            if (res.ok) {
                setImportResult(data);
                fetchTrainees();
            } else {
                setImportResult({ error: data.error || 'Import failed' });
            }
        } catch (e) {
            setImportResult({ error: 'Connection error' });
        } finally {
            setImporting(false);
        }
    };

    const handleExport = async (format = 'csv') => {
        setExporting(true);
        try {
            let url = `/api/admin/export.php?type=trainees&format=${format}`;
            if (selectedCourse) url += `&course_id=${selectedCourse}`;
            const res = await fetch(url, {
                credentials: 'include',
                headers: authHeaders()
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                toast?.error(errData.error || `Export failed (${res.status})`);
                return;
            }
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            const disp = res.headers.get('Content-Disposition') || '';
            const nameMatch = disp.match(/filename="?([^"]+)"?/);
            a.download = nameMatch ? nameMatch[1] : `Export_Trainees_${format}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);
            toast?.success(lang === 'ar' ? 'تم تصدير البيانات بنجاح' : 'Export downloaded successfully');
        } catch (e) {
            toast?.error('Export connection error');
        } finally {
            setExporting(false);
        }
    };

    const startEditTrainee = (trainee) => {
        setEditingTrainee(trainee);
        setEditForm({
            full_name: trainee.full_name || '',
            student_id: trainee.student_id || '',
            email: trainee.email || '',
            final_track: trainee.final_track || '',
            training_start_date: trainee.training_start_date || '',
            password: ''
        });
        setEditError('');
        setEditSuccess(false);
        setShowDeleteConfirm(false);
    };

    const handleDeleteTrainee = async (traineeParam = null) => {
        const target = traineeParam || editingTrainee;
        if (!target) return;
        const targetTraineeId = target.trainee_id || target.id || target.enrollment_id;
        setDeletingTrainee(true);
        setEditError('');

        try {
            const res = await fetch('/api/training/trainees/delete.php', {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ trainee_id: targetTraineeId }),
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                // Remove from local list
                setTrainees(prev => prev.filter(t => (t.trainee_id || t.id || t.enrollment_id) !== targetTraineeId));
                setTotal(prev => Math.max(0, prev - 1));
                setEditingTrainee(null);
                setShowDeleteConfirm(false);
            } else {
                setEditError(data.error || 'Failed to delete trainee');
            }
        } catch (err) {
            setEditError('Server connection failed');
        } finally {
            setDeletingTrainee(false);
        }
    };

    const handleSaveTrainee = async (e) => {
        e.preventDefault();
        if (!editingTrainee) return;
        setSavingEdit(true);
        setEditError('');

        try {
            const res = await fetch('/api/training/trainees/update.php', {
                method: 'POST',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    trainee_id: editingTrainee.trainee_id || editingTrainee.enrollment_id,
                    full_name: editForm.full_name,
                    student_id: editForm.student_id,
                    email: editForm.email,
                    final_track: editForm.final_track,
                    training_start_date: editForm.training_start_date,
                    password: editForm.password || undefined
                }),
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setEditSuccess(true);
                // Update in local state
                setTrainees(prev => prev.map(t => {
                    if ((t.trainee_id || t.id) === (editingTrainee.trainee_id || editingTrainee.id)) {
                        return {
                            ...t,
                            full_name: editForm.full_name,
                            student_id: editForm.student_id,
                            email: editForm.email
                        };
                    }
                    return t;
                }));
                setTimeout(() => {
                    setEditingTrainee(null);
                    setEditSuccess(false);
                }, 1000);
            } else {
                setEditError(data.error || 'Failed to update trainee details');
            }
        } catch (err) {
            setEditError('Server connection failed');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteAll = async (e) => {
        e.preventDefault();
        if (deleteAllInput.trim().toLowerCase() !== 'delete') {
            setDeleteAllError(lang === 'ar' ? 'يجب كتابة "delete" للتأكيد' : 'You must type "delete" to confirm');
            return;
        }
        setDeletingAll(true);
        setDeleteAllError('');

        try {
            const res = await fetch('/api/training/trainees/delete_all.php', {
                method: 'POST',
                headers: authHeaders(),
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTrainees([]);
                setTotal(0);
                setShowDeleteAllModal(false);
                setDeleteAllInput('');
            } else {
                setDeleteAllError(data.error || 'Failed to delete trainees');
            }
        } catch (err) {
            setDeleteAllError('Server connection failed');
        } finally {
            setDeletingAll(false);
        }
    };

    // Calculate smart pagination range
    const getPageNumbers = () => {
        const pages = [];
        const delta = 2;
        const left = page - delta;
        const right = page + delta + 1;
        let l;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= left && i < right)) {
                pages.push(i);
            }
        }

        const result = [];
        for (const p of pages) {
            if (l) {
                if (p - l === 2) {
                    result.push(l + 1);
                } else if (p - l !== 1) {
                    result.push('...');
                }
            }
            result.push(p);
            l = p;
        }
        return result;
    };

    return (
        <div className="trainees-mgmt-page container">
            <div className="tm-header">
                <div>
                    <h1><Users size={28} /> {lang === 'ar' ? 'دليل المتدربين' : 'Trainees Directory'}</h1>
                    <p>{lang === 'ar' ? 'عرض وتعديل وتصفح قائمة جميع المتدربين المقيدين في الدورات التدريبية' : 'View, edit, and paginate through all enrolled trainees'}</p>
                </div>
                {isTrainer && (
                    <div className="tm-actions">
                        <button className="btn btn-primary" onClick={() => setShowExcelModal(true)}>
                            <FileSpreadsheet size={18} />
                            {lang === 'ar' ? 'استيراد متدربين (Excel)' : 'Import Trainees (Excel)'}
                        </button>
                        <button className="btn btn-outline" onClick={() => handleExport('csv')} disabled={exporting}>
                            <Download size={16} /> CSV
                        </button>
                        <button className="btn btn-outline" onClick={() => handleExport('xlsx')} disabled={exporting}>
                            <Download size={16} /> XLSX
                        </button>
                        <button className="btn btn-danger" onClick={() => { setShowDeleteAllModal(true); setDeleteAllInput(''); setDeleteAllError(''); }}>
                            <Trash2 size={16} />
                            {lang === 'ar' ? 'حذف جميع المتدربين' : 'Delete All Trainees'}
                        </button>
                    </div>
                )}
            </div>

            {/* Filter Bar */}
            <div className="tm-filter-card">
                <div className="tm-search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder={lang === 'ar' ? 'البحث بالاسم، الرقم الجامعي، أو البريد...' : 'Search by name, student ID, or email...'}
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                    />
                </div>

                <div className="tm-select-wrapper">
                    <BookOpen size={16} />
                    <select value={selectedCourse} onChange={e => { setSelectedCourse(e.target.value); setPage(1); }}>
                        <option value="">{lang === 'ar' ? 'جميع الدورات' : 'All Courses'}</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="tm-loading">
                    <Loader2 className="spin" size={32} />
                </div>
            ) : trainees.length === 0 ? (
                <div className="tm-empty">
                    <Users size={48} strokeWidth={1} />
                    <h3>{lang === 'ar' ? 'لا يوجد متدربون' : 'No Trainees Found'}</h3>
                    <p>{lang === 'ar' ? 'جرّب تغيير خيارات البحث أو قم باستيراد كشف جديد.' : 'Try adjusting filters or import a new student roster.'}</p>
                </div>
            ) : (
                <div className="tm-table-wrap">
                    <div className="tm-meta-info">
                        <span>
                            {lang === 'ar'
                                ? `إجمالي المتدربين: ${total.toLocaleString()} متدرب (الصفحة ${page} من ${totalPages})`
                                : `Total Trainees: ${total.toLocaleString()} (Page ${page} of ${totalPages})`
                            }
                        </span>
                    </div>
                    <table className="tm-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{lang === 'ar' ? 'المتدرب' : 'Trainee'}</th>
                                <th>{lang === 'ar' ? 'الرقم الجامعي' : 'Student ID'}</th>
                                <th>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                                <th>{lang === 'ar' ? 'الدورات المقيد بها' : 'Enrolled Courses'}</th>
                                <th>{lang === 'ar' ? 'المسار وجهة التدريب' : 'Track & Provider'}</th>
                                <th>{lang === 'ar' ? 'الأفكار المقترحة' : 'Submitted Ideas'}</th>
                                {isTrainer && <th style={{ textAlign: 'center' }}>{lang === 'ar' ? 'إجراءات' : 'Actions'}</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {trainees.map((t, idx) => {
                                const coursesList = Array.isArray(t.courses) && t.courses.length > 0 
                                    ? t.courses 
                                    : (t.course_name ? [{ id: 0, name: t.course_name }] : []);

                                return (
                                    <tr key={t.trainee_id || t.enrollment_id || idx}>
                                        <td className="tm-num">{(page - 1) * perPage + idx + 1}</td>
                                        <td>
                                            <div className="tm-trainee-cell">
                                                <div className="tm-avatar">
                                                    {t.avatar_url ? <img src={t.avatar_url} alt="" /> : (t.full_name?.charAt(0) || 'U')}
                                                </div>
                                                <strong className="tm-name-text">{t.full_name}</strong>
                                            </div>
                                        </td>
                                        <td><span className="tm-sid">{t.student_id || '-'}</span></td>
                                        <td>{t.email}</td>
                                        <td>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                                                {coursesList.length > 0 ? (
                                                    coursesList.map((c, cIdx) => (
                                                        <span key={c.id || cIdx} className="tm-course-badge">
                                                            <BookOpen size={12} />
                                                            {c.name || c}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            {t.final_track || t.provider_name ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {t.final_track && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600, color: '#2563eb', background: 'rgba(37, 99, 235, 0.08)', padding: '2px 7px', borderRadius: '6px' }}>
                                                            <Sparkles size={11} /> {t.final_track}
                                                        </span>
                                                    )}
                                                    {t.provider_name && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.76rem', color: 'var(--text-1)' }}>
                                                            <Building2 size={11} /> {t.provider_name}
                                                            {t.provider_website && (
                                                                <a href={t.provider_website} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', display: 'inline-flex' }}>
                                                                    <ExternalLink size={10} />
                                                                </a>
                                                            )}
                                                        </span>
                                                    )}
                                                    {t.training_start_date && (
                                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                                                            <Calendar size={10} /> {lang === 'ar' ? `بدأ: ${t.training_start_date}` : `Started: ${t.training_start_date}`}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>-</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`tm-stat-badge ${t.idea_count > 0 ? 'active' : ''}`}>
                                                <Lightbulb size={12} /> {t.idea_count}
                                            </span>
                                        </td>
                                        {isTrainer && (
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <button
                                                        type="button"
                                                        className="tm-row-edit-btn"
                                                        onClick={() => startEditTrainee(t)}
                                                        title={lang === 'ar' ? 'تعديل بيانات المتدرب والاسم' : 'Edit Trainee Name & Details'}
                                                    >
                                                        <Edit2 size={14} />
                                                        <span>{lang === 'ar' ? 'تعديل' : 'Edit'}</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="tm-row-delete-btn"
                                                        onClick={() => {
                                                            startEditTrainee(t);
                                                            setShowDeleteConfirm(true);
                                                        }}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.08)',
                                                            color: '#ef4444',
                                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                                            borderRadius: '6px',
                                                            padding: '0.35rem 0.6rem',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '0.8rem',
                                                            cursor: 'pointer'
                                                        }}
                                                        title={lang === 'ar' ? 'حذف المتدرب' : 'Delete Trainee'}
                                                    >
                                                        <Trash2 size={14} />
                                                        <span>{lang === 'ar' ? 'حذف' : 'Delete'}</span>
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* ── Trainees Directory Pagination Bar ── */}
                    <div className="tm-pagination">
                        <div className="tm-pagination-info">
                            {lang === 'ar'
                                ? `عرض ${(page - 1) * perPage + 1} - ${Math.min(page * perPage, total)} من أصل ${total} متدرب`
                                : `Showing ${(page - 1) * perPage + 1} - ${Math.min(page * perPage, total)} of ${total} trainees`
                            }
                        </div>

                        <div className="tm-pagination-controls">
                            <div className="tm-per-page-select">
                                <label>{lang === 'ar' ? 'لكل صفحة:' : 'Per page:'}</label>
                                <select
                                    value={perPage}
                                    onChange={e => {
                                        setPerPage(Number(e.target.value));
                                        setPage(1);
                                    }}
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                    <option value={200}>200</option>
                                </select>
                            </div>

                            <div className="tm-page-buttons">
                                {/* First Page Arrow */}
                                <button
                                    className="tm-nav-btn"
                                    disabled={page <= 1}
                                    onClick={() => { setPage(1); window.scrollTo({ top: 180, behavior: 'smooth' }); }}
                                    title={lang === 'ar' ? 'الصفحة الأولى' : 'First Page'}
                                >
                                    {lang === 'ar' ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
                                </button>

                                {/* Previous Page Arrow */}
                                <button
                                    className="tm-nav-btn tm-nav-arrow"
                                    disabled={page <= 1}
                                    onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 180, behavior: 'smooth' }); }}
                                    title={lang === 'ar' ? 'الصفحة السابقة' : 'Previous Page'}
                                >
                                    {lang === 'ar' ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                                    <span className="tm-btn-label">{lang === 'ar' ? 'السابق' : 'Prev'}</span>
                                </button>

                                {/* Numbered Page Buttons */}
                                <div className="tm-num-pages">
                                    {getPageNumbers().map((pNum, pIdx) => {
                                        if (pNum === '...') {
                                            return <span key={`ellipsis-${pIdx}`} className="tm-ellipsis">…</span>;
                                        }
                                        return (
                                            <button
                                                key={pNum}
                                                className={`tm-page-btn ${page === pNum ? 'active' : ''}`}
                                                onClick={() => {
                                                    setPage(pNum);
                                                    window.scrollTo({ top: 180, behavior: 'smooth' });
                                                }}
                                            >
                                                {pNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Next Page Arrow */}
                                <button
                                    className="tm-nav-btn tm-nav-arrow"
                                    disabled={page >= totalPages}
                                    onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 180, behavior: 'smooth' }); }}
                                    title={lang === 'ar' ? 'الصفحة التالية' : 'Next Page'}
                                >
                                    <span className="tm-btn-label">{lang === 'ar' ? 'التالي' : 'Next'}</span>
                                    {lang === 'ar' ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                                </button>

                                {/* Last Page Arrow */}
                                <button
                                    className="tm-nav-btn"
                                    disabled={page >= totalPages}
                                    onClick={() => { setPage(totalPages); window.scrollTo({ top: 180, behavior: 'smooth' }); }}
                                    title={lang === 'ar' ? 'الصفحة الأخيرة' : 'Last Page'}
                                >
                                    {lang === 'ar' ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Trainee Modal */}
            {editingTrainee && (
                <div className="modal-overlay" onClick={() => setEditingTrainee(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header-row">
                            <div>
                                <h2>
                                    <Edit2 size={20} className="text-primary" />
                                    {lang === 'ar' ? 'تعديل بيانات المتدرب' : 'Edit Trainee Details'}
                                </h2>
                                <p className="hint-text">
                                    {lang === 'ar'
                                        ? 'قم بتعديل اسم المتدرب أو رقمه الجامعي أو بريده الأكاديمي'
                                        : 'Update the trainee full name, student ID, or academic email'}
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setEditingTrainee(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        {editError && (
                            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                                {editError}
                            </div>
                        )}

                        {editSuccess && (
                            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                                {lang === 'ar' ? 'تم حفظ التعديلات بنجاح' : 'Trainee details saved successfully'}
                            </div>
                        )}

                        <form onSubmit={handleSaveTrainee} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'الاسم الكامل *' : 'Full Name *'}</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.full_name}
                                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                    placeholder={lang === 'ar' ? 'الاسم بالعربي كما في الكشف' : 'Student Full Name'}
                                    autoFocus
                                />
                            </div>

                            <div className="form-group">
                                <label>{lang === 'ar' ? 'الرقم الجامعي (Academic ID) *' : 'Academic ID *'}</label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.student_id}
                                    onChange={e => setEditForm({ ...editForm, student_id: e.target.value })}
                                    placeholder="202300000"
                                />
                            </div>

                            <div className="form-group">
                                <label>{lang === 'ar' ? 'البريد الأكاديمي *' : 'Academic Email *'}</label>
                                <input
                                    type="email"
                                    required
                                    value={editForm.email}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                    placeholder="name@nmu.edu.eg"
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Sparkles size={14} style={{ color: '#2563eb' }} />
                                    {lang === 'ar' ? 'المسار التقني التخصصي' : 'Technical Track'}
                                </label>
                                <input
                                    type="text"
                                    value={editForm.final_track}
                                    onChange={e => setEditForm({ ...editForm, final_track: e.target.value })}
                                    placeholder={lang === 'ar' ? 'مثال: Web Development / Mobile Dev' : 'e.g. Web Development, Mobile Dev'}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <Calendar size={14} style={{ color: '#f59e0b' }} />
                                    {lang === 'ar' ? 'تاريخ بدء التدريب (Started Date)' : 'Training Start Date'}
                                </label>
                                <input
                                    type="date"
                                    value={editForm.training_start_date}
                                    onChange={e => setEditForm({ ...editForm, training_start_date: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span>{lang === 'ar' ? 'تعيين كلمة مرور جديدة (اختياري)' : 'Reset Password (Optional)'}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {lang === 'ar' ? 'اتركه فارغاً إذا لم ترغب بالتغيير' : 'Leave blank to keep unchanged'}
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={editForm.password}
                                    onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                    placeholder={lang === 'ar' ? 'كلمة المرور الجديدة' : 'New password'}
                                    minLength={6}
                                />
                            </div>

                            <div className="modal-actions" style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div>
                                    {!showDeleteConfirm ? (
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ef4444', borderColor: '#fca5a5', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                                        >
                                            <Trash2 size={15} />
                                            {lang === 'ar' ? 'حذف المتدرب' : 'Delete Trainee'}
                                        </button>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239, 68, 68, 0.08)', padding: '4px 8px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                            <span style={{ fontSize: '0.78rem', color: '#dc2626', fontWeight: 600 }}>
                                                {lang === 'ar' ? 'تأكيد الحذف النهائي؟' : 'Confirm deletion?'}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-danger"
                                                onClick={handleDeleteTrainee}
                                                disabled={deletingTrainee}
                                                style={{ background: '#ef4444', color: '#fff', padding: '0.25rem 0.65rem', fontSize: '0.78rem', border: 'none', borderRadius: '6px' }}
                                            >
                                                {deletingTrainee ? <Loader2 className="spin" size={13} /> : (lang === 'ar' ? 'نعم، احذف' : 'Yes, Delete')}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-ghost"
                                                onClick={() => setShowDeleteConfirm(false)}
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.78rem' }}
                                            >
                                                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => { setEditingTrainee(null); setShowDeleteConfirm(false); }}>
                                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={savingEdit || deletingTrainee}>
                                        {savingEdit ? <Loader2 className="spin" size={16} /> : <><Save size={16} /> {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</>}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Excel Import Modal */}
            {showExcelModal && (
                <div className="modal-overlay" onClick={() => setShowExcelModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-row">
                            <div>
                                <h2>
                                    <FileSpreadsheet size={22} className="text-primary" />
                                    {lang === 'ar' ? 'استيراد كشف المتدربين من Excel' : 'Import Trainee Roster (Excel)'}
                                </h2>
                                <p className="hint-text">
                                    {lang === 'ar'
                                        ? 'قم برفع ملف Excel (.xlsx, .xls) أو CSV يحتوي على الأعمدة: [NO., Academic ID, Name, Academic Email, CourseCode, Program, Final Track, Training Platform Email, Password]'
                                        : 'Upload an Excel (.xlsx, .xls) or CSV containing: [NO., Academic ID, Name, Academic Email, CourseCode, Program, Final Track, Training Platform Email, Password]'}
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowExcelModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-2, #f1f5f9)', padding: '0.65rem 0.95rem', borderRadius: '8px', fontSize: '0.82rem' }}>
                            <span>
                                {lang === 'ar' ? 'هل تحتاج إلى النموذج القياسي؟' : 'Need the standard template?'}
                            </span>
                            <a 
                                href="/api/training/enrollments/template.php"
                                className="btn btn-ghost btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: 'var(--primary, #002D56)', fontWeight: 600 }}
                                download="Students_Import_Template.csv"
                            >
                                <Download size={13} /> {lang === 'ar' ? 'تحميل نموذج Excel' : 'Download Template (CSV)'}
                            </a>
                        </div>

                        {importResult && (
                            <div className={`alert ${importResult.error ? 'alert-error' : 'alert-success'}`}>
                                {importResult.error || importResult.message}
                            </div>
                        )}

                        <form onSubmit={handleExcelImport} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'اختر الدورة التدريبية *' : 'Select Course *'}</label>
                                <select required value={importCourseId} onChange={e => setImportCourseId(e.target.value)}>
                                    <option value="">-- {lang === 'ar' ? 'اختر الدورة' : 'Choose Course'} --</option>
                                    {courses.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{lang === 'ar' ? 'ملف Excel (.xlsx, .xls) *' : 'Excel File (.xlsx, .xls) *'}</label>
                                <div className="custom-file-dropzone">
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        required
                                        onChange={e => setExcelFile(e.target.files[0])}
                                    />
                                    <div className="custom-file-icon">
                                        <Upload size={22} />
                                    </div>
                                    <span className="custom-file-label">
                                        {lang === 'ar' ? 'اضغط هنا لرفع الملف أو اسحبه إلى هنا' : 'Click to upload or drag and drop file'}
                                    </span>
                                    <span className="custom-file-subtext">XLSX, XLS or CSV (Max 10MB)</span>
                                    {excelFile && (
                                        <div className="custom-file-name-pill">
                                            <FileCheck size={14} />
                                            {excelFile.name}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowExcelModal(false)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={importing || !excelFile}>
                                    {importing ? (
                                        <>
                                            <Loader2 className="spin" size={16} />
                                            <span>{lang === 'ar' ? 'جاري الاستيراد...' : 'Importing...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileSpreadsheet size={16} />
                                            <span>{lang === 'ar' ? 'بدء الاستيراد' : 'Start Import'}</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete All Modal */}
            {showDeleteAllModal && (
                <div className="modal-overlay" onClick={() => setShowDeleteAllModal(false)}>
                    <div className="modal-box modal-sm" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                            <div className="modal-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', fontWeight: 700 }}>
                                <AlertTriangle size={22} />
                                {lang === 'ar' ? 'حذف جميع المتدربين' : 'Delete All Trainees'}
                            </div>
                            <button className="modal-close" onClick={() => setShowDeleteAllModal(false)}><X size={20} /></button>
                        </div>
                        <div className="modal-body" style={{ paddingTop: '10px' }}>
                            <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                                {lang === 'ar' 
                                    ? 'هل أنت متأكد من حذف جميع المتدربين من النظام بشكل نهائي؟ لا يمكن التراجع عن هذا الإجراء.' 
                                    : 'Are you sure you want to permanently delete ALL trainees from the system? This action cannot be undone.'}
                            </p>
                            <form onSubmit={handleDeleteAll}>
                                <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                    <label style={{ color: '#ef4444', fontWeight: 600, display: 'block', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
                                        {lang === 'ar' ? 'اكتب "delete" للتأكيد' : 'Type "delete" to confirm'}
                                    </label>
                                    <input 
                                        type="text" 
                                        value={deleteAllInput}
                                        onChange={e => setDeleteAllInput(e.target.value)}
                                        placeholder="delete"
                                        style={{ border: '1px solid #fca5a5', width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'var(--surface-2, #1e293b)', color: '#fff', fontSize: '0.95rem' }}
                                        autoComplete="off"
                                        autoFocus
                                    />
                                </div>
                                {deleteAllError && (
                                    <div style={{ color: '#dc2626', fontSize: '0.85rem', marginBottom: '1rem', background: '#fee2e2', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #fca5a5' }}>
                                        {deleteAllError}
                                    </div>
                                )}
                                <div className="modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowDeleteAllModal(false)} disabled={deletingAll}>
                                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="btn btn-danger" 
                                        disabled={deletingAll || deleteAllInput.trim().toLowerCase() !== 'delete'}
                                        style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '0.55rem 1.2rem', borderRadius: '8px', fontWeight: 600 }}
                                    >
                                        {deletingAll ? <Loader2 size={18} className="spin" /> : (lang === 'ar' ? 'حذف الكل' : 'Delete All')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
