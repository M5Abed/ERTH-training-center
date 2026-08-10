import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { 
    UserPlus, Search, CheckCircle, Loader2, X, Mail, Hash, 
    BookOpen 
} from 'lucide-react';
import './AddStudentModal.css';

export default function AddStudentModal({ isOpen, onClose, courseId, courseName, onStudentAdded }) {
    const { lang } = useI18n();

    const [mode, setMode] = useState('search'); // 'search' or 'manual'
    const [searchQuery, setSearchQuery] = useState('');
    const [candidates, setCandidates] = useState([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [enrollingId, setEnrollingId] = useState(null);

    // Manual input state
    const [manualInput, setManualInput] = useState('');
    const [manualLoading, setManualLoading] = useState(false);
    const [manualMsg, setManualMsg] = useState(null);

    useEffect(() => {
        if (isOpen && courseId) {
            fetchCandidates(searchQuery);
        }
    }, [isOpen, courseId]);

    // Search input change debouncing
    useEffect(() => {
        if (!isOpen || mode !== 'search') return;
        const timer = setTimeout(() => {
            fetchCandidates(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, mode]);

    const fetchCandidates = async (q = '') => {
        setLoadingCandidates(true);
        try {
            const res = await fetch(`/api/training/enrollments/search_candidates.php?course_id=${courseId}&q=${encodeURIComponent(q)}`);
            const data = await res.json();
            if (res.ok && data.candidates) {
                setCandidates(data.candidates);
            }
        } catch (e) {
            console.error('Failed to search candidates:', e);
        } finally {
            setLoadingCandidates(false);
        }
    };

    const handleAddSingle = async (candidate) => {
        if (candidate.is_enrolled || enrollingId) return;
        setEnrollingId(candidate.id);

        try {
            const res = await fetch('/api/training/enrollments/add_single.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseId,
                    trainee_id: candidate.id
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                // Update local candidate list to show enrolled
                setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, is_enrolled: true } : c));
                if (onStudentAdded) onStudentAdded(candidate);
            }
        } catch (e) {
            console.error('Failed to enroll candidate:', e);
        } finally {
            setEnrollingId(null);
        }
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualInput.trim()) return;
        setManualLoading(true);
        setManualMsg(null);

        const val = manualInput.trim();
        const payload = { course_id: courseId };
        if (val.includes('@')) {
            payload.email = val;
        } else if (/^\d+$/.test(val)) {
            payload.trainee_id = parseInt(val, 10);
        } else {
            payload.email = val;
        }

        try {
            const res = await fetch('/api/training/enrollments/add_single.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setManualMsg({ type: 'success', text: lang === 'ar' ? 'تم تسجيل الطالب بنجاح!' : 'Student enrolled successfully!' });
                setManualInput('');
                if (onStudentAdded) onStudentAdded();
                fetchCandidates(searchQuery);
            } else {
                setManualMsg({ type: 'error', text: data.error || (lang === 'ar' ? 'فشل تسجيل الطالب' : 'Failed to enroll student') });
            }
        } catch (e) {
            setManualMsg({ type: 'error', text: lang === 'ar' ? 'خطأ في الاتصال' : 'Connection error' });
        } finally {
            setManualLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box add-student-modal animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="modal-header-row">
                    <div>
                        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.35rem' }}>
                            <UserPlus size={22} className="text-primary" />
                            {lang === 'ar' ? 'إضافة متدرب للدورة' : 'Add Student to Course'}
                        </h2>
                        {courseName && (
                            <p className="hint-text" style={{ margin: '0.25rem 0 0 0' }}>
                                <BookOpen size={13} style={{ display: 'inline', marginEnd: '4px' }} />
                                <strong>{courseName}</strong>
                            </p>
                        )}
                    </div>
                    <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                <div className="mode-toggle-tabs">
                    <button 
                        className={`mode-tab-btn ${mode === 'search' ? 'active' : ''}`}
                        onClick={() => setMode('search')}
                    >
                        <Search size={14} style={{ display: 'inline', marginEnd: '4px' }} />
                        {lang === 'ar' ? 'البحث في المتدربين المسجلين' : 'Search Registered Students'}
                    </button>
                    <button 
                        className={`mode-tab-btn ${mode === 'manual' ? 'active' : ''}`}
                        onClick={() => setMode('manual')}
                    >
                        <Mail size={14} style={{ display: 'inline', marginEnd: '4px' }} />
                        {lang === 'ar' ? 'إدخال يدوي (بريد/رقم)' : 'Manual Entry (Email/ID)'}
                    </button>
                </div>

                {mode === 'search' ? (
                    <div>
                        <div className="add-student-search-bar">
                            <Search size={18} className="add-student-search-icon" />
                            <input 
                                type="text"
                                className="add-student-search-input"
                                placeholder={lang === 'ar' 
                                    ? 'ابحث باسم الطالب، الرقم الجامعي، أو البريد الأكاديمي...' 
                                    : 'Search by Name, Academic ID, or Academic Email...'}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            {searchQuery && (
                                <button className="add-student-clear-btn" onClick={() => setSearchQuery('')}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        <p className="search-hint">
                            {lang === 'ar' 
                                ? 'يمكنك البحث عن طريق الاسم أو الرقم الجامعي (مثال: 20240123) أو الايميل الجامعي'
                                : 'Filter registered students by Name, Academic ID (e.g. 20240123), or Email.'}
                        </p>

                        {loadingCandidates ? (
                            <div style={{ padding: '2.5rem 0', textAlign: 'center' }}>
                                <Loader2 className="spin" size={28} style={{ color: 'var(--primary)' }} />
                            </div>
                        ) : candidates.length === 0 ? (
                            <div className="empty-tab" style={{ padding: '2rem 1rem' }}>
                                <Search size={32} style={{ color: 'var(--text-3)' }} />
                                <p style={{ marginTop: '0.5rem', color: 'var(--text-2)' }}>
                                    {searchQuery 
                                        ? (lang === 'ar' ? 'لم يتم العثور على طلاب يطابقون البحث' : 'No students found matching your query')
                                        : (lang === 'ar' ? 'لا يوجد طلاب مسجلون في النظام' : 'No registered students in system')}
                                </p>
                            </div>
                        ) : (
                            <div className="candidates-list">
                                {candidates.map(candidate => {
                                    const initial = (candidate.full_name_en || candidate.username || 'S').charAt(0).toUpperCase();
                                    const isEnrolled = candidate.is_enrolled;
                                    const isCurrentEnrolling = enrollingId === candidate.id;

                                    return (
                                        <div key={candidate.id} className="candidate-card">
                                            <div className="candidate-avatar-col">
                                                <div className="candidate-avatar">
                                                    {candidate.avatar_url ? (
                                                        <img src={candidate.avatar_url} alt={candidate.full_name_en} />
                                                    ) : (
                                                        <span>{initial}</span>
                                                    )}
                                                </div>
                                                <div className="candidate-info">
                                                    <span className="candidate-name">
                                                        {candidate.full_name_en || candidate.username}
                                                    </span>
                                                    <div className="candidate-meta-row">
                                                        {candidate.email && (
                                                            <span className="candidate-badge candidate-badge-email">
                                                                <Mail size={11} /> {candidate.email}
                                                            </span>
                                                        )}
                                                        {candidate.academic_id && (
                                                            <span className="candidate-badge candidate-badge-id">
                                                                <Hash size={11} /> ID: {candidate.academic_id}
                                                            </span>
                                                        )}
                                                        {candidate.major && (
                                                            <span className="candidate-badge">
                                                                {candidate.major}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                {isEnrolled ? (
                                                    <span className="badge badge-approved" style={{ gap: '4px', padding: '6px 12px' }}>
                                                        <CheckCircle size={14} />
                                                        {lang === 'ar' ? 'تمت الإضافة' : 'Enrolled'}
                                                    </span>
                                                ) : (
                                                    <button 
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handleAddSingle(candidate)}
                                                        disabled={isCurrentEnrolling}
                                                    >
                                                        {isCurrentEnrolling ? (
                                                            <Loader2 className="spin" size={14} />
                                                        ) : (
                                                            <>
                                                                <UserPlus size={14} />
                                                                {lang === 'ar' ? 'إضافة' : 'Add'}
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
                        {manualMsg && (
                            <div className={`alert ${manualMsg.type === 'error' ? 'alert-error' : 'alert-success'}`}>
                                {manualMsg.text}
                            </div>
                        )}

                        <div className="form-group">
                            <label>
                                {lang === 'ar' ? 'البريد الأكاديمي أو الرقم الجامعي *' : 'Academic Email or Student ID *'}
                            </label>
                            <input 
                                type="text"
                                required
                                placeholder="e.g. 202400192 or student@nmu.edu.eg"
                                value={manualInput}
                                onChange={e => setManualInput(e.target.value)}
                            />
                        </div>

                        <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
                            <button type="button" className="btn btn-ghost" onClick={onClose}>
                                {lang === 'ar' ? 'إغلاق' : 'Close'}
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={manualLoading}>
                                {manualLoading ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'تسجيل المتدرب' : 'Enroll Student')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
