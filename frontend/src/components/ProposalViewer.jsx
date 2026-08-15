import React, { useState, useEffect } from 'react';
import { FileText, Download, Sparkles, Edit3, CheckCircle2, User, Users, Calendar, BookOpen, Loader2, X, AlertCircle } from 'lucide-react';
import './ProposalViewer.css';

export default function ProposalViewer({
    ideaId,
    initialProposal = null,
    documentLabel = 'proposal', // 'proposal' for trainee, 'documentation' for trainer/admin
    canEdit = true,
    onProposalUpdated = null,
    lang = 'en'
}) {
    const [proposal, setProposal] = useState(initialProposal);
    const [loading, setLoading] = useState(!initialProposal && !!ideaId);
    const [error, setError] = useState('');
    
    // Live Section Edit (Case A) State
    const [editingSection, setEditingSection] = useState(null);
    const [editInstruction, setEditInstruction] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');

    useEffect(() => {
        if (initialProposal) {
            setProposal(initialProposal);
        } else if (ideaId) {
            fetchProposal();
        }
    }, [ideaId, initialProposal]);

    const fetchProposal = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/api/training/ideas/proposal_get.php?idea_id=${ideaId}`);
            const data = await res.json();
            if (res.ok && data.proposal) {
                setProposal(data.proposal);
            } else {
                setError(data.error || 'Failed to load proposal details');
            }
        } catch (e) {
            setError('Network error loading proposal');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenEdit = (sec) => {
        setEditingSection(sec);
        setEditInstruction('');
        setEditError('');
        setEditSuccess('');
    };

    const handleSaveSectionEdit = async () => {
        if (!editInstruction.trim() || !editingSection) return;
        setSavingEdit(true);
        setEditError('');
        try {
            const res = await fetch('/api/training/ideas/proposal_edit_section.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea_id: ideaId,
                    section_key: editingSection.key,
                    instruction: editInstruction.trim()
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                // Update targeted section only
                setProposal(prev => {
                    if (!prev || !prev.sections) return prev;
                    const nextSections = prev.sections.map(s => {
                        if (s.key === editingSection.key) {
                            return { ...s, content: data.updated_content, source: 'ai_edited' };
                        }
                        return s;
                    });
                    const updated = { ...prev, sections: nextSections };
                    if (onProposalUpdated) onProposalUpdated(updated);
                    return updated;
                });
                setEditSuccess(lang === 'ar' ? 'تم تحديث هذا القسم بنجاح' : 'Section updated successfully');
                setTimeout(() => {
                    setEditingSection(null);
                    setEditSuccess('');
                }, 800);
            } else {
                setEditError(data.error || 'Failed to update section');
            }
        } catch (e) {
            setEditError('Error connecting to AI revision service');
        } finally {
            setSavingEdit(false);
        }
    };

    if (loading) {
        return (
            <div className="proposal-viewer-container" style={{ padding: '3rem', textAlign: 'center' }}>
                <Loader2 className="spin" size={32} style={{ color: '#3b82f6', marginBottom: '0.75rem' }} />
                <p style={{ margin: 0, color: '#94a3b8' }}>
                    {lang === 'ar' ? 'جاري تحميل وثيقة المقترح...' : 'Loading official document...'}
                </p>
            </div>
        );
    }

    if (error || !proposal) {
        return (
            <div className="proposal-viewer-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <AlertCircle size={32} style={{ color: '#ef4444', marginBottom: '0.5rem' }} />
                <p style={{ color: '#ef4444', margin: 0 }}>{error || 'No proposal data available'}</p>
            </div>
        );
    }

    const sections = proposal.sections || [];
    const team = proposal.team || {};
    const title = proposal.project_title || proposal.title || 'Training Project';
    const category = proposal.category || 'software';
    const isDocLabel = documentLabel === 'documentation';

    const displayTitle = isDocLabel 
        ? (lang === 'ar' ? 'توثيق المشروع الرسمي' : 'Official Project Documentation')
        : (lang === 'ar' ? 'مقترح المشروع الأكاديمي' : 'Official Project Proposal');

    return (
        <div className="proposal-viewer-container">
            {/* Header */}
            <div className="proposal-viewer-header">
                <div className="proposal-title-area">
                    <div className="proposal-icon-badge">
                        <FileText size={24} />
                    </div>
                    <div className="proposal-header-text">
                        <h3>{displayTitle}</h3>
                        <div className="proposal-header-meta">
                            <span className={`category-tag ${category}`}>{category}</span>
                            <span>•</span>
                            <span style={{ fontWeight: 600, color: '#f1f5f9' }}>{title}</span>
                            {proposal.source === 'catalog_seed' && (
                                <span className="source-badge">
                                    {lang === 'ar' ? 'محتوى معتمد جاهز' : 'Verified Catalog Template'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="proposal-header-actions">
                    {ideaId && (
                        <a
                            href={`/api/training/ideas/proposal_docx.php?idea_id=${ideaId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-docx-download"
                        >
                            <Download size={15} />
                            <span>{lang === 'ar' ? 'تحميل التقرير الرسمي (.docx)' : 'Download Official Word Report (.docx)'}</span>
                        </a>
                    )}
                </div>
            </div>

            {/* Team & Context Metadata Bar */}
            <div className="proposal-team-bar">
                {team.leader && (
                    <div className="team-bar-item">
                        <User size={14} className="text-primary" />
                        <span>{lang === 'ar' ? 'قائد الفريق:' : 'Team Leader:'} <strong>{team.leader}</strong></span>
                    </div>
                )}
                {team.members && team.members.length > 0 && (
                    <div className="team-bar-item">
                        <Users size={14} />
                        <span>{lang === 'ar' ? 'الأعضاء:' : 'Members:'} <strong>{team.members.join(', ')}</strong></span>
                    </div>
                )}
                {team.trainer && (
                    <div className="team-bar-item">
                        <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                        <span>{lang === 'ar' ? 'المشرف:' : 'Supervisor:'} <strong>{team.trainer}</strong></span>
                    </div>
                )}
                {team.course && (
                    <div className="team-bar-item">
                        <BookOpen size={14} />
                        <span>{team.course}</span>
                    </div>
                )}
                {team.date && (
                    <div className="team-bar-item">
                        <Calendar size={14} />
                        <span>{team.date}</span>
                    </div>
                )}
            </div>

            {/* Document Sections List */}
            <div className="proposal-sections-list">
                {sections.map((sec, idx) => (
                    <div 
                        key={sec.key || idx} 
                        className="proposal-section-card revealing"
                        style={{ animationDelay: `${idx * 0.08}s` }}
                    >
                        <div className="section-card-header">
                            <div className="section-number-title">
                                <span className="section-num">{idx + 1}</span>
                                <h4>{sec.title || sec.key}</h4>
                            </div>

                            {canEdit && (
                                <div className="section-actions">
                                    <button
                                        type="button"
                                        className="btn-ai-edit-section"
                                        onClick={() => handleOpenEdit(sec)}
                                        title={lang === 'ar' ? 'طلب تعديل ذكي لهذا القسم بالذكاء الاصطناعي' : 'Request AI revision for this specific section'}
                                    >
                                        <Sparkles size={13} />
                                        <span>{lang === 'ar' ? 'تعديل ذكي بالذكاء الاصطناعي' : 'AI Section Edit'}</span>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="section-card-content">
                            {sec.content || <em style={{ color: '#64748b' }}>Pending implementation details...</em>}
                        </div>
                    </div>
                ))}
            </div>

            {/* Case A: AI Section Live Revision Modal */}
            {editingSection && (
                <div className="ai-edit-modal-overlay" onClick={() => !savingEdit && setEditingSection(null)}>
                    <div className="ai-edit-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="ai-edit-modal-header">
                            <h4>
                                <Sparkles size={18} style={{ color: '#c084fc' }} />
                                <span>{lang === 'ar' ? `تعديل قسم: ${editingSection.title}` : `Revise Section: ${editingSection.title}`}</span>
                            </h4>
                            <button 
                                className="btn btn-ghost btn-icon" 
                                onClick={() => setEditingSection(null)}
                                disabled={savingEdit}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="ai-edit-modal-body">
                            {editError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{editError}</div>}
                            {editSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{editSuccess}</div>}

                            <label>
                                {lang === 'ar'
                                    ? 'اكتب تعليماتك للتعديل (سيقوم الذكاء الاصطناعي بتعديل هذا القسم فقط دون تغيير باقي الوثيقة):'
                                    : 'Specify how you want this section revised (AI will update ONLY this section):'}
                            </label>
                            <textarea
                                rows="3"
                                placeholder={lang === 'ar' 
                                    ? 'مثال: اجعل صياغة المشكلة أكثر تركيزاً على المستخدمين كبار السن، أو اختصر منهجية العمل...'
                                    : 'e.g. Make the problem statement more specific to healthcare kiosks, or shorten this section to 2 paragraphs...'}
                                value={editInstruction}
                                onChange={e => setEditInstruction(e.target.value)}
                            />

                            <div className="quick-prompts">
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                                    {lang === 'ar' ? 'اقتراحات سريعة:' : 'Quick Prompts:'}
                                </span>
                                {[
                                    { en: 'Make it more formal and academic', ar: 'اجعل الصياغة أكثر أكاديمية ورسمية' },
                                    { en: 'Add focus on real-time performance', ar: 'ركز أكثر على الأداء والسرعة اللحظية' },
                                    { en: 'Shorten and simplify', ar: 'اختصر ولخص النقاط الأساسية' },
                                ].map((qp, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        className="quick-prompt-btn"
                                        onClick={() => setEditInstruction(lang === 'ar' ? qp.ar : qp.en)}
                                    >
                                        {lang === 'ar' ? qp.ar : qp.en}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="ai-edit-modal-footer">
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => setEditingSection(null)}
                                disabled={savingEdit}
                            >
                                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleSaveSectionEdit}
                                disabled={savingEdit || !editInstruction.trim()}
                                style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', gap: '6px' }}
                            >
                                {savingEdit ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
                                <span>{savingEdit ? (lang === 'ar' ? 'جاري التعديل...' : 'Revising...') : (lang === 'ar' ? 'تطبيق التعديل' : 'Apply AI Revision')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
