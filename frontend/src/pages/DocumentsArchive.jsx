import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import {
    FolderOpen, Download, Filter, Search, BookOpen,
    FileText, Code2, Presentation, Link as LinkIcon,
    Loader2, Github
} from 'lucide-react';
import './DocumentsArchive.css';

const DOC_TYPE_LABELS = {
    report:       { en: 'Final Report',     ar: 'التقرير النهائي',       icon: FileText },
    presentation: { en: 'Presentation',     ar: 'عرض تقديمي',            icon: FileText },
    srs:          { en: 'SRS / Arch',       ar: 'وثيقة المتطلبات',       icon: FileText },
    code_zip:     { en: 'Source Code',      ar: 'الكود المصدري',          icon: Code2 },
    github_url:   { en: 'GitHub Repo',      ar: 'مستودع GitHub',          icon: Github },
};

export default function DocumentsArchive() {
    const { lang } = useI18n();
    const { user } = useAuth();
    const role     = (user?.role || '').toLowerCase();
    const isAdmin  = !!(user?.is_admin || role === 'admin');
    const isTrainer = role === 'trainer' || isAdmin;

    const [docs, setDocs]       = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    const [courseFilter, setCourseFilter] = useState('');
    const [typeFilter, setTypeFilter]     = useState('');
    const [search, setSearch]             = useState('');
    const [exporting, setExporting]       = useState(false);

    useEffect(() => {
        fetch('/api/training/courses/list.php')
            .then(r => r.json())
            .then(d => setCourses(d.courses || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        fetchDocs();
    }, [courseFilter, typeFilter]);

    const fetchDocs = async () => {
        setLoading(true);
        try {
            let url = '/api/training/docs/list.php?all=1&';
            if (courseFilter) url += `course_id=${courseFilter}&`;
            if (typeFilter)   url += `doc_type=${typeFilter}&`;
            const res  = await fetch(url);
            const data = await res.json();
            if (res.ok) setDocs(data.docs || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleExport = async (format = 'csv') => {
        setExporting(true);
        let url = `/api/admin/export.php?type=ideas&format=${format}`;
        if (courseFilter) url += `&course_id=${courseFilter}`;
        window.open(url, '_blank');
        setTimeout(() => setExporting(false), 1500);
    };

    const filtered = docs.filter(d => {
        const haystack = [
            d.file_name || '', d.doc_type || '',
            d.trainee_name || '', d.course_name || ''
        ].join(' ').toLowerCase();
        return haystack.includes(search.toLowerCase());
    });

    const DocIcon = ({ type }) => {
        const Ic = DOC_TYPE_LABELS[type]?.icon || FileText;
        return <Ic size={18} />;
    };

    const formatSize = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024)       return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="docs-archive-page">
            <div className="da-header">
                <div>
                    <h1><FolderOpen size={26} /> {lang === 'ar' ? 'أرشيف الوثائق والتقارير' : 'Documents Archive'}</h1>
                    <p>{lang === 'ar' ? 'جميع وثائق ومستندات المشاريع عبر جميع دورات التدريب' : 'All project documents and reports across all training courses'}</p>
                </div>
                {isTrainer && (
                    <div className="da-export-btns">
                        <button className="btn btn-outline btn-sm" onClick={() => handleExport('csv')} disabled={exporting}>
                            <Download size={15} /> CSV
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={() => handleExport('xlsx')} disabled={exporting}>
                            <Download size={15} /> XLSX
                        </button>
                    </div>
                )}
            </div>

            {/* Filter bar */}
            <div className="da-filters">
                <div className="da-search">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder={lang === 'ar' ? 'البحث بالاسم أو المتدرب أو نوع الوثيقة...' : 'Search by name, trainee, or document type...'}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="da-selects">
                    <div className="da-select">
                        <BookOpen size={14} />
                        <select value={courseFilter} onChange={e => setCourseFilter(e.target.value)}>
                            <option value="">{lang === 'ar' ? 'جميع الدورات' : 'All Courses'}</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="da-select">
                        <Filter size={14} />
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                            <option value="">{lang === 'ar' ? 'جميع الأنواع' : 'All Types'}</option>
                            {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{lang === 'ar' ? v.ar : v.en}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Results */}
            {loading ? (
                <div className="da-loading"><Loader2 className="spin" size={30} /></div>
            ) : filtered.length === 0 ? (
                <div className="da-empty">
                    <FolderOpen size={48} strokeWidth={1} />
                    <h3>{lang === 'ar' ? 'لا توجد وثائق' : 'No Documents Found'}</h3>
                    <p>{lang === 'ar' ? 'لم يتم رفع أي وثائق تطابق خيارات التصفية.' : 'No documents match the current filters.'}</p>
                </div>
            ) : (
                <div className="da-table-wrap">
                    <div className="da-count">{filtered.length} {lang === 'ar' ? 'وثيقة' : 'document(s)'}</div>
                    <table className="da-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{lang === 'ar' ? 'اسم الملف' : 'File Name'}</th>
                                <th>{lang === 'ar' ? 'النوع' : 'Type'}</th>
                                <th>{lang === 'ar' ? 'المتدرب' : 'Trainee'}</th>
                                <th>{lang === 'ar' ? 'الدورة' : 'Course'}</th>
                                <th>{lang === 'ar' ? 'الحجم' : 'Size'}</th>
                                <th>{lang === 'ar' ? 'التاريخ' : 'Date'}</th>
                                <th>{lang === 'ar' ? 'تحميل' : 'Download'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((doc, idx) => {
                                const typeInfo = DOC_TYPE_LABELS[doc.doc_type] || DOC_TYPE_LABELS.report;
                                const isLink   = doc.doc_type === 'github_url';
                                return (
                                    <tr key={doc.id}>
                                        <td className="da-num">{idx + 1}</td>
                                        <td>
                                            <div className="da-file-name">
                                                <DocIcon type={doc.doc_type} />
                                                <span>{doc.file_name || doc.url?.split('/').pop() || 'Document'}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="da-type-badge">
                                                {lang === 'ar' ? typeInfo.ar : typeInfo.en}
                                            </span>
                                        </td>
                                        <td>{doc.trainee_name || '—'}</td>
                                        <td>
                                            <span className="da-course-tag">
                                                {lang === 'ar' && doc.course_name_ar ? doc.course_name_ar : (doc.course_name || '—')}
                                            </span>
                                        </td>
                                        <td className="da-size">{formatSize(doc.file_size)}</td>
                                        <td className="da-date">{new Date(doc.created_at).toLocaleDateString()}</td>
                                        <td>
                                            {doc.file_url || doc.url ? (
                                                <a
                                                    href={doc.file_url || doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-ghost btn-sm"
                                                >
                                                    {isLink ? <LinkIcon size={14} /> : <Download size={14} />}
                                                    {isLink ? (lang === 'ar' ? 'فتح' : 'Open') : (lang === 'ar' ? 'تحميل' : 'Download')}
                                                </a>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
