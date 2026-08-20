import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { getWrittenReviews, getUserReviews, submitReview, getCompletedProjectsForUser, getTeamMembers, deleteReview, updateReview, formatDate } from '../services/api';
import { Star, Send, Loader2, MessageSquare, Edit3, PenLine, Trash2, X, Save, History, ArrowLeft } from 'lucide-react';
import './Reviews.css';

export default function Reviews() {
    const { t, lang } = useI18n();
    const { user } = useAuth();
    const [written, setWritten] = useState([]);
    const [received, setReceived] = useState([]);
    const [projects, setProjects] = useState([]);
    const [teammates, setTeammates] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [selectedTeammate, setSelectedTeammate] = useState('');
    const [commitment, setCommitment] = useState(0);
    const [quality, setQuality] = useState(0);
    const [collab, setCollab] = useState(0);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState('');
    const [showHistory, setShowHistory] = useState(false);

    // Edit/delete written reviews
    const [editingReview, setEditingReview] = useState(null);
    const [editRevComment, setEditRevComment] = useState('');
    const [editCommitment, setEditCommitment] = useState(0);
    const [editQuality, setEditQuality] = useState(0);
    const [editCollab, setEditCollab] = useState(0);
    const [editRevError, setEditRevError] = useState('');

    useEffect(() => {
        async function load() {
            const [w, p, r] = await Promise.all([
                getWrittenReviews(),
                getCompletedProjectsForUser(user?.id),
                getUserReviews(user?.id)
            ]);
            setWritten(w || []);
            setProjects(p || []);
            setReceived(r || []);
            setLoading(false);
        }
        if (user) load();
    }, [user]);

    useEffect(() => {
        if (selectedProject) {
            getTeamMembers(selectedProject).then(m => setTeammates((m || []).filter(tm => (tm.user_id || tm.id) != user?.id)));
        } else { setTeammates([]); }
    }, [selectedProject, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedProject || !selectedTeammate) {
            setMsg(lang === 'ar' ? 'حدد المشروع والزميل' : 'Select project and teammate');
            return;
        }
        if (!commitment || !quality || !collab) {
            setMsg(lang === 'ar' ? 'يرجى إكمال جميع التقييمات' : 'Please rate all categories');
            return;
        }
        setSubmitting(true); setMsg('');
        const rating = Math.round((commitment + quality + collab) / 3 * 10) / 10;
        const result = await submitReview({
            project_id: selectedProject,
            reviewee_id: selectedTeammate,
            commitment_rating: commitment,
            quality_rating: quality,
            collaboration_rating: collab,
            rating,
            comment
        });
        setSubmitting(false);
        if (result && !result.error) {
            setMsg(t('review_submitted'));
            setSelectedProject(''); setSelectedTeammate('');
            setCommitment(0); setQuality(0); setCollab(0); setComment('');
            const [w, r] = await Promise.all([getWrittenReviews(), getUserReviews(user?.id)]);
            setWritten(w || []);
            setReceived(r || []);
        } else {
            setMsg(result?.error?.message || t('error_generic'));
        }
    };

    const handleDeleteWrittenReview = async (reviewId) => {
        if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذه المراجعة؟' : 'Are you sure you want to delete this review?')) return;
        await deleteReview(reviewId);
        const w = await getWrittenReviews();
        setWritten(w || []);
    };

    const handleSaveEditedReview = async () => {
        if (!editingReview) return;
        const avgRating = Math.round((editCommitment + editQuality + editCollab) / 3 * 10) / 10;
        const result = await updateReview(editingReview, avgRating, editCommitment, editQuality, editCollab, editRevComment);
        if (result?.error) {
            setEditRevError(lang === 'ar' ? 'فشل حفظ المراجعة' : 'Failed to save review: ' + (result.error.message || result.error));
            return;
        }
        setEditingReview(null);
        const w = await getWrittenReviews();
        setWritten(w || []);
    };

    const StarPicker = ({ value, onChange, label }) => (
        <div className="star-picker">
            <label>{label}</label>
            <div className="stars-row">
                {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" onClick={() => onChange(n)} className="star-btn">
                        <Star size={24} fill={n <= value ? 'var(--amber)' : 'none'} color={n <= value ? 'var(--amber)' : 'var(--border)'} />
                    </button>
                ))}
            </div>
        </div>
    );

    if (loading) return <div className="loading-state"><div className="spinner" /></div>;

    return (
        <div className="reviews-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('reviews_title')}</h1>
                </div>
                {written.length > 0 && !showHistory && (
                    <button className="btn btn-outline btn-md" onClick={() => setShowHistory(true)}>
                        <History size={16} /> {lang === 'ar' ? 'سجل التقييمات' : 'History'}
                    </button>
                )}
                {showHistory && (
                    <button className="btn btn-ghost btn-md" onClick={() => setShowHistory(false)}>
                        <ArrowLeft size={16} /> {t('cancel') || 'Back'}
                    </button>
                )}
            </div>

            {showHistory ? (
                /* Written reviews history view */
                <div className="written-reviews">
                    <h3><MessageSquare size={18} /> {lang === 'ar' ? 'التقييمات التي كتبتها' : 'Reviews You Wrote'}</h3>
                    <div className="written-list">
                        {written.map((r, i) => {
                            const commitment = Number(r.commitment_rating || r.commitment || 0);
                            const quality = Number(r.quality_rating || r.quality || 0);
                            const collab = Number(r.collaboration_rating || r.collaboration || 0);
                            let avgScore = 0;
                            if (commitment || quality || collab) {
                                avgScore = (commitment + quality + collab) / 3;
                            } else {
                                avgScore = Number(r.rating || 0);
                            }
                            const starsFilled = Math.round(avgScore);

                            return (
                                <div key={i} className="received-review-card">
                                    <div className="received-review-top">
                                        <div>
                                            <div className="received-review-reviewer">{lang === 'ar' ? 'لـ ' : 'For '} {r.reviewee_name || r.reviewed_name || 'User'}</div>
                                            <div className="received-review-meta">{lang === 'ar' ? (r.project_title_ar || r.project_title) : r.project_title || ''} · {formatDate(r.created_at)}</div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div className="received-review-avg">{avgScore.toFixed(1)}</div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className="btn-icon" onClick={() => {
                                                    setEditingReview(r.id);
                                                    setEditCommitment(commitment);
                                                    setEditQuality(quality);
                                                    setEditCollab(collab);
                                                    setEditRevComment(r.comment || '');
                                                    setEditRevError('');
                                                }} title={lang === 'ar' ? 'تعديل' : 'Edit'}><PenLine size={14} /></button>
                                                <button className="btn-icon btn-icon--danger" onClick={() => handleDeleteWrittenReview(r.id)} title={lang === 'ar' ? 'حذف' : 'Delete'}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="received-review-scores">
                                        <div>
                                            <div className="rrs-val" style={{ color: 'var(--indigo)' }}>{commitment}/5</div>
                                            <div className="rrs-label">{t('commitment')}</div>
                                        </div>
                                        <div>
                                            <div className="rrs-val" style={{ color: 'var(--indigo-l)' }}>{quality}/5</div>
                                            <div className="rrs-label">{t('quality')}</div>
                                        </div>
                                        <div>
                                            <div className="rrs-val" style={{ color: 'var(--teal)' }}>{collab}/5</div>
                                            <div className="rrs-label">{t('collaboration')}</div>
                                        </div>
                                    </div>
                                    {r.comment && <p className="review-comment">"{r.comment}"</p>}
                                    {r.created_at && <span className="review-date">{formatDate(r.created_at)}</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="reviews-layout">
                    {/* Left: Submit form */}
                    <div className="review-form-card">
                        <h3><Edit3 size={18} /> {t('leave_review')}</h3>
                        {msg && <div className={msg === t('review_submitted') ? 'success-msg' : 'auth-error'}>{msg}</div>}
                        <form onSubmit={handleSubmit} className="review-form">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>{t('select_project')}</label>
                                    <select value={selectedProject} onChange={e => { setSelectedProject(e.target.value); setSelectedTeammate(''); }} required>
                                        <option value=""> </option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{lang === 'ar' ? (p.title) : (p.title)}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>{t('select_teammate')}</label>
                                    <select value={selectedTeammate} onChange={e => setSelectedTeammate(e.target.value)} required disabled={!selectedProject}>
                                        <option value=""> </option>
                                        {teammates.map(m => <option key={m.user_id || m.id} value={m.user_id || m.id}>{m.full_name || m.full_name || m.email}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="star-pickers">
                                <StarPicker value={commitment} onChange={setCommitment} label={t('rate_commitment')} />
                                <StarPicker value={quality} onChange={setQuality} label={t('rate_quality')} />
                                <StarPicker value={collab} onChange={setCollab} label={t('rate_collab')} />
                            </div>
                            <div className="form-group">
                                <label>{t('review_comment')}</label>
                                <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} />
                            </div>
                            <button className="btn btn-primary btn-md" type="submit" disabled={submitting}>
                                {submitting ? <Loader2 size={16} className="spin" /> : <><Send size={16} /> {t('submit')}</>}
                            </button>
                        </form>
                    </div>

                    {/* Right: Received reviews */}
                    <div className="reviews-received">
                        <h3><Star size={18} /> {lang === 'ar' ? 'التقييمات المستلمة' : 'My Received Reviews'}</h3>
                        {received.length === 0 ? (
                            <div className="empty-state" style={{ padding: '2rem' }}>
                                <Star size={40} />
                                <p>{lang === 'ar' ? 'لا توجد تقييمات حتى الآن' : 'No reviews received yet'}</p>
                            </div>
                        ) : (
                            <div className="received-list">
                                {received.map((r, i) => {
                                    const reviewer = lang === 'ar'
                                        ? (r.users?.full_name || r.reviewer_name || '')
                                        : (r.users?.full_name || r.reviewer_name || '');
                                    const projTitle = lang === 'ar'
                                        ? (r.projects?.title || r.projects?.title || r.project_title || '')
                                        : (r.projects?.title || r.project_title || '');
                                    const avg = ((
                                        (r.commitment_rating || r.commitment || 0) +
                                        (r.quality_rating || r.quality || 0) +
                                        (r.collaboration_rating || r.collaboration || 0)
                                    ) / 3).toFixed(1);
                                    return (
                                        <div key={i} className="received-review-card">
                                            <div className="received-review-top">
                                                <div>
                                                    <div className="received-review-reviewer">{reviewer || '—'}</div>
                                                    <div className="received-review-meta">{projTitle} · {formatDate(r.created_at)}</div>
                                                </div>
                                                <div className="received-review-avg">{avg}</div>
                                            </div>
                                            <div className="received-review-scores">
                                                <div>
                                                    <div className="rrs-val" style={{ color: 'var(--indigo)' }}>{r.commitment_rating || r.commitment || 0}/5</div>
                                                    <div className="rrs-label">{t('commitment')}</div>
                                                </div>
                                                <div>
                                                    <div className="rrs-val" style={{ color: 'var(--indigo-l)' }}>{r.quality_rating || r.quality || 0}/5</div>
                                                    <div className="rrs-label">{t('quality')}</div>
                                                </div>
                                                <div>
                                                    <div className="rrs-val" style={{ color: 'var(--teal)' }}>{r.collaboration_rating || r.collaboration || 0}/5</div>
                                                    <div className="rrs-label">{t('collaboration')}</div>
                                                </div>
                                            </div>
                                            {r.comment && <p className="received-review-comment">"{r.comment}"</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Review Modal */}
            {editingReview && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditingReview(null); }}>
                    <div className="modal-box modal-box--sm">
                        <div className="modal-header">
                            <h3>{lang === 'ar' ? 'تعديل المراجعة' : 'Edit Review'}</h3>
                            <button className="modal-close" onClick={() => setEditingReview(null)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            {editRevError && <div className="auth-error" style={{ marginBottom: '1rem' }}>{editRevError}</div>}
                            <div className="star-pickers" style={{ marginBottom: '1rem' }}>
                                <StarPicker value={editCommitment} onChange={setEditCommitment} label={t('commitment')} />
                                <StarPicker value={editQuality} onChange={setEditQuality} label={t('quality')} />
                                <StarPicker value={editCollab} onChange={setEditCollab} label={t('collaboration')} />
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'التعليق' : 'Comment'}</label>
                                <textarea value={editRevComment} onChange={e => setEditRevComment(e.target.value)} rows={3} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost btn-md" onClick={() => setEditingReview(null)}>{t('cancel')}</button>
                            <button className="btn btn-primary btn-md" onClick={handleSaveEditedReview}>
                                <Save size={16} /> {t('save')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
