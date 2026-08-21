import React, { useState, useEffect } from 'react';
import {
    FileText, Download, CheckCircle2, User, Users, Calendar,
    BookOpen, Loader2, X, AlertCircle, Shield, Target, Compass, AlertTriangle,
    Layers, Cpu, Layout, Code, ShieldAlert, ShieldCheck, Hammer, Activity,
    Bookmark, Paperclip, Copy, Check, Search, Filter, Edit3, Save, PenLine
} from 'lucide-react';
import { downloadProposalDocx } from '../services/api';
import { useToast } from './Toast';
import './ProposalViewer.css';

// Section icons & badges helper
const getSectionMeta = (key, idx) => {
    const k = (key || '').toLowerCase();
    if (k.includes('abstract')) return { icon: BookOpen, tag: 'Overview', color: '#3b82f6' };
    if (k.includes('introduction') || k.includes('background')) return { icon: Compass, tag: 'Context', color: '#6366f1' };
    if (k.includes('problem')) return { icon: AlertTriangle, tag: 'Problem Statement', color: '#f59e0b' };
    if (k.includes('objective') || k.includes('scope')) return { icon: Target, tag: 'Goals & Scope', color: '#10b981' };
    if (k.includes('related')) return { icon: Layers, tag: 'Literature', color: '#8b5cf6' };
    if (k.includes('methodology')) return { icon: Cpu, tag: 'Core Method', color: '#06b6d4' };
    if (k.includes('design') || k.includes('architecture')) return { icon: Layout, tag: 'System Design', color: '#ec4899' };
    if (k.includes('team') || k.includes('contribution')) return { icon: Users, tag: 'Team Roles', color: '#3b82f6' };
    if (k.includes('success') || k.includes('criteria')) return { icon: CheckCircle2, tag: 'Success Criteria', color: '#10b981' };
    if (k.includes('tech') || k.includes('tools') || k.includes('stack')) return { icon: Code, tag: 'Tech Stack', color: '#f97316' };
    if (k.includes('challenge') || k.includes('risk')) return { icon: ShieldAlert, tag: 'Risk & Mitigation', color: '#ef4444' };
    if (k.includes('ethic') || k.includes('safety')) return { icon: ShieldCheck, tag: 'Ethics & Safety', color: '#14b8a6' };
    if (k.includes('implementation') || k.includes('approach')) return { icon: Hammer, tag: 'Implementation Plan', color: '#a855f7' };
    if (k.includes('test') || k.includes('result')) return { icon: Activity, tag: 'Testing Strategy', color: '#0ea5e9' };
    if (k.includes('reference')) return { icon: Bookmark, tag: 'References', color: '#64748b' };
    if (k.includes('appendix')) return { icon: Paperclip, tag: 'Appendices', color: '#eab308' };
    return { icon: FileText, tag: `Section ${idx + 1}`, color: '#6366f1' };
};

