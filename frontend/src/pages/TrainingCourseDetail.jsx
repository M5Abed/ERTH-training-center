import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    BookOpen, Users, Lightbulb, FileText, Award, Plus, Upload, 
    CheckCircle, XCircle, FileSpreadsheet, Sparkles, Download, 
    ExternalLink, Trash2, Edit3, Loader2, ArrowLeft, Video, Link as LinkIcon, X, FileCheck
} from 'lucide-react';
import './TrainingCourseDetail.css';

export default function TrainingCourseDetail() {
    const { id: courseId } = useParams();
    const { lang } = useI18n();
    const { user } = useAuth();
    
    const role = strtolowerRole(user?.role);
    const isAdmin = !!(user?.is_admin || role === 'admin');
    const isTrainer = role === 'trainer' || isAdmin;
    const isTrainee = !isTrainer;

    const [activeTab, setActiveTab] = useState('topics');
    const [course, setCourse] = useState(null);
    const [topics, setTopics] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [trainees, setTrainees] = useState([]);
    const [myIdea, setMyIdea] = useState(null);
    const [allIdeas, setAllIdeas] = useState([]);
    const [docs, setDocs] = useState([]);
    const [myEval, setMyEval] = useState(null);
    const [allEvals, setAllEvals] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals state
    const [showTopicModal, setShowTopicModal] = useState(false);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [selectedTopicId, setSelectedTopicId] = useState(null);
    const [selectedTraineeForEval, setSelectedTraineeForEval] = useState(null);

    // Form inputs state
    const [topicTitleEn, setTopicTitleEn] = useState('');
    const [topicTitleAr, setTopicTitleAr] = useState('');
    const [topicDescEn, setTopicDescEn] = useState('');

    // Material Upload inputs
    const [matTitleEn, setMatTitleEn] = useState('');
    const [matType, setMatType] = useState('pdf');
    const [matFile, setMatFile] = useState(null);
    const [matUrl, setMatUrl] = useState('');

    // Excel import state
    const [excelFile, setExcelFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);

    // Trainee Idea Form state
    const [ideaTitleEn, setIdeaTitleEn] = useState('');
    const [ideaDescEn, setIdeaDescEn] = useState('');
    const [techStack, setTechStack] = useState('');
    const [problemStmt, setProblemStmt] = useState('');
    const [expectedOutput, setExpectedOutput] = useState('');
    const [aiKeyword, setAiKeyword] = useState('');
    const [generatingAi, setGeneratingAi] = useState(false);
    const [submittingIdea, setSubmittingIdea] = useState(false);

    // Trainer Evaluation Form state
    const [evalScore, setEvalScore] = useState(85);
    const [evalStatus, setEvalStatus] = useState('pass');
    const [evalFeedback, setEvalFeedback] = useState('');
    const [submittingEval, setSubmittingEval] = useState(false);

    // Doc upload
    const [docType, setDocType] = useState('srs');
    const [docFile, setDocFile] = useState(null);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    useEffect(() => {
        loadCourseDetail();
    }, [courseId]);

    const loadCourseDetail = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/training/courses/get.php?id=${courseId}`);
            const data = await res.json();
            if (res.ok && data.course) {
                setCourse(data.course);
                setTopics(data.topics || []);
                setTrainers(data.trainers || []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'trainees' && isTrainer) {
            fetchTrainees();
        } else if (activeTab === 'idea') {
            fetchIdeas();
        } else if (activeTab === 'docs') {
            fetchDocs();
        } else if (activeTab === 'evaluations') {
            fetchEvals();
        }
    }, [activeTab]);

    const fetchTrainees = async () => {
        try {
            const res = await fetch(`/api/training/enrollments/list.php?course_id=${courseId}`);
            const data = await res.json();
            if (res.ok) setTrainees(data.trainees || []);
        } catch (e) { console.error(e); }
    };

    const fetchIdeas = async () => {
        try {
            const res = await fetch(`/api/training/ideas/get.php?course_id=${courseId}`);
            const data = await res.json();
            if (res.ok) {
                if (isTrainee) {
                    setMyIdea(data.idea || null);
                    if (data.idea) {
                        setIdeaTitleEn(data.idea.title_en || '');
                        setIdeaDescEn(data.idea.description_en || '');
                        setTechStack(data.idea.tech_stack || '');
                        setProblemStmt(data.idea.problem_statement || '');
                        setExpectedOutput(data.idea.expected_output || '');
                    }
                } else {
                    setAllIdeas(data.ideas || []);
                }
            }
        } catch (e) { console.error(e); }
    };

    const fetchDocs = async () => {
        try {
            const res = await fetch(`/api/training/docs/list.php?course_id=${courseId}`);
            const data = await res.json();
            if (res.ok) setDocs(data.docs || []);
        } catch (e) { console.error(e); }
    };

    const fetchEvals = async () => {
        try {
            if (isTrainee) {
                const res = await fetch(`/api/training/evaluations/get.php?course_id=${courseId}`);
                const data = await res.json();
                if (res.ok) setMyEval(data.evaluation);
            } else {
                const res = await fetch(`/api/training/evaluations/list.php?course_id=${courseId}`);
                const data = await res.json();
                if (res.ok) setAllEvals(data.evaluations || []);
            }
        } catch (e) { console.error(e); }
    };

    // Actions
    const handleAddTopic = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/training/topics/create.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseId,
                    title_en: topicTitleEn,
                    title_ar: topicTitleEn,
                    description_en: topicDescEn
                })
            });
            if (res.ok) {
                setShowTopicModal(false);
                setTopicTitleEn(''); setTopicDescEn('');
                loadCourseDetail();
            }
        } catch (e) { console.error(e); }
    };

    const handleUploadMaterial = async (e) => {
        e.preventDefault();
        if (!selectedTopicId) return;

        if (matType === 'url' || matType === 'youtube') {
            try {
                const res = await fetch('/api/training/content/add_url.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic_id: selectedTopicId,
                        title_en: matTitleEn,
                        url: matUrl,
                        type: matType
                    })
                });
                if (res.ok) {
                    setShowMaterialModal(false);
                    setMatTitleEn(''); setMatUrl('');
                    loadCourseDetail();
                }
            } catch (e) { console.error(e); }
        } else {
            if (!matFile) return;
            const formData = new FormData();
            formData.append('topic_id', selectedTopicId);
            formData.append('title_en', matTitleEn);
            formData.append('type', matType);
            formData.append('file', matFile);

            try {
                const res = await fetch('/api/training/content/upload.php', {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    setShowMaterialModal(false);
                    setMatTitleEn(''); setMatFile(null);
                    loadCourseDetail();
                }
            } catch (e) { console.error(e); }
        }
    };

    const handleExcelImport = async (e) => {
        e.preventDefault();
        if (!excelFile) return;
        setImporting(true);
        setImportResult(null);

        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('excel_file', excelFile);

        try {
            const res = await fetch('/api/training/enrollments/import_excel.php', {
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

    const handleGenerateAiProposal = async () => {
        if (!aiKeyword) return;
        setGeneratingAi(true);
        try {
            const res = await fetch('/api/training/ideas/ai_generate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: aiKeyword })
            });
            const data = await res.json();
            if (res.ok && data.proposal) {
                setIdeaTitleEn(data.proposal.title_en);
                setIdeaDescEn(data.proposal.description_en);
                setProblemStmt(data.proposal.problem_statement);
                setTechStack(data.proposal.tech_stack);
                setExpectedOutput(data.proposal.expected_output);
            }
        } catch (e) { console.error(e); }
        finally { setGeneratingAi(false); }
    };

    const handleSubmitIdea = async (e) => {
        e.preventDefault();
        setSubmittingIdea(true);
        try {
            const res = await fetch('/api/training/ideas/submit.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseId,
                    title_en: ideaTitleEn,
                    description_en: ideaDescEn,
                    tech_stack: techStack,
                    problem_statement: problemStmt,
                    expected_output: expectedOutput
                })
            });
            if (res.ok) fetchIdeas();
        } catch (e) { console.error(e); }
        finally { setSubmittingIdea(false); }
    };

    const handleEvaluateIdea = async (ideaId, status, feedback) => {
        try {
            await fetch('/api/training/ideas/evaluate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea_id: ideaId, status, feedback })
            });
            fetchIdeas();
        } catch (e) { console.error(e); }
    };

    const handleUploadDoc = async (e) => {
        e.preventDefault();
        if (!docFile) return;
        setUploadingDoc(true);

        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('doc_type', docType);
        formData.append('file', docFile);

        try {
            const res = await fetch('/api/training/docs/upload.php', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                setDocFile(null);
                fetchDocs();
            }
        } catch (e) { console.error(e); }
        finally { setUploadingDoc(false); }
    };

    const handleSubmitEvaluation = async (e) => {
        e.preventDefault();
        if (!selectedTraineeForEval) return;
        setSubmittingEval(true);

        try {
            const res = await fetch('/api/training/evaluations/submit.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseId,
                    trainee_id: selectedTraineeForEval,
                    final_score: evalScore,
                    status: evalStatus,
                    feedback: evalFeedback
                })
            });
            if (res.ok) {
                setSelectedTraineeForEval(null);
                fetchEvals();
            }
        } catch (e) { console.error(e); }
        finally { setSubmittingEval(false); }
    };

    function strtolowerRole(r) { return (r || '').toLowerCase(); }

    if (loading) {
        return (
            <div className="container loader-container" style={{ padding: '5rem 0' }}>
                <Loader2 className="spin" size={32} />
            </div>
        );
    }

    if (!course) {
        return (
            <div className="container" style={{ padding: '3rem 0' }}>
                <h2>Course Not Found</h2>
                <Link to="/courses" className="btn btn-outline" style={{ marginTop: '1rem' }}>
                    <ArrowLeft size={16} /> Back to Courses
                </Link>
            </div>
        );
    }

    return (
        <div className="course-detail-page container">
            <Link to="/courses" className="back-link">
                <ArrowLeft size={16} /> {lang === 'ar' ? 'العودة للدورات' : 'Back to Courses'}
            </Link>

            <div className="course-header-card">
                <div>
                    <h1>{lang === 'ar' && course.name_ar ? course.name_ar : course.name_en}</h1>
                    <p>{lang === 'ar' && course.description_ar ? course.description_ar : course.description_en}</p>
                </div>
                {isTrainer && (
                    <button className="btn btn-outline" onClick={() => setShowExcelModal(true)}>
                        <FileSpreadsheet size={18} />
                        {lang === 'ar' ? 'استيراد كشف المتدربين (Excel)' : 'Import Trainees (Excel)'}
                    </button>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="tabs-nav">
                <button className={`tab-btn ${activeTab === 'topics' ? 'active' : ''}`} onClick={() => setActiveTab('topics')}>
                    <BookOpen size={16} /> {lang === 'ar' ? 'المواضيع والمواد' : 'Topics & Materials'}
                </button>
                <button className={`tab-btn ${activeTab === 'trainees' ? 'active' : ''}`} onClick={() => setActiveTab('trainees')}>
                    <Users size={16} /> {lang === 'ar' ? 'المتدربين' : 'Trainees'}
                </button>
                <button className={`tab-btn ${activeTab === 'idea' ? 'active' : ''}`} onClick={() => setActiveTab('idea')}>
                    <Lightbulb size={16} /> {lang === 'ar' ? 'فكرة المشروعات' : 'Project Idea'}
                </button>
                <button className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>
                    <FileText size={16} /> {lang === 'ar' ? 'المستندات' : 'Documentation'}
                </button>
                <button className={`tab-btn ${activeTab === 'evaluations' ? 'active' : ''}`} onClick={() => setActiveTab('evaluations')}>
                    <Award size={16} /> {lang === 'ar' ? 'التقييم والدرجات' : 'Evaluations'}
                </button>
            </div>

            {/* Tab 1: Topics & Materials */}
            {activeTab === 'topics' && (
                <div className="tab-content">
                    <div className="tab-action-bar">
                        <h3>{lang === 'ar' ? 'المواضيع والمواد التدريبية' : 'Topics & Training Materials'}</h3>
                        {isTrainer && (
                            <button className="btn btn-primary btn-sm" onClick={() => setShowTopicModal(true)}>
                                <Plus size={16} /> {lang === 'ar' ? 'إضافة موضوع جديد' : 'Add Topic'}
                            </button>
                        )}
                    </div>

                    {topics.length === 0 ? (
                        <div className="empty-tab">
                            <BookOpen size={36} />
                            <p>{lang === 'ar' ? 'لا توجد مواضيع مضافة في هذه الدورة بعد.' : 'No topics created in this course yet.'}</p>
                        </div>
                    ) : (
                        <div className="topics-list">
                            {topics.map((t, idx) => (
                                <div key={t.id} className="topic-card">
                                    <div className="topic-header">
                                        <div className="topic-num">{idx + 1}</div>
                                        <div style={{ flex: 1 }}>
                                            <h4>{t.title_en} {t.title_ar ? `( ${t.title_ar} )` : ''}</h4>
                                            {t.description_en && <p className="topic-desc">{t.description_en}</p>}
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {isTrainee && (
                                                <button
                                                    className={`btn btn-sm ${t.viewed ? 'btn-success' : 'btn-outline'}`}
                                                    onClick={async () => {
                                                        try {
                                                            await fetch('/api/training/progress/mark.php', {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ topic_id: t.id })
                                                            });
                                                            loadCourseDetail();
                                                        } catch (e) { console.error(e); }
                                                    }}
                                                >
                                                    <CheckCircle size={14} />
                                                    {t.viewed ? (lang === 'ar' ? 'تم الاطلاع' : 'Completed') : (lang === 'ar' ? 'تحديد كمكتمل' : 'Mark as Viewed')}
                                                </button>
                                            )}

                                            {isTrainer && (
                                                <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedTopicId(t.id); setShowMaterialModal(true); }}>
                                                    <Upload size={14} /> {lang === 'ar' ? 'رفع مادة' : 'Upload Material'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Topic Materials List */}
                                    {t.materials && t.materials.length > 0 && (
                                        <div className="materials-list" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                            <h5 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                                {lang === 'ar' ? 'المواد المرفقة' : 'Attached Materials'} ({t.materials.length})
                                            </h5>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {t.materials.map(mat => (
                                                    <div key={mat.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                                                        {mat.type === 'video' || mat.type === 'youtube' ? <Video size={16} style={{ color: '#ef4444' }} /> :
                                                         mat.type === 'url' ? <LinkIcon size={16} style={{ color: '#2563eb' }} /> :
                                                         <FileText size={16} style={{ color: '#f59e0b' }} />}

                                                        <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{mat.title_en}</span>
                                                        <span className="source-tag" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>{mat.type}</span>

                                                        <a
                                                            href={mat.url || mat.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ gap: '0.25rem' }}
                                                        >
                                                            <ExternalLink size={14} /> {lang === 'ar' ? 'فتح' : 'View'}
                                                        </a>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Trainees & Excel Import */}
            {activeTab === 'trainees' && (
                <div className="tab-content">
                    <div className="tab-action-bar">
                        <h3>{lang === 'ar' ? 'كشف المتدربين المقيدين' : 'Enrolled Trainees'}</h3>
                        {isTrainer && (
                            <button className="btn btn-primary btn-sm" onClick={() => setShowExcelModal(true)}>
                                <FileSpreadsheet size={16} /> {lang === 'ar' ? 'استيراد ملف Excel' : 'Import Excel'}
                            </button>
                        )}
                    </div>

                    {trainees.length === 0 ? (
                        <div className="empty-tab">
                            <Users size={36} />
                            <p>{lang === 'ar' ? 'لا يوجد متدربون مقيدون بعد.' : 'No trainees enrolled yet.'}</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                                    <th>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                                    <th>{lang === 'ar' ? 'الرقم الجامعي' : 'Student ID'}</th>
                                    <th>{lang === 'ar' ? 'المصدر' : 'Source'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trainees.map((tr, idx) => (
                                    <tr key={tr.trainee_id}>
                                        <td>{idx + 1}</td>
                                        <td><strong>{tr.full_name_en}</strong></td>
                                        <td>{tr.email}</td>
                                        <td>{tr.student_id || '-'}</td>
                                        <td><span className="source-tag">{tr.source}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Tab 3: Trainee Project Idea */}
            {activeTab === 'idea' && (
                <div className="tab-content">
                    {isTrainee ? (
                        <div className="idea-submission-box">
                            <div className="box-header">
                                <h3>{lang === 'ar' ? 'تقديم فكرة المشروع التدريبي' : 'Training Project Idea Submission'}</h3>
                                <button className="btn btn-outline btn-sm" onClick={handleGenerateAiProposal} disabled={generatingAi}>
                                    <Sparkles size={16} /> {generatingAi ? 'Generating...' : 'AI Proposal Generator'}
                                </button>
                            </div>

                            <div className="ai-box">
                                <label>{lang === 'ar' ? 'مساعد الذكاء الاصطناعي (أدخل الكلمات المفتاحية):' : 'AI Assistant (Enter project topic / keywords):'}</label>
                                <div className="ai-input-row">
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Smart E-Learning Platform for University"
                                        value={aiKeyword}
                                        onChange={e => setAiKeyword(e.target.value)}
                                    />
                                    <button className="btn btn-primary btn-sm" onClick={handleGenerateAiProposal} disabled={generatingAi}>
                                        <Sparkles size={16} /> Generate
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmitIdea}>
                                <div className="form-group">
                                    <label>Project Title (English) *</label>
                                    <input type="text" required value={ideaTitleEn} onChange={e => setIdeaTitleEn(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Project Description *</label>
                                    <textarea rows="4" required value={ideaDescEn} onChange={e => setIdeaDescEn(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Target Tech Stack</label>
                                    <input type="text" value={techStack} onChange={e => setTechStack(e.target.value)} placeholder="React, PHP, MySQL, Docker..." />
                                </div>
                                <div className="form-group">
                                    <label>Problem Statement</label>
                                    <textarea rows="3" value={problemStmt} onChange={e => setProblemStmt(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>Expected Output</label>
                                    <textarea rows="3" value={expectedOutput} onChange={e => setExpectedOutput(e.target.value)} />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={submittingIdea}>
                                    {submittingIdea ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'حفظ وإرسال الفكرة' : 'Save & Submit Idea')}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="ideas-review-list">
                            <h3>{lang === 'ar' ? 'مقترحات أفكار المتدربين' : 'Trainee Submitted Ideas'}</h3>
                            {allIdeas.length === 0 ? (
                                <div className="empty-tab">
                                    <Lightbulb size={36} />
                                    <p>No ideas submitted yet.</p>
                                </div>
                            ) : (
                                allIdeas.map(idea => (
                                    <div key={idea.id} className="idea-card">
                                        <div className="idea-card-header">
                                            <h4>{idea.title_en}</h4>
                                            <span className={`status-badge status-${idea.status}`}>{idea.status}</span>
                                        </div>
                                        <p className="idea-author">Submitted by: <strong>{idea.trainee_name}</strong> ({idea.trainee_email})</p>
                                        <p className="idea-body">{idea.description_en}</p>

                                        <div className="idea-actions">
                                            <button className="btn btn-success btn-sm" onClick={() => handleEvaluateIdea(idea.id, 'approved', 'Great proposal!')}>
                                                <CheckCircle size={14} /> Approve
                                            </button>
                                            <button className="btn btn-danger btn-sm" onClick={() => handleEvaluateIdea(idea.id, 'rejected', 'Needs modification.')}>
                                                <XCircle size={14} /> Reject
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 4: Documentation Upload */}
            {activeTab === 'docs' && (
                <div className="tab-content">
                    {isTrainee && (
                        <div className="doc-upload-box">
                            <h3>{lang === 'ar' ? 'رفع توثيق وتقارير المشروع' : 'Upload Project Documentation'}</h3>
                            <form onSubmit={handleUploadDoc} className="doc-form">
                                <div className="form-group">
                                    <label>Document Type</label>
                                    <select value={docType} onChange={e => setDocType(e.target.value)}>
                                        <option value="srs">SRS / System Architecture</option>
                                        <option value="report">Final Training Report</option>
                                        <option value="presentation">Presentation Slides (PPTX)</option>
                                        <option value="code_zip">Source Code Archive (ZIP)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Select File (PDF, DOCX, ZIP, PPTX)</label>
                                    <input type="file" required onChange={e => setDocFile(e.target.files[0])} />
                                </div>
                                <button type="submit" className="btn btn-primary" disabled={uploadingDoc}>
                                    {uploadingDoc ? <Loader2 className="spin" size={16} /> : 'Upload Document'}
                                </button>
                            </form>
                        </div>
                    )}

                    <div className="docs-list">
                        <h4>{lang === 'ar' ? 'الملفات المرفوعة' : 'Uploaded Files'}</h4>
                        {docs.length === 0 ? (
                            <p className="text-muted">No documents uploaded yet.</p>
                        ) : (
                            <ul className="docs-ul">
                                {docs.map(d => (
                                    <li key={d.id} className="doc-li">
                                        <FileText size={18} />
                                        <div className="doc-info">
                                            <strong>{d.file_name}</strong>
                                            <span className="doc-meta">{d.doc_type} | {d.uploaded_at}</span>
                                        </div>
                                        <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                                            <Download size={14} /> Download
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* Tab 5: Evaluations */}
            {activeTab === 'evaluations' && (
                <div className="tab-content">
                    {isTrainee ? (
                        <div className="eval-result-card">
                            <h3>{lang === 'ar' ? 'نتيجة تقييم التدريب الصيفي' : 'Summer Training Final Evaluation'}</h3>
                            {myEval ? (
                                <div className="eval-details">
                                    <div className="score-badge">{myEval.final_score} / 100</div>
                                    <p className={`status-text status-${myEval.status}`}>Status: <strong>{myEval.status.toUpperCase()}</strong></p>
                                    {myEval.feedback && <p className="eval-feedback">Feedback: "{myEval.feedback}"</p>}
                                    <p className="eval-meta">Evaluated by: {myEval.evaluator_name || 'Trainer'} on {myEval.evaluated_at}</p>
                                </div>
                            ) : (
                                <p className="text-muted">Your training evaluation has not been entered yet.</p>
                            )}
                        </div>
                    ) : (
                        <div className="evals-trainer-view">
                            <h3>{lang === 'ar' ? 'تقييم درجات المتدربين' : 'Grade & Evaluate Trainees'}</h3>
                            <div className="eval-form-box">
                                <h4>Submit Trainee Grade</h4>
                                <form onSubmit={handleSubmitEvaluation}>
                                    <div className="form-group">
                                        <label>Select Trainee</label>
                                        <select required value={selectedTraineeForEval || ''} onChange={e => setSelectedTraineeForEval(e.target.value)}>
                                            <option value="">-- Choose Trainee --</option>
                                            {trainees.map(tr => (
                                                <option key={tr.trainee_id} value={tr.trainee_id}>
                                                    {tr.full_name_en} ({tr.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label>Final Score (0 - 100)</label>
                                            <input type="number" min="0" max="100" required value={evalScore} onChange={e => setEvalScore(e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <label>Evaluation Status</label>
                                            <select value={evalStatus} onChange={e => setEvalStatus(e.target.value)}>
                                                <option value="pass">PASS</option>
                                                <option value="fail">FAIL</option>
                                                <option value="needs_revision">NEEDS REVISION</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Trainer Feedback & Notes</label>
                                        <textarea rows="3" value={evalFeedback} onChange={e => setEvalFeedback(e.target.value)} placeholder="Constructive feedback for the trainee..." />
                                    </div>
                                    <button type="submit" className="btn btn-primary" disabled={submittingEval}>
                                        {submittingEval ? <Loader2 className="spin" size={16} /> : 'Save Grade'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
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
                                    {lang === 'ar' ? 'استيراد كشف المتدربين من Excel' : 'Import Trainees via Excel'}
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
                                <label>{lang === 'ar' ? 'ملف Excel (.xlsx, .xls) *' : 'Excel File (.xlsx, .xls) *'}</label>
                                <div className="custom-file-dropzone">
                                    <input type="file" accept=".xlsx,.xls,.csv" required onChange={e => setExcelFile(e.target.files[0])} />
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

            {/* Add Topic Modal */}
            {showTopicModal && (
                <div className="modal-overlay" onClick={() => setShowTopicModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-row">
                            <div>
                                <h2>
                                    <Plus size={22} className="text-primary" />
                                    {lang === 'ar' ? 'إضافة موضوع جديد' : 'Add New Topic'}
                                </h2>
                                <p className="hint-text">
                                    {lang === 'ar' ? 'أدخل عنوان وخطة الموضوع التدريبي الجديد' : 'Create a new training topic for this course'}
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowTopicModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddTopic} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'عنوان الموضوع *' : 'Topic Title *'}</label>
                                <input
                                    type="text"
                                    required
                                    value={topicTitleEn}
                                    onChange={e => setTopicTitleEn(e.target.value)}
                                    placeholder={lang === 'ar' ? 'مثال: مقدمة في React / Intro to React' : 'e.g. Intro to React / مقدمة في React'}
                                />
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'وصف الموضوع' : 'Topic Description'}</label>
                                <textarea rows="3" value={topicDescEn} onChange={e => setTopicDescEn(e.target.value)} placeholder={lang === 'ar' ? 'وصف أو أهداف الموضوع...' : 'Summary or objectives...'} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowTopicModal(false)}>{lang === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                                <button type="submit" className="btn btn-primary">{lang === 'ar' ? 'حفظ الموضوع' : 'Save Topic'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Material Modal */}
            {showMaterialModal && (
                <div className="modal-overlay" onClick={() => setShowMaterialModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-row">
                            <div>
                                <h2>
                                    <Upload size={22} className="text-primary" />
                                    {lang === 'ar' ? 'رفع مادة تعليمية للموضوع' : 'Upload Material to Topic'}
                                </h2>
                                <p className="hint-text">
                                    {lang === 'ar' ? 'اختر نوع المادة (ملف PDF، مستند، فيديو، أو رابط خارجي)' : 'Choose material type (PDF, Word, Video or Link)'}
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowMaterialModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleUploadMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'عنوان المادة *' : 'Material Title *'}</label>
                                <input type="text" required value={matTitleEn} onChange={e => setMatTitleEn(e.target.value)} placeholder={lang === 'ar' ? 'مثال: محتوى المحاضرة الأولى PDF' : 'e.g. Lecture 1 PDF'} />
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'نوع المادة *' : 'Material Type *'}</label>
                                <select value={matType} onChange={e => setMatType(e.target.value)}>
                                    <option value="pdf">PDF Document</option>
                                    <option value="word">Word Document</option>
                                    <option value="video">Video (MP4)</option>
                                    <option value="url">External Link</option>
                                    <option value="youtube">YouTube Video</option>
                                </select>
                            </div>

                            {matType === 'url' || matType === 'youtube' ? (
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'الرابط الإلكتروني *' : 'URL / Link *'}</label>
                                    <input type="url" required value={matUrl} onChange={e => setMatUrl(e.target.value)} placeholder="https://..." />
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'رفع الملف *' : 'File Upload *'}</label>
                                    <div className="custom-file-dropzone">
                                        <input type="file" required onChange={e => setMatFile(e.target.files[0])} />
                                        <div className="custom-file-icon">
                                            <Upload size={22} />
                                        </div>
                                        <span className="custom-file-label">
                                            {lang === 'ar' ? 'اضغط هنا لرفع الملف أو اسحبه إلى هنا' : 'Click to upload or drag and drop file'}
                                        </span>
                                        <span className="custom-file-subtext">PDF, DOCX, MP4 (Max 50MB)</span>
                                        {matFile && (
                                            <div className="custom-file-name-pill">
                                                <FileCheck size={14} />
                                                {matFile.name}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowMaterialModal(false)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {lang === 'ar' ? 'حفظ المادة' : 'Save Material'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
