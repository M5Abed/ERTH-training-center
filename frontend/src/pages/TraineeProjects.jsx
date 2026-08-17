import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import {
    Search, Filter, CheckCircle2, XCircle, AlertCircle, Clock, FileText,
    Send, User, BookOpen, Loader2, Sparkles, Plus, Edit3, X, Vote,
    ThumbsUp, ThumbsDown, Users, Trash2, Paperclip, Upload, Download,
    ExternalLink, Code, UserCheck, Layers, Bot, Cpu, Zap, Crown,
    FolderOpen, Shield, Link as LinkIcon, Activity, UserPlus, Check,
    Video, Globe, ArrowRight, Award, RefreshCw, AlertTriangle, HardDrive
} from 'lucide-react';
import TeammateSelector from '../components/TeammateSelector';
import MemberDetailModal from '../components/MemberDetailModal';
import ProposalViewer from '../components/ProposalViewer';
import ProposalDocModal from '../components/ProposalDocModal';
import { downloadProposalDocx } from '../services/api';
import './TrainingCourseDetail.css';
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

    // Filters (Evaluator view)
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Active project & Trainee Dashboard tab
    const [activeProject, setActiveProject] = useState(null);
    const [dashboardTab, setDashboardTab] = useState('overview'); // 'overview' | 'team' | 'docs'

    // Evaluator review & evaluation state
    const [evalTab, setEvalTab] = useState('proposal'); // 'proposal' | 'deliverables'
    const [feedback, setFeedback] = useState('');
    const [evaluating, setEvaluating] = useState(false);
    const [evalSuccess, setEvalSuccess] = useState('');
    const [deletingIdea, setDeletingIdea] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [voting, setVoting] = useState(false);
    const [voteNotes, setVoteNotes] = useState('');

    // 64-Project Catalog modal state
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [catalogProjects, setCatalogProjects] = useState([]);
    const [loadingCatalog, setLoadingCatalog] = useState(false);
    const [catalogCategory, setCatalogCategory] = useState('all');
    const [catalogSearch, setCatalogSearch] = useState('');
    const [submissionTab, setSubmissionTab] = useState('catalog'); // 'catalog' | 'custom'
    const [selectedCatalogId, setSelectedCatalogId] = useState(null);
    const [selectedProposalData, setSelectedProposalData] = useState(null);
    const [selectingCatalog, setSelectingCatalog] = useState(false);
    const [catalogError, setCatalogError] = useState('');
    const [showProposalDoc, setShowProposalDoc] = useState(false);
    const [createdIdeaId, setCreatedIdeaId] = useState(null);
    const [simulationState, setSimulationState] = useState(null);

    // Custom idea submission state
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
    const [submitTeammates, setSubmitTeammates] = useState([]);

    // Project Documents & Links state
    const [projectDocs, setProjectDocs] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [docUploadMode, setDocUploadMode] = useState('file'); // 'file' | 'link'
    const [docFile, setDocFile] = useState(null);
    const [docFileTitle, setDocFileTitle] = useState('');
    const [linkType, setLinkType] = useState('github'); // 'github' | 'demo' | 'video' | 'figma' | 'other'
    const [linkUrl, setLinkUrl] = useState('');
    const [linkTitle, setLinkTitle] = useState('');
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [docError, setDocError] = useState('');
    const [docSuccess, setDocSuccess] = useState('');
    const [completingProject, setCompletingProject] = useState(false);
    const [downloadingDocxId, setDownloadingDocxId] = useState(null);

    const handleDownloadProjectDocx = async (ideaId, title) => {
        if (!ideaId) return;
        setDownloadingDocxId(ideaId);
        try {
            await downloadProposalDocx(ideaId, title || 'Proposal');
        } catch (err) {
            alert(err.message || 'Error downloading Word document');
        } finally {
            setDownloadingDocxId(null);
        }
    };

    // Team management state inside "My Team" tab
    const [viewingMember, setViewingMember] = useState(null);
    const [teamSearchQuery, setTeamSearchQuery] = useState('');
    const [teamCandidates, setTeamCandidates] = useState([]);
    const [loadingTeamCandidates, setLoadingTeamCandidates] = useState(false);
    const [teamSearchOpen, setTeamSearchOpen] = useState(false);
    const [directInviteInput, setDirectInviteInput] = useState('');
    const [invitingMember, setInvitingMember] = useState(false);
    const [teamActionError, setTeamActionError] = useState('');
    const [teamActionSuccess, setTeamActionSuccess] = useState('');
    const teamSearchRef = useRef(null);

    // Close team candidate dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (teamSearchRef.current && !teamSearchRef.current.contains(e.target)) {
                setTeamSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Initial data loading
    useEffect(() => {
        fetchCourses();
        fetchProjects();
        fetchCatalogProjects();
    }, [selectedCourse, selectedStatus]);

    // Auto-select active project for Trainee
    useEffect(() => {
        if (!isEvaluator && !loading && projects.length > 0) {
            const proj = projects[0];
            if (!activeProject || activeProject.id !== proj.id) {
                setActiveProject(proj);
                fetchIdeaDocs(proj.id);
            }
        }
    }, [projects, isEvaluator, loading]);

    // Search teammates candidates for active project course
    useEffect(() => {
        if (!activeProject?.course_id || dashboardTab !== 'team') {
            setTeamCandidates([]);
            return;
        }

        const timer = setTimeout(() => {
            fetchTeamCandidates(teamSearchQuery);
        }, 250);

        return () => clearTimeout(timer);
    }, [teamSearchQuery, activeProject?.course_id, activeProject?.id, dashboardTab]);

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
                if (data.courses.length > 0 && !submitCourseId) {
                    setSubmitCourseId(data.courses[0].id);
                }
            }
        } catch (e) {
            console.error('Error fetching active courses:', e);
        }
    };

    const fetchProjects = async (preferredActiveId = null) => {
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
                if (!isEvaluator && data.ideas.length > 0) {
                    const matchedProj = preferredActiveId
                        ? data.ideas.find(p => p.id == preferredActiveId) || data.ideas[0]
                        : data.ideas[0];
                    setActiveProject(matchedProj);
                    fetchIdeaDocs(matchedProj.id);
                } else if (!isEvaluator && data.ideas.length === 0) {
                    setActiveProject(null);
                }
            } else {
                setError(data.error || 'Failed to load submitted projects');
            }
        } catch (e) {
            setError('Connection error while fetching projects');
        } finally {
            setLoading(false);
        }
    };

    const fetchCatalogProjects = async (force = false) => {
        if (!force && catalogProjects.length > 0) return;
        setCatalogError('');
        setLoadingCatalog(true);
        try {
            const res = await fetch('/api/training/ideas/catalog_list.php');
            let data;
            try { data = await res.json(); } catch { data = {}; }
            if (res.ok && data.projects && data.projects.length > 0) {
                setCatalogProjects(data.projects);
            } else {
                setCatalogError(data.error || `HTTP ${res.status}: Failed to load catalog`);
            }
        } catch (e) {
            setCatalogError('Network error — cannot reach catalog service');
        } finally {
            setLoadingCatalog(false);
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

    const fetchTeamCandidates = async (query = '') => {
        if (!activeProject?.course_id) return;
        setLoadingTeamCandidates(true);
        try {
            const url = `/api/training/ideas/search_teammates.php?course_id=${activeProject.course_id}&q=${encodeURIComponent(query)}&current_idea_id=${activeProject.id}`;
            const res = await fetch(url);
            const data = await res.json();
            if (res.ok && data.candidates) {
                setTeamCandidates(data.candidates);
            } else {
                setTeamCandidates([]);
            }
        } catch (err) {
            setTeamCandidates([]);
        } finally {
            setLoadingTeamCandidates(false);
        }
    };

    // ── TEAM MANAGEMENT HANDLERS ─────────────────────────────────────────────
    const handleAddTeamMember = async (userId = 0, identifier = '') => {
        if (!activeProject?.id) return;
        setInvitingMember(true);
        setTeamActionError('');
        setTeamActionSuccess('');

        try {
            const res = await fetch('/api/training/ideas/team_manage.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea_id: activeProject.id,
                    action: 'add',
                    user_id: userId || undefined,
                    identifier: identifier || undefined
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setTeamActionSuccess(lang === 'ar' ? 'تمت إضافة العضو إلى الفريق بنجاح' : 'Team member added successfully');
                setActiveProject(prev => prev ? { ...prev, team_members: data.team_members } : null);
                setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, team_members: data.team_members } : p));
                setTeamSearchQuery('');
                setDirectInviteInput('');
                setTeamSearchOpen(false);
                fetchTeamCandidates('');
                setTimeout(() => setTeamActionSuccess(''), 4000);
            } else {
                setTeamActionError(data.error || (lang === 'ar' ? 'فشل في إضافة العضو' : 'Failed to add team member'));
            }
        } catch (err) {
            setTeamActionError(lang === 'ar' ? 'حدث خطأ في الاتصال بالخادم' : 'Connection error occurred');
        } finally {
            setInvitingMember(false);
        }
    };

    const handleRemoveTeamMember = async (userId) => {
        if (!activeProject?.id || !userId) return;
        if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من إزالة هذا العضو من الفريق؟' : 'Are you sure you want to remove this member from the team?')) {
            return;
        }

        setInvitingMember(true);
        setTeamActionError('');
        setTeamActionSuccess('');

        try {
            const res = await fetch('/api/training/ideas/team_manage.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea_id: activeProject.id,
                    action: 'remove',
                    user_id: userId
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setTeamActionSuccess(lang === 'ar' ? 'تمت إزالة العضو من الفريق' : 'Member removed from team');
                setActiveProject(prev => prev ? { ...prev, team_members: data.team_members } : null);
                setProjects(prev => prev.map(p => p.id === activeProject.id ? { ...p, team_members: data.team_members } : p));
                fetchTeamCandidates(teamSearchQuery);
                setTimeout(() => setTeamActionSuccess(''), 4000);
            } else {
                setTeamActionError(data.error || (lang === 'ar' ? 'فشل في إزالة العضو' : 'Failed to remove member'));
            }
        } catch (err) {
            setTeamActionError(lang === 'ar' ? 'حدث خطأ في الاتصال بالخادم' : 'Connection error occurred');
        } finally {
            setInvitingMember(false);
        }
    };

    // ── DOCUMENT & LINK UPLOAD HANDLERS ──────────────────────────────────────
    const handleFileUploadDirect = async (e) => {
        e.preventDefault();
        if (!activeProject?.id) return;
        if (!docFile) {
            setDocError(lang === 'ar' ? 'يرجى اختيار ملف لرفعه' : 'Please select a file to upload');
            return;
        }
        if (!docFileTitle.trim()) {
            setDocError(lang === 'ar' ? 'يرجى إدخال عنوان أو مسمى للملف' : 'Please enter a title for the file');
            return;
        }

        setUploadingDoc(true);
        setDocError('');
        setDocSuccess('');

        try {
            const formData = new FormData();
            formData.append('idea_id', activeProject.id);
            formData.append('course_id', activeProject.course_id || '');
            formData.append('file', docFile);
            formData.append('title', docFileTitle.trim());

            const res = await fetch('/api/training/docs/upload.php', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setDocSuccess(lang === 'ar' ? 'تم رفع الملف بنجاح وحفظه في سجل المشروع' : 'File uploaded successfully and synced');
                setDocFile(null);
                setDocFileTitle('');
                fetchIdeaDocs(activeProject.id);
                setTimeout(() => setDocSuccess(''), 4000);
            } else {
                setDocError(data.error || (lang === 'ar' ? 'فشل في رفع الملف' : 'Failed to upload file'));
            }
        } catch (err) {
            setDocError(lang === 'ar' ? 'حدث خطأ في الاتصال أثناء الرفع' : 'Network error during upload');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleLinkSubmitDirect = async (e) => {
        e.preventDefault();
        if (!activeProject?.id) return;
        if (!linkUrl.trim()) {
            setDocError(lang === 'ar' ? 'يرجى إدخال الرابط' : 'Please enter a valid URL');
            return;
        }

        setUploadingDoc(true);
        setDocError('');
        setDocSuccess('');

        try {
            const res = await fetch('/api/training/docs/upload.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea_id: activeProject.id,
                    course_id: activeProject.course_id,
                    url: linkUrl.trim(),
                    title: linkTitle.trim() || undefined,
                    doc_type: linkType
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setDocSuccess(lang === 'ar' ? 'تم حفظ الرابط بنجاح ومزامنته للمشرف' : 'Project link saved successfully and synced');
                setLinkUrl('');
                setLinkTitle('');
                fetchIdeaDocs(activeProject.id);
                setTimeout(() => setDocSuccess(''), 4000);
            } else {
                setDocError(data.error || (lang === 'ar' ? 'فشل في حفظ الرابط' : 'Failed to save link'));
            }
        } catch (err) {
            setDocError(lang === 'ar' ? 'حدث خطأ في الاتصال أثناء حفظ الرابط' : 'Network error saving link');
        } finally {
            setUploadingDoc(false);
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا التوثيق/الرابط؟' : 'Are you sure you want to delete this deliverable/link?')) return;
        try {
            const res = await fetch('/api/training/docs/delete.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: docId })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setProjectDocs(prev => prev.filter(d => d.id !== docId));
                fetchIdeaDocs(activeProject?.id);
            } else {
                alert(data.error || 'Failed to delete');
            }
        } catch (e) {
            alert('Network error while deleting');
        }
    };

    const handleMarkAsFinished = async (ideaId) => {
        if (!ideaId) return;
        if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من أنك أكملت جميع تسليمات المشروع وتريد تحديده كـ مكتمل؟' : 'Are you sure you have uploaded all deliverables and want to mark this project as finished?')) {
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
                fetchProjects();
            } else {
                alert(data.error || 'Failed to mark project as finished');
            }
        } catch (err) {
            alert('Error completing project');
        } finally {
            setCompletingProject(false);
        }
    };

    // ── SUBMISSION MODAL HANDLERS ────────────────────────────────────────────
    const openSubmitModal = (idea = null) => {
        setError('');
        setCatalogError('');
        fetchCatalogProjects();

        if (idea) {
            setEditingIdeaId(idea.id);
            setCreatedIdeaId(idea.id);
            setSubmitCourseId(idea.course_id);
            setSubmitTitleEn(idea.title || idea.title_en || '');
            setSubmitDescEn(idea.description || idea.description_en || '');
            setSubmitTechStack(idea.tech_stack || '');
            setSubmitProblemStmt(idea.problem_statement || '');
            setSubmitExpectedOutput(idea.expected_output || '');
            setSubmissionTab(idea.catalog_project_id ? 'catalog' : 'custom');
            setSelectedCatalogId(idea.catalog_project_id || null);

            const rawMembers = idea.team_members || [];
            const currentUserId = user?.id;
            const teammates = rawMembers.filter(m => (m.user_id || m.id) !== currentUserId && m.role !== 'leader');
            setSubmitTeammates(teammates);

            fetch(`/api/training/ideas/proposal_get.php?idea_id=${idea.id}`)
                .then(r => r.json())
                .then(d => {
                    if (d.proposal) setSelectedProposalData(d.proposal);
                })
                .catch(() => {});
        } else {
            setEditingIdeaId(null);
            setCreatedIdeaId(null);
            setSelectedCatalogId(null);
            setSelectedProposalData(null);
            setSubmissionTab('catalog');
            const defaultList = isEvaluator ? (allActiveCourses.length > 0 ? allActiveCourses : courses) : courses;
            setSubmitCourseId(defaultList.length > 0 ? defaultList[0].id : '');
            setSubmitTitleEn('');
            setSubmitDescEn('');
            setSubmitTechStack('');
            setSubmitProblemStmt('');
            setSubmitExpectedOutput('');
            setSubmitTeammates([]);
        }
        setShowSubmitModal(true);
        fetchActiveCourses();
    };

    const handleSelectCatalogIdea = async (catProject) => {
        if (!submitCourseId) {
            setError(lang === 'ar' ? 'يرجى اختيار الدورة التدريبية أولاً من الأعلى' : 'Please select a course first from above');
            return;
        }
        setSelectingCatalog(true);
        setError('');
        try {
            const res = await fetch('/api/training/ideas/catalog_select.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    catalog_project_id: catProject.id,
                    course_id: submitCourseId,
                    training_idea_id: editingIdeaId || createdIdeaId || undefined
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const ideaId = data.idea_id;
                setSelectedCatalogId(catProject.id);
                setSelectedProposalData(data.proposal);
                setCreatedIdeaId(ideaId);
                setSubmitTitleEn(catProject.title);
                setSubmitDescEn(data.proposal?.sections?.[0]?.content || catProject.title);
                setSubmitTechStack(catProject.skills || '');
                fetchProjects();
                setShowSubmitModal(false);
                setSimulationState({
                    active: true,
                    step: 1,
                    progress: 25,
                    project: catProject,
                    ideaId: ideaId,
                    done: false
                });
                setTimeout(() => setSimulationState(s => s ? { ...s, step: 2, progress: 50 } : null), 600);
                setTimeout(() => setSimulationState(s => s ? { ...s, step: 3, progress: 75 } : null), 1200);
                setTimeout(() => setSimulationState(s => s ? { ...s, step: 4, progress: 100 } : null), 1800);
                setTimeout(() => {
                    setSimulationState(s => s ? { ...s, done: true } : null);
                    fetchProjects();
                }, 2400);
            } else {
                setError(data.error || 'Failed to select catalog idea');
            }
        } catch (e) {
            setError('Error connecting to catalog service');
        } finally {
            setSelectingCatalog(false);
        }
    };

    const handleGenerateAiProposal = async () => {
        if (!aiKeyword.trim()) return;
        setGeneratingAi(true);
        try {
            const res = await fetch('/api/training/ideas/ai_generate.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keywords: aiKeyword,
                    full_sections: true
                })
            });
            const data = await res.json();
            if (res.ok && data.proposal) {
                setSubmitTitleEn(data.proposal.title || '');
                setSubmitDescEn(data.proposal.description || '');
                setSubmitProblemStmt(data.proposal.problem_statement || '');
                setSubmitTechStack(data.proposal.tech_stack || '');
                setSubmitExpectedOutput(data.proposal.expected_output || '');
                if (data.proposal.sections) {
                    setSelectedProposalData(data.proposal);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setGeneratingAi(false);
        }
    };

    const handleSubmitIdea = async (e) => {
        e?.preventDefault?.();
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
                    expected_output: submitExpectedOutput,
                    proposal_json: selectedProposalData || undefined,
                    teammate_ids: submitTeammates.map(t => t.id || t.user_id)
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setShowSubmitModal(false);
                setSubmitTitleEn('');
                setSubmitDescEn('');
                setSubmitTechStack('');
                setSubmitProblemStmt('');
                setSubmitExpectedOutput('');
                setAiKeyword('');
                setSelectedProposalData(null);
                setSubmitTeammates([]);
                fetchProjects(data.idea_id);
            } else {
                setError(data.error || 'Failed to submit idea');
            }
        } catch (e) {
            setError('Error submitting project idea');
        } finally {
            setSubmittingIdea(false);
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
            try { data = JSON.parse(text); } catch (err) {
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
            const data = await res.json();

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
                setError(data.error || 'Failed to update evaluation');
            }
        } catch (e) {
            setError('Error submitting evaluation');
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
            const data = await res.json();

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
                setError(data.error || 'Failed to cast vote');
            }
        } catch (e) {
            setError('Error submitting vote');
        } finally {
            setVoting(false);
        }
    };

    const filteredProjects = projects.filter(p => {
        const title = (p.title || p.title_ar || p.title_en || '').toLowerCase();
        const traineeName = (p.trainee_name || '').toLowerCase();
        const studentId = (p.student_id || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return title.includes(query) || traineeName.includes(query) || studentId.includes(query);
    });

    const getStatusBadge = (st) => {
        switch (st) {
            case 'approved':
                return <span className="status-badge badge-approved"><CheckCircle2 size={14} /> {lang === 'ar' ? 'معتمد' : 'Approved'}</span>;
            case 'completed':
                return <span className="status-badge badge-completed"><Award size={14} /> {lang === 'ar' ? 'مكتمل' : 'Completed'}</span>;
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

    const isOwner = activeProject && (activeProject.trainee_id === user?.id || activeProject.owner_id === user?.id || activeProject.is_team_leader);

    return (
        <div className="trainee-projects-page">
            {/* ── NMU Template Proposal Document Modal ─────────────────── */}
            {showProposalDoc && selectedProposalData && (
                <ProposalDocModal
                    proposal={selectedProposalData}
                    ideaId={createdIdeaId}
                    isEvaluator={isEvaluator}
                    lang={lang}
                    onClose={() => setShowProposalDoc(false)}
                    onEvaluated={() => {
                        setShowProposalDoc(false);
                        fetchProjects();
                    }}
                />
            )}

            {/* ── Page Top Header ──────────────────────────────────────── */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1>
                        <FolderOpen size={24} className="text-primary" />
                        {isEvaluator
                            ? (lang === 'ar' ? 'مشاريع المتدربين المقدمة' : 'Trainee Submitted Projects')
                            : (lang === 'ar' ? 'مشروعي وفكرتي للتدريب الميداني' : 'My Field Training Project & Idea')
                        }
                    </h1>
                    <p>
                        {isEvaluator
                            ? (lang === 'ar' ? 'مراجعة وتقييم ومتابعة مشاريع الطلاب وتوثيقاتهم المرفوعة' : 'Review, grade, and monitor student project deliverables and team proposals')
                            : (lang === 'ar' ? 'إدارة مقترح مشروعك، أعضاء فريقك، وتسليم وثائق وتقارير التدريب' : 'Manage your official proposal, team collaborators, and submit all deliverables')
                        }
                    </p>
                </div>

                {!isEvaluator && activeProject && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="hero-course-chip">
                            <BookOpen size={13} /> {activeProject.course_name}
                        </span>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                TRAINEE VIEW — UNIFIED MODERN PROJECT HUB
            ════════════════════════════════════════════════════════════════ */}
            {!isEvaluator && (
                <>
                    {loading ? (
                        <div className="loading-state">
                            <Loader2 className="spin" size={32} />
                            <p>{lang === 'ar' ? 'جاري تحميل بيانات مشروعك...' : 'Loading your project...'}</p>
                        </div>
                    ) : (!activeProject || projects.length === 0) ? (
                        /* Empty State: Prompt Student to Choose Catalog or Custom */
                        <div className="empty-state-card">
                            <div className="empty-state-icon-glow">
                                <Sparkles size={40} className="text-primary" />
                            </div>
                            <h3>{lang === 'ar' ? 'لم تختر فكرة مشروعك للتدريب الميداني بعد' : 'No Field Training Project Selected Yet'}</h3>
                            <p>
                                {lang === 'ar'
                                    ? 'يمكنك الاختيار فوراً من دليل المشاريع الـ 64 المعتمدة مع المقترح الأكاديمي الكامل، أو إنشاء فكرتك الخاصة بالذكاء الاصطناعي.'
                                    : 'Select instantly from the 64 official pre-approved catalog projects or create your own custom idea.'
                                }
                            </p>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.25rem' }}>
                                <button className="btn btn-primary" onClick={() => openSubmitModal()} style={{ gap: '8px', padding: '0.85rem 1.85rem', fontWeight: 700, fontSize: '0.95rem' }}>
                                    <BookOpen size={18} />
                                    {lang === 'ar' ? 'تصفح المشاريع' : 'Browse Projects'}
                                </button>
                            </div>
                        </div>
                    ) : activeProject && (
                        /* Active Project Space */
                        <div className="trainee-project-workspace">
                            {/* ── 1. Hero Project Banner Card ── */}
                            <div className="project-hero-banner">
                                <div className="hero-banner-main">
                                    <div className="hero-badge-row">
                                        <span className="hero-course-chip">
                                            <BookOpen size={13} /> {activeProject.course_name}
                                        </span>
                                        {getStatusBadge(activeProject.status)}
                                    </div>
                                    <h2 className="hero-project-title">
                                        {activeProject.title || activeProject.title_en || activeProject.title_ar}
                                    </h2>
                                    <div className="hero-meta-row">
                                        <span>
                                            <UserCheck size={14} />
                                            {lang === 'ar' ? 'المدرب المشرف:' : 'Supervisor:'} <strong>{activeProject.reviewer_name || activeProject.effective_trainer_name || (lang === 'ar' ? 'مشرف الدورة' : 'Course Trainer')}</strong>
                                        </span>
                                        <span>
                                            <Users size={14} />
                                            {lang === 'ar' ? 'فريق العمل:' : 'Team:'} <strong>{(activeProject.team_members?.length || 1)} / 5 {lang === 'ar' ? 'أعضاء' : 'Members'}</strong>
                                        </span>
                                        <span>
                                            <Clock size={14} />
                                            {new Date(activeProject.updated_at || activeProject.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="hero-banner-actions">
                                    {isOwner && (activeProject.status === 'approved' || activeProject.status === 'submitted') && (
                                        <button
                                            type="button"
                                            className="btn-hero-action btn-hero-delete"
                                            onClick={(e) => handleDeleteIdea(e, activeProject.id)}
                                            title={lang === 'ar' ? 'حذف فكرة المشروع واختيار فكرة أخرى' : 'Delete Project Proposal & Choose Another'}
                                        >
                                            <Trash2 size={15} />
                                            <span>{lang === 'ar' ? 'حذف واختيار فكرة أخرى' : 'Delete & Restart'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* ── 2. Navigation Tabs Bar ── */}
                            <div className="workspace-tabs-bar">
                                <button
                                    type="button"
                                    className={`ws-tab-btn ${dashboardTab === 'overview' ? 'active' : ''}`}
                                    onClick={() => setDashboardTab('overview')}
                                >
                                    <FileText size={16} />
                                    <span>{lang === 'ar' ? 'نظرة عامة والمقترح الرسمي' : 'Overview & Proposal'}</span>
                                </button>
                                <button
                                    type="button"
                                    className={`ws-tab-btn ${dashboardTab === 'team' ? 'active' : ''}`}
                                    onClick={() => setDashboardTab('team')}
                                >
                                    <Users size={16} />
                                    <span>{lang === 'ar' ? 'فريق العمل والزملاء' : 'My Team & Collaborators'}</span>
                                    <span className="tab-count-pill">
                                        {activeProject.team_members?.length || 1}
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    className={`ws-tab-btn ${dashboardTab === 'docs' ? 'active' : ''}`}
                                    onClick={() => setDashboardTab('docs')}
                                >
                                    <Paperclip size={16} />
                                    <span>{lang === 'ar' ? 'التوثيق وروابط المشروع' : 'Documentation & Links'}</span>
                                    <span className="tab-count-pill">
                                        {projectDocs.length}
                                    </span>
                                </button>
                            </div>

                            {/* ── 3. Tab Contents ── */}
                            <div className="workspace-tab-body">
                                {/* TAB 1: OVERVIEW & OFFICIAL PROPOSAL */}
                                {dashboardTab === 'overview' && (
                                    <div className="tab-pane-content">
                                        {/* Dynamic Milestone Roadmap */}
                                        <div className="milestone-roadmap-wrapper">
                                            <div className="roadmap-header">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Activity size={18} className="text-primary" />
                                                    <h4>{lang === 'ar' ? 'خارطة طريق ومراحل إنجاز المشروع' : 'Project Lifecycle & Milestones'}</h4>
                                                </div>
                                                <span className="roadmap-track-badge">
                                                    {lang === 'ar' ? 'المسار الأكاديمي المعتمد' : 'Official Academic Track'}
                                                </span>
                                            </div>

                                            <div className="roadmap-steps-grid">
                                                {[
                                                    { step: 1, titleEn: 'Idea Registration', titleAr: 'تسجيل الفكرة', descEn: 'Project selected & initialized', descAr: 'تم تسجيل واختيار المشروع', done: true },
                                                    { step: 2, titleEn: 'Academic Review', titleAr: 'المراجعة الأكاديمية', descEn: 'Trainer evaluation & feedback', descAr: 'مراجعة وتقييم المشرف', done: ['approved', 'completed', 'voting', 'changes_requested'].includes(activeProject.status) },
                                                    { step: 3, titleEn: 'Approved & Active', titleAr: 'الاعتماد والتنفيذ', descEn: 'Officially approved for development', descAr: 'اعتماد رسمي وبدء التنفيذ', done: activeProject.status === 'approved' || activeProject.status === 'completed' },
                                                    { step: 4, titleEn: 'Documentation', titleAr: 'التوثيق والتقارير', descEn: 'Reports, code & links submitted', descAr: 'تم رفع التقارير والروابط', done: projectDocs.length > 0 },
                                                    { step: 5, titleEn: 'Final Evaluation', titleAr: 'التقييم النهائي والشهادة', descEn: 'Graded & certificate ready', descAr: 'اكتمال التقييم والشهادة', done: activeProject.status === 'completed' }
                                                ].map(ms => (
                                                    <div key={ms.step} className={`roadmap-step-card ${ms.done ? 'is-done' : ''}`}>
                                                        <div className="step-card-top">
                                                            <span className={`step-number-badge ${ms.done ? 'done' : ''}`}>
                                                                {ms.done ? '✓' : ms.step}
                                                            </span>
                                                            <span className={`step-status-tag ${ms.done ? 'done' : ''}`}>
                                                                {ms.done ? (lang === 'ar' ? 'مكتمل' : 'Done') : (lang === 'ar' ? 'قادم' : 'Pending')}
                                                            </span>
                                                        </div>
                                                        <strong className="step-title">
                                                            {lang === 'ar' ? ms.titleAr : ms.titleEn}
                                                        </strong>
                                                        <p className="step-desc">
                                                            {lang === 'ar' ? ms.descAr : ms.descEn}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Project Key Highlights */}
                                        <div className="project-highlights-grid">
                                            {(activeProject.description || activeProject.description_ar) && !['no description available', 'no description provided', 'لا يوجد وصف متاح'].includes((activeProject.description || activeProject.description_ar).toLowerCase().trim()) && (
                                                <div className="highlight-box">
                                                    <label>{lang === 'ar' ? 'المستخلص ووصف المشروع' : 'Project Abstract'}</label>
                                                    <p>{activeProject.description || activeProject.description_ar}</p>
                                                </div>
                                            )}

                                            {activeProject.problem_statement && (
                                                <div className="highlight-box">
                                                    <label>{lang === 'ar' ? 'المشكلة المستهدفة' : 'Problem Statement'}</label>
                                                    <p>{activeProject.problem_statement}</p>
                                                </div>
                                            )}

                                            {activeProject.expected_output && (
                                                <div className="highlight-box">
                                                    <label>{lang === 'ar' ? 'المخرجات والتسليمات المتوقعة' : 'Expected Deliverables'}</label>
                                                    <p>{activeProject.expected_output}</p>
                                                </div>
                                            )}
                                        </div>

                                        {activeProject.tech_stack && (
                                            <div className="tech-stack-container">
                                                <label>{lang === 'ar' ? 'التقنيات والأدوات المستخدمة' : 'Technologies & Tech Stack'}</label>
                                                <div className="tech-chips-list">
                                                    {activeProject.tech_stack.split(',').map((tech, idx) => (
                                                        <span key={idx} className="tech-chip-item">{tech.trim()}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Official Academic Proposal Viewer (16 Certified Chapters) */}
                                        <ProposalViewer
                                            ideaId={activeProject.id}
                                            documentLabel="proposal"
                                            canEdit={isOwner}
                                            lang={lang}
                                        />
                                    </div>
                                )}

                                {/* TAB 2: MY TEAM & COLLABORATORS */}
                                {dashboardTab === 'team' && (
                                    <div className="tab-pane-content">
                                        {/* Alerts */}
                                        {teamActionSuccess && (
                                            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                                                <CheckCircle2 size={16} /> {teamActionSuccess}
                                            </div>
                                        )}
                                        {teamActionError && (
                                            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                                                <AlertCircle size={16} /> {teamActionError}
                                            </div>
                                        )}

                                        {/* Team Roster Top Bar */}
                                        <div className="team-roster-header">
                                            <div>
                                                <h3>{lang === 'ar' ? 'فريق عمل المشروع' : 'Project Team Members'}</h3>
                                                <p>{lang === 'ar'
                                                    ? 'يمكن لطلاب الدورة العمل معاً كفريق بحد أقصى 5 طلاب لكل مشروع تدريب ميداني.'
                                                    : 'Classmates can collaborate in a team up to 5 members per training project.'}
                                                </p>
                                            </div>
                                            <span className="team-size-counter">
                                                <Users size={16} />
                                                <strong>{activeProject.team_members?.length || 1} / 5 {lang === 'ar' ? 'أعضاء' : 'Members'}</strong>
                                            </span>
                                        </div>

                                        {/* Team Roster Grid Cards */}
                                        <div className="team-cards-grid">
                                            {(activeProject.team_members && activeProject.team_members.length > 0) ? (
                                                activeProject.team_members.map((m, idx) => {
                                                    const isLeader = m.role === 'leader';
                                                    const memberId = m.user_id || m.id;
                                                    const isSelf = memberId === user?.id;

                                                    return (
                                                        <div
                                                            key={memberId || idx}
                                                            className={`team-member-card ${isLeader ? 'is-leader' : ''}`}
                                                            onClick={() => setViewingMember(m)}
                                                        >
                                                            <div className="member-card-avatar">
                                                                {isLeader ? (
                                                                    <div className="leader-crown-badge"><Crown size={14} /></div>
                                                                ) : (
                                                                    <User size={20} />
                                                                )}
                                                            </div>
                                                            <div className="member-card-details">
                                                                <div className="member-name-row">
                                                                    <strong>{m.full_name || m.username || m.email}</strong>
                                                                    <span className={`role-badge ${isLeader ? 'leader' : 'member'}`}>
                                                                        {isLeader ? (lang === 'ar' ? 'قائد الفريق' : 'Team Leader') : (lang === 'ar' ? 'عضو فريق' : 'Member')}
                                                                    </span>
                                                                </div>
                                                                <div className="member-sub-details">
                                                                    {m.student_id && <span>ID: {m.student_id}</span>}
                                                                    {m.major && <span>Major: {m.major}</span>}
                                                                    {m.email && <span className="member-email">{m.email}</span>}
                                                                </div>
                                                            </div>

                                                            {/* Action buttons (only for leader/owner, remove member) */}
                                                            {isOwner && !isLeader && (
                                                                <button
                                                                    type="button"
                                                                    className="btn-remove-member-row"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleRemoveTeamMember(memberId);
                                                                    }}
                                                                    disabled={invitingMember}
                                                                    title={lang === 'ar' ? 'إزالة العضو من الفريق' : 'Remove from team'}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="empty-tab">
                                                    <Users size={32} />
                                                    <p>{lang === 'ar' ? 'لا يوجد أعضاء مضافون بعد' : 'No team members added yet'}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Capacity Full Notification */}
                                        {isOwner && (activeProject.team_members?.length || 1) >= 5 && (
                                            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', fontWeight: 700 }}>
                                                <CheckCircle2 size={20} />
                                                <div>
                                                    <div>{lang === 'ar' ? 'اكتمل أعضاء فريق المشروع (5 من 5 طلاب)' : 'Team Capacity Reached (5 / 5 Members)'}</div>
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)' }}>{lang === 'ar' ? 'تم الوصول للحد الأقصى لعدد الطلاب المسموح به لكل مشروع.' : 'The maximum team limit has been reached for this project.'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Invite / Add Classmates Section (For Leader/Owner, if < 5) ── */}
                                        {isOwner && (activeProject.team_members?.length || 1) < 5 && (
                                            <div className="team-invite-box" ref={teamSearchRef}>
                                                <div className="invite-box-title">
                                                    <UserPlus size={18} className="text-primary" />
                                                    <h4>{lang === 'ar' ? 'إضافة زميل إلى الفريق' : 'Add Classmate to Team'}</h4>
                                                </div>

                                                <div className="invite-inputs-grid">
                                                    {/* Option A: Search Classmates with Autocomplete */}
                                                    <div className="invite-search-col">
                                                        <label>{lang === 'ar' ? 'البحث عن زميل في الدورة بالاسم أو الرقم الجامعي:' : 'Search Enrolled Classmate:'}</label>
                                                        <div className="search-input-wrapper">
                                                            <Search size={16} className="search-icon" />
                                                            <input
                                                                type="text"
                                                                placeholder={lang === 'ar' ? 'ابحث بالاسم، الرقم الجامعي، أو البريد...' : 'Search student by name, student ID, email...'}
                                                                value={teamSearchQuery}
                                                                onChange={e => {
                                                                    setTeamSearchQuery(e.target.value);
                                                                    setTeamSearchOpen(true);
                                                                }}
                                                                onFocus={() => setTeamSearchOpen(true)}
                                                            />
                                                            {loadingTeamCandidates && <Loader2 size={16} className="spin search-spin" />}
                                                        </div>

                                                        {/* Candidates Dropdown Menu */}
                                                        {teamSearchOpen && (
                                                            <div className="team-candidates-dropdown">
                                                                {loadingTeamCandidates ? (
                                                                    <div className="candidate-dropdown-loading">
                                                                        <Loader2 size={16} className="spin" />
                                                                        <span>{lang === 'ar' ? 'جاري البحث...' : 'Searching...'}</span>
                                                                    </div>
                                                                ) : teamCandidates.length === 0 ? (
                                                                    <div className="candidate-dropdown-empty">
                                                                        <User size={20} />
                                                                        <p>{lang === 'ar' ? 'لم يتم العثور على طلاب متاحين في هذه الدورة' : 'No available students found in this course'}</p>
                                                                    </div>
                                                                ) : (
                                                                    <div className="candidate-items-list">
                                                                        {teamCandidates.map(cand => {
                                                                            const isAlreadyInTeam = cand.is_in_team || cand.is_in_other_team;
                                                                            const isAlreadySelected = activeProject.team_members?.some(m => (m.user_id || m.id) === cand.id);

                                                                            return (
                                                                                <div
                                                                                    key={cand.id}
                                                                                    className={`candidate-row-item ${isAlreadyInTeam || isAlreadySelected ? 'disabled' : ''}`}
                                                                                    onClick={() => {
                                                                                        if (!isAlreadyInTeam && !isAlreadySelected) {
                                                                                            handleAddTeamMember(cand.id);
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <div className="cand-avatar">
                                                                                        {cand.full_name ? cand.full_name.charAt(0).toUpperCase() : 'U'}
                                                                                    </div>
                                                                                    <div className="cand-info">
                                                                                        <div className="cand-name-row">
                                                                                            <strong>{cand.full_name}</strong>
                                                                                            {cand.student_id && <span className="cand-id">{cand.student_id}</span>}
                                                                                        </div>
                                                                                        <span className="cand-email">{cand.email}</span>
                                                                                    </div>
                                                                                    <div className="cand-action">
                                                                                        {isAlreadySelected ? (
                                                                                            <span className="cand-badge added"><Check size={12} /> {lang === 'ar' ? 'مضاف' : 'Added'}</span>
                                                                                        ) : isAlreadyInTeam ? (
                                                                                            <span className="cand-badge busy"><AlertTriangle size={12} /> {lang === 'ar' ? 'في فريق آخر' : 'In Another Team'}</span>
                                                                                        ) : (
                                                                                            <button type="button" className="btn-add-cand" disabled={invitingMember}>
                                                                                                <UserPlus size={13} />
                                                                                                {lang === 'ar' ? 'إضافة' : 'Add'}
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
                                                    </div>

                                                    {/* Option B: Direct Add by Student ID / Email */}
                                                    <div className="invite-direct-col">
                                                        <label>{lang === 'ar' ? 'أو إضافة مباشرة بالرقم الجامعي / البريد:' : 'Or Quick Add by Student ID / Email:'}</label>
                                                        <form
                                                            onSubmit={(e) => {
                                                                e.preventDefault();
                                                                if (directInviteInput.trim()) {
                                                                    handleAddTeamMember(0, directInviteInput.trim());
                                                                }
                                                            }}
                                                            style={{ display: 'flex', gap: '8px' }}
                                                        >
                                                            <input
                                                                type="text"
                                                                className="direct-invite-input"
                                                                placeholder={lang === 'ar' ? 'الرقم الجامعي أو البريد...' : 'Student ID or Email...'}
                                                                value={directInviteInput}
                                                                onChange={e => setDirectInviteInput(e.target.value)}
                                                            />
                                                            <button
                                                                type="submit"
                                                                className="btn btn-primary"
                                                                disabled={invitingMember || !directInviteInput.trim()}
                                                                style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem', flexShrink: 0, fontWeight: 700 }}
                                                            >
                                                                {invitingMember ? <Loader2 size={16} className="spin" /> : <UserPlus size={16} />}
                                                                <span>{lang === 'ar' ? 'إضافة' : 'Add'}</span>
                                                            </button>
                                                        </form>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Guidelines Info Note */}
                                        <div className="team-guidelines-note">
                                            <Shield size={18} className="text-primary" />
                                            <p>
                                                {lang === 'ar'
                                                    ? 'ملاحظة: تكوين الفريق متاح لقائد المشروع. كل طالب يمكنه الانضمام إلى مشروع واحد فقط في نفس الدورة التدريبية.'
                                                    : 'Note: Team members can be managed by the team leader. Each student can participate in only 1 project per training course.'
                                                }
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: DOCUMENTATION & DELIVERABLES */}
                                {dashboardTab === 'docs' && (
                                    <div className="tab-pane-content">
                                        {/* Alerts */}
                                        {docSuccess && (
                                            <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                                                <CheckCircle2 size={16} /> {docSuccess}
                                            </div>
                                        )}
                                        {docError && (
                                            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                                                <AlertCircle size={16} /> {docError}
                                            </div>
                                        )}

                                        {/* Submissions Container (File Upload & Links) */}
                                        <div className="docs-submission-grid">
                                            {/* Box 1: File Upload */}
                                            <div className="doc-action-card">
                                                <div className="doc-card-title">
                                                    <FileText size={18} className="text-primary" />
                                                    <h4>{lang === 'ar' ? 'رفع ملفات وتقارير المشروع' : 'Upload Project Files & Reports'}</h4>
                                                </div>
                                                <p className="doc-card-subtitle">
                                                    {lang === 'ar'
                                                        ? 'ارفع التقرير النهائي (PDF/Word) أو الكود المصدري (ZIP) أو العرض التقديمي (PPTX).'
                                                        : 'Upload your final report (PDF/DOCX), code archive (ZIP), or presentation (PPTX).'
                                                    }
                                                </p>

                                                <form onSubmit={handleFileUploadDirect} className="direct-upload-form">
                                                    <div className="file-dropzone-box">
                                                        <input
                                                            type="file"
                                                            required
                                                            onChange={e => {
                                                                if (e.target.files[0]) {
                                                                    setDocFile(e.target.files[0]);
                                                                    if (!docFileTitle) {
                                                                        const cleanName = e.target.files[0].name.replace(/\.[^/.]+$/, "");
                                                                        setDocFileTitle(cleanName);
                                                                    }
                                                                }
                                                            }}
                                                        />
                                                        <div className="dropzone-content">
                                                            <Upload size={24} className="text-primary" />
                                                            {docFile ? (
                                                                <strong className="selected-filename">
                                                                    {docFile.name} ({(docFile.size / (1024 * 1024)).toFixed(2)} MB)
                                                                </strong>
                                                            ) : (
                                                                <>
                                                                    <strong>{lang === 'ar' ? 'اختر أو اسحب الملف هنا' : 'Click or drop file here'}</strong>
                                                                    <span>{lang === 'ar' ? 'PDF, DOCX, ZIP, PPTX (حتى 50 ميجابايت)' : 'PDF, DOCX, ZIP, PPTX (Up to 50MB)'}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '0.75rem' }}>
                                                        <input
                                                            type="text"
                                                            required
                                                            className="doc-title-input"
                                                            placeholder={lang === 'ar' ? 'عنوان أو مسمى الملف (مطلوب)...' : 'File title / description (required)...'}
                                                            value={docFileTitle}
                                                            onChange={e => setDocFileTitle(e.target.value)}
                                                        />
                                                        <button
                                                            type="submit"
                                                            className="btn btn-primary"
                                                            disabled={uploadingDoc || !docFile || !docFileTitle.trim()}
                                                            style={{ padding: '0.55rem 1.25rem', fontWeight: 700, flexShrink: 0 }}
                                                        >
                                                            {uploadingDoc ? <Loader2 size={16} className="spin" /> : <Upload size={16} />}
                                                            <span>{lang === 'ar' ? 'رفع الملف' : 'Upload File'}</span>
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>

                                            {/* Box 2: Link Submissions (GitHub, Demo, Video, Figma) */}
                                            <div className="doc-action-card">
                                                <div className="doc-card-title">
                                                    <ExternalLink size={18} className="text-primary" />
                                                    <h4>{lang === 'ar' ? 'إضافة روابط المشروع الخارجية' : 'Add External Project Links'}</h4>
                                                </div>
                                                <p className="doc-card-subtitle">
                                                    {lang === 'ar'
                                                        ? 'أضف رابط مستودع GitHub، العرض المباشر (Demo)، فيديو الشرح، أو تصميم Figma.'
                                                        : 'Submit your GitHub repo, live deployment, demo video, or Figma prototype.'
                                                    }
                                                </p>

                                                {/* Link Type Pills */}
                                                <div className="link-type-pills">
                                                    {[
                                                        { key: 'github', label: 'GitHub Repo', icon: Code },
                                                        { key: 'demo', label: lang === 'ar' ? 'عرض مباشر' : 'Live Demo', icon: Globe },
                                                        { key: 'video', label: lang === 'ar' ? 'فيديو الشرح' : 'Video Demo', icon: Video },
                                                        { key: 'figma', label: 'Figma UI', icon: Layers },
                                                    ].map(lt => {
                                                        const Icon = lt.icon;
                                                        return (
                                                            <button
                                                                key={lt.key}
                                                                type="button"
                                                                className={`link-pill-btn ${linkType === lt.key ? 'active' : ''}`}
                                                                onClick={() => setLinkType(lt.key)}
                                                            >
                                                                <Icon size={14} />
                                                                <span>{lt.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <form onSubmit={handleLinkSubmitDirect} className="direct-link-form">
                                                    <div className="link-inputs-stack">
                                                        <input
                                                            type="url"
                                                            required
                                                            className="doc-title-input"
                                                            placeholder={linkType === 'github' ? 'https://github.com/username/project' : 'https://...'}
                                                            value={linkUrl}
                                                            onChange={e => setLinkUrl(e.target.value)}
                                                        />
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            <input
                                                                type="text"
                                                                className="doc-title-input"
                                                                placeholder={lang === 'ar' ? 'اسم أو وصف الرابط (اختياري)...' : 'Link title / label (optional)...'}
                                                                value={linkTitle}
                                                                onChange={e => setLinkTitle(e.target.value)}
                                                            />
                                                            <button
                                                                type="submit"
                                                                className="btn btn-primary"
                                                                disabled={uploadingDoc || !linkUrl.trim()}
                                                                style={{ padding: '0.55rem 1.25rem', fontWeight: 700, flexShrink: 0 }}
                                                            >
                                                                {uploadingDoc ? <Loader2 size={16} className="spin" /> : <Plus size={16} />}
                                                                <span>{lang === 'ar' ? 'حفظ الرابط' : 'Save Link'}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>

                                        {/* ── Uploaded Deliverables & Links List ── */}
                                        <div className="deliverables-list-box">
                                            <div className="deliverables-header">
                                                <h4>{lang === 'ar' ? 'التسليمات والروابط المرفوعة' : 'Submitted Deliverables & Links'}</h4>
                                                <span className="deliverables-count">{projectDocs.length} {lang === 'ar' ? 'عناصر' : 'Items'}</span>
                                            </div>

                                            {loadingDocs ? (
                                                <div className="deliverables-loading">
                                                    <Loader2 size={20} className="spin" />
                                                    <span>{lang === 'ar' ? 'جاري التحميل...' : 'Loading deliverables...'}</span>
                                                </div>
                                            ) : projectDocs.length === 0 ? (
                                                <div className="deliverables-empty">
                                                    <FileText size={32} strokeWidth={1} />
                                                    <p>{lang === 'ar' ? 'لم يتم رفع أي وثائق أو روابط بعد.' : 'No project documents or links submitted yet.'}</p>
                                                </div>
                                            ) : (
                                                <div className="deliverables-cards-list">
                                                    {projectDocs.map(d => {
                                                        const isLink = ['link', 'github', 'demo', 'figma', 'video'].includes(d.doc_type) || (d.file_url && d.file_url.startsWith('http') && !d.file_url.includes('/uploads/'));
                                                        const isGitHub = d.doc_type === 'github' || (d.file_url && d.file_url.includes('github.com'));
                                                        const isVideo = d.doc_type === 'video' || (d.file_url && (d.file_url.includes('youtube.com') || d.file_url.includes('youtu.be') || d.file_url.includes('vimeo.com')));
                                                        const isFigma = d.doc_type === 'figma' || (d.file_url && d.file_url.includes('figma.com'));

                                                        return (
                                                            <div key={d.id} className="deliverable-item-row">
                                                                <div className={`deliverable-icon-box ${isLink ? 'link-type' : 'file-type'}`}>
                                                                    {isGitHub ? <Code size={20} /> : isVideo ? <Video size={20} /> : isFigma ? <Layers size={20} /> : isLink ? <Globe size={20} /> : <FileText size={20} />}
                                                                </div>

                                                                <div className="deliverable-info-col">
                                                                    <div className="deliverable-title-row">
                                                                        <strong className="deliverable-name">{d.file_name}</strong>
                                                                        {isLink && <span className={`deliverable-type-badge ${d.doc_type}`}>{d.doc_type}</span>}
                                                                    </div>
                                                                    <div className="deliverable-meta-row">
                                                                        {d.file_size > 0 && <span><HardDrive size={13} /> {(d.file_size / (1024 * 1024)).toFixed(2)} MB</span>}
                                                                        <span><Clock size={13} /> {new Date(d.uploaded_at).toLocaleDateString()}</span>
                                                                        {d.trainee_name && <span><User size={13} /> {d.trainee_name}</span>}
                                                                    </div>
                                                                </div>

                                                                <div className="deliverable-actions-col">
                                                                    {isLink ? (
                                                                        <a
                                                                            href={d.file_url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="btn btn-sm btn-outline-primary"
                                                                        >
                                                                            <ExternalLink size={14} />
                                                                            <span>{lang === 'ar' ? 'فتح الرابط' : 'Open Link'}</span>
                                                                        </a>
                                                                    ) : (
                                                                        <a
                                                                            href={d.file_url}
                                                                            download
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="btn btn-sm btn-primary"
                                                                        >
                                                                            <Download size={14} />
                                                                            <span>{lang === 'ar' ? 'تنزيل' : 'Download'}</span>
                                                                        </a>
                                                                    )}

                                                                    {(d.trainee_id === user?.id || isOwner || isAdmin) && (
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-ghost text-danger"
                                                                            onClick={() => handleDeleteDoc(d.id)}
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
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                EVALUATOR VIEW (Trainers & Admins)
            ════════════════════════════════════════════════════════════════ */}
            {isEvaluator && (
                <>
                    {/* Filter Card */}
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
                                    <option value="submitted">{lang === 'ar' ? 'قيد المراجعة' : 'Under Review'}</option>
                                    <option value="voting">{lang === 'ar' ? 'قيد التصويت' : 'In Voting'}</option>
                                    <option value="approved">{lang === 'ar' ? 'معتمدة' : 'Approved'}</option>
                                    <option value="completed">{lang === 'ar' ? 'مكتملة' : 'Completed'}</option>
                                    <option value="changes_requested">{lang === 'ar' ? 'مطلوب تعديلات' : 'Changes Requested'}</option>
                                    <option value="rejected">{lang === 'ar' ? 'مرفوضة' : 'Rejected'}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Projects Grid for Evaluators */}
                    {loading ? (
                        <div className="loading-state">
                            <Loader2 className="spin" size={32} />
                            <p>{lang === 'ar' ? 'جاري تحميل المشاريع...' : 'Loading submitted projects...'}</p>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="empty-state-card">
                            <FileText size={48} strokeWidth={1} />
                            <h3>{lang === 'ar' ? 'لا توجد مشاريع مقدّمة' : 'No Submitted Projects Found'}</h3>
                            <p>{lang === 'ar' ? 'لم يقم المتدربون بتقديم أي مقترحات مشاريع تطابق خيارات التصفية.' : 'No trainees have submitted project proposals matching your filters.'}</p>
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
                                            {project.title || project.title_ar || project.title_en}
                                        </h3>
                                        <div className="course-tag">
                                            <BookOpen size={13} />
                                            <span>{project.course_name}</span>
                                        </div>

                                        <p className="project-desc">
                                            {project.description || project.description_ar || project.problem_statement || (lang === 'ar' ? 'لا يوجد وصف متاح' : 'No description provided')}
                                        </p>

                                        {project.team_members && project.team_members.length > 1 && (
                                            <div className="card-team-roster" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                                <Users size={13} style={{ color: 'var(--text-muted)' }} />
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                    {lang === 'ar' ? 'فريق العمل:' : 'Team:'}
                                                </span>
                                                {project.team_members.map(m => (
                                                    <span
                                                        key={m.user_id || m.id}
                                                        style={{
                                                            fontSize: '0.72rem',
                                                            padding: '0.12rem 0.5rem',
                                                            borderRadius: '4px',
                                                            background: m.role === 'leader' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(59, 130, 246, 0.08)',
                                                            color: m.role === 'leader' ? '#d97706' : '#2563eb',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {m.role === 'leader' && <Crown size={11} style={{ marginRight: '3px' }} />}
                                                        {m.full_name || m.username}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="project-card-footer">
                                        <span className="submission-date">
                                            {new Date(project.updated_at || project.created_at).toLocaleDateString()}
                                        </span>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadProjectDocx(project.id, project.title_en || project.title)}
                                                disabled={downloadingDocxId === project.id}
                                                className="btn btn-sm btn-outline-primary"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: downloadingDocxId === project.id ? 'wait' : 'pointer' }}
                                            >
                                                {downloadingDocxId === project.id ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                                                <span>{downloadingDocxId === project.id ? '...' : 'Word (.docx)'}</span>
                                            </button>

                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={() => {
                                                    setActiveProject(project);
                                                    setFeedback(project.feedback || '');
                                                    setVoteNotes(project.vote_summary?.my_notes || '');
                                                    setEvalTab('proposal');
                                                    fetchProjectDocs(project.id);
                                                }}
                                            >
                                                {lang === 'ar' ? 'مراجعة وتقييم' : 'Review & Evaluate'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                EVALUATOR REVIEW & EVALUATION MODAL (FULL STUDIO)
            ════════════════════════════════════════════════════════════════ */}
            {isEvaluator && activeProject && (
                <div className="eval-modal-overlay" onClick={() => setActiveProject(null)}>
                    <div className="eval-modal-box" onClick={e => e.stopPropagation()}>
                        <div className="eval-modal-header">
                            <div className="eval-modal-header-left">
                                <div className="eval-modal-title-row">
                                    <h2>{activeProject.title || activeProject.title_en || activeProject.title_ar}</h2>
                                    {getStatusBadge(activeProject.status)}
                                </div>
                                <div className="eval-modal-meta">
                                    <span><strong>{lang === 'ar' ? 'المقرر:' : 'Course:'}</strong> {activeProject.course_name}</span>
                                    <span>•</span>
                                    <span><strong>{lang === 'ar' ? 'الطالب:' : 'Student:'}</strong> {activeProject.trainee_name} ({activeProject.student_id || activeProject.trainee_email})</span>
                                    {activeProject.category && (
                                        <>
                                            <span>•</span>
                                            <span className="source-tag">{activeProject.category}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="eval-modal-header-right">
                                <button
                                    type="button"
                                    onClick={() => handleDownloadProjectDocx(activeProject.id, activeProject.title_en || activeProject.title)}
                                    disabled={downloadingDocxId === activeProject.id}
                                    className="btn btn-sm btn-outline-primary"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: downloadingDocxId === activeProject.id ? 'wait' : 'pointer' }}
                                >
                                    {downloadingDocxId === activeProject.id ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
                                    <span>{downloadingDocxId === activeProject.id ? (lang === 'ar' ? 'جارٍ التحميل...' : 'Downloading...') : 'Word (.docx)'}</span>
                                </button>
                                <button className="eval-modal-close-btn" onClick={() => setActiveProject(null)}>
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="eval-modal-split-body">
                            {/* Main Document / Deliverables Pane */}
                            <div className="eval-modal-main-pane">
                                <div className="eval-pane-tabs">
                                    <button
                                        type="button"
                                        className={`eval-pane-tab ${evalTab === 'proposal' ? 'active' : ''}`}
                                        onClick={() => setEvalTab('proposal')}
                                    >
                                        <FileText size={16} />
                                        {lang === 'ar' ? 'المقترح الأكاديمي والتوثيق' : 'Academic Proposal Document'}
                                    </button>
                                    <button
                                        type="button"
                                        className={`eval-pane-tab ${evalTab === 'deliverables' ? 'active' : ''}`}
                                        onClick={() => setEvalTab('deliverables')}
                                    >
                                        <Paperclip size={16} />
                                        {lang === 'ar' ? 'التسليمات والملفات المرفوعة' : 'Submitted Deliverables'}
                                        {projectDocs.length > 0 && <span className="tab-count-badge">{projectDocs.length}</span>}
                                    </button>
                                </div>

                                <div className="eval-pane-content">
                                    {evalTab === 'proposal' && (
                                        <div className="eval-proposal-wrapper">
                                            <ProposalViewer
                                                ideaId={activeProject.id}
                                                documentLabel="proposal"
                                                canEdit={false}
                                                lang={lang}
                                            />
                                        </div>
                                    )}

                                    {evalTab === 'deliverables' && (
                                        <div className="eval-deliverables-wrapper">
                                            <h4>
                                                <Paperclip size={18} />
                                                {lang === 'ar' ? 'ملفات وتسليمات المشروع' : 'Project Files & Deliverables'}
                                            </h4>
                                            {projectDocs.length === 0 ? (
                                                <div className="eval-empty-docs">
                                                    <FileText size={40} className="text-muted" />
                                                    <p>{lang === 'ar' ? 'لم يقم الطالب برفع أي ملفات أو روابط إضافية بعد.' : 'No uploaded files or links for this project yet.'}</p>
                                                </div>
                                            ) : (
                                                <div className="eval-docs-list">
                                                    {projectDocs.map(d => {
                                                        const isLink = ['link', 'github', 'demo', 'figma', 'video'].includes(d.doc_type) || (d.file_url && d.file_url.startsWith('http') && !d.file_url.includes('/uploads/'));
                                                        return (
                                                            <div key={d.id} className="eval-doc-card">
                                                                <div className="eval-doc-card-info">
                                                                    {isLink ? <ExternalLink size={18} className="text-primary" /> : <FileText size={18} className="text-primary" />}
                                                                    <div>
                                                                        <strong className="eval-doc-name">{d.file_name}</strong>
                                                                        {isLink && <span className="source-tag">{d.doc_type}</span>}
                                                                    </div>
                                                                </div>
                                                                <a href={d.file_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">
                                                                    {isLink ? (lang === 'ar' ? 'فتح الرابط' : 'Open Link') : (lang === 'ar' ? 'تنزيل' : 'Download')}
                                                                </a>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Supervisor Evaluation Controls Sidebar */}
                            <div className="eval-modal-side-pane">
                                <div className="eval-sidebar-card">
                                    <div className="eval-sidebar-header">
                                        <Award size={22} className="text-primary" />
                                        <div>
                                            <h3>{lang === 'ar' ? 'لوحة تقييم واعتماد المشرف' : 'Supervisor Evaluation'}</h3>
                                            <p>{lang === 'ar' ? 'اتخاذ القرار الأكاديمي وتوجيه الملاحظات' : 'Review deliverables & decide'}</p>
                                        </div>
                                    </div>

                                    {evalSuccess && <div className="alert alert-success">{evalSuccess}</div>}
                                    {error && <div className="alert alert-error">{error}</div>}

                                    <div className="eval-feedback-group">
                                        <label>
                                            {lang === 'ar' ? 'ملاحظات وتوجيهات المشرف:' : 'Supervisor Feedback & Notes:'}
                                        </label>
                                        <textarea
                                            rows={5}
                                            placeholder={lang === 'ar' ? 'أدخل ملاحظاتك وتوجيهاتك للطالب للتعديل أو المتابعة...' : 'Enter feedback, guidance, or revision instructions for the student...'}
                                            value={feedback}
                                            onChange={e => setFeedback(e.target.value)}
                                        />
                                    </div>

                                    <div className="eval-action-buttons">
                                        <button
                                            type="button"
                                            className="btn-eval-approve"
                                            disabled={evaluating}
                                            onClick={() => handleEvaluate('approved')}
                                        >
                                            <CheckCircle2 size={20} />
                                            <div>
                                                <strong>{lang === 'ar' ? 'اعتماد وقبول المشروع' : 'Approve Project'}</strong>
                                                <span>{lang === 'ar' ? 'الموافقة على الفكرة والبدء بالتنفيذ' : 'Accept proposal & start work'}</span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            className="btn-eval-complete"
                                            disabled={evaluating}
                                            onClick={() => handleEvaluate('completed')}
                                        >
                                            <Award size={20} />
                                            <div>
                                                <strong>{lang === 'ar' ? 'تحديد كمكتمل وناجح' : 'Mark as Completed'}</strong>
                                                <span>{lang === 'ar' ? 'اكتمال التدريب واجتياز المتطلبات' : 'Final completion & success'}</span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            className="btn-eval-changes"
                                            disabled={evaluating}
                                            onClick={() => handleEvaluate('changes_requested')}
                                        >
                                            <AlertCircle size={20} />
                                            <div>
                                                <strong>{lang === 'ar' ? 'طلب تعديلات من الطالب' : 'Request Changes'}</strong>
                                                <span>{lang === 'ar' ? 'إعادة الفكرة للطالب للتعديل' : 'Return for student revision'}</span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            className="btn-eval-reject"
                                            disabled={evaluating}
                                            onClick={() => handleEvaluate('rejected')}
                                        >
                                            <XCircle size={20} />
                                            <div>
                                                <strong>{lang === 'ar' ? 'رفض الفكرة' : 'Reject Idea'}</strong>
                                                <span>{lang === 'ar' ? 'عدم ملائمة الفكرة للمشروع' : 'Reject proposal'}</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                64 OFFICIAL CATALOG & SUBMISSION MODAL
            ════════════════════════════════════════════════════════════════ */}
            {showSubmitModal && (
                <div className="modal-overlay" onClick={() => setShowSubmitModal(false)}>
                    <div className="modal-box modal-lg submit-idea-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header fancy-modal-header">
                            <div className="modal-header-title-group">
                                <div className="modal-header-icon-badge">
                                    <Sparkles size={24} className="glowing-sparkle-icon" />
                                </div>
                                <div>
                                    <h2>{editingIdeaId
                                        ? (lang === 'ar' ? 'تعديل فكرة المشروع' : 'Edit Project Idea')
                                        : (lang === 'ar' ? 'تقديم أو اختيار فكرة مشروع جديدة' : 'Submit / Select New Project Idea')
                                    }</h2>
                                    <p className="modal-subtext">
                                        {lang === 'ar' ? 'اختر فكرة معتمدة أو أنشئ فكرتك الخاصة للمراجعة والتقييم' : 'Choose a certified idea or submit your own for evaluation.'}
                                    </p>
                                </div>
                            </div>
                            <button className="modal-close-icon-btn" onClick={() => setShowSubmitModal(false)}>
                                <X size={20} />
                            </button>
                        </div>

                        {error && <div className="alert alert-error" style={{ margin: '1rem 1.5rem 0 1.5rem' }}>{error}</div>}

                        {/* Submission Mode Tabs */}
                        <div className="catalog-mode-tabs" style={{ margin: '0.75rem 1.5rem 1rem 1.5rem' }}>
                            <button
                                type="button"
                                className={`catalog-mode-tab ${submissionTab === 'catalog' ? 'active' : ''}`}
                                onClick={() => setSubmissionTab('catalog')}
                            >
                                <BookOpen size={16} />
                                <span>{lang === 'ar' ? 'اختيار من دليل المشاريع (64 فكرة معتمدة)' : 'Choose from 64 Official Projects Catalog'}</span>
                                <span className="catalog-instant-badge" style={{ padding: '1px 6px', fontSize: '0.7rem' }}>
                                    <Zap size={11} /> {lang === 'ar' ? 'فوري' : 'Instant'}
                                </span>
                            </button>
                            <button
                                type="button"
                                className={`catalog-mode-tab ${submissionTab === 'custom' ? 'active' : ''}`}
                                onClick={() => setSubmissionTab('custom')}
                            >
                                <Edit3 size={16} />
                                <span>{lang === 'ar' ? 'إنشاء فكرتي الخاصة (ERTH AI)' : 'Create My Own Idea (ERTH AI)'}</span>
                            </button>
                        </div>

                        {/* TAB 1: 64 OFFICIAL PROJECTS CATALOG */}
                        {submissionTab === 'catalog' && (
                            <div className="modal-body-content fancy-modal-body catalog-view-body" style={{ padding: '0.75rem 1.5rem 1rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                <div className="catalog-control-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', background: '#f8fafc', padding: '0.65rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
                                        <BookOpen size={16} className="text-primary" />
                                        <label style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: '#1e293b', whiteSpace: 'nowrap' }}>
                                            {lang === 'ar' ? 'الدورة المستهدفة:' : 'Target Course:'}
                                        </label>
                                        <select
                                            required
                                            value={submitCourseId}
                                            onChange={e => setSubmitCourseId(e.target.value)}
                                            disabled={!isEvaluator && courses.length === 0}
                                            className="catalog-course-select"
                                            style={{ flex: 1, maxWidth: '320px', padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                                        >
                                            <option value="">{lang === 'ar' ? '-- اختر الدورة التدريبية --' : '-- Select Training Course --'}</option>
                                            {(isEvaluator ? (allActiveCourses.length > 0 ? allActiveCourses : courses) : courses).map(c => (
                                                <option key={c.id} value={c.id}>
                                                    {c.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="catalog-instant-badge" style={{ padding: '4px 12px', fontSize: '0.75rem' }}>
                                        <Sparkles size={13} />
                                        <span>{lang === 'ar' ? 'دليل الأفكار المعتمد رسمياً' : 'Official Pre-Approved Catalog'}</span>
                                    </div>
                                </div>

                                <div className="catalog-filter-bar" style={{ marginBottom: '0.75rem' }}>
                                    <div className="catalog-category-pills">
                                        {[
                                            { key: 'all', labelEn: 'All (64)', labelAr: 'الكل (64)' },
                                            { key: 'software', labelEn: 'Software / AI (24)', labelAr: 'برمجيات وذكاء اصطناعي (24)' },
                                            { key: 'yanshee', labelEn: 'Yanshee Robots (15)', labelAr: 'روبوت يانشي (15)' },
                                            { key: 'nao', labelEn: 'NAO Robots (15)', labelAr: 'روبوت ناو (15)' },
                                            { key: 'integrated', labelEn: 'Integrated (10)', labelAr: 'مشاريع مدمجة (10)' },
                                        ].map(tab => (
                                            <button
                                                key={tab.key}
                                                type="button"
                                                className={`catalog-category-pill ${catalogCategory === tab.key ? 'active' : ''}`}
                                                onClick={() => setCatalogCategory(tab.key)}
                                            >
                                                {lang === 'ar' ? tab.labelAr : tab.labelEn}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="catalog-search-box">
                                        <Search size={15} />
                                        <input
                                            type="text"
                                            placeholder={lang === 'ar' ? 'بحث في دليل المشاريع الـ 64...' : 'Search 64 projects catalog...'}
                                            value={catalogSearch}
                                            onChange={e => setCatalogSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {catalogError && (
                                    <div className="alert alert-error" style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                        <span>{catalogError}</span>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => fetchCatalogProjects(true)}
                                            style={{ padding: '3px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <RefreshCw size={12} /> {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                                        </button>
                                    </div>
                                )}

                                {loadingCatalog ? (
                                    <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                                        <Loader2 className="spin" size={28} style={{ color: '#3b82f6' }} />
                                        <p style={{ marginTop: '0.75rem', color: '#94a3b8', fontSize: '0.9rem' }}>
                                            {lang === 'ar' ? 'جاري تحميل دليل المشاريع الـ 64 المعتمدة...' : 'Loading 64 official project ideas...'}
                                        </p>
                                    </div>
                                ) : (() => {
                                    const filtered = catalogProjects.filter(p => {
                                        if (catalogCategory !== 'all' && p.category !== catalogCategory) return false;
                                        if (catalogSearch.trim()) {
                                            const q = catalogSearch.toLowerCase();
                                            return (p.title || '').toLowerCase().includes(q) ||
                                                (p.skills || '').toLowerCase().includes(q) ||
                                                (p.level || '').toLowerCase().includes(q);
                                        }
                                        return true;
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <div style={{ textAlign: 'center', padding: '3rem 2rem', color: 'var(--text-2, #64748b)', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '12px', border: '1px dashed var(--border, #cbd5e1)' }}>
                                                <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: '0 0 0.35rem 0', color: 'var(--text-0, #0f172a)' }}>
                                                    {lang === 'ar' ? 'لم يتم العثور على أفكار مشاريع مطابقة للبحث' : 'No project templates found matching your search'}
                                                </p>
                                                <p style={{ fontSize: '0.85rem', margin: 0 }}>
                                                    {lang === 'ar' ? 'جرب البحث بكلمات أخرى أو اختر تصنيفاً مختلفاً.' : 'Try searching with different keywords or select another category filter.'}
                                                </p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="catalog-grid-64">
                                            {filtered.map(p => {
                                                const isSelected = selectedCatalogId === p.id;
                                                return (
                                                    <div
                                                        key={p.id}
                                                        className={`catalog-item-card ${isSelected ? 'selected' : ''}`}
                                                        onClick={() => handleSelectCatalogIdea(p)}
                                                    >
                                                        <div>
                                                            <div className="catalog-item-top">
                                                                <span className="catalog-item-id">#{p.id}</span>
                                                                <span className={`category-tag ${p.category}`}>{p.category}</span>
                                                            </div>
                                                            <h4>{p.title}</h4>
                                                            <p className="catalog-item-skills">
                                                                <strong>{p.level}</strong>{p.skills ? ` • ${p.skills}` : ''}
                                                            </p>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="btn-select-catalog-item"
                                                            disabled={selectingCatalog}
                                                        >
                                                            {isSelected ? (
                                                                <>
                                                                    <CheckCircle2 size={14} style={{ color: '#22c55e' }} />
                                                                    <span>{lang === 'ar' ? 'تم اختيار الفكرة' : 'Selected Idea'}</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Zap size={14} />
                                                                    <span>{lang === 'ar' ? 'اختيار وتجهيز المقترح فوراً' : 'Select & View Proposal'}</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* TAB 2: CUSTOM IDEA WITH ERTH AI */}
                        {submissionTab === 'custom' && (
                            <form onSubmit={handleSubmitIdea} className="custom-idea-form">
                                {/* AI Proposal Synthesis Assistant */}
                                <div className="custom-ai-hero-box">
                                    <div className="custom-ai-hero-header">
                                        <Sparkles size={18} className="text-primary" />
                                        <strong>
                                            {lang === 'ar' ? 'المساعد الذكي لتوليد المقترح الأكاديمي' : 'AI Proposal Synthesis Engine'}
                                        </strong>
                                    </div>
                                    <p className="custom-ai-hero-desc">
                                        {lang === 'ar'
                                            ? 'اكتب عنوان الفكرة أو كلمات مفتاحية مختصرة وسيقوم الذكاء الاصطناعي ببناء المقترح الكامل والفصول الرسمية تلقائياً.'
                                            : 'Enter keywords or a summary to auto-generate the complete academic proposal chapters and tech stack.'}
                                    </p>
                                    <div className="custom-ai-input-group">
                                        <input
                                            type="text"
                                            value={aiKeyword}
                                            onChange={e => setAiKeyword(e.target.value)}
                                            placeholder={lang === 'ar' ? 'مثال: نظام ذكي للرؤية الحاسوبية والملاحة الذاتية...' : 'e.g. Smart Computer Vision and Autonomous Navigation...'}
                                            className="custom-form-input"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleGenerateAiProposal}
                                            disabled={generatingAi || !aiKeyword.trim()}
                                            className="btn btn-primary btn-ai-generate"
                                        >
                                            {generatingAi ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}
                                            <span>{generatingAi ? (lang === 'ar' ? 'جاري التوليد...' : 'Generating...') : (lang === 'ar' ? 'توليد بالذكاء الاصطناعي' : 'Generate with AI')}</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="custom-form-grid">
                                    <div className="custom-form-group">
                                        <label>{lang === 'ar' ? 'الدورة التدريبية' : 'Training Course'} *</label>
                                        <select
                                            required
                                            value={submitCourseId}
                                            onChange={e => setSubmitCourseId(e.target.value)}
                                            className="custom-form-select"
                                        >
                                            <option value="">{lang === 'ar' ? '-- اختر الدورة التدريبية --' : '-- Select Training Course --'}</option>
                                            {(isEvaluator ? (allActiveCourses.length > 0 ? allActiveCourses : courses) : courses).map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="custom-form-group">
                                        <label>{lang === 'ar' ? 'عنوان المشروع' : 'Project Title'} *</label>
                                        <input
                                            type="text"
                                            required
                                            value={submitTitleEn}
                                            onChange={e => setSubmitTitleEn(e.target.value)}
                                            className="custom-form-input"
                                            placeholder={lang === 'ar' ? 'عنوان المشروع المقترح...' : 'Proposed Project Title...'}
                                        />
                                    </div>
                                </div>

                                <div className="custom-form-group">
                                    <label>{lang === 'ar' ? 'وصف ومستخلص المشروع' : 'Project Description / Abstract'} *</label>
                                    <textarea
                                        rows={3}
                                        required
                                        value={submitDescEn}
                                        onChange={e => setSubmitDescEn(e.target.value)}
                                        className="custom-form-textarea"
                                        placeholder={lang === 'ar' ? 'شرح مختصر لأهداف وفكرة المشروع...' : 'Detailed description and executive summary...'}
                                    />
                                </div>

                                <div className="custom-form-grid">
                                    <div className="custom-form-group">
                                        <label>{lang === 'ar' ? 'المشكلة المستهدفة' : 'Problem Statement'}</label>
                                        <textarea
                                            rows={2}
                                            value={submitProblemStmt}
                                            onChange={e => setSubmitProblemStmt(e.target.value)}
                                            className="custom-form-textarea"
                                            placeholder={lang === 'ar' ? 'ما هي المشكلة الواقعية التي يعالجها المشروع؟' : 'What real-world problem does this solve?'}
                                        />
                                    </div>

                                    <div className="custom-form-group">
                                        <label>{lang === 'ar' ? 'المخرجات والتسليمات المتوقعة' : 'Expected Deliverables'}</label>
                                        <textarea
                                            rows={2}
                                            value={submitExpectedOutput}
                                            onChange={e => setSubmitExpectedOutput(e.target.value)}
                                            className="custom-form-textarea"
                                            placeholder={lang === 'ar' ? 'النماذج الأولية، الكود، التقارير المرفوعة...' : 'Prototypes, code repository, final report...'}
                                        />
                                    </div>
                                </div>

                                <div className="custom-form-group">
                                    <label>{lang === 'ar' ? 'التقنيات والأدوات المستخدمة' : 'Technologies & Tech Stack'}</label>
                                    <input
                                        type="text"
                                        value={submitTechStack}
                                        onChange={e => setSubmitTechStack(e.target.value)}
                                        className="custom-form-input"
                                        placeholder="Python, OpenCV, PyTorch, ROS2, Flask, React..."
                                    />
                                </div>

                                <div className="custom-form-actions">
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowSubmitModal(false)}>
                                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-submit-project" disabled={submittingIdea}>
                                        {submittingIdea ? <Loader2 className="spin" size={16} /> : <CheckCircle2 size={16} />}
                                        <span>{lang === 'ar' ? 'تقديم الفكرة واعتمادها' : 'Submit Project Proposal'}</span>
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                MEMBER DETAILS POPUP MODAL
            ════════════════════════════════════════════════════════════════ */}
            {viewingMember && (
                <MemberDetailModal
                    member={viewingMember}
                    onClose={() => setViewingMember(null)}
                />
            )}

            {/* ═══════════════════════════════════════════════════════════════
                DELETE CONFIRMATION MODAL
            ════════════════════════════════════════════════════════════════ */}
            {confirmDeleteId && (
                <div className="modal-overlay" onClick={() => setConfirmDeleteId(null)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '1.5rem', borderRadius: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>{lang === 'ar' ? 'تأكيد حذف فكرة المشروع' : 'Delete Project Proposal?'}</h3>
                                <p style={{ margin: '2px 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{lang === 'ar' ? 'هذا الإجراء نهائي ولا يمكن التراجع عنه.' : 'This action cannot be undone.'}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-ghost" onClick={() => setConfirmDeleteId(null)} disabled={deletingIdea}>
                                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => executeDeleteIdea(confirmDeleteId)}
                                disabled={deletingIdea}
                                style={{ background: '#ef4444', color: '#fff', fontWeight: 700 }}
                            >
                                {deletingIdea ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                                <span>{lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                LIVE PROPOSAL SYNTHESIS SIMULATION ANIMATION OVERLAY
            ════════════════════════════════════════════════════════════════ */}
            {simulationState && simulationState.active && (
                <div className="live-synthesizer-overlay">
                    <div className="live-synthesizer-card">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '0.75rem' }}>
                            <Sparkles size={28} className="text-primary" />
                            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-0, #0f172a)' }}>
                                {simulationState.done
                                    ? (lang === 'ar' ? 'اكتمل تجهيز المقترح الرسمي!' : 'Official Proposal Ready!')
                                    : (lang === 'ar' ? 'جاري تجهيز مقترح المشروع الرسمي...' : 'Preparing Official NMU Project Proposal...')
                                }
                            </h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
                            {simulationState.project?.title || 'Selected Project Proposal'}
                        </p>

                        <div className="synth-progress-bar-wrap">
                            <div className="synth-progress-bar-fill" style={{ width: `${simulationState.progress}%` }}></div>
                        </div>

                        <div className="synth-doc-preview">
                            <div className={`synth-step-item ${simulationState.step >= 1 ? (simulationState.step > 1 ? 'done' : 'active') : ''}`}>
                                {simulationState.step > 1 ? <CheckCircle2 size={16} /> : <Loader2 size={16} className="spin" />}
                                <span>{lang === 'ar' ? '1. استخلاص مواصفات المشروع من الدليل المعتمد' : '1. Extracting Project Scope & Attributes'}</span>
                            </div>
                            <div className={`synth-step-item ${simulationState.step >= 2 ? (simulationState.step > 2 ? 'done' : 'active') : ''}`}>
                                {simulationState.step > 2 ? <CheckCircle2 size={16} /> : (simulationState.step === 2 ? <Loader2 size={16} className="spin" /> : <div style={{width: 16}} />)}
                                <span>{lang === 'ar' ? '2. صياغة المستخلص والتحليل المنهجي' : '2. Compiling Executive Abstract & Methodology'}</span>
                            </div>
                            <div className={`synth-step-item ${simulationState.step >= 3 ? (simulationState.step > 3 ? 'done' : 'active') : ''}`}>
                                {simulationState.step > 3 ? <CheckCircle2 size={16} /> : (simulationState.step === 3 ? <Loader2 size={16} className="spin" /> : <div style={{width: 16}} />)}
                                <span>{lang === 'ar' ? '3. تجهيز الفصول السبعة المعتمدة والمخرجات' : '3. Structuring 16 Academic Chapters & Deliverables'}</span>
                            </div>
                            <div className={`synth-step-item ${simulationState.step >= 4 ? (simulationState.done ? 'done' : 'active') : ''}`}>
                                {simulationState.done ? <CheckCircle2 size={16} /> : (simulationState.step === 4 ? <Loader2 size={16} className="spin" /> : <div style={{width: 16}} />)}
                                <span>{lang === 'ar' ? '4. تصدير وثيقة جامعة المنصورة الجديدة الرسمية (.docx)' : '4. Formatting Official NMU Template (.docx)'}</span>
                            </div>
                        </div>

                        {simulationState.done && (
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={() => setSimulationState(null)}
                                    style={{
                                        background: 'linear-gradient(135deg, #002D56 0%, #1e40af 100%)',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        padding: '0.85rem 2.25rem',
                                        borderRadius: '12px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '1rem',
                                        boxShadow: '0 4px 16px rgba(0, 45, 86, 0.3)',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <FolderOpen size={18} />
                                    <span>{lang === 'ar' ? 'عرض مشروعي وفكرتي' : 'View My Project'}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