export default function ProposalViewer({
    ideaId,
    initialProposal = null,
    documentLabel = 'proposal', // 'proposal' for trainee, 'documentation' for trainer/admin
    canEdit = true,
    onProposalUpdated = null,
    lang = 'en',
    isExternal = false
}) {
    const toast = useToast();
    const [proposal, setProposal] = useState(initialProposal);
    const [loading, setLoading] = useState(!initialProposal && !!ideaId);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedSec, setCopiedSec] = useState(null);

    // Live Manual Section Edit
    const [editingSection, setEditingSection] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState('');
    const [editSuccess, setEditSuccess] = useState('');
    const [downloadingDocx, setDownloadingDocx] = useState(false);

    const handleDownload = async () => {
        if (!ideaId) return;
        setDownloadingDocx(true);
        try {
            await downloadProposalDocx(ideaId, title || 'Proposal');
        } catch (err) {
            toast?.error(err.message || 'Error downloading Word proposal');
        } finally {
            setDownloadingDocx(false);
        }
    };

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
            const res = await fetch(`/api/training/ideas/proposal_get.php?idea_id=${ideaId}`, { credentials: 'include' });
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

    const handleCopySection = (key, text) => {
        navigator.clipboard.writeText(text || '');
        setCopiedSec(key);
        setTimeout(() => setCopiedSec(null), 2000);
    };

    const handleOpenEdit = (sec) => {
        setEditingSection(sec);
        setEditContent(sec.content || '');
        setEditError('');
        setEditSuccess('');
    };

    const handleSaveSectionEdit = async () => {
        if (!editingSection || !ideaId) return;
        setSavingEdit(true);
        setEditError('');
        try {
            const res = await fetch('/api/training/ideas/proposal_save.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea_id: ideaId,
                    section_key: editingSection.key,
                    content: editContent,
                    section_title: editingSection.title || ''
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                // Update targeted section directly in local state
                setProposal(prev => {
                    if (!prev || !prev.sections) return prev;
                    const nextSections = prev.sections.map(s => {
                        if (s.key === editingSection.key) {
                            return { ...s, content: editContent, source: 'trainee_edit', last_edited_at: new Date().toISOString() };
                        }
                        return s;
                    });
                    const updated = { ...prev, sections: nextSections };
                    if (onProposalUpdated) onProposalUpdated(updated);
                    return updated;
                });
                setEditSuccess(lang === 'ar' ? 'تم حفظ التعديلات بنجاح' : 'Section updated successfully');
                setTimeout(() => {
                    setEditingSection(null);
                    setEditSuccess('');
                }, 800);
            } else {
                setEditError(data.error || (lang === 'ar' ? 'فشل حفظ التعديل' : 'Failed to update section'));
            }
        } catch (e) {
            setEditError(lang === 'ar' ? 'حدث خطأ في الاتصال أثناء حفظ التعديل' : 'Error connecting to proposal service');
        } finally {
            setSavingEdit(false);
        }
    };

    if (loading) {
        return (
            <div className="proposal-viewer-container" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
                <Loader2 className="spin" size={36} style={{ color: '#3b82f6', marginBottom: '1rem' }} />
                <h4 style={{ margin: '0 0 0.5rem', color: '#f8fafc' }}>
                    {lang === 'ar' ? 'جاري تحميل وثيقة المشروع المعتمدة...' : 'Loading Official Academic Proposal...'}
                </h4>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>
                    {lang === 'ar' ? 'يتم جلب أقسام التقرير الكاملة ومطابقتها...' : 'Retrieving full multi-section report specifications...'}
                </p>
            </div>
        );
    }

    if (error || !proposal) {
        return (
            <div className="proposal-viewer-container" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <AlertCircle size={36} style={{ color: '#ef4444', marginBottom: '0.75rem' }} />
                <h4 style={{ color: '#ef4444', margin: '0 0 0.5rem' }}>{lang === 'ar' ? 'تعذر تحميل بيانات المشروع' : 'Unable to Load Project Data'}</h4>
                <p style={{ color: '#94a3b8', margin: 0 }}>{error || 'No proposal data available'}</p>
            </div>
        );
    }

    const rawSections = proposal.sections || [];
    const team = proposal.team || {};
    const title = proposal.project_title || proposal.title || 'Training Project';
    const category = proposal.category || 'software';
    const isDocLabel = documentLabel === 'documentation';

    const displayTitle = isDocLabel
        ? (lang === 'ar' ? 'توثيق المشروع الرسمي المعتمد' : 'Official Project Documentation & Technical Report')
        : (lang === 'ar' ? 'المقترح الأكاديمي والتوثيق المعتمد' : 'Official Academic Proposal & Documentation');

    // Filter sections based on search query
    const sections = rawSections.filter(sec => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        const t = (sec.title || sec.key || '').toLowerCase();
        const c = (sec.content || '').toLowerCase();
        return t.includes(q) || c.includes(q);
    });

    return (
        <div className="proposal-viewer-container">
            {/* Header */}
            <div className="proposal-viewer-header">
                <div className="proposal-title-area">
                    <div className="proposal-icon-badge">
                        <FileText size={26} />
                    </div>
                    <div className="proposal-header-text">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <h3>{displayTitle}</h3>
                            <span className="section-count-badge">
                                {rawSections.length} {lang === 'ar' ? 'أقسام رسمية' : 'Sections'}
                            </span>
                        </div>
                        <div className="proposal-header-meta">
                            <span className={`category-tag ${category}`}>{category}</span>
                            <span>•</span>
                            <span className="project-title-highlight">{title}</span>
                        </div>
                    </div>
                </div>

                <div className="proposal-header-actions">
                    {ideaId && (
                        <button
                            type="button"
                            onClick={handleDownload}
                            disabled={downloadingDocx}
                            className="btn-docx-download"
                            style={{ cursor: downloadingDocx ? 'wait' : 'pointer' }}
                        >
                            {downloadingDocx ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
                            <span>{downloadingDocx ? (lang === 'ar' ? 'جارٍ التحميل...' : 'Downloading...') : (lang === 'ar' ? 'تحميل التقرير الكامل (.docx)' : 'Download Full Proposal (.docx)')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Team / Author & Context Metadata Bar */}
            <div className="proposal-team-bar">
                {team.leader && (
                    <div className="team-bar-item">
                        <User size={14} style={{ color: '#3b82f6' }} />
                        <span>{(isExternal || proposal?.course_type === 'external' || proposal?.training_type === 'external') ? (lang === 'ar' ? 'اسم المتدرب:' : 'Student / Trainee:') : (lang === 'ar' ? 'قائد الفريق:' : 'Team Leader:')} <strong>{team.leader}</strong></span>
                    </div>
                )}
                {!(isExternal || proposal?.course_type === 'external' || proposal?.training_type === 'external') && team.members && team.members.length > 0 && (
                    <div className="team-bar-item">
                        <Users size={14} style={{ color: '#8b5cf6' }} />
                        <span>{lang === 'ar' ? 'الأعضاء:' : 'Members:'} <strong>{team.members.join(', ')}</strong></span>
                    </div>
                )}
                {team.trainer && (
                    <div className="team-bar-item">
                        <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                        <span>{lang === 'ar' ? 'المشرف الأكاديمي:' : 'Supervisor:'} <strong>{team.trainer}</strong></span>
                    </div>
                )}
                {team.course && (
                    <div className="team-bar-item">
                        <BookOpen size={14} style={{ color: '#f59e0b' }} />
                        <span>{team.course}</span>
                    </div>
                )}
                {team.date && (
                    <div className="team-bar-item">
                        <Calendar size={14} style={{ color: '#64748b' }} />
                        <span>{team.date}</span>
                    </div>
                )}
            </div>

            {/* Academic Disclaimer Alert for AI Generated Proposals */}
            {(proposal?.source === 'custom_ai' || proposal?.source === 'groq_ai_generated' || !proposal?.catalog_project_id) && (
                <div style={{
                    margin: '0 0 1rem 0',
                    padding: '0.85rem 1.15rem',
                    borderRadius: '10px',
                    background: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                }}>
                    <AlertTriangle size={18} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.82rem', color: '#92400e', lineHeight: '1.5' }}>
                        <strong style={{ fontWeight: 700 }}>{lang === 'ar' ? 'تنويه وإخلاء مسؤولية: ' : 'Academic Disclaimer: '}</strong>
                        {lang === 'ar'
                            ? 'المحتوى المعروض تم توليده بواسطة الذكاء الاصطناعي كنموذج استرشادي، ويقع على عاتق الطالب مسؤولية مراجعته وتدقيقه قبل تقديمه للجهة الأكاديمية. المنصة غير مسؤولة عن أي أخطاء أو نواقص في التقرير النهائي.'
                            : 'The content displayed was generated by AI as an academic guideline model. It is the student\'s responsibility to review and refine it before academic submission. The platform assumes no liability for errors or omissions in the final report.'}
                    </div>
                </div>
            )}

            {/* Search & Filter Bar */}
            <div className="proposal-toolbar">
                <div className="proposal-search-box">
                    <Search size={15} style={{ color: '#64748b' }} />
                    <input
                        type="text"
                        placeholder={lang === 'ar' ? 'ابحث في محتوى أقسام الوثيقة...' : 'Search within sections and requirements...'}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>
                            <X size={13} />
                        </button>
                    )}
                </div>
                <div className="proposal-toolbar-stats">
                    <span>{lang === 'ar' ? `عرض ${sections.length} من أصل ${rawSections.length} قسم` : `Showing ${sections.length} of ${rawSections.length} sections`}</span>
                </div>
            </div>

            {/* Document Sections List */}
            <div className="proposal-sections-list">
                {sections.length === 0 ? (
                    <div className="no-sections-found">
                        <Search size={28} style={{ color: '#64748b', marginBottom: '0.5rem' }} />
                        <p>{lang === 'ar' ? 'لا توجد أقسام مطابقة للبحث' : 'No sections match your search query.'}</p>
                    </div>
                ) : (
                    sections.map((sec, idx) => {
                        const meta = getSectionMeta(sec.title || sec.key, idx);
                        const IconComponent = meta.icon;

                        return (
                            <div
                                key={sec.key || idx}
                                className="proposal-section-card"
                                id={`section-${sec.key}`}
                            >
                                <div className="section-card-header">
                                    <div className="section-number-title">
                                        <div className="section-icon-pill" style={{ background: `${meta.color}18`, color: meta.color, borderColor: `${meta.color}35` }}>
                                            <IconComponent size={16} />
                                        </div>
                                        <div className="section-title-wrap">
                                            <div className="section-tag-row">
                                                <span className="section-idx-badge">{idx + 1}</span>
                                                <span className="section-cat-tag" style={{ color: meta.color }}>{meta.tag}</span>
                                            </div>
                                            <h4>{sec.title || sec.key}</h4>
                                        </div>
                                    </div>

                                    <div className="section-actions">
                                        <button
                                            type="button"
                                            className="btn-sec-action"
                                            onClick={() => handleCopySection(sec.key, sec.content)}
                                            title={lang === 'ar' ? 'نسخ نص القسم' : 'Copy section text'}
                                        >
                                            {copiedSec === sec.key ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                                            <span>{copiedSec === sec.key ? (lang === 'ar' ? 'تم النسخ' : 'Copied') : (lang === 'ar' ? 'نسخ' : 'Copy')}</span>
                                        </button>

                                        {/* Direct Manual Edit */}
                                        {canEdit && (
                                            <button
                                                type="button"
                                                className="btn-manual-edit-section"
                                                onClick={() => handleOpenEdit(sec)}
                                                title={lang === 'ar' ? 'تعديل نص هذا القسم يدوياً' : 'Manually edit this section'}
                                            >
                                                <Edit3 size={13} />
                                                <span>{lang === 'ar' ? 'تعديل' : 'Edit'}</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="section-card-content">
                                    {sec.content ? (
                                        sec.content.split('\n').map((line, li) => {
                                            const trimmed = line.trim();
                                            if (!trimmed) return <div key={li} style={{ height: '0.6rem' }} />;
                                            
                                            // Check if bullet point or numbered item
                                            const isBullet = trimmed.startsWith('•') || trimmed.startsWith('-') || /^\(\d+\)/.test(trimmed) || /^\d+\./.test(trimmed);
                                            
                                            return (
                                                <p
                                                    key={li}
                                                    className={`section-paragraph ${isBullet ? 'bullet-item' : ''}`}
                                                >
                                                    {trimmed}
                                                </p>
                                            );
                                        })
                                    ) : (
                                        <em className="pending-text">
                                            {lang === 'ar' ? 'قيد التطوير والتنفيذ العملي...' : 'Pending implementation details...'}
                                        </em>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Manual Section Edit Modal */}
            {editingSection && canEdit && (
                <div className="manual-edit-modal-overlay" onClick={() => !savingEdit && setEditingSection(null)}>
                    <div className="manual-edit-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="manual-edit-modal-header">
                            <h4>
                                <Edit3 size={18} className="text-primary" />
                                <span>{lang === 'ar' ? `تعديل قسم: ${editingSection.title || editingSection.key}` : `Edit Section: ${editingSection.title || editingSection.key}`}</span>
                            </h4>
                            <button
                                type="button"
                                className="manual-edit-close-btn"
                                onClick={() => setEditingSection(null)}
                                disabled={savingEdit}
                                title={lang === 'ar' ? 'إغلاق' : 'Close'}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="manual-edit-modal-body">
                            {editError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{editError}</div>}
                            {editSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem' }}>{editSuccess}</div>}

                            <div className="manual-edit-label-row">
                                <label className="manual-edit-label">
                                    {lang === 'ar'
                                        ? 'محتوى القسم (يمكنك كتابة وتعديل النص بحرية):'
                                        : 'Section Content (edit text directly):'}
                                </label>
                                <span className="manual-edit-counter-badge">
                                    {editContent.length} {lang === 'ar' ? 'حرف' : 'chars'} • {editContent.trim() ? editContent.trim().split(/\s+/).filter(Boolean).length : 0} {lang === 'ar' ? 'كلمة' : 'words'}
                                </span>
                            </div>
                            <textarea
                                rows="12"
                                className="manual-edit-textarea"
                                placeholder={lang === 'ar' ? 'اكتب محتوى القسم هنا...' : 'Enter section content here...'}
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                            />
                        </div>

                        <div className="manual-edit-modal-footer">
                            <button
                                type="button"
                                className="manual-edit-cancel-btn"
                                onClick={() => setEditingSection(null)}
                                disabled={savingEdit}
                            >
                                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                className="manual-edit-save-btn"
                                onClick={handleSaveSectionEdit}
                                disabled={savingEdit}
                            >
                                {savingEdit ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
                                <span>{savingEdit ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
