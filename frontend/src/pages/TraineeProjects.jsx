import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { Search, Filter, CheckCircle2, XCircle, AlertCircle, Clock, FileText, Send, User, BookOpen, Loader2, Sparkles, Plus, Edit3, X, Vote, ThumbsUp, ThumbsDown, Users, Trash2, Paperclip, Upload, Download, ExternalLink, Code, UserCheck } from 'lucide-react';
import './TraineeProjects.css';

export default function TraineeProjects() {
    const { lang } = useI18n();
    const { user, profile } = useAuth();
    const role = user?.role || profile?.role || 'trainee';
    const isAdmin = !!(user?.is_admin || role === 'admin' || profile?.is_admin);
    const isTrainer = role === 'trainer';
    const isEvaluator = isAdmin || isTrainer;

    const [projects, setProjects] = useState([]);
    const [courses, setCourses] = useState([]);
    const [allActiveCourses, setAllActiveCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal / Review state for Evaluators
    const [activeProject, setActiveProject] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [evaluating, setEvaluating] = useState(false);
    const [evalSuccess, setEvalSuccess] = useState('');
    const [deletingIdea, setDeletingIdea] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);

    // Project Documents & Links state
    const [projectDocs, setProjectDocs] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [showDocUploadModal, setShowDocUploadModal] = useState(false);
    const [docMode, setDocMode] = useState('file'); // 'file' or 'link'
    const [docType, setDocType] = useState('report');
    const [docFile, setDocFile] = useState(null);
    const [docLinkUrl, setDocLinkUrl] = useState('');
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [docError, setDocError] = useState('');
    const [completingProject, setCompletingProject] = useState(false);

    // Voting state
    const [voting, setVoting] = useState(false);
    const [voteNotes, setVoteNotes] = useState('');

    // Submission Modal state for Trainees
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [editingIdeaId, setEditingIdeaId] = useState(null);
    const [submitCourseId, setSubmitCourseId] = useState('');
    const [submitTitleEn, setSubmitTitleEn] = useState('');
    const [submitDescEn, setSubmitDescEn] = useState('');
    const [submitTechStack, setSubmitTechStack] = useState('');
    const [submitProblemStmt, setSubmitProblemStmt] = useState('');
    const [submitExpectedOutput, setSubmitExpectedOutput] = useState('');
    const [aiKeyword, setAiKeyword] = useState('');
    const [generatingAi, setGeneratingAi] = useState(false);
    const [submittingIdea, setSubmittingIdea] = useState(false);

    useEffect(() => {
        fetchCourses();
        fetchProjects();
    }, [selectedCourse, selectedStatus]);

    const fetchCourses = async () => {
        try {
            const res = await fetch('/api/training/courses/list.php');
            const data = await res.json();
            if (res.ok && data.courses) {
                setCourses(data.courses);
            }
        } catch (e) {
            console.error('Error fetching courses:', e);
        }
    };

    const fetchActiveCourses = async () => {
        try {
            const url = isEvaluator ? '/api/training/courses/list.php?all=1' : '/api/training/courses/list.php';
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok && data.courses) {
                setAllActiveCourses(data.courses);
                if (!isEvaluator) {
                    setCourses(data.courses);
                }
                if (data.courses.length > 0) {
                    setSubmitCourseId(prev => (prev ? prev : data.courses[0].id));
                }
            }
        } catch (e) {
            console.error('Error fetching active courses:', e);
        }
    };

    const fetchProjects = async () => {
        setLoading(true);
        setError('');
        try {
            let url = '/api/training/ideas/list.php?';
            if (selectedCourse) url += `course_id=${selectedCourse}&`;
            if (selectedStatus) url += `status=${selectedStatus}&`;

            const res = await fetch(url);
            const data = await res.json();
            if (res.ok && data.ideas) {
                setProjects(data.ideas);
            } else {
                setError(data.error || 'Failed to load submitted projects');
            }
        } catch (e) {
            setError('Connection error while fetching projects');
        } finally {
            setLoading(false);
        }
    };

    const openSubmitModal = (idea = null) => {
        setError('');
        if (idea) {
            setEditingIdeaId(idea.id);
            setSubmitCourseId(idea.course_id);
            setSubmitTitleEn(idea.title || '');
            setSubmitDescEn(idea.description || '');
            setSubmitTechStack(idea.tech_stack || '');
            setSubmitProblemStmt(idea.problem_statement || '');
            setSubmitExpectedOutput(idea.expected_output || '');
        } else {
            setEditingIdeaId(null);
            const defaultList = isEvaluator ? (allActiveCourses.length > 0 ? allActiveCourses : courses) : courses;
            setSubmitCourseId(defaultList.length > 0 ? defaultList[0].id : '');
            setSubmitTitleEn('');
            setSubmitDescEn('');
            setSubmitTechStack('');
            setSubmitProblemStmt('');
            setSubmitExpectedOutput('');
        }
        setShowSubmitModal(true);
        fetchActiveCourses();
    };

    const handleGenerateAiProposal = async () => {
        if (!aiKeyword.trim()) return;
        setGeneratingAi(true);
        try {
            const res = await fetch('/api/training/ideas/ai_generate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: aiKeyword })
            });
            const data = await res.json();
            if (res.ok && data.proposal) {
                setSubmitTitleEn(data.proposal.title || '');
                setSubmitDescEn(data.proposal.description || '');
                setSubmitProblemStmt(data.proposal.problem_statement || '');
                setSubmitTechStack(data.proposal.tech_stack || '');
                setSubmitExpectedOutput(data.proposal.expected_output || '');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setGeneratingAi(false);
        }
    };

    const handleSubmitIdea = async (e) => {
        e.preventDefault();
        if (!submitCourseId || !submitTitleEn.trim() || !submitDescEn.trim()) {
            setError(lang === 'ar' ? 'يرجى اختيار الدورة التدريبية وملء عنوان المشروع والوصف' : 'Please choose a course and fill in title and description');
            return;
        }
        setSubmittingIdea(true);
        setError('');
        try {
            const res = await fetch('/api/training/ideas/submit.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: submitCourseId,
                    title: submitTitleEn,
                    description: submitDescEn,
                    tech_stack: submitTechStack,
                    problem_statement: submitProblemStmt,
                    expected_output: submitExpectedOutput
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setShowSubmitModal(false);
                fetchProjects();
            } else {
                setError(data.error || 'Failed to submit idea');
            }
        } catch (e) {
            setError('Error submitting project idea');
        } finally {
            setSubmittingIdea(false);
        }
    };

    const fetchIdeaDocs = async (ideaId) => {
        if (!ideaId) return;
        setLoadingDocs(true);
        try {
            const res = await fetch(`/api/training/docs/list.php?idea_id=${ideaId}`);
            const data = await res.json();
            if (res.ok && data.docs) {
                setProjectDocs(data.docs);
            }
        } catch (e) {
            console.error("Error loading project docs:", e);
        } finally {
            setLoadingDocs(false);
        }
    };

    const handleUploadDocOrLink = async (e) => {
        e.preventDefault();
        if (!activeProject?.id) return;
        setUploadingDoc(true);
        setDocError('');

        try {
            const formData = new FormData();
            formData.append('idea_id', activeProject.id);
            formData.append('course_id', activeProject.course_id || '');
            formData.append('doc_type', docType);

            if (docMode === 'link') {
                if (!docLinkUrl) {
                    setDocError(lang === 'ar' ? 'يرجى إدخال الرابط' : 'Please enter a URL');
                    setUploadingDoc(false);
                    return;
                }
                formData.append('url', docLinkUrl);
            } else {
                if (!docFile) {
                    setDocError(lang === 'ar' ? 'يرجى اختيار ملف مرفق' : 'Please select a file to upload');
                    setUploadingDoc(false);
                    return;
                }
                formData.append('file', docFile);
            }

            const res = await fetch('/api/training/docs/upload.php', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setShowDocUploadModal(false);
                setDocFile(null);
                setDocLinkUrl('');
                fetchIdeaDocs(activeProject.id);
            } else {
                setDocError(data.error || 'Failed to upload document');
            }
        } catch (err) {
            setDocError('Error uploading document');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleMarkAsFinished = async (ideaId) => {
        if (!ideaId) return;
        if (!window.confirm(lang === 'ar' ? 'هل أنت تأكد من أنك أكملت جميع تسليمات المشروع وتريد تحديده كـ مكتمل؟' : 'Are you sure you have uploaded all deliverables and want to mark this project as finished?')) {
            return;
        }
        setCompletingProject(true);
        try {
            const res = await fetch('/api/training/ideas/complete.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea_id: ideaId })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setActiveProject(prev => prev ? { ...prev, status: 'completed' } : null);
                fetchIdeas();
            } else {
                alert(data.error || 'Failed to mark project as finished');
            }
        } catch (err) {
            alert('Error completing project');
        } finally {
            setCompletingProject(false);
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا التوثيق/الرابط؟' : 'Are you sure you want to delete this document/link?')) return;
        try {
            const res = await fetch('/api/training/docs/delete.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: docId }) // FIXED: sending id instead of doc_id
            });
            
            let data;
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const text = await res.text();
                try {
                    data = JSON.parse(text);
                } catch (_) {
                    console.error('Delete response was not JSON:', res.status, text.substring(0, 300));
                    alert('Server Error (' + res.status + '): ' + (text.substring(0, 200) || 'Empty response'));
                    return;
                }
            }

            if (res.ok && data.success) {
                alert(lang === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully');
                fetchIdeaDocs(activeProject.id);
            } else {
                alert(data.error || (lang === 'ar' ? 'فشل الحذف' : 'Failed to delete'));
            }
        } catch (e) {
            console.error(e);
            alert(lang === 'ar' ? 'حدث خطأ في الاتصال بالخادم' : 'Network error: Could not reach the server.');
        }
    };

    const handleDeleteIdea = (e, ideaIdToDelete) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const id = ideaIdToDelete || editingIdeaId || activeProject?.id;
        if (!id) return;
        setConfirmDeleteId(id);
    };

    const executeDeleteIdea = async (id) => {
        if (!id) return;
        setDeletingIdea(true);
        setError('');

        try {
            const res = await fetch('/api/training/ideas/delete.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea_id: id })
            });
            const text = await res.text();
            let data = {};
            try { 
                data = JSON.parse(text); 
            } catch (err) { 
                console.error("Non-JSON delete response:", text);
                data = { error: text || 'Server returned an invalid response' }; 
            }

            if (res.ok && data.success) {
                setConfirmDeleteId(null);
                setShowSubmitModal(false);
                if (activeProject && (activeProject.id === id || activeProject.id === parseInt(id))) {
                    setActiveProject(null);
                }
                await fetchProjects();
            } else {
                setError(data.error || 'Failed to delete project idea');
            }
        } catch (e) {
            console.error("Delete Exception:", e);
            setError('Error deleting project idea');
        } finally {
            setDeletingIdea(false);
        }
    };

    const handleEvaluate = async (newStatus) => {
        if (!activeProject) return;
        setEvaluating(true);
        setEvalSuccess('');
        setError('');

        try {
            const res = await fetch('/api/training/ideas/evaluate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea_id: activeProject.id,
                    status: newStatus,
                    feedback: feedback || voteNotes
                })
            });
            const text = await res.text();
            let data = {};
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error("Non-JSON evaluate API response:", text);
                setError(lang === 'ar' ? 'خطأ في الخادم أثناء التقييم' : 'Server error while evaluating project');
                return;
            }

            if (res.ok && data.success) {
                setEvalSuccess(lang === 'ar' ? 'تم تحديث حالة المشروع بنجاح' : 'Project status updated successfully');
                if (newStatus === 'voting') {
                    setActiveProject(prev => ({
                        ...prev,
                        status: 'voting',
                        vote_summary: data.vote_summary || prev.vote_summary
                    }));
                    fetchProjects();
                    setTimeout(() => setEvalSuccess(''), 3000);
                } else {
                    setActiveProject(prev => ({
                        ...prev,
                        status: newStatus,
                        feedback: feedback || voteNotes
                    }));
                    fetchProjects();
                    setTimeout(() => {
                        setActiveProject(null);
                        setEvalSuccess('');
                    }, 1200);
                }
            } else {
                setError(data.error || (lang === 'ar' ? 'فشل في تحديث التقييم' : 'Failed to update evaluation'));
            }
        } catch (e) {
            console.error("Evaluate JS Exception:", e);
            setError(lang === 'ar' ? 'خطأ في الاتصال أثناء التقييم' : 'Error submitting evaluation');
        } finally {
            setEvaluating(false);
        }
    };

    const handleCastVote = async (choice) => {
        if (!activeProject) return;
        setVoting(true);
        setError('');
        setEvalSuccess('');

        try {
            const res = await fetch('/api/training/ideas/vote.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea_id: activeProject.id,
                    vote: choice,
                    notes: voteNotes
                })
            });
            const text = await res.text();
            let data = {};
            try {
                data = JSON.parse(text);
            } catch (err) {
                console.error("Non-JSON vote API response:", text);
                setError(lang === 'ar' ? 'خطأ في الخادم أثناء تسجيل التصويت' : 'Server error while submitting vote');
                return;
            }

            if (res.ok && data.success && data.vote_summary) {
                setEvalSuccess(lang === 'ar' ? 'تم تسجيل تصويتك بنجاح' : 'Your vote has been recorded successfully');
                setActiveProject(prev => ({
                    ...prev,
                    status: 'voting',
                    vote_summary: data.vote_summary
                }));
                fetchProjects();
                setTimeout(() => setEvalSuccess(''), 3000);
            } else {
                setError(data.error || (lang === 'ar' ? 'فشل في تسجيل التصويت' : 'Failed to cast vote'));
            }
        } catch (e) {
            console.error("Cast vote JS Exception:", e);
            setError(lang === 'ar' ? 'خطأ في الاتصال أثناء تسجيل التصويت' : 'Error submitting vote');
        } finally {
            setVoting(false);
        }
    };

    const filteredProjects = projects.filter(p => {
        const title = (p.title || p.title_ar || '').toLowerCase();
        const traineeName = (p.trainee_name || '').toLowerCase();
        const studentId = (p.student_id || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return title.includes(query) || traineeName.includes(query) || studentId.includes(query);
    });

    const getStatusBadge = (st) => {
        switch (st) {
            case 'approved':
                return <span className="status-badge badge-approved"><CheckCircle2 size={14} /> {lang === 'ar' ? 'مقبول' : 'Approved'}</span>;
            case 'completed':
                return <span className="status-badge badge-completed" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }}><CheckCircle2 size={14} /> {lang === 'ar' ? 'مكتمل' : 'Completed'}</span>;
            case 'rejected':
                return <span className="status-badge badge-rejected"><XCircle size={14} /> {lang === 'ar' ? 'مرفوض' : 'Rejected'}</span>;
            case 'changes_requested':
                return <span className="status-badge badge-changes"><AlertCircle size={14} /> {lang === 'ar' ? 'مطلوب تعديلات' : 'Changes Requested'}</span>;
            case 'voting':
                return <span className="status-badge badge-voting"><Vote size={14} /> {lang === 'ar' ? 'قيد التصويت' : 'In Voting'}</span>;
            default:
                return <span className="status-badge badge-pending"><Clock size={14} /> {lang === 'ar' ? 'قيد المراجعة' : 'Under Review'}</span>;
        }
    };

    return (
        <div className="trainee-projects-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>{isEvaluator 
                        ? (lang === 'ar' ? 'مشاريع المتدربين المقدمة' : 'Trainee Submitted Projects')
                        : (lang === 'ar' ? 'مشاريعي وأفكاري المقدمة' : 'My Submitted Projects & Ideas')
                    }</h1>
                    <p>{isEvaluator
                        ? (lang === 'ar' ? 'مراجعة وتقييم المشاريع المقدمة من المتدربين لكل دورة' : 'Review and evaluate individual project proposals submitted by trainees')
                        : (lang === 'ar' ? 'تقديم ومتابعة حالة أفكار ومشاريع التدريب الخاصة بك وتقييمات المدربين' : 'Submit and track your training project ideas and trainer evaluations.')
                    }</p>
                </div>
                {!isEvaluator && (
                    <button className="btn btn-submit-header" onClick={() => openSubmitModal()}>
                        <Plus size={18} />
                        {lang === 'ar' ? 'تقديم فكرة مشروع جديدة' : 'Submit New Idea / Project'}
                    </button>
                )}
            </div>

            {/* Filter Bar */}
            <div className="filter-card">
                <div className="filter-search">
                    <Search size={18} className="search-icon" />
                    <input 
                        type="text" 
                        placeholder={lang === 'ar' ? 'البحث عن طريق اسم المتدرب أو الرقم الجامعي أو عنوان المشروع...' : 'Search by trainee name, student ID, or project title...'} 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="filter-dropdowns">
                    <div className="select-wrapper">
                        <BookOpen size={16} />
                        <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
                            <option value="">{lang === 'ar' ? 'جميع الدورات' : 'All Courses'}</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="select-wrapper">
                        <Filter size={16} />
                        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)}>
                            <option value="">{lang === 'ar' ? 'جميع الحالات' : 'All Statuses'}</option>
                            <option value="submitted">{lang === 'ar' ? 'قيد المراجعة' : 'Under Review / Submitted'}</option>
                            <option value="voting">{lang === 'ar' ? 'قيد التصويت الجماعي' : 'In Community Voting'}</option>
                            <option value="approved">{lang === 'ar' ? 'مقبولة' : 'Approved'}</option>
                            <option value="completed">{lang === 'ar' ? 'مكتملة' : 'Completed'}</option>
                            <option value="changes_requested">{lang === 'ar' ? 'مطلوب تعديلات' : 'Changes Requested'}</option>
                            <option value="rejected">{lang === 'ar' ? 'مرفوضة' : 'Rejected'}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Projects Grid */}
            {loading ? (
                <div className="loading-state">
                    <Loader2 className="spin" size={32} />
                    <p>{lang === 'ar' ? 'جاري تحميل المشاريع...' : 'Loading submitted projects...'}</p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="empty-state-card">
                    <FileText size={48} strokeWidth={1} />
                    <h3>{lang === 'ar' ? 'لا توجد مشاريع مقدّمة' : 'No Submitted Projects Found'}</h3>
                    <p>{isEvaluator
                        ? (lang === 'ar' ? 'لم يقم المتدربون بتقديم أي مقترحات مشاريع تطابق خيارات التصفية.' : 'No trainees have submitted project proposals matching your filters.')
                        : (lang === 'ar' ? 'لم تقم بتقديم أفكار مشاريع بعد. انقر فوق زر تقديم فكرة مشروع جديدة لبدء التقديم!' : 'You have not submitted any project ideas yet. Click the button above to submit your project idea!')
                    }</p>
                    {!isEvaluator && (
                        <button className="btn btn-primary" onClick={() => openSubmitModal()} style={{ marginTop: '1rem', gap: '8px' }}>
                            <Plus size={18} />
                            {lang === 'ar' ? 'تقديم فكرة مشروع جديدة' : 'Submit New Idea / Project'}
                        </button>
                    )}
                </div>
            ) : (
                <div className="projects-grid">
                    {filteredProjects.map(project => (
                        <div key={project.id} className="project-card">
                            <div className="project-card-header">
                                <div className="trainee-meta">
                                    <User size={16} className="trainee-icon" />
                                    <div>
                                        <h4 className="trainee-name">{project.trainee_name || 'Trainee'}</h4>
                                        {project.student_id && <span className="student-id-badge">{project.student_id}</span>}
                                    </div>
                                </div>
                                {getStatusBadge(project.status)}
                            </div>

                            <div className="project-card-body">
                                <h3 className="project-title">
                                    {project.title || project.title_ar}
                                </h3>
                                <div className="course-tag">
                                    <BookOpen size={13} />
                                    <span>{project.course_name}</span>
                                </div>
                                <div className="course-tag" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
                                    <UserCheck size={13} />
                                    <span>{lang === 'ar' ? 'المدرب المشرف:' : 'Supervising Trainer:'} <strong>{project.reviewer_name || project.effective_trainer_name || (lang === 'ar' ? 'مدرب الدورة' : 'Course Trainer')}</strong></span>
                                </div>
                                <p className="project-desc">
                                    {project.description || project.description_ar || project.problem_statement || (lang === 'ar' ? 'لا يوجد وصف متاح' : 'No description provided')}
                                </p>

                                {project.tech_stack && (
                                    <div className="tech-stack-row">
                                        {project.tech_stack.split(',').map((tech, idx) => (
                                            <span key={idx} className="tech-chip">{tech.trim()}</span>
                                        ))}
                                    </div>
                                )}

                                {project.vote_summary && project.vote_summary.total_votes > 0 && (
                                    <div className="card-voting-summary">
                                        <span className="vote-pill vote-approve"><ThumbsUp size={12} /> {project.vote_summary.approve_count}</span>
                                        <span className="vote-pill vote-reject"><ThumbsDown size={12} /> {project.vote_summary.reject_count}</span>
                                        <span className="vote-pill vote-total"><Vote size={12} /> {project.vote_summary.total_votes} {lang === 'ar' ? 'أصوات' : 'votes'}</span>
                                    </div>
                                )}
                            </div>

                            <div className="project-card-footer">
                                <span className="submission-date">
                                    {new Date(project.updated_at || project.created_at).toLocaleDateString()}
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {(!isEvaluator || project.trainee_id === user?.id || project.owner_id === user?.id) && (
                                        <>
                                            <button 
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => openSubmitModal(project)}
                                            >
                                                <Edit3 size={14} /> {lang === 'ar' ? 'تعديل' : 'Edit'}
                                            </button>
                                            <button 
                                                className="btn btn-danger-outline btn-sm"
                                                onClick={(e) => handleDeleteIdea(e, project.id)}
                                                disabled={deletingIdea}
                                                style={{ 
                                                    borderColor: 'rgba(239, 68, 68, 0.4)', 
                                                    color: '#ef4444',
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    padding: '0.35rem 0.65rem',
                                                    borderRadius: '6px',
                                                    fontWeight: 600
                                                }}
                                                title={lang === 'ar' ? 'حذف الفكرة' : 'Delete Idea'}
                                            >
                                                <Trash2 size={14} /> {lang === 'ar' ? 'حذف' : 'Delete'}
                                            </button>
                                        </>
                                    )}
                                    <button 
                                        className="btn btn-outline btn-sm" 
                                        onClick={() => {
                                            setActiveProject(project);
                                            setFeedback(project.feedback || '');
                                            setVoteNotes(project.vote_summary?.my_notes || '');
                                            setError('');
                                            setEvalSuccess('');
                                            fetchIdeaDocs(project.id);
                                        }}
                                    >
                                        {isEvaluator ? (lang === 'ar' ? 'مراجعة وتقييم' : 'Review & Evaluate') : (lang === 'ar' ? 'عرض التفاصيل' : 'View Details')}
                                    </button>
                                    
                                    {(project.status === 'evaluated' || project.status === 'submitted' || project.status === 'draft') && (
                                        <a 
                                            href={`/api/training/reports/generate.php?idea_id=${project.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-primary btn-sm"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                        >
                                            <FileText size={14} />
                                            {lang === 'ar' ? 'توليد تقرير وورد' : 'Word Report'}
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Trainee Submit / Edit Project Idea Modal */}
            {showSubmitModal && (
                <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
                    <div className="modal-box modal-lg submit-idea-modal" onClick={e => e.stopPropagation()}>
                        {/* Modal Header with Glowing Gradient */}
                        <div className="modal-header fancy-modal-header">
                            <div className="modal-header-title-group">
                                <div className="modal-header-icon-badge">
                                    <Sparkles size={24} className="glowing-sparkle-icon" />
                                </div>
                                <div>
                                    <h2>{editingIdeaId 
                                        ? (lang === 'ar' ? 'تعديل فكرة المشروع' : 'Edit Project Idea')
                                        : (lang === 'ar' ? 'تقديم فكرة مشروع جديدة' : 'Submit New Project Idea')
                                    }</h2>
                                    <p className="modal-subtext">
                                        {lang === 'ar' ? 'قم بإدخال تفاصيل مشروعك للمراجعة والتقييم من المدربين' : 'Fill in your project details for review and evaluation by trainers.'}
                                    </p>
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-icon close-modal-btn" onClick={() => setShowSubmitModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {error && <div className="alert alert-error">{error}</div>}

                        {!isEvaluator && courses.length === 0 && (
                            <div className="alert alert-warning" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', padding: '0.85rem 1rem', borderRadius: '10px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                <span>
                                    {lang === 'ar' 
                                        ? 'أنت غير مسجل في أي دورة تدريبية حالياً. يجب الالتحاق بدورة تدريبية أولاً لتقديم فكرة مشروع.'
                                        : 'You are not enrolled in any training course yet. You must be enrolled in a course to submit a project proposal.'}
                                </span>
                            </div>
                        )}

                        <form onSubmit={handleSubmitIdea} className="modal-body-content fancy-modal-body">
                            {/* Course & Basic Info Section */}
                            <div className="form-section-card">
                                <div className="form-section-title">
                                    <BookOpen size={16} />
                                    <span>{lang === 'ar' ? 'بيانات الدورة التدريبية والعنوان' : 'Course Selection & Project Title'}</span>
                                </div>
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>{lang === 'ar' ? 'اختر الدورة التدريبية *' : 'Select Training Course *'}</label>
                                        <div className="input-with-icon">
                                            <BookOpen size={16} className="field-icon" />
                                            <select 
                                                required 
                                                value={submitCourseId} 
                                                onChange={e => setSubmitCourseId(e.target.value)}
                                                disabled={!isEvaluator && courses.length === 0}
                                            >
                                                <option value="">{lang === 'ar' ? '-- اختر الدورة --' : '-- Select Course --'}</option>
                                                {(isEvaluator ? (allActiveCourses.length > 0 ? allActiveCourses : courses) : courses).map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label>{lang === 'ar' ? 'عنوان المشروع *' : 'Project Title *'}</label>
                                        <div className="input-with-icon">
                                            <FileText size={16} className="field-icon" />
                                            <input 
                                                type="text" 
                                                required 
                                                value={submitTitleEn} 
                                                onChange={e => setSubmitTitleEn(e.target.value)} 
                                                placeholder={lang === 'ar' ? 'مثال: نظام إدارة الحضور الذكي' : 'e.g. Smart Student Attendance System'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* AI Magic Generator Banner */}
                            <div className="ai-generator-card">
                                <div className="ai-card-header">
                                    <div className="ai-title-row">
                                        <Sparkles size={18} className="ai-sparkle" />
                                        <h4>{lang === 'ar' ? 'مساعد توليد المقترحات بالذكاء الاصطناعي' : 'AI Idea Proposal Generator'}</h4>
                                        <span className="ai-badge">{lang === 'ar' ? 'مساعد ذكي' : 'AI Powered'}</span>
                                    </div>
                                    <p className="ai-subtitle">
                                        {lang === 'ar' ? 'أدخل فكرة مبسطة أو اختر أحد المقترحات الجاهزة لتوليد المقترح بالكامل تلقائياً' : 'Enter keywords or click a sample topic to generate a complete project proposal.'}
                                    </p>
                                </div>
                                <div className="ai-input-row">
                                    <input 
                                        type="text" 
                                        placeholder={lang === 'ar' ? 'مثال: نظام إدارة الزراعة الذكية باستخدام الذكاء الاصطناعي' : 'e.g. AI-Powered Smart Agriculture System'}
                                        value={aiKeyword}
                                        onChange={e => setAiKeyword(e.target.value)}
                                    />
                                    <button 
                                        type="button"
                                        className="btn btn-ai-generate" 
                                        onClick={handleGenerateAiProposal} 
                                        disabled={generatingAi || !aiKeyword.trim()}
                                    >
                                        {generatingAi ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
                                        <span>{lang === 'ar' ? 'توليد تلقائي' : 'Generate Proposal'}</span>
                                    </button>
                                </div>

                                {/* Quick suggestion pills */}
                                <div className="ai-sample-pills">
                                    <span className="pill-label">{lang === 'ar' ? 'مقترحات سريعة:' : 'Quick Topics:'}</span>
                                    {[
                                        { ar: '⚡ نظام حضور ذكي', en: 'Smart Attendance System' },
                                        { ar: '🤖 شات بوت الدعم الأكاديمي', en: 'Academic Support AI Chatbot' },
                                        { ar: '📊 لوحة تحليلات الطاقة', en: 'Energy Analytics Dashboard' },
                                        { ar: '📱 تطبيق الفعاليات الجامعية', en: 'University Events Mobile App' }
                                    ].map((pill, idx) => (
                                        <button 
                                            key={idx}
                                            type="button" 
                                            className="ai-pill-btn"
                                            onClick={() => {
                                                setAiKeyword(lang === 'ar' ? pill.ar : pill.en);
                                            }}
                                        >
                                            {lang === 'ar' ? pill.ar : pill.en}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Project Specs Section */}
                            <div className="form-section-card">
                                <div className="form-section-title">
                                    <Send size={16} />
                                    <span>{lang === 'ar' ? 'الوصف والتفاصيل التقنية' : 'Description & Technical Details'}</span>
                                </div>

                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'وصف المشروع والتفاصيل الأساسية *' : 'Project Description *'}</label>
                                    <textarea 
                                        rows="3" 
                                        required 
                                        value={submitDescEn} 
                                        onChange={e => setSubmitDescEn(e.target.value)}
                                        placeholder={lang === 'ar' ? 'اشرح فكرة المشروع، الأهداف الرئيسية، ورؤية الحل...' : 'Explain the project idea, main goals, and solution vision...'}
                                    />
                                </div>

                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'التقنيات المستخدمة (Tech Stack)' : 'Target Tech Stack'}</label>
                                    <input 
                                        type="text" 
                                        value={submitTechStack} 
                                        onChange={e => setSubmitTechStack(e.target.value)} 
                                        placeholder="e.g. React, Node.js, Python, PostgreSQL, TailwindCSS" 
                                    />
                                </div>

                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>{lang === 'ar' ? 'المشكلة التي يحلها المشروع' : 'Problem Statement'}</label>
                                        <textarea 
                                            rows="3" 
                                            value={submitProblemStmt} 
                                            onChange={e => setSubmitProblemStmt(e.target.value)} 
                                            placeholder={lang === 'ar' ? 'ما هي التحديات والمشاكل التي يعالجها مشروعك؟' : 'What specific problems does this project solve?'}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>{lang === 'ar' ? 'المخرجات المتوقعة للتسليم' : 'Expected Deliverables'}</label>
                                        <textarea 
                                            rows="3" 
                                            value={submitExpectedOutput} 
                                            onChange={e => setSubmitExpectedOutput(e.target.value)} 
                                            placeholder={lang === 'ar' ? 'ما هي مخرجات التطبيق أو النظام النهائي المتوقع تسليمه؟' : 'What final system deliverables or applications will be produced?'}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="modal-actions fancy-modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <div>
                                    {editingIdeaId && (
                                        <button 
                                            type="button" 
                                            className="btn" 
                                            onClick={(e) => handleDeleteIdea(e, editingIdeaId)}
                                            disabled={deletingIdea}
                                            style={{
                                                borderColor: 'rgba(239, 68, 68, 0.5)',
                                                color: '#ef4444',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '8px',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {deletingIdea ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                                            <span>{lang === 'ar' ? 'حذف الفكرة' : 'Delete Idea'}</span>
                                        </button>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowSubmitModal(false)}>
                                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button type="submit" className="btn btn-submit-glowing" disabled={submittingIdea || (!isEvaluator && courses.length === 0)}>
                                        {submittingIdea ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
                                        <span>{submittingIdea 
                                            ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') 
                                            : (editingIdeaId
                                                ? (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')
                                                : (lang === 'ar' ? 'إرسال الفكرة للمراجعة' : 'Submit Idea for Review')
                                              )
                                        }</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Review / Evaluation Modal for Evaluators or View Details for Trainees */}
            {activeProject && (
                <div className="modal-overlay" onClick={() => setActiveProject(null)}>
                    <div className="modal-box modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>{activeProject.title || activeProject.title_ar}</h2>
                                <p className="modal-subtext">
                                    {lang === 'ar' ? 'مقدّم بواسطة:' : 'Submitted by:'} <strong>{activeProject.trainee_name}</strong> ({activeProject.student_id || activeProject.trainee_email})
                                </p>
                            </div>
                            {getStatusBadge(activeProject.status)}
                        </div>

                        {error && <div className="alert alert-error">{error}</div>}
                        {evalSuccess && <div className="alert alert-success">{evalSuccess}</div>}

                        <div className="modal-body-content">
                            <div className="detail-section">
                                <label>{lang === 'ar' ? 'الدورة التدريبية' : 'Course'}</label>
                                <p className="detail-text">{activeProject.course_name}</p>
                            </div>

                            <div className="supervising-trainer-box" style={{ marginBottom: '1.25rem' }}>
                                <label>
                                    <UserCheck size={16} /> {lang === 'ar' ? 'المحاضر / المدرب المشرف' : 'Supervising Trainer / Evaluator'}
                                </label>
                                <p>
                                    {activeProject.reviewer_name || activeProject.effective_trainer_name || (lang === 'ar' ? 'مدرب الدورة' : 'Course Trainer')}
                                </p>
                            </div>

                            <div className="detail-section">
                                <label>{lang === 'ar' ? 'وصف الفكرة / المشروع' : 'Description / Proposal'}</label>
                                <p className="detail-text">{activeProject.description || activeProject.description_ar || 'N/A'}</p>
                            </div>

                            {activeProject.problem_statement && (
                                <div className="detail-section">
                                    <label>{lang === 'ar' ? 'مشكلة المشروع' : 'Problem Statement'}</label>
                                    <p className="detail-text">{activeProject.problem_statement}</p>
                                </div>
                            )}

                            {activeProject.expected_output && (
                                <div className="detail-section">
                                    <label>{lang === 'ar' ? 'المخرجات المتوقعة' : 'Expected Deliverables / Output'}</label>
                                    <p className="detail-text">{activeProject.expected_output}</p>
                                </div>
                            )}

                            {activeProject.tech_stack && (
                                <div className="detail-section">
                                    <label>{lang === 'ar' ? 'التقنيات المستخدمة' : 'Technologies / Tech Stack'}</label>
                                    <div className="tech-stack-row">
                                        {activeProject.tech_stack.split(',').map((tech, idx) => (
                                            <span key={idx} className="tech-chip">{tech.trim()}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Project Deliverables, Documents & Links Section (Only shown when project is approved/completed or for trainers) */}
                            {(activeProject.status === 'approved' || activeProject.status === 'completed' || isEvaluator) && (
                                <div className="detail-section docs-deliverables-section" style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem', fontWeight: 700 }}>
                                                <Paperclip size={18} className="text-primary" />
                                                {lang === 'ar' ? 'وثائق وروابط المشروع (الملفات والروابط)' : 'Project Deliverables, Documents & Links'}
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                                                {lang === 'ar' ? 'إرفاق تقارير المشروع، التقديم، رابط GitHub، العرض المباشر' : 'Upload SRS, Final Reports, GitHub links, Live Demo, Figma & Presentations'}
                                            </p>
                                        </div>
                                        
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            {(activeProject.trainee_id === user?.id || activeProject.owner_id === user?.id || isEvaluator || activeProject.status === 'approved' || activeProject.status === 'completed') && (
                                                <button 
                                                    type="button" 
                                                    className="btn btn-primary btn-sm" 
                                                    onClick={() => {
                                                        setDocError('');
                                                        setShowDocUploadModal(true);
                                                    }}
                                                    style={{ gap: '6px' }}
                                                >
                                                    <Plus size={15} />
                                                    <span>{lang === 'ar' ? 'إضافة ملف / رابط' : 'Add File / Link'}</span>
                                                </button>
                                            )}

                                            {activeProject.status === 'completed' && (
                                                <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.4rem 0.85rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                    <CheckCircle2 size={15} />
                                                    {lang === 'ar' ? 'المشروع مكتمل' : 'Project Completed'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {loadingDocs ? (
                                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
                                            <Loader2 className="spin" size={20} /> {lang === 'ar' ? 'جاري تحميل الوثائق...' : 'Loading project documents...'}
                                        </div>
                                    ) : projectDocs.length === 0 ? (
                                        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '10px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.15)' }}>
                                            <FileText size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                                            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                {lang === 'ar' ? 'لم يتم إرفاق أي ملفات أو روابط لهذا المشروع بعد.' : 'No project documents or links attached yet.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="docs-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                                            {projectDocs.map(doc => {
                                                const isLink = doc.doc_type === 'link' || doc.doc_type === 'github' || doc.doc_type === 'demo' || doc.doc_type === 'figma' || doc.file_url.startsWith('http');
                                                return (
                                                    <div key={doc.id} className="docs-item-card">
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                                            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: isLink ? 'rgba(168, 85, 247, 0.12)' : 'rgba(139, 28, 34, 0.12)', color: isLink ? '#a855f7' : 'var(--primary, #8b1c22)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                {doc.doc_type === 'github' ? <Code size={20} /> : isLink ? <ExternalLink size={20} /> : <FileText size={20} />}
                                                            </div>
                                                            <div style={{ overflow: 'hidden' }}>
                                                                <h5 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>{doc.file_name}</h5>
                                                                <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 500 }}>
                                                                    {doc.doc_type} {doc.file_size > 0 ? `• ${(doc.file_size / (1024 * 1024)).toFixed(2)} MB` : ''}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                            <a 
                                                                href={doc.file_url} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="btn btn-sm btn-outline"
                                                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: '#cbd5e1', color: '#334155' }}
                                                            >
                                                                {isLink ? <ExternalLink size={13} /> : <Download size={13} />}
                                                                <span>{isLink ? (lang === 'ar' ? 'زيارة' : 'Open') : (lang === 'ar' ? 'تحميل' : 'Download')}</span>
                                                            </a>
                                                            {(doc.trainee_id === user?.id || isEvaluator) && (
                                                                <button 
                                                                    type="button" 
                                                                    onClick={() => handleDeleteDoc(doc.id)} 
                                                                    className="btn btn-sm btn-ghost" 
                                                                    style={{ color: '#ef4444', padding: '0.35rem' }}
                                                                    title={lang === 'ar' ? 'حذف' : 'Delete'}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Evaluation Box for Trainers/Admins */}
                            {isEvaluator ? (
                                <div className="eval-box">
                                    <h3><Sparkles size={18} /> {lang === 'ar' ? 'خيارات التقييم والمراجعة' : 'Evaluation Options & Workflow'}</h3>
                                    
                                    <div className="eval-options-grid">
                                        {/* Option 1: Direct Decision */}
                                        <div className="eval-option-card">
                                            <div className="option-header">
                                                <CheckCircle2 size={18} className="text-success" />
                                                <h4>{lang === 'ar' ? 'الخيار 1: اتخاذ قرار مباشر' : 'Option 1: Direct Decision'}</h4>
                                            </div>
                                            <p className="option-desc">
                                                {lang === 'ar' 
                                                    ? 'اعتماد القبول المباشر أو الرفض أو طلب تعديلات من المتدرب بدون تصويت'
                                                    : 'Directly accept, request changes, or reject this project idea.'}
                                            </p>
                                            
                                            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                                <label>{lang === 'ar' ? 'ملاحظات المحاضر للمتدرب' : 'Trainer Feedback & Notes'}</label>
                                                <textarea 
                                                    rows="2" 
                                                    value={feedback} 
                                                    onChange={e => setFeedback(e.target.value)} 
                                                    placeholder={lang === 'ar' ? 'اكتب أي ملاحظات أو توجيهات للمتدرب هنا...' : 'Add guidance or feedback for the trainee here...'}
                                                />
                                            </div>

                                            <div className="eval-actions">
                                                <button 
                                                    type="button" 
                                                    className="btn btn-success" 
                                                    disabled={evaluating}
                                                    onClick={() => handleEvaluate('approved')}
                                                >
                                                    <CheckCircle2 size={16} /> {lang === 'ar' ? 'قبول مباشر' : 'Direct Accept'}
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="btn btn-warning" 
                                                    disabled={evaluating}
                                                    onClick={() => handleEvaluate('changes_requested')}
                                                >
                                                    <AlertCircle size={16} /> {lang === 'ar' ? 'طلب تعديلات' : 'Request Changes'}
                                                </button>
                                                <button 
                                                    type="button" 
                                                    className="btn btn-danger" 
                                                    disabled={evaluating}
                                                    onClick={() => handleEvaluate('rejected')}
                                                >
                                                    <XCircle size={16} /> {lang === 'ar' ? 'رفض مباشر' : 'Direct Reject'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Option 2: Send to Community Voting */}
                                        <div className="eval-option-card option-voting-card">
                                            <div className="option-header">
                                                <Vote size={18} className="text-purple" />
                                                <h4>{lang === 'ar' ? 'الخيار 2: فتح للتصويت الجماعي' : 'Option 2: Open Community Voting'}</h4>
                                            </div>
                                            <p className="option-desc">
                                                {lang === 'ar' 
                                                    ? 'إحالة المشروع لجميع المدربين والمسؤولين للتصويت وإبداء آرائهم'
                                                    : 'Open this project proposal for voting among all trainers and administrators.'}
                                            </p>
                                            
                                            {activeProject.status !== 'voting' ? (
                                                <button 
                                                    type="button" 
                                                    className="btn btn-purple-glow" 
                                                    disabled={evaluating}
                                                    onClick={() => handleEvaluate('voting')}
                                                    style={{ width: '100%', justifyContent: 'center', marginTop: '1rem', gap: '8px' }}
                                                >
                                                    <Vote size={16} /> {lang === 'ar' ? 'إرسال للتصويت الجماعي' : 'Send to Community Voting'}
                                                </button>
                                            ) : (
                                                <div className="voting-active-badge">
                                                    <Vote size={16} /> {lang === 'ar' ? 'التصويت مفعّل حالياً' : 'Voting Currently Active'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Voting Panel & Live Results (Show if status is 'voting' or if votes exist) */}
                                    {(activeProject.status === 'voting' || (activeProject.vote_summary && activeProject.vote_summary.total_votes > 0)) && (
                                        <div className="voting-panel-section">
                                            <div className="voting-panel-header">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Vote size={20} className="text-purple" />
                                                    <h4 style={{ margin: 0 }}>{lang === 'ar' ? 'نتائج تصويت المدربين والمسؤولين' : 'Trainer & Admin Voting Panel'}</h4>
                                                </div>
                                                <span className="count-pill-purple">
                                                    {activeProject.vote_summary?.total_votes || 0} {lang === 'ar' ? 'أصوات' : 'Votes'}
                                                </span>
                                            </div>

                                            {/* Inline Alerts for Voting Section */}
                                            {error && <div className="alert alert-error" style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>{error}</div>}
                                            {evalSuccess && <div className="alert alert-success" style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>{evalSuccess}</div>}

                                            {/* Voting Metrics & Bar */}
                                            {activeProject.vote_summary && activeProject.vote_summary.total_votes > 0 && (
                                                <div className="voting-stats-card">
                                                    <div className="voting-stat-labels">
                                                        <span className="stat-approve"><ThumbsUp size={14} /> {activeProject.vote_summary.approve_count} {lang === 'ar' ? 'مؤيد' : 'Approved'}</span>
                                                        <span className="stat-reject"><ThumbsDown size={14} /> {activeProject.vote_summary.reject_count} {lang === 'ar' ? 'معارض' : 'Rejected'}</span>
                                                    </div>
                                                    <div className="voting-bar-track">
                                                        <div 
                                                            className="voting-bar-fill" 
                                                            style={{ 
                                                                width: `${Math.round((activeProject.vote_summary.approve_count / activeProject.vote_summary.total_votes) * 100)}%` 
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Cast Vote Form */}
                                            <div className="cast-vote-card">
                                                <h5>{lang === 'ar' ? 'تصويتك ورأيك على المشروع:' : 'Cast / Change Your Vote:'}</h5>
                                                
                                                {activeProject.vote_summary?.my_vote && (
                                                    <div className="my-vote-status">
                                                        {lang === 'ar' ? 'تصويتك الحالي: ' : 'Your current vote: '}
                                                        <strong>
                                                            {activeProject.vote_summary.my_vote === 'approve' 
                                                                ? (lang === 'ar' ? 'مؤيد للقبول' : 'Recommended Approval')
                                                                : (lang === 'ar' ? 'معارض للقبول' : 'Recommended Rejection')
                                                            }
                                                        </strong>
                                                    </div>
                                                )}

                                                <div className="vote-input-box">
                                                    <input 
                                                        type="text"
                                                        placeholder={lang === 'ar' ? 'أدخل ملاحظات أو سبب تصويتك (اختياري)...' : 'Optional vote reasoning or comments...'}
                                                        value={voteNotes}
                                                        onChange={e => setVoteNotes(e.target.value)}
                                                    />
                                                </div>

                                                <div className="vote-buttons-row">
                                                    <button 
                                                        type="button" 
                                                        className={`btn-vote btn-vote-yes ${activeProject.vote_summary?.my_vote === 'approve' ? 'active' : ''}`}
                                                        onClick={() => handleCastVote('approve')}
                                                        disabled={voting}
                                                    >
                                                        {voting ? <Loader2 className="spin" size={16} /> : <ThumbsUp size={16} />}
                                                        <span>{lang === 'ar' ? 'تصويت بالقبول' : 'Vote Approve'}</span>
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className={`btn-vote btn-vote-no ${activeProject.vote_summary?.my_vote === 'reject' ? 'active' : ''}`}
                                                        onClick={() => handleCastVote('reject')}
                                                        disabled={voting}
                                                    >
                                                        {voting ? <Loader2 className="spin" size={16} /> : <ThumbsDown size={16} />}
                                                        <span>{lang === 'ar' ? 'تصويت بالرفض' : 'Vote Reject'}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Voters Breakdown List */}
                                            {activeProject.vote_summary?.votes_list?.length > 0 && (
                                                <div className="voter-logs-box">
                                                    <div className="logs-header">
                                                        <Users size={15} />
                                                        <span>{lang === 'ar' ? 'سجل تصويت الأعضاء (' + activeProject.vote_summary.votes_list.length + ')' : 'Voter Activity Log (' + activeProject.vote_summary.votes_list.length + ')'}</span>
                                                    </div>
                                                    <div className="voter-chips-list">
                                                        {activeProject.vote_summary.votes_list.map((v, idx) => (
                                                            <div key={idx} className={`voter-chip-item vote-is-${v.vote}`}>
                                                                <div className="voter-chip-top">
                                                                    <strong>{v.evaluator_name}</strong>
                                                                    <span className={`chip-vote-pill ${v.vote}`}>
                                                                        {v.vote === 'approve' ? 'Approved' : 'Rejected'}
                                                                    </span>
                                                                </div>
                                                                {v.notes && <p className="chip-voter-notes">"{v.notes}"</p>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Finalize Decision Action */}
                                            <div className="finalize-decision-footer">
                                                <span>{lang === 'ar' ? 'اعتماد القرار النهائي بناءً على تصويت الأعضاء:' : 'Finalize official evaluation decision:'}</span>
                                                <div className="finalize-btns">
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-success btn-sm"
                                                        onClick={() => handleEvaluate('approved')}
                                                        disabled={evaluating}
                                                    >
                                                        {evaluating ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />}
                                                        <span>{lang === 'ar' ? 'إنهاء والتصديق بالقبول' : 'Finalize & Approve'}</span>
                                                    </button>
                                                    <button 
                                                        type="button" 
                                                        className="btn btn-danger btn-sm"
                                                        onClick={() => handleEvaluate('rejected')}
                                                        disabled={evaluating}
                                                    >
                                                        {evaluating ? <Loader2 className="spin" size={14} /> : <XCircle size={14} />}
                                                        <span>{lang === 'ar' ? 'إنهاء والتصديق بالرفض' : 'Finalize & Reject'}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                activeProject.status === 'voting' ? (
                                    <div className="voting-trainee-banner">
                                        <Vote size={28} className="purple-sparkle-icon" />
                                        <div>
                                            <h4>{lang === 'ar' ? 'المشروع متاح للتصويت الجماعي' : 'Project Open for Community Voting'}</h4>
                                            <p>{lang === 'ar' ? 'تمت إحالة فكرة مشروعك إلى هيئة التدريب والمسؤولين للتصويت عليها وتقييمها.' : 'Your project idea has been submitted to all trainers & administrators for evaluation voting.'}</p>
                                            {activeProject.vote_summary && activeProject.vote_summary.total_votes > 0 && (
                                                <span className="count-pill-purple">{activeProject.vote_summary.total_votes} {lang === 'ar' ? 'أصوات تم تسجيلها' : 'Votes Recorded'}</span>
                                            )}
                                        </div>
                                    </div>
                                ) : activeProject.feedback && (
                                    <div className="feedback-display" style={{ background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
                                        <h4 style={{ margin: '0 0 0.5rem 0', color: '#ffb100' }}>{lang === 'ar' ? 'ملاحظات المشرف والمدرب:' : 'Trainer Feedback:'}</h4>
                                        <p style={{ margin: 0, fontSize: '0.95rem' }}>{activeProject.feedback}</p>
                                    </div>
                                )
                            )}
                        </div>

                        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {(isEvaluator || activeProject.trainee_id === user?.id || activeProject.owner_id === user?.id) && (
                                    <button 
                                        type="button" 
                                        className="btn" 
                                        onClick={(e) => handleDeleteIdea(e, activeProject.id)}
                                        disabled={deletingIdea}
                                        style={{
                                            borderColor: 'rgba(239, 68, 68, 0.5)',
                                            color: '#ef4444',
                                            background: 'rgba(239, 68, 68, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {deletingIdea ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                                        <span>{lang === 'ar' ? 'حذف الفكرة' : 'Delete Idea'}</span>
                                    </button>
                                )}

                                {activeProject.status === 'approved' && (activeProject.trainee_id === user?.id || activeProject.owner_id === user?.id || isEvaluator) && (
                                    <button 
                                        type="button" 
                                        className="btn" 
                                        onClick={() => handleMarkAsFinished(activeProject.id)}
                                        disabled={completingProject}
                                        style={{
                                            borderColor: 'rgba(16, 185, 129, 0.4)',
                                            color: '#10b981',
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '0.5rem 1rem',
                                            borderRadius: '8px',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {completingProject ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                                        <span>{lang === 'ar' ? 'إنهاء وتصفية المشروع' : 'Mark as Finished'}</span>
                                    </button>
                                )}
                            </div>
                            <button className="btn btn-ghost" onClick={() => setActiveProject(null)}>
                                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom React Delete Confirmation Modal */}
            {confirmDeleteId && (
                <div className="modal-overlay" style={{ zIndex: 9999 }}>
                    <div className="modal-card" style={{ maxWidth: '440px', textAlign: 'center', padding: '2.25rem 1.75rem', borderRadius: '16px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
                            <Trash2 size={30} />
                        </div>
                        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                            {lang === 'ar' ? 'حذف فكرة المشروع' : 'Delete Project Idea'}
                        </h3>
                        <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                            {lang === 'ar' 
                                ? 'هل أنت تأكد من رغبتك في حذف هذه الفكرة؟ لا يمكن التراجع عن هذا الإجراء.' 
                                : 'Are you sure you want to delete this project idea? This action cannot be undone.'}
                        </p>

                        {error && <div className="alert alert-error" style={{ marginBottom: '1.25rem', fontSize: '0.85rem' }}>{error}</div>}

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                type="button" 
                                className="btn btn-ghost" 
                                onClick={() => { setConfirmDeleteId(null); setError(''); }}
                                disabled={deletingIdea}
                                style={{ padding: '0.6rem 1.25rem' }}
                            >
                                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button 
                                type="button" 
                                className="btn" 
                                onClick={() => executeDeleteIdea(confirmDeleteId)}
                                disabled={deletingIdea}
                                style={{
                                    background: '#ef4444',
                                    color: '#ffffff',
                                    borderColor: '#ef4444',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: 600,
                                    padding: '0.6rem 1.25rem',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                {deletingIdea ? <Loader2 className="spin" size={18} /> : <Trash2 size={18} />}
                                <span>{deletingIdea ? (lang === 'ar' ? 'جاري الحذف...' : 'Deleting...') : (lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete')}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document & Link Upload Modal */}
            {showDocUploadModal && (
                <div className="modal-overlay" style={{ zIndex: 99999 }} onClick={() => setShowDocUploadModal(false)}>
                    <div className="doc-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="doc-modal-header">
                            <div className="icon-badge">
                                <Upload size={20} />
                            </div>
                            <h3>
                                {lang === 'ar' ? 'إضافة وثيقة أو رابط للمشروع' : 'Add Project Document or Link'}
                            </h3>
                        </div>

                        {docError && <div className="alert alert-error" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>{docError}</div>}

                        <form onSubmit={handleUploadDocOrLink}>
                            <div className="doc-mode-switcher">
                                <button 
                                    type="button" 
                                    className={`doc-mode-btn ${docMode === 'file' ? 'active' : ''}`}
                                    onClick={() => setDocMode('file')}
                                >
                                    <FileText size={16} />
                                    <span>{lang === 'ar' ? 'رفع ملف' : 'Upload File'}</span>
                                </button>
                                <button 
                                    type="button" 
                                    className={`doc-mode-btn ${docMode === 'link' ? 'active' : ''}`}
                                    onClick={() => setDocMode('link')}
                                >
                                    <ExternalLink size={16} />
                                    <span>{lang === 'ar' ? 'إضافة رابط خارجي' : 'Add External Link'}</span>
                                </button>
                            </div>

                            <div className="doc-form-group">
                                <label>{lang === 'ar' ? 'نوع المرفق' : 'Attachment Type'}</label>
                                <select 
                                    className="doc-form-select"
                                    value={docType} 
                                    onChange={e => setDocType(e.target.value)}
                                >
                                    <option value="report">{lang === 'ar' ? 'تقرير المشروع (Final Report / SRS)' : 'Final Project Report / SRS'}</option>
                                    <option value="presentation">{lang === 'ar' ? 'عرض تقديمي (PowerPoint / PDF)' : 'Presentation (PPT / PDF)'}</option>
                                    <option value="code_zip">{lang === 'ar' ? 'ملف الكود (Source Code ZIP)' : 'Source Code ZIP Archive'}</option>
                                    <option value="github">GitHub Repository</option>
                                    <option value="demo">{lang === 'ar' ? 'رابط العرض المباشر (Live Demo)' : 'Live Demo / Web Link'}</option>
                                    <option value="figma">Figma / UI Design</option>
                                    <option value="other">{lang === 'ar' ? 'أخرى' : 'Other'}</option>
                                </select>
                            </div>

                            {docMode === 'link' ? (
                                <div className="doc-form-group">
                                    <label>{lang === 'ar' ? 'الرابط (URL) *' : 'URL Link *'}</label>
                                    <input 
                                        type="url" 
                                        className="doc-form-input"
                                        required 
                                        placeholder="https://github.com/..." 
                                        value={docLinkUrl} 
                                        onChange={e => setDocLinkUrl(e.target.value)}
                                    />
                                </div>
                            ) : (
                                <div className="doc-form-group">
                                    <label>{lang === 'ar' ? 'اختر الملف (PDF, WORD, ZIP, PPTX) *' : 'Select File (PDF, WORD, ZIP, PPTX) *'}</label>
                                    <div className="doc-file-dropzone">
                                        <input 
                                            type="file" 
                                            required={!docFile}
                                            onChange={e => setDocFile(e.target.files[0])} 
                                        />
                                        <div className="doc-dropzone-content">
                                            <Upload size={28} className="upload-icon" />
                                            {docFile ? (
                                                <strong>{docFile.name} ({(docFile.size / (1024 * 1024)).toFixed(2)} MB)</strong>
                                            ) : (
                                                <>
                                                    <strong>{lang === 'ar' ? 'انقر أو اسحب الملف هنا للرفع' : 'Click or drag file here to upload'}</strong>
                                                    <span>{lang === 'ar' ? 'يدعم PDF, Word, ZIP, PowerPoint (بحد أقصى 50 ميجابايت)' : 'Supports PDF, Word, ZIP, PowerPoint (Max 50MB)'}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="doc-modal-footer">
                                <button type="button" className="doc-btn-cancel" onClick={() => setShowDocUploadModal(false)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="doc-btn-save" disabled={uploadingDoc}>
                                    {uploadingDoc ? <Loader2 className="spin" size={16} /> : <Upload size={16} />}
                                    <span>{uploadingDoc ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ' : 'Save')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
