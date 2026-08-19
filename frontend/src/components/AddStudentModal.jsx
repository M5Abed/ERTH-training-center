import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { 
    UserPlus, Search, CheckCircle, Loader2, X, Mail, Hash, 
    BookOpen, Building2, GraduationCap, Plus
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

    // External Training Assignment State
    const [trainingType, setTrainingType] = useState('internal'); // 'internal' | 'external'
    const [selectedProviderId, setSelectedProviderId] = useState(''); // '' | 'custom' | providerId
    const [selectedTrackId, setSelectedTrackId] = useState('');
    const [customProviderName, setCustomProviderName] = useState('');
    const [customProviderWebsite, setCustomProviderWebsite] = useState('');
    const [customProviderLinkedin, setCustomProviderLinkedin] = useState('');

    const [providers, setProviders] = useState([]);
    const [tracks, setTracks] = useState([]);

    useEffect(() => {
        if (isOpen && courseId) {
            fetchCandidates(searchQuery);
            fetchProvidersAndTracks();
        }
    }, [isOpen, courseId]);

    const fetchProvidersAndTracks = async () => {
        try {
            const pRes = await fetch(`/api/training/providers/list.php?course_id=${courseId}`);
            const pData = await pRes.json();
            if (pRes.ok && pData.providers) {
                setProviders(pData.providers);
            }

            const tRes = await fetch(`/api/training/topics/list.php?course_id=${courseId}`);
            const tData = await tRes.json();
            if (tRes.ok && tData.topics) {
                setTracks(tData.topics);
            }
        } catch (e) {
            console.error('Failed to fetch providers or tracks:', e);
        }
    };

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

    const buildPayload = (basePayload) => {
        const payload = {
            ...basePayload,
            course_id: courseId,
            training_type: trainingType
        };

        if (trainingType === 'external') {
            if (selectedProviderId === 'custom' || selectedProviderId === '') {
                payload.custom_provider_name = customProviderName;
                payload.custom_provider_website = customProviderWebsite;
                payload.custom_provider_linkedin = customProviderLinkedin;
            } else {
                payload.provider_id = parseInt(selectedProviderId, 10);
            }
            if (selectedTrackId) {
                payload.track_id = parseInt(selectedTrackId, 10);
            }
        } else {
            if (selectedTrackId) {
                payload.track_id = parseInt(selectedTrackId, 10);
            }
        }
        return payload;
    };

    const handleAddSingle = async (candidate) => {
        if (candidate.is_enrolled || enrollingId) return;
        setEnrollingId(candidate.id);

        try {
            const res = await fetch('/api/training/enrollments/add_single.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildPayload({ trainee_id: candidate.id }))
            });
            const data = await res.json();
            if (res.ok && data.success) {
                // Update local candidate list to show enrolled
                setCandidates(prev => prev.map(c => c.id === candidate.id ? { ...c, is_enrolled: true } : c));
                if (onStudentAdded) onStudentAdded(candidate);
            } else {
                alert(data.error || 'Failed to enroll student');
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
        let basePayload = {};
        if (val.includes('@')) {
            basePayload.email = val;
        } else if (/^\d+$/.test(val)) {
            basePayload.trainee_id = parseInt(val, 10);
        } else {
            basePayload.email = val;
        }

        try {
            const res = await fetch('/api/training/enrollments/add_single.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildPayload(basePayload))
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

                {/* Training Type & Track/Provider Setup */}
                <div className="assignment-type-box" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-1)' }}>
                        {lang === 'ar' ? 'مسار ونوع التدريب للمتدرب:' : 'Training Type & Track Assignment:'}
                    </label>
                    
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <button
                            type="button"
                            className={`btn btn-sm ${trainingType === 'internal' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setTrainingType('internal')}
                            style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <GraduationCap size={15} />
                            <span>{lang === 'ar' ? 'تدريب داخلي (جامعي)' : 'Internal (University)'}</span>
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm ${trainingType === 'external' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setTrainingType('external')}
                            style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Building2 size={15} />
                            <span>{lang === 'ar' ? 'تدريب خارجي (شركات ومؤسسات)' : 'External (Provider / Company)'}</span>
                        </button>
                    </div>

                    {trainingType === 'external' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>
                                        {lang === 'ar' ? 'جهة التدريب الخارجية:' : 'External Provider:'}
                                    </label>
                                    <select
                                        className="form-control"
                                        style={{ width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.85rem', borderRadius: '6px', background: 'var(--bg-1)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
                                        value={selectedProviderId}
                                        onChange={e => setSelectedProviderId(e.target.value)}
                                    >
                                        <option value="">{lang === 'ar' ? '-- اختر جهة التدريب --' : '-- Select Provider --'}</option>
                                        {providers.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.is_contracted ? (lang === 'ar' ? '[معتمد]' : '[Contracted]') : ''}
                                            </option>
                                        ))}
                                        <option value="custom">{lang === 'ar' ? '+ جهة أخرى / غير متعاقد معها' : '+ Other / Non-contracted Provider'}</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: '0.8rem', color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>
                                        {lang === 'ar' ? 'المسار التدريبي (Track):' : 'Training Track:'}
                                    </label>
                                    <select
                                        className="form-control"
                                        style={{ width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.85rem', borderRadius: '6px', background: 'var(--bg-1)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
                                        value={selectedTrackId}
                                        onChange={e => setSelectedTrackId(e.target.value)}
                                    >
                                        <option value="">{lang === 'ar' ? '-- مسار عام / بدون تحديد --' : '-- General / None --'}</option>
                                        {tracks
                                            .filter(t => !selectedProviderId || selectedProviderId === 'custom' || !t.provider_id || String(t.provider_id) === String(selectedProviderId))
                                            .map(t => (
                                                <option key={t.id} value={t.id}>{t.title}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>

                            {selectedProviderId === 'custom' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem', padding: '0.5rem', background: 'var(--bg-1)', borderRadius: '6px' }}>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder={lang === 'ar' ? 'اسم الشركة أو جهة التدريب *' : 'Company / Organization Name *'}
                                            value={customProviderName}
                                            onChange={e => setCustomProviderName(e.target.value)}
                                            style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                        <input
                                            type="url"
                                            placeholder={lang === 'ar' ? 'الموقع الإلكتروني (اختياري)' : 'Website URL (Optional)'}
                                            value={customProviderWebsite}
                                            onChange={e => setCustomProviderWebsite(e.target.value)}
                                            style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                                        />
                                        <input
                                            type="url"
                                            placeholder={lang === 'ar' ? 'رابط لينكد إن (اختياري)' : 'LinkedIn URL (Optional)'}
                                            value={customProviderLinkedin}
                                            onChange={e => setCustomProviderLinkedin(e.target.value)}
                                            style={{ width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ marginTop: '0.5rem' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-2)', display: 'block', marginBottom: '4px' }}>
                                {lang === 'ar' ? 'المسار التدريبي الداخلي (اختياري):' : 'Internal Track (Optional):'}
                            </label>
                            <select
                                className="form-control"
                                style={{ width: '100%', padding: '0.45rem 0.65rem', fontSize: '0.85rem', borderRadius: '6px', background: 'var(--bg-1)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
                                value={selectedTrackId}
                                onChange={e => setSelectedTrackId(e.target.value)}
                            >
                                <option value="">{lang === 'ar' ? '-- بدون مسار محدد --' : '-- None --'}</option>
                                {tracks.filter(t => !t.provider_id).map(t => (
                                    <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                            </select>
                        </div>
                    )}
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
                                    const initial = (candidate.full_name || candidate.username || 'S').charAt(0).toUpperCase();
                                    const isEnrolled = candidate.is_enrolled;
                                    const isCurrentEnrolling = enrollingId === candidate.id;

                                    return (
                                        <div key={candidate.id} className="candidate-card">
                                            <div className="candidate-avatar-col">
                                                <div className="candidate-avatar">
                                                    {candidate.avatar_url ? (
                                                        <img src={candidate.avatar_url} alt={candidate.full_name} />
                                                    ) : (
                                                        <span>{initial}</span>
                                                    )}
                                                </div>
                                                <div className="candidate-info">
                                                    <span className="candidate-name">
                                                        {candidate.full_name || candidate.username}
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
