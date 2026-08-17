import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import {
    Users, Search, Filter, FileSpreadsheet, Download,
    BookOpen, CheckCircle, Lightbulb, Loader2, UserPlus, X, Upload, FileCheck
} from 'lucide-react';
import './TraineesManagement.css';

export default function TraineesManagement() {
    const { lang } = useI18n();
    const { user, profile } = useAuth();
    const role = (user?.role || profile?.role || '').toLowerCase();
    const isAdmin = !!(user?.is_admin || profile?.is_admin || role === 'admin');
    const isTrainer = role === 'trainer' || isAdmin;

    const [trainees, setTrainees]   = useState([]);
    const [courses, setCourses]     = useState([]);
    const [loading, setLoading]     = useState(true);
    const [total, setTotal]         = useState(0);
    const [page, setPage]           = useState(1);

    const [selectedCourse, setSelectedCourse] = useState('');
    const [searchQuery, setSearchQuery]       = useState('');
    const [exporting, setExporting]           = useState(false);

    // Excel import modal
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [importCourseId, setImportCourseId] = useState('');
    const [excelFile, setExcelFile]           = useState(null);
    const [importing, setImporting]           = useState(false);
    const [importResult, setImportResult]     = useState(null);

    useEffect(() => {
        fetch('/api/training/courses/list.php')
            .then(r => r.json())
            .then(d => setCourses(d.courses || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchTrainees();
    }, [selectedCourse, searchQuery, page]);

    const fetchTrainees = async () => {
        setLoading(true);
        try {
            let url = `/api/training/trainees/list.php?page=${page}&`;
            if (selectedCourse) url += `course_id=${selectedCourse}&`;
            if (searchQuery)    url += `search=${encodeURIComponent(searchQuery)}&`;
            const res  = await fetch(url);
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
                body: formData
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

    const handleExport = (format = 'csv') => {
        setExporting(true);
        let url = `/api/admin/export.php?type=trainees&format=${format}`;
        if (selectedCourse) url += `&course_id=${selectedCourse}`;
        window.open(url, '_blank');
        setTimeout(() => setExporting(false), 1500);
    };

    return (
        <div className="trainees-mgmt-page container">
            <div className="tm-header">
                <div>
                    <h1><Users size={28} /> {lang === 'ar' ? 'دليل المتدربين' : 'Trainees Directory'}</h1>
                    <p>{lang === 'ar' ? 'عرض قائمة جميع المتدربين المقيدين في الدورات التدريبية' : 'View and manage enrolled trainees across all training courses'}</p>
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
                        <span>{lang === 'ar' ? `إجمالي المتدربين: ${total}` : `Total Trainees: ${total}`}</span>
                    </div>
                    <table className="tm-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{lang === 'ar' ? 'المتدرب' : 'Trainee'}</th>
                                <th>{lang === 'ar' ? 'الرقم الجامعي' : 'Student ID'}</th>
                                <th>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                                <th>{lang === 'ar' ? 'الدورات المقيد بها' : 'Enrolled Courses'}</th>
                                <th>{lang === 'ar' ? 'الأفكار المقترحة' : 'Submitted Ideas'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {trainees.map((t, idx) => {
                                const coursesList = Array.isArray(t.courses) && t.courses.length > 0 
                                    ? t.courses 
                                    : (t.course_name ? [{ id: 0, name: t.course_name }] : []);

                                return (
                                    <tr key={t.trainee_id || t.enrollment_id || idx}>
                                        <td className="tm-num">{(page - 1) * 50 + idx + 1}</td>
                                        <td>
                                            <div className="tm-trainee-cell">
                                                <div className="tm-avatar">
                                                    {t.avatar_url ? <img src={t.avatar_url} alt="" /> : (t.full_name?.charAt(0) || 'U')}
                                                </div>
                                                <strong>{t.full_name}</strong>
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
                                            <span className={`tm-stat-badge ${t.idea_count > 0 ? 'active' : ''}`}>
                                                <Lightbulb size={12} /> {t.idea_count}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
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
                                        ? 'قم برفع ملف Excel (.xlsx, .xls) يحتوي على الأعمدة: Student ID, Full Name, Email'
                                        : 'Upload an Excel sheet (.xlsx, .xls) containing columns: Student ID, Full Name, Email'}
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowExcelModal(false)}>
                                <X size={18} />
                            </button>
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
                                <button type="submit" className="btn btn-primary" disabled={importing}>
                                    {importing ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'بدء الاستيراد' : 'Start Import')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
