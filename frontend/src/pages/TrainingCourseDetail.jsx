import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    BookOpen, Users, User, Lightbulb, FileText, Award, Plus, Upload, 
    CheckCircle, XCircle, FileSpreadsheet, Sparkles, Download, 
    ExternalLink, Trash2, Edit3, Loader2, ArrowLeft, Video, Link as LinkIcon, X, FileCheck, UserPlus, Code, Send,
    Play, Cpu, Terminal, Zap, ShieldAlert, Layers, Calendar, MessageSquare, UserCheck, Crown, ChevronDown, ChevronUp, AlertCircle,
    Sliders, RotateCcw, Check, Settings, Vote, Trophy, CheckCircle2,
    Building2, Globe, Linkedin, ShieldCheck, CheckSquare, Eye, GraduationCap, Target, Info, Search
} from 'lucide-react';
import AddStudentModal from '../components/AddStudentModal';
import CertificateModal from '../components/CertificateModal';
import ConfirmModal from '../components/ConfirmModal';
import EngMagyMascot from '../components/mascot/EngMagyMascot';
import TeammateSelector from '../components/TeammateSelector';
import MemberDetailModal from '../components/MemberDetailModal';
import { downloadProposalDocx } from '../services/api';
import './TrainingCourseDetail.css';

export default function TrainingCourseDetail({ courseIdOverride }) {
    const navigate = useNavigate();
    const { id: paramCourseId } = useParams();
    const courseId = courseIdOverride || paramCourseId;
    const { lang } = useI18n();
    const { user } = useAuth();
    
    const role = strtolowerRole(user?.role);
    const isAdmin = !!(user?.is_admin || role === 'admin');
    const isTrainer = role === 'trainer' || isAdmin;
    const isTrainee = !isTrainer;

    const [searchParams] = useSearchParams();
    const urlTab = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(urlTab === 'voting' && !isTrainer ? 'topics' : (urlTab || 'topics'));

    useEffect(() => {
        const t = searchParams.get('tab');
        if (t === 'voting' && !isTrainer) {
            setActiveTab('topics');
            return;
        }
        if (t) setActiveTab(t);
    }, [searchParams, isTrainer]);

    const [course, setCourse] = useState(null);
    const [topics, setTopics] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [trainees, setTrainees] = useState([]);
    const [traineeSearchQuery, setTraineeSearchQuery] = useState('');
    const [traineeSortCol, setTraineeSortCol] = useState('name');
    const [traineeSortDir, setTraineeSortDir] = useState('asc');
    
    // Trainers Management state
    const [availableTrainers, setAvailableTrainers] = useState([]);
    const [searchingTrainers, setSearchingTrainers] = useState(false);
    const [searchTrainerQuery, setSearchTrainerQuery] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [assigningTrainer, setAssigningTrainer] = useState(false);
    const [myIdea, setMyIdea] = useState(null);
    const [allIdeas, setAllIdeas] = useState([]);
    const [docs, setDocs] = useState([]);
    const [myEval, setMyEval] = useState(null);
    const [allEvals, setAllEvals] = useState([]);
    const [loading, setLoading] = useState(true);

    // Proposal Update / Re-upload state
    const [showUpdateProposalModal, setShowUpdateProposalModal] = useState(false);
    const [proposalFile, setProposalFile] = useState(null);
    const [updatingProposal, setUpdatingProposal] = useState(false);
    const [showOfficialDocPreview, setShowOfficialDocPreview] = useState(true);

    // Edit Course state
    const [showEditCourseModal, setShowEditCourseModal] = useState(false);
    const [isUpdatingCourse, setIsUpdatingCourse] = useState(false);
    const [editCourseForm, setEditCourseForm] = useState({
        name: '', description: '', start_date: '', end_date: '', duration_hours: 40, category: '', level: '', course_type: 'both'
    });

    // External Training & Providers State
    const [totalInternal, setTotalInternal] = useState(0);
    const [totalExternal, setTotalExternal] = useState(0);
    const [courseExternalProviders, setCourseExternalProviders] = useState([]);
    const [allGlobalProviders, setAllGlobalProviders] = useState([]);
    const [verificationRequests, setVerificationRequests] = useState([]);
    const [loadingVerifications, setLoadingVerifications] = useState(false);

    // External Modals
    const [showAddProviderModal, setShowAddProviderModal] = useState(false);
    const [newProviderForm, setNewProviderForm] = useState({ name: '', name_ar: '', website_url: '', linkedin_url: '', is_contracted: 1 });
    const [savingProvider, setSavingProvider] = useState(false);

    const [showAssociateProviderModal, setShowAssociateProviderModal] = useState(false);
    const [associatingProviderId, setAssociatingProviderId] = useState('');

    const [showAddTrackModal, setShowAddTrackModal] = useState(false);
    const [newTrackForm, setNewTrackForm] = useState({ title: '', description: '', provider_id: '' });
    const [savingTrack, setSavingTrack] = useState(false);

    const [showReassignStudentModal, setShowReassignStudentModal] = useState(false);
    const [reassignStudent, setReassignStudent] = useState(null);
    const [reassignForm, setReassignForm] = useState({ training_type: 'internal', provider_id: '', track_id: '', custom_provider_name: '', custom_provider_website: '', custom_provider_linkedin: '' });
    const [savingReassign, setSavingReassign] = useState(false);

    const [reviewingVerif, setReviewingVerif] = useState(null);
    const [verifFeedback, setVerifFeedback] = useState('');
    const [submittingVerifReview, setSubmittingVerifReview] = useState(false);

    // Delete Course state
    const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
    const [isDeletingCourse, setIsDeletingCourse] = useState(false);

    const authHeaders = (extra = {}) => ({
        ...extra,
        ...(user?.id ? { 'X-User-Id': String(user.id), 'Authorization': `Bearer ${user.id}` } : {})
    });

    const openEditCourseModal = () => {
        setEditCourseForm({
            name: course?.name || '',
            description: course?.description || '',
            start_date: course?.start_date || '',
            end_date: course?.end_date || '',
            duration_hours: course?.duration_hours || 40,
            category: course?.category || '',
            level: course?.level || '',
            course_type: course?.course_type || 'both'
        });
        setShowEditCourseModal(true);
    };

    const handleUpdateCourse = async (e) => {
        e.preventDefault();
        setIsUpdatingCourse(true);
        try {
            const res = await fetch('/api/training/courses/update.php', {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    course_id: courseId,
                    ...editCourseForm
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setShowEditCourseModal(false);
                loadCourseDetail();
            } else {
                alert(data.error || 'Failed to update course');
            }
        } catch (e) {
            console.error(e);
            alert('Connection error');
        } finally {
            setIsUpdatingCourse(false);
        }
    };

    const handleDeleteCourse = async () => {
        setIsDeletingCourse(true);
        try {
            const res = await fetch('/api/training/courses/delete.php', {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ id: courseId })
            });
            let data = {};
            try { data = await res.json(); } catch (err) {}
            if (res.ok && data.success) {
                setShowDeleteCourseModal(false);
                navigate('/courses');
            } else {
                alert(data.error || (lang === 'ar' ? 'فشل حذف الدورة التدريبية' : 'Failed to delete course'));
            }
        } catch (e) {
            console.error('Delete course error:', e);
            alert(lang === 'ar' ? 'خطأ في الاتصال أثناء حذف الدورة' : 'Connection error while deleting course');
        } finally {
            setIsDeletingCourse(false);
        }
    };

    const isRoboticsCourse = Boolean(
        course?.category?.toLowerCase()?.includes('robot') ||
        course?.name?.toLowerCase()?.includes('robot') ||
        course?.name?.toLowerCase()?.includes('robot') ||
        course?.name?.includes('روبوت') ||
        course?.name?.includes('الروبوتات') ||
        (typeof courseId === 'string' && courseId.toLowerCase().includes('robot'))
    );

    // Robotics Simulator state
    const [simCode, setSimCode] = useState(`// Eng. Magy Robotics PWM Control Node
#include <Wire.h>
#include <MPU6050.h>

const int MOTOR_PWM_PIN = 9;
const int TRIG_PIN = 12;
const int ECHO_PIN = 13;

void setup() {
  Serial.begin(115200);
  pinMode(MOTOR_PWM_PIN, OUTPUT);
  Serial.println("NMU Robotics Node Initialized!");
}

void loop() {
  int sensorDist = readUltrasonicDistance();
  if (sensorDist < 20) {
    analogWrite(MOTOR_PWM_PIN, 0); // Emergency stop
    Serial.println("[WARNING] Obstacle detected! Stopping motors.");
  } else {
    analogWrite(MOTOR_PWM_PIN, 180); // Cruise velocity
    Serial.println("[INFO] PWM Duty Cycle: 70% | Clear path.");
  }
  delay(100);
}`);
    const [simRunning, setSimRunning] = useState(false);
    const [simLogs, setSimLogs] = useState([
        "[SYSTEM] Eng. Magy Simulator Ready.",
        "[STATUS] Microcontroller connected via USB Serial (115200 baud).",
        "[READY] Press 'Run ROS2 Node' to execute hardware simulation."
    ]);
    const [pwmGauge, setPwmGauge] = useState(70);

    const handleRunSim = () => {
        setSimRunning(true);
        setSimLogs(prev => [...prev, "[EXEC] Compiling Embedded C++ ROS2 Node..."]);
        setTimeout(() => {
            setSimLogs(prev => [
                ...prev,
                "[BUILD] Compiled successfully. Flashing to ATmega328P...",
                "[RUNNING] Motor PWM: 180 (70% Duty Cycle)",
                "[SENSOR] Ultrasonic Distance: 45 cm | Clearance: SAFE",
                "[IMU] Pitch: 1.2° | Roll: -0.4° | Stability: STABLE",
                "[SUCCESS] Robotics Node running smoothly! (Press Magy for tips)"
            ]);
            setPwmGauge(75);
            setSimRunning(false);
        }, 1200);
    };

    // Modals state
    const [showAddStudentModal, setShowAddStudentModal] = useState(false);
    const [showTopicModal, setShowTopicModal] = useState(false);
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [showCertModal, setShowCertModal] = useState(false);
    const [certData, setCertData] = useState(null);
    const [issuingCertId, setIssuingCertId] = useState(null);
    const [confirmIssuing, setConfirmIssuing] = useState(false);
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
    const [selectedTeammates, setSelectedTeammates] = useState([]);
    const [viewingMember, setViewingMember] = useState(null);
    const [ideaSubmitError, setIdeaSubmitError] = useState('');
    const [downloadingIdeaDocx, setDownloadingIdeaDocx] = useState(false);

    const handleDownloadMyIdeaDocx = async () => {
        if (!myIdea?.id) return;
        setDownloadingIdeaDocx(true);
        try {
            await downloadProposalDocx(myIdea.id, myIdea.title || 'Proposal');
        } catch (err) {
            alert(err.message || 'Error downloading Word document');
        } finally {
            setDownloadingIdeaDocx(false);
        }
    };

    // Course Evaluation Criteria & Dynamic Rubric State
    const defaultRubrics = [
        { name: 'Attendance', weight: 15 },
        { name: 'Architecture', weight: 20 },
        { name: 'Implementation', weight: 25 },
        { name: 'Presentation', weight: 20 },
        { name: 'Documentation', weight: 20 },
    ];
    const [courseCriteria, setCourseCriteria] = useState(defaultRubrics.map((d, i) => ({ ...d, order_index: i })));
    const [loadingCriteria, setLoadingCriteria] = useState(false);
    const [savingCriteria, setSavingCriteria] = useState(false);
    const [useRubrics, setUseRubrics] = useState(false);

    // Trainer Trainee Evaluation Form state
    const [evalScore, setEvalScore] = useState(100);
    const [evalStatus, setEvalStatus] = useState('pass');
    const [evalFeedback, setEvalFeedback] = useState('');
    const [submittingEval, setSubmittingEval] = useState(false);
    const [evalCriteriaScores, setEvalCriteriaScores] = useState({});
    const [evalSearchQuery, setEvalSearchQuery] = useState('');

    // Dynamic Rubric Calculation & Operations
    const totalCriteriaWeight = Math.round(courseCriteria.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0) * 100) / 100;
    const isWeightValid = Math.abs(totalCriteriaWeight - 100) < 0.001;

    const fetchCourseCriteria = async () => {
        if (!courseId) return;
        setLoadingCriteria(true);
        try {
            const res = await fetch(`/api/training/criteria/list.php?course_id=${courseId}`, { credentials: 'include' });
            let data = null;
            try {
                data = await res.json();
            } catch (jsonErr) {}

            if (res.ok && data && data.criteria && data.criteria.length > 0) {
                setCourseCriteria(data.criteria.map((c, i) => ({
                    id: c.id,
                    name: c.name,
                    weight: parseFloat(c.weight) || 0,
                    order_index: c.order_index ?? i
                })));
            } else {
                setCourseCriteria(defaultRubrics.map((d, i) => ({ ...d, order_index: i })));
            }
        } catch (e) {
            setCourseCriteria(defaultRubrics.map((d, i) => ({ ...d, order_index: i })));
        } finally {
            setLoadingCriteria(false);
        }
    };

    const handleAddCriterion = () => {
        setCourseCriteria(prev => [
            ...prev,
            { id: `new_${Date.now()}`, name: '', weight: 0, order_index: prev.length }
        ]);
    };

    const handleCriterionFieldChange = (index, field, value) => {
        setCourseCriteria(prev => {
            const next = [...prev];
            if (field === 'weight') {
                next[index] = { ...next[index], weight: value === '' ? '' : Math.max(0, parseFloat(value) || 0) };
            } else {
                next[index] = { ...next[index], [field]: value };
            }
            return next;
        });
    };

    const handleDeleteCriterion = (index) => {
        if (courseCriteria.length <= 1) {
            alert(lang === 'ar' ? 'يجب أن تحتوي الدورة على معيار تقييم واحد على الأقل.' : 'A course must have at least one evaluation criterion.');
            return;
        }
        setCourseCriteria(prev => prev.filter((_, i) => i !== index));
    };

    const handleMoveCriterion = (index, direction) => {
        setCourseCriteria(prev => {
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= prev.length) return prev;
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            next.splice(targetIndex, 0, moved);
            return next.map((c, i) => ({ ...c, order_index: i }));
        });
    };

    const handleResetToDefaultCriteria = () => {
        if (!window.confirm(lang === 'ar' ? 'هل تريد استعادة المعايير الافتراضية (5 معايير بإجمالي 100%)؟' : 'Reset to default 5 evaluation criteria (100% total)?')) return;
        setCourseCriteria(defaultRubrics.map((d, i) => ({ ...d, order_index: i })));
    };

    const handleSaveCriteria = async () => {
        if (!isWeightValid) {
            alert(lang === 'ar' 
                ? `إجمالي أوزان المعايير يجب أن يساوي 100% بالضبط. الإجمالي الحالي: ${totalCriteriaWeight}%` 
                : `Total criteria weight must equal exactly 100%. Current total: ${totalCriteriaWeight}%`);
            return;
        }

        for (let i = 0; i < courseCriteria.length; i++) {
            const c = courseCriteria[i];
            if (!c.name || !c.name.trim()) {
                alert(lang === 'ar' ? `المعيار رقم (${i + 1}) لا يحتوي على اسم.` : `Criterion #${i + 1} is missing a name.`);
                return;
            }
            if ((parseFloat(c.weight) || 0) <= 0) {
                alert(lang === 'ar' ? `وزن المعيار (${c.name}) يجب أن يكون أكبر من صفر.` : `Criterion (${c.name}) must have a positive weight.`);
                return;
            }
        }

        setSavingCriteria(true);
        try {
            const payload = {
                course_id: parseInt(courseId, 10),
                criteria: courseCriteria.map((c, idx) => ({
                    name: c.name.trim(),
                    weight: parseFloat(c.weight) || 0,
                    order_index: idx
                }))
            };

            const res = await fetch('/api/training/criteria/save.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(lang === 'ar' ? 'تم حفظ وتحديث معايير تقييم الدورة بنجاح!' : 'Course evaluation criteria saved successfully!');
                fetchCourseCriteria();
            } else {
                alert(data.error || (lang === 'ar' ? 'فشل حفظ معايير التقييم' : 'Failed to save criteria'));
            }
        } catch (e) {
            console.error(e);
            alert(lang === 'ar' ? 'حدث خطأ في الاتصال بالخادم' : 'Network error saving criteria');
        } finally {
            setSavingCriteria(false);
        }
    };

    const handleCriterionScoreChange = (critName, val, maxWeight) => {
        const rawNum = val === '' ? '' : Math.max(0, Math.min(Number(maxWeight) || 100, parseFloat(val) || 0));
        
        setEvalCriteriaScores(prev => {
            const nextScores = { ...prev, [critName]: rawNum };
            
            // Automatically calculate final score from sum
            let total = 0;
            courseCriteria.forEach(c => {
                const s = nextScores[c.name];
                if (s !== '' && s !== undefined && !isNaN(Number(s))) {
                    total += Number(s);
                }
            });
            
            const roundedTotal = Math.min(100, Math.max(0, Math.round(total * 100) / 100));
            setEvalScore(roundedTotal);
            
            if (roundedTotal >= 60) setEvalStatus('pass');
            else setEvalStatus('fail');
            
            return nextScores;
        });
    };

    // End-of-Course Voting State
    const [votingProjects, setVotingProjects] = useState([]);
    const [votingTop5, setVotingTop5] = useState([]);
    const [courseVotingStatus, setCourseVotingStatus] = useState('not_started');
    const [canUserVote, setCanUserVote] = useState(false);
    const [myVotedProjectIds, setMyVotedProjectIds] = useState([]);
    const [loadingVoting, setLoadingVoting] = useState(false);
    const [submittingVotes, setSubmittingVotes] = useState(false);
    const [updatingVotingStatus, setUpdatingVotingStatus] = useState(false);

    const fetchCourseVotingData = async () => {
        if (!courseId) return;
        setLoadingVoting(true);
        try {
            const res = await fetch(`/api/training/votes/course_votes.php?course_id=${courseId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.success) {
                setVotingProjects(data.projects || []);
                setVotingTop5(data.top_5 || []);
                setCourseVotingStatus(data.voting_status || 'not_started');
                setCanUserVote(data.can_vote || false);
                setMyVotedProjectIds(data.my_votes || []);
            }
        } catch (e) {
            console.error('Failed to fetch course voting data:', e);
        } finally {
            setLoadingVoting(false);
        }
    };

    const handleToggleVote = (projectId) => {
        if (courseVotingStatus !== 'open') return;
        const pId = Number(projectId);
        setMyVotedProjectIds(prev => {
            if (prev.includes(pId)) {
                return prev.filter(id => id !== pId);
            }
            if (prev.length >= 5) {
                alert(lang === 'ar' ? 'يمكنك اختيار حتى 5 مشاريع كحد أقصى.' : 'You can select up to 5 projects.');
                return prev;
            }
            return [...prev, pId];
        });
    };

    const handleAddVote = (projectId) => {
        if (courseVotingStatus !== 'open') return;
        const pId = Number(projectId);
        if (myVotedProjectIds.includes(pId)) return;
        if (myVotedProjectIds.length >= 5) {
            alert(lang === 'ar' ? 'لقد بلغت الحد الأقصى للتصويت (5 مشاريع). يمكنك حذف مشروع محدد لإضافة غيره.' : 'You reached the max limit (5 projects). Remove a project to add another.');
            return;
        }
        setMyVotedProjectIds(prev => [...prev, pId]);
    };

    const handleDeleteVote = (projectId) => {
        if (courseVotingStatus !== 'open') return;
        const pId = Number(projectId);
        setMyVotedProjectIds(prev => prev.filter(id => id !== pId));
    };

    const handleClearAllVotes = () => {
        if (courseVotingStatus !== 'open') return;
        if (myVotedProjectIds.length === 0) return;
        if (window.confirm(lang === 'ar' ? 'هل أنت متأكد من رغبتك في مسح كافة اختيارات التصويت المحددة؟' : 'Are you sure you want to clear all selected votes?')) {
            setMyVotedProjectIds([]);
        }
    };

    const handleSubmitVotes = async () => {
        if (courseVotingStatus !== 'open') {
            alert(lang === 'ar' ? 'التصويت مغلق حالياً' : 'Voting is currently closed');
            return;
        }
        setSubmittingVotes(true);
        try {
            const res = await fetch('/api/training/votes/course_votes_submit.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: parseInt(courseId, 10),
                    project_ids: myVotedProjectIds
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(lang === 'ar' ? 'تم تسجيل وتأكيد تصويتك بنجاح!' : 'Your votes have been submitted successfully.');
                fetchCourseVotingData();
            } else {
                alert(data.error || (lang === 'ar' ? 'فشل حفظ التصويت' : 'Failed to submit votes'));
            }
        } catch (e) {
            console.error(e);
            alert(lang === 'ar' ? 'حدث خطأ في الاتصال أثناء حفظ التصويت' : 'Network error submitting votes');
        } finally {
            setSubmittingVotes(false);
        }
    };

    const handleUpdateCourseVotingStatus = async (newStatus) => {
        setUpdatingVotingStatus(true);
        try {
            const res = await fetch('/api/training/courses/voting_status.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: parseInt(courseId, 10),
                    voting_status: newStatus
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setCourseVotingStatus(newStatus);
                fetchCourseVotingData();
            } else {
                alert(data.error || 'Failed to update voting status');
            }
        } catch (e) {
            console.error(e);
            alert('Network error updating voting status');
        } finally {
            setUpdatingVotingStatus(false);
        }
    };

    // Doc upload
    const [docType, setDocType] = useState('srs');
    const [docFile, setDocFile] = useState(null);
    const [docUrl, setDocUrl] = useState('');
    const [docTitle, setDocTitle] = useState('');
    const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'link'
    const [uploadingDoc, setUploadingDoc] = useState(false);

    useEffect(() => {
        loadCourseDetail();
    }, [courseId]);

    const loadCourseDetail = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/training/courses/get.php?id=${courseId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.course) {
                setCourse(data.course);
                let loadedTopics = data.topics || [];
                
                // Fallback default modules for Robotics course if not populated in DB
                if (loadedTopics.length === 0 && (courseId === 'robotics' || (data.course.track && data.course.track.includes('robotics')))) {
                    loadedTopics = [
                        {
                            id: 101,
                            title: 'Module 1: Microcontroller GPIOs, PWM & Sensor Fusion',
                            
                            description: 'Hands-on interfacing with Arduino/ESP32, PWM motor signal modulation, MPU6050 IMU accelerometer/gyroscope, and ultrasonic distance sensors.',
                            viewed: true,
                            materials: [
                                { id: 201, title: 'Lecture 1: GPIO & PWM Motor Control (PDF)', type: 'pdf', file_url: '#' },
                                { id: 202, title: 'Lab 1: IMU Sensor Calibration & Serial Debugging', type: 'code', file_url: '#' },
                                { id: 203, title: 'Video: Motor Driver Schematics & H-Bridge Wiring', type: 'youtube', url: 'https://youtube.com' }
                            ]
                        },
                        {
                            id: 102,
                            title: 'Module 2: Forward & Inverse Kinematics for Robotic Arms',
                            
                            description: 'Mathematical modeling using Denavit-Hartenberg (DH) parameters, transformation matrices, joint space vs Cartesian task space trajectory planning.',
                            viewed: false,
                            materials: [
                                { id: 204, title: 'DH Parameters Reference Sheet & Equations', type: 'pdf', file_url: '#' }
                            ]
                        },
                        {
                            id: 103,
                            title: 'Module 3: ROS2 (Robot Operating System) Nodes & Topics',
                            
                            description: 'Publisher/Subscriber architecture in ROS2 Humble, URDF robot description files, Gazebo 3D simulation physics, RViz visualization.',
                            viewed: false,
                            materials: [
                                { id: 205, title: 'ROS2 Nodes Setup & Gazebo Simulation Guide', type: 'pdf', file_url: '#' }
                            ]
                        },
                        {
                            id: 104,
                            title: 'Module 4: Autonomous SLAM Navigation & Path Planning',
                            
                            description: 'LiDAR point cloud processing, Occupancy Grid Mapping, A* & Dijkstra path planning algorithms, real-time obstacle avoidance.',
                            viewed: false,
                            materials: [
                                { id: 206, title: 'LiDAR SLAM Algorithm & Navigation Package', type: 'code', file_url: '#' }
                            ]
                        }
                    ];
                }
                
                setTopics(loadedTopics);
                setTrainers(data.trainers || []);
                setTotalInternal(data.total_internal || 0);
                setTotalExternal(data.total_external || 0);
                setCourseExternalProviders(data.external_providers || []);
                fetchTrainees();
                fetchIdeas();
                fetchDocs();
                fetchCourseCriteria();
                fetchExternalProviders();
                fetchVerificationRequests();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchExternalProviders = async () => {
        try {
            const res = await fetch(`/api/training/providers/list.php?course_id=${courseId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.providers) {
                setCourseExternalProviders(data.providers);
            }
        } catch (e) {
            console.error('Failed to fetch course external providers:', e);
        }
    };

    const fetchAllGlobalProviders = async () => {
        try {
            const res = await fetch('/api/training/providers/list.php?all=1', { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.providers) {
                setAllGlobalProviders(data.providers);
            }
        } catch (e) {
            console.error('Failed to fetch all providers:', e);
        }
    };

    const fetchVerificationRequests = async () => {
        setLoadingVerifications(true);
        try {
            const res = await fetch(`/api/training/verification/list.php?course_id=${courseId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.verifications) {
                setVerificationRequests(data.verifications);
            }
        } catch (e) {
            console.error('Failed to fetch verifications:', e);
        } finally {
            setLoadingVerifications(false);
        }
    };

    const handleCreateProviderSubmit = async (e) => {
        e.preventDefault();
        setSavingProvider(true);
        try {
            const res = await fetch('/api/training/providers/create.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseId,
                    ...newProviderForm
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(lang === 'ar' ? 'تمت إضافة جهة التدريب وربطها بالدورة بنجاح!' : 'Provider created and associated successfully!');
                setShowAddProviderModal(false);
                setNewProviderForm({ name: '', name_ar: '', website_url: '', linkedin_url: '', is_contracted: 1 });
                fetchExternalProviders();
            } else {
                alert(data.error || 'Failed to create provider');
            }
        } catch (e) {
            alert('Connection error');
        } finally {
            setSavingProvider(false);
        }
    };

    const handleAssociateProviderSubmit = async (e) => {
        e.preventDefault();
        if (!associatingProviderId) return;
        try {
            const res = await fetch('/api/training/providers/assign_course.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: parseInt(courseId, 10),
                    provider_id: parseInt(associatingProviderId, 10),
                    action: 'add'
                })
            });
            let data = {};
            try { data = await res.json(); } catch(err){}
            if (res.ok && data.success) {
                setShowAssociateProviderModal(false);
                setAssociatingProviderId('');
                fetchExternalProviders();
            } else {
                alert(data.error || 'Failed to associate provider');
            }
        } catch (e) {
            alert('Connection error');
        }
    };

    const handleCreateTrackSubmit = async (e) => {
        e.preventDefault();
        setSavingTrack(true);
        try {
            const res = await fetch('/api/training/topics/create.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: parseInt(courseId, 10),
                    provider_id: newTrackForm.provider_id ? parseInt(newTrackForm.provider_id, 10) : null,
                    title: newTrackForm.title,
                    description: newTrackForm.description
                })
            });
            let data = {};
            try { data = await res.json(); } catch(err){}
            if (res.ok && data.success) {
                setShowAddTrackModal(false);
                setNewTrackForm({ title: '', description: '', provider_id: '' });
                loadCourseDetail();
                fetchExternalProviders();
            } else {
                alert(data.error || 'Failed to create track');
            }
        } catch (e) {
            console.error('Error creating track:', e);
            alert('Connection error');
        } finally {
            setSavingTrack(false);
        }
    };

    const handleReviewVerificationSubmit = async (decision) => {
        if (!reviewingVerif) return;
        setSubmittingVerifReview(true);
        try {
            const res = await fetch('/api/training/verification/review.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: parseInt(courseId, 10),
                    trainee_id: reviewingVerif.trainee_id,
                    decision: decision,
                    feedback: verifFeedback
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(decision === 'approved' 
                    ? (lang === 'ar' ? 'تمت الموافقة على وثيقة التدريب بنجاح!' : 'Verification approved!') 
                    : (lang === 'ar' ? 'تم تسجيل رفض الوثيقة وإرسال السبب للطالب.' : 'Verification rejected.')
                );
                setReviewingVerif(null);
                setVerifFeedback('');
                fetchVerificationRequests();
                fetchTrainees();
            } else {
                alert(data.error || 'Failed to submit review');
            }
        } catch (e) {
            alert('Connection error');
        } finally {
            setSubmittingVerifReview(false);
        }
    };

    const handleReassignStudentSubmit = async (e) => {
        e.preventDefault();
        if (!reassignStudent) return;
        setSavingReassign(true);
        try {
            const res = await fetch('/api/training/enrollments/assign_external.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: parseInt(courseId, 10),
                    trainee_id: reassignStudent.trainee_id,
                    ...reassignForm
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setShowReassignStudentModal(false);
                setReassignStudent(null);
                fetchTrainees();
                loadCourseDetail();
            } else {
                alert(data.error || 'Failed to update assignment');
            }
        } catch (e) {
            alert('Connection error');
        } finally {
            setSavingReassign(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'trainees') {
            fetchTrainees();
        } else if (activeTab === 'external') {
            fetchExternalProviders();
            fetchVerificationRequests();
            fetchAllGlobalProviders();
        } else if (activeTab === 'idea') {
            fetchIdeas();
        } else if (activeTab === 'docs') {
            fetchDocs();
        } else if (activeTab === 'evaluations') {
            fetchCourseCriteria();
            fetchEvals();
            fetchTrainees();
            const poll = setInterval(() => {
                fetchEvals();
            }, 5000);
            return () => clearInterval(poll);
        } else if (activeTab === 'voting') {
            fetchCourseVotingData();
        }
    }, [activeTab]);

    const fetchTrainees = async () => {
        try {
            const res = await fetch(`/api/training/enrollments/list.php?course_id=${courseId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok) setTrainees(data.trainees || []);
        } catch (e) { console.error(e); }
    };

    const handleRemoveTrainee = async (traineeId, traineeName) => {
        if (!window.confirm(lang === 'ar' 
            ? `هل أنت متأكد من حذف المتدرب (${traineeName}) من هذه الدورة التدريبية؟` 
            : `Are you sure you want to remove trainee (${traineeName}) from this course?`)) {
            return;
        }
        try {
            const res = await fetch('/api/training/enrollments/remove.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: parseInt(courseId, 10),
                    trainee_id: parseInt(traineeId, 10)
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                fetchTrainees();
                loadCourseDetail();
            } else {
                alert(data.error || (lang === 'ar' ? 'فشل حذف المتدرب' : 'Failed to remove trainee'));
            }
        } catch (e) {
            console.error(e);
            alert(lang === 'ar' ? 'حدث خطأ في الاتصال أثناء الحذف' : 'Network error while removing trainee');
        }
    };

    const handleRemoveAllTrainees = async () => {
        const confirmMsg = lang === 'ar' 
            ? 'تحذير: سيتم حذف جميع المتدربين المسجلين في هذه الدورة التدريبية بالإضافة إلى تقييماتهم وشهاداتهم. هل أنت متأكد؟'
            : 'Warning: This will remove ALL enrolled trainees, their evaluations, and certificates from this course. Are you sure?';
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await fetch('/api/training/enrollments/remove_all.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: parseInt(courseId, 10),
                    confirmation: 'delete'
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                fetchTrainees();
                loadCourseDetail();
            } else {
                alert(data.error || (lang === 'ar' ? 'فشل حذف المتدربين' : 'Failed to remove trainees'));
            }
        } catch (e) {
            console.error(e);
            alert(lang === 'ar' ? 'حدث خطأ أثناء مسح المتدربين' : 'Network error while clearing trainees');
        }
    };

    const fetchIdeas = async () => {
        try {
            const res = await fetch(`/api/training/ideas/get.php?course_id=${courseId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok) {
                if (isTrainee) {
                    setMyIdea(data.idea || null);
                    if (data.idea) {
                        setIdeaTitleEn(data.idea.title || '');
                        setIdeaDescEn(data.idea.description || '');
                        setTechStack(data.idea.tech_stack || '');
                        setProblemStmt(data.idea.problem_statement || '');
                        setExpectedOutput(data.idea.expected_output || '');
                        
                        // Populate teammates from server response (excluding current user / leader)
                        const rawMembers = data.idea.team_members || [];
                        const currentUserId = user?.id;
                        const teammates = rawMembers.filter(m => (m.user_id || m.id) !== currentUserId && m.role !== 'leader');
                        setSelectedTeammates(teammates);
                    } else {
                        setSelectedTeammates([]);
                    }
                } else {
                    setAllIdeas(data.ideas || []);
                }
            }
        } catch (e) { console.error(e); }
    };

    const fetchDocs = async () => {
        try {
            const res = await fetch(`/api/training/docs/list.php?course_id=${courseId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok) setDocs(data.docs || []);
        } catch (e) { console.error(e); }
    };

    const fetchEvals = async () => {
        try {
            if (isTrainee) {
                const res = await fetch(`/api/training/evaluations/get.php?course_id=${courseId}`, { credentials: 'include' });
                const data = await res.json();
                if (res.ok) setMyEval(data.evaluation);
            } else {
                const res = await fetch(`/api/training/evaluations/list.php?course_id=${courseId}`, { credentials: 'include' });
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
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseId,
                    title: topicTitleEn,
                    title_ar: topicTitleEn,
                    description: topicDescEn
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
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        topic_id: selectedTopicId,
                        title: matTitleEn,
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
                    credentials: 'include',
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

    const handleSearchTrainers = async () => {
        setSearchingTrainers(true);
        setHasSearched(true);
        try {
            const res = await fetch(`/api/users/search-trainers.php?q=${encodeURIComponent(searchTrainerQuery)}`, { credentials: 'include' });
            const data = await res.json();
            setAvailableTrainers(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setSearchingTrainers(false);
        }
    };

    const handleAssignTrainer = async (trainerId) => {
        setAssigningTrainer(true);
        try {
            const res = await fetch('/api/training/courses/assign_trainer.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course_id: courseId, trainer_id: trainerId })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                loadCourseDetail();
            } else {
                alert(data.error || 'Failed to assign trainer');
            }
        } catch (e) {
            console.error(e);
            alert('Connection error');
        } finally {
            setAssigningTrainer(false);
        }
    };

    const handleRemoveTrainer = async (assignmentId) => {
        if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من إزالة هذا المدرب؟' : 'Are you sure you want to remove this trainer?')) return;
        try {
            const res = await fetch('/api/training/courses/remove_trainer.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assignment_id: assignmentId })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                loadCourseDetail();
            } else {
                alert(data.error || 'Failed to remove trainer');
            }
        } catch (e) {
            console.error(e);
            alert('Connection error');
        }
    };

    const handleDeleteTopic = async (topicId) => {
        const confirmMsg = lang === 'ar' 
            ? 'هل أنت متأكد من حذف هذا الموضوع التدريبي وجميع المواد التابعة له؟' 
            : 'Are you sure you want to delete this topic and all its materials?';
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await fetch('/api/training/topics/delete.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: topicId })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                loadCourseDetail();
            } else {
                alert(data.error || 'Failed to delete topic');
            }
        } catch (err) {
            console.error(err);
            alert(lang === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting topic');
        }
    };

    const handleDeleteMaterial = async (materialId) => {
        const confirmMsg = lang === 'ar' 
            ? 'هل أنت متأكد من حذف هذه المادة التعليمية؟' 
            : 'Are you sure you want to delete this material?';
        if (!window.confirm(confirmMsg)) return;

        try {
            const res = await fetch('/api/training/content/delete.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: materialId })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                loadCourseDetail();
            } else {
                alert(data.error || 'Failed to delete material');
            }
        } catch (err) {
            console.error(err);
            alert(lang === 'ar' ? 'حدث خطأ أثناء الحذف' : 'Error deleting material');
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
                credentials: 'include',
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
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ keywords: aiKeyword })
            });
            const data = await res.json();
            if (res.ok && data.proposal) {
                setIdeaTitleEn(data.proposal.title);
                setIdeaDescEn(data.proposal.description);
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
        setIdeaSubmitError('');
        try {
            const res = await fetch('/api/training/ideas/submit.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: course?.id || courseId,
                    title: ideaTitleEn,
                    description: ideaDescEn,
                    tech_stack: techStack,
                    problem_statement: problemStmt,
                    expected_output: expectedOutput,
                    teammate_ids: isExternalCourse ? [] : selectedTeammates.map(t => t.id || t.user_id)
                }),
                credentials: 'include'
            });
            const text = await res.text();
            let data = {};
            try {
                data = JSON.parse(text);
            } catch (err) {
                data = { error: text || 'Server returned invalid response' };
            }

            if (res.ok && data.success) {
                fetchIdeas();
                alert(lang === 'ar' ? 'تم حفظ وإرسال فكرة المشروع بنجاح' : 'Project idea saved successfully');
            } else {
                const msg = data.error || (lang === 'ar' ? 'حدث خطأ أثناء حفظ الفكرة' : 'Failed to save project idea');
                setIdeaSubmitError(msg);
                alert(msg);
            }
        } catch (e) { 
            console.error(e); 
            setIdeaSubmitError(e?.message || 'Network error');
        }
        finally { setSubmittingIdea(false); }
    };

    const handleEvaluateIdea = async (ideaId, status, feedback) => {
        try {
            await fetch('/api/training/ideas/evaluate.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea_id: ideaId, status, feedback })
            });
            fetchIdeas();
        } catch (e) { console.error(e); }
    };

    const fileInputRef = useRef(null);

    const handleUploadDoc = async (e) => {
        e.preventDefault();
        setUploadingDoc(true);

        const formData = new FormData();
        formData.append('course_id', courseId);
        if (myIdea?.id) {
            formData.append('idea_id', myIdea.id);
        }
        formData.append('doc_type', docType);

        if (uploadMode === 'link') {
            if (!docUrl) {
                alert(lang === 'ar' ? 'الرجاء إدخال رابط صحيح' : 'Please enter a valid link URL');
                setUploadingDoc(false);
                return;
            }
            formData.append('url', docUrl);
            if (docTitle) formData.append('title', docTitle);
        } else {
            if (!docFile) {
                alert(lang === 'ar' ? 'الرجاء اختيار ملف للرفع' : 'Please select a file to upload');
                setUploadingDoc(false);
                return;
            }
            formData.append('file', docFile);
        }

        try {
            const res = await fetch('/api/training/docs/upload.php', {
                method: 'POST',
                credentials: 'include',
                body: formData
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
                    console.error('Upload response was not JSON:', res.status, text.substring(0, 300));
                    alert('Server Error (' + res.status + '): ' + (text.substring(0, 200) || 'Empty response'));
                    setUploadingDoc(false);
                    return;
                }
            }

            if (res.ok && data.success) {
                setDocFile(null);
                setDocUrl('');
                setDocTitle('');
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                fetchDocs();
                alert(lang === 'ar' ? 'تم الرفع بنجاح!' : 'Document uploaded successfully!');
            } else {
                alert(data.error || (lang === 'ar' ? 'فشل الرفع' : 'Upload failed. Please try again.'));
            }
        } catch (e) {
            console.error('Upload network error:', e);
            alert(lang === 'ar' ? 'حدث خطأ في الاتصال بالخادم' : 'Network error: Could not reach the server.');
        } finally { 
            setUploadingDoc(false); 
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!window.confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا التوثيق/الرابط؟' : 'Are you sure you want to delete this document/link?')) return;
        try {
            const res = await fetch('/api/training/docs/delete.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: docId })
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
                fetchDocs();
            } else {
                alert(data.error || (lang === 'ar' ? 'فشل الحذف' : 'Failed to delete'));
            }
        } catch (e) {
            console.error(e);
            alert(lang === 'ar' ? 'حدث خطأ في الاتصال بالخادم' : 'Network error: Could not reach the server.');
        }
    };

    useEffect(() => {
        if (!selectedTraineeForEval || !courseId) return;
        fetch(`/api/training/evaluations/get.php?course_id=${courseId}&trainee_id=${selectedTraineeForEval}`, { credentials: 'include' })
            .then(r => r.json())
            .then(d => {
                const currentCriteria = (courseCriteria && courseCriteria.length > 0) ? courseCriteria : defaultRubrics;

                if (d.evaluation) {
                    const ev = d.evaluation;
                    const fScore = parseFloat(ev.final_score) || 0;
                    setEvalStatus(ev.status || (fScore >= 60 ? 'pass' : 'fail'));
                    setEvalFeedback(ev.feedback || '');
                    let stored = {};
                    try {
                        stored = typeof ev.criteria_scores === 'string' ? JSON.parse(ev.criteria_scores) : (ev.criteria_scores || {});
                    } catch (_) {}

                    const newScores = {};
                    let calculatedSum = 0;

                    currentCriteria.forEach(crit => {
                        const critName = crit.name;
                        const maxW = parseFloat(crit.weight) || 0;
                        let val = undefined;
                        if (stored[critName] !== undefined) val = Number(stored[critName]);
                        else if (stored[critName.toLowerCase()] !== undefined) val = Number(stored[critName.toLowerCase()]);
                        else if (crit.id && stored[crit.id] !== undefined) val = Number(stored[crit.id]);

                        if (val === undefined || isNaN(val)) {
                            val = Math.min(maxW, Math.round((fScore * (maxW / 100)) * 10) / 10);
                        } else {
                            val = Math.min(maxW, Math.max(0, val));
                        }

                        newScores[critName] = val;
                        calculatedSum += val;
                    });

                    setEvalCriteriaScores(newScores);
                    setEvalScore(Math.min(100, Math.max(0, Math.round(calculatedSum * 100) / 100)));
                } else {
                    // New evaluation: default to full points for each configured criterion
                    const newScores = {};
                    let calculatedSum = 0;
                    currentCriteria.forEach(crit => {
                        const maxW = parseFloat(crit.weight) || 0;
                        newScores[crit.name] = maxW;
                        calculatedSum += maxW;
                    });
                    setEvalCriteriaScores(newScores);
                    setEvalScore(Math.min(100, Math.max(0, Math.round(calculatedSum * 100) / 100)));
                    setEvalFeedback('');
                    setEvalStatus('pass');
                }
            })
            .catch(console.error);
    }, [selectedTraineeForEval, courseId, courseCriteria]);

    const handleSubmitEvaluation = async (e) => {
        e.preventDefault();
        if (!selectedTraineeForEval) {
            alert(lang === 'ar' ? 'يرجى اختيار المتدرب أولاً' : 'Please select a trainee first.');
            return;
        }
        setSubmittingEval(true);

        try {
            const res = await fetch('/api/training/evaluations/submit.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseId,
                    trainee_id: selectedTraineeForEval,
                    final_score: evalScore,
                    status: evalStatus,
                    feedback: evalFeedback,
                    criteria_scores: evalCriteriaScores
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const trObj = trainees.find(t => t.trainee_id == selectedTraineeForEval);
                const traineeName = trObj ? trObj.full_name : 'Trainee';
                const confirmedScore = data.final_score ?? evalScore;
                const successMsg = lang === 'ar'
                    ? `تم حفظ ونشر التقييم بنجاح للمتدرب (${traineeName})! الدرجة المعتمدة: ${confirmedScore}/100`
                    : `Evaluation saved and published successfully for (${traineeName})! Grade: ${confirmedScore}/100`;
                fetchEvals();
                alert(successMsg);
            } else {
                alert(data.error || (lang === 'ar' ? 'فشل حفظ التقييم' : 'Failed to save evaluation'));
            }
        } catch (e) {
            console.error(e);
            alert(lang === 'ar' ? 'حدث خطأ في الاتصال أثناء حفظ التقييم' : 'Network error: could not save evaluation');
        } finally {
            setSubmittingEval(false);
        }
    };

    const handleUpdateProposalSubmit = async (e) => {
        e.preventDefault();
        if (!proposalFile) {
            alert(lang === 'ar' ? 'يرجى اختيار ملف التقرير / المقترح المحدّث' : 'Please select the updated proposal/report file.');
            return;
        }
        setUpdatingProposal(true);
        try {
            const formData = new FormData();
            formData.append('file', proposalFile);
            formData.append('course_id', courseId);
            formData.append('idea_id', myIdea?.id || '');
            formData.append('doc_type', 'proposal');
            formData.append('title', myIdea?.title || 'Updated Official Field Training Proposal');

            const res = await fetch('/api/training/docs/upload.php', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(lang === 'ar' ? 'تم تحديث ورفع نسخة المقترح بنجاح ومزامنتها مباشرة مع لوحة المشرفين!' : 'Proposal updated and synchronized with supervisor dashboard successfully!');
                setShowUpdateProposalModal(false);
                setProposalFile(null);
                fetchDocs();
                fetchIdeas();
            } else {
                alert(data.error || (lang === 'ar' ? 'فشل تحديث الملف' : 'Failed to update proposal file'));
            }
        } catch (e) {
            console.error(e);
            alert(lang === 'ar' ? 'حدث خطأ أثناء رفع التحديث' : 'Network error updating proposal');
        } finally {
            setUpdatingProposal(false);
        }
    };

    const handleIssueCertificate = async (traineeId, traineeName) => {
        setIssuingCertId(traineeId);
        try {
            // First check if certificate has already been issued
            const res = await fetch(`/api/training/certificates/get.php?course_id=${courseId}&trainee_id=${traineeId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.certificate) {
                setCertData({
                    studentName: data.certificate.trainee_name || traineeName || 'Trainee',
                    courseTitle: data.certificate.course_title || (lang === 'ar' && course?.name ? course.name : course?.name),
                    issueDate: data.certificate.issued_at ? new Date(data.certificate.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '10 August 2026',
                    certCode: data.certificate.cert_code,
                    downloadUrl: `/api/training/certificates/download.php?code=${data.certificate.cert_code}`,
                    isPendingIssuance: false
                });
                setShowCertModal(true);
            } else {
                // Not issued yet -> Open Preview/Verification mode
                setCertData({
                    studentName: traineeName || 'Trainee',
                    courseTitle: (lang === 'ar' && course?.name ? course.name : course?.name) || 'Summer Training Program',
                    issueDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
                    certCode: 'VERIFY-BEFORE-ISSUE',
                    downloadUrl: null,
                    isPendingIssuance: true,
                    traineeId: traineeId
                });
                setShowCertModal(true);
            }
        } catch (e) {
            console.error(e);
            alert('Error loading certificate data');
        } finally {
            setIssuingCertId(null);
        }
    };

    const handleConfirmIssueCertificate = async () => {
        if (!certData || !certData.traineeId) return;
        setConfirmIssuing(true);
        try {
            const res = await fetch('/api/training/certificates/issue.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ course_id: courseId, trainee_id: certData.traineeId })
            });
            const data = await res.json();
            if (res.ok && data.certificate) {
                setCertData({
                    studentName: data.trainee?.name || certData.studentName,
                    courseTitle: data.course?.title || certData.courseTitle,
                    issueDate: data.certificate.issued_at ? new Date(data.certificate.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : certData.issueDate,
                    certCode: data.certificate.cert_code,
                    downloadUrl: `/api/training/certificates/download.php?code=${data.certificate.cert_code}`,
                    isPendingIssuance: false
                });
                fetchTrainees();
            } else {
                alert(data.error || 'Failed to issue certificate');
            }
        } catch (e) {
            console.error(e);
            alert('Network error while issuing certificate');
        } finally {
            setConfirmIssuing(false);
        }
    };

    const handleViewCertificate = async (traineeId, traineeName) => {
        setIssuingCertId(traineeId);
        try {
            const res = await fetch(`/api/training/certificates/get.php?course_id=${courseId}&trainee_id=${traineeId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.certificate) {
                setCertData({
                    studentName: data.certificate.trainee_name || traineeName || user?.full_name || 'Trainee',
                    courseTitle: data.certificate.course_title || (lang === 'ar' && course?.name ? course.name : course?.name),
                    issueDate: data.certificate.issued_at ? new Date(data.certificate.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '10 August 2026',
                    certCode: data.certificate.cert_code,
                    downloadUrl: `/api/training/certificates/download.php?code=${data.certificate.cert_code}`,
                    isPendingIssuance: false
                });
                setShowCertModal(true);
            } else {
                setCertData({
                    studentName: traineeName || user?.full_name || 'Trainee',
                    courseTitle: (lang === 'ar' && course?.name ? course.name : course?.name) || 'Summer Training Program',
                    issueDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
                    certCode: 'NMU-VERIFY-PREVIEW',
                    downloadUrl: null,
                    isPendingIssuance: true,
                    traineeId: traineeId
                });
                setShowCertModal(true);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIssuingCertId(null);
        }
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        <h1 style={{ margin: 0 }}>{course.name}</h1>
                        {course.course_type === 'both' && (
                            <>
                                <span className="badge" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: '0.8rem', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                    <GraduationCap size={13} />
                                    {lang === 'ar' ? `داخلي: ${totalInternal}` : `Internal: ${totalInternal}`}
                                </span>
                                <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.8rem', padding: '3px 10px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                    <Building2 size={13} />
                                    {lang === 'ar' ? `خارجي: ${totalExternal}` : `External: ${totalExternal}`}
                                </span>
                            </>
                        )}
                    </div>
                    <p>{course.description}</p>
                </div>
                {isTrainer && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={openEditCourseModal}>
                            <Edit3 size={18} /> {lang === 'ar' ? 'تعديل بيانات الدورة' : 'Edit Course'}
                        </button>
                        <button className="btn btn-danger" onClick={() => setShowDeleteCourseModal(true)}>
                            <Trash2 size={18} />
                            {lang === 'ar' ? 'حذف الدورة' : 'Delete Course'}
                        </button>
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="tabs-nav">
                <button className={`tab-btn ${activeTab === 'topics' ? 'active' : ''}`} onClick={() => setActiveTab('topics')} data-magy-key="topics">
                    <BookOpen size={16} /> {lang === 'ar' ? 'المحتوى والمواد التدريبية' : 'Course Content & Materials'}
                </button>
                {isTrainer && course?.course_type === 'external' && (
                    <button className={`tab-btn ${activeTab === 'external' ? 'active' : ''}`} onClick={() => setActiveTab('external')} data-magy-key="external">
                        <Building2 size={16} /> {lang === 'ar' ? 'التدريب الخارجي والجهات' : 'External Training & Providers'}
                    </button>
                )}
                {isRoboticsCourse && (
                    <button className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`} onClick={() => setActiveTab('simulator')} data-magy-key="simulator">
                        <Code size={16} /> {lang === 'ar' ? 'مختبر كود المحاكاة' : 'ROS2 Code Simulator'}
                    </button>
                )}
                {isTrainer && (
                    <button className={`tab-btn ${activeTab === 'trainees' ? 'active' : ''}`} onClick={() => setActiveTab('trainees')} data-magy-key="trainees">
                        <Users size={16} /> {lang === 'ar' ? 'المتدربين' : 'Trainees'}
                    </button>
                )}
                {isTrainer && (
                    <button className={`tab-btn ${activeTab === 'idea' ? 'active' : ''}`} onClick={() => setActiveTab('idea')} data-magy-key="idea">
                        <Lightbulb size={16} /> {lang === 'ar' ? 'أفكار المشروعات' : 'Project Ideas'}
                    </button>
                )}
                <button className={`tab-btn ${activeTab === 'evaluations' ? 'active' : ''}`} onClick={() => setActiveTab('evaluations')} data-magy-key="evaluations">
                    <Award size={16} /> {lang === 'ar' ? 'التقييم والدرجات' : 'Evaluations'}
                </button>
                {isTrainer && (
                    <button className={`tab-btn ${activeTab === 'voting' ? 'active' : ''}`} onClick={() => setActiveTab('voting')} data-magy-key="voting">
                        <Vote size={16} /> {lang === 'ar' ? 'تصويت الـ Top 5' : 'Top 5 Voting'}
                    </button>
                )}
                <Link to={`/leaderboard?course_id=${courseId}`} className="tab-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Trophy size={16} style={{ color: '#F59E0B' }} /> {lang === 'ar' ? 'لوحة الترتيب' : 'Leaderboard'}
                </Link>
                {isAdmin && (
                    <button className={`tab-btn ${activeTab === 'trainers' ? 'active' : ''}`} onClick={() => setActiveTab('trainers')} data-magy-key="trainers">
                        <Users size={16} /> {lang === 'ar' ? 'المدربين' : 'Manage Trainers'}
                    </button>
                )}
            </div>

            {/* Tab 1: Topics & Materials */}
            {activeTab === 'topics' && (
                <div className="tab-content">
                    <div className="tab-action-bar">
                        <h3>{lang === 'ar' ? 'المحتوى والمواد التدريبية للدورة' : 'Course Content & Training Materials'}</h3>
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
                                            <h4>{t.title} {t.title ? `( ${t.title} )` : ''}</h4>
                                            {t.description && <p className="topic-desc">{t.description}</p>}
                                        </div>

                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            {isTrainee && (
                                                <button
                                                    className={`btn btn-sm ${t.viewed || Number(t.is_completed) > 0 ? 'btn-success' : 'btn-outline'}`}
                                                    onClick={async () => {
                                                        try {
                                                            await fetch('/api/training/progress/mark.php', {
                                                                method: 'POST',
                                                                credentials: 'include',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ topic_id: t.id })
                                                            });
                                                            loadCourseDetail();
                                                        } catch (e) { console.error(e); }
                                                    }}
                                                >
                                                    <CheckCircle size={14} />
                                                    {t.viewed || Number(t.is_completed) > 0 ? (lang === 'ar' ? 'تم الاطلاع' : 'Completed') : (lang === 'ar' ? 'تحديد كمكتمل' : 'Mark as Viewed')}
                                                </button>
                                            )}

                                            {isTrainer && (
                                                <>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => { setSelectedTopicId(t.id); setShowMaterialModal(true); }}>
                                                        <Upload size={14} /> {lang === 'ar' ? 'رفع مادة' : 'Upload Material'}
                                                    </button>
                                                    <button 
                                                        className="btn btn-ghost btn-sm" 
                                                        style={{ color: '#ef4444' }} 
                                                        onClick={() => handleDeleteTopic(t.id)}
                                                        title={lang === 'ar' ? 'حذف الموضوع' : 'Delete Topic'}
                                                    >
                                                        <Trash2 size={14} /> {lang === 'ar' ? 'حذف' : 'Delete'}
                                                    </button>
                                                </>
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

                                                        <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500 }}>{mat.title}</span>
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
                                                        {isTrainer && (
                                                            <button
                                                                className="btn btn-ghost btn-sm"
                                                                style={{ color: '#ef4444', padding: '0.25rem 0.5rem' }}
                                                                onClick={() => handleDeleteMaterial(mat.id)}
                                                                title={lang === 'ar' ? 'حذف المادة' : 'Delete Material'}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
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

            {/* Tab: External Training & Providers Hub */}
            {activeTab === 'external' && isTrainer && course?.course_type === 'external' && (
                <div className="tab-content external-training-container">
                    {/* Header Banner */}
                    <div className="external-header-banner">
                        <div>
                            <h3 style={{ margin: '0 0 0.25rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building2 size={20} className="text-primary" />
                                {lang === 'ar' ? 'إدارة التدريب الميداني الخارجي والجهات المعتمدة' : 'External Training & Industry Providers Hub'}
                            </h3>
                            <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--text-2)' }}>
                                {lang === 'ar' 
                                    ? 'هيكلية التدريب الخارجي: الجهة المعتمدة ← المسار التدريبي (Track) ← المتدربون المسجلون ← اعتماد وثائق التدريب.'
                                    : 'External training structure: Provider → Track → Enrolled Students → Verification Document Approvals.'}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {isAdmin && (
                                <>
                                    <button className="btn btn-primary btn-sm" onClick={() => setShowAddProviderModal(true)}>
                                        <Plus size={15} /> {lang === 'ar' ? 'إنشاء جهة تدريب جديدة' : 'Create Provider'}
                                    </button>
                                    <button className="btn btn-outline btn-sm" onClick={() => setShowAssociateProviderModal(true)}>
                                        <Building2 size={15} /> {lang === 'ar' ? 'ربط جهة تدريب بالدورة' : 'Link Provider to Course'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Stats Summary Pills */}
                    <div className="external-stats-pills">
                        <div className="external-stat-pill">
                            <GraduationCap size={14} />
                            <span>{lang === 'ar' ? 'الطلاب بالتدريب الداخلي:' : 'Internal Students:'} <strong>{totalInternal}</strong></span>
                        </div>
                        <div className="external-stat-pill" style={{ borderColor: 'rgba(59, 130, 246, 0.4)', background: 'rgba(59, 130, 246, 0.05)' }}>
                            <Building2 size={14} />
                            <span>{lang === 'ar' ? 'الطلاب بالتدريب الخارجي:' : 'External Students:'} <strong>{totalExternal}</strong></span>
                        </div>
                        <div className="external-stat-pill">
                            <ShieldCheck size={14} />
                            <span>{lang === 'ar' ? 'الجهات المعتمدة المرتبطة:' : 'Linked Providers:'} <strong>{courseExternalProviders.length}</strong></span>
                        </div>
                        <div className="external-stat-pill">
                            <FileText size={14} />
                            <span>{lang === 'ar' ? 'طلبات التحقق المعلقة:' : 'Pending Verifications:'} <strong>{verificationRequests.filter(v => v.verification_status === 'pending').length}</strong></span>
                        </div>
                    </div>

                    {/* 1. Contracted Providers Section */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ShieldCheck size={18} style={{ color: '#22c55e' }} />
                                {lang === 'ar' ? 'الجهات والمؤسسات المعتمدة والمتعاقد معها' : 'Official Contracted Providers'}
                            </h4>
                        </div>

                        {courseExternalProviders.length === 0 ? (
                            <div className="empty-tab" style={{ padding: '2rem 1rem' }}>
                                <Building2 size={36} />
                                <p>{lang === 'ar' ? 'لم يتم ربط أي جهات تدريب معتمدة بهذه الدورة بعد.' : 'No external providers associated with this course yet.'}</p>
                                {isAdmin && (
                                    <button className="btn btn-outline btn-sm" onClick={() => setShowAssociateProviderModal(true)} style={{ marginTop: '0.75rem' }}>
                                        <Plus size={14} /> {lang === 'ar' ? 'ربط جهة تدريب الآن' : 'Link a Provider Now'}
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="provider-cards-grid">
                                {courseExternalProviders.map(p => {
                                    const providerTracks = topics.filter(t => t.provider_id === p.id);
                                    const providerStudents = trainees.filter(t => t.provider_id === p.id);

                                    return (
                                        <div key={p.id} className="provider-card">
                                            <div className="provider-card-header">
                                                <div className="provider-title-group">
                                                    <h4>{p.name}</h4>
                                                    {p.name && p.name !== p.name && (
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.name}</span>
                                                    )}
                                                    <div className="provider-links-row" style={{ marginTop: '0.35rem' }}>
                                                        {p.website_url && (
                                                            <a href={p.website_url} target="_blank" rel="noopener noreferrer" className="provider-link">
                                                                <Globe size={13} /> {lang === 'ar' ? 'الموقع الرسمي' : 'Website'}
                                                            </a>
                                                        )}
                                                        {p.linkedin_url && (
                                                            <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer" className="provider-link">
                                                                <Linkedin size={13} /> LinkedIn
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                                    <span className="badge badge-approved" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>
                                                        {p.is_contracted ? (lang === 'ar' ? 'معتمد رسمياً' : 'Contracted') : (lang === 'ar' ? 'جهة مخصصة' : 'Custom')}
                                                    </span>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {providerStudents.length} {lang === 'ar' ? 'متدرب' : 'Students'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Tracks under this Provider */}
                                            <div className="provider-tracks-section">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-1)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                                        <Target size={13} />
                                                        {lang === 'ar' ? 'المسارات التدريبية (Tracks):' : 'Training Tracks:'}
                                                    </span>
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        style={{ padding: '2px 6px', fontSize: '0.75rem' }}
                                                        onClick={() => {
                                                            setNewTrackForm({ title: '', description: '', provider_id: String(p.id) });
                                                            setShowAddTrackModal(true);
                                                        }}
                                                    >
                                                        <Plus size={12} /> {lang === 'ar' ? 'إضافة مسار' : 'Add Track'}
                                                    </button>
                                                </div>

                                                <div className="track-chips-list">
                                                    {providerTracks.length === 0 ? (
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                                            {lang === 'ar' ? 'لا توجد مسارات مخصصة بعد' : 'No specific tracks added'}
                                                        </span>
                                                    ) : (
                                                        providerTracks.map(track => (
                                                            <span key={track.id} className="track-chip">
                                                                {track.title}
                                                            </span>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            {/* Enrolled Students preview */}
                                            {providerStudents.length > 0 && (
                                                <div style={{ paddingTop: '0.5rem', borderTop: '1px dashed var(--border)', fontSize: '0.78rem' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>
                                                        {lang === 'ar' ? 'أبرز الطلاب:' : 'Enrolled:'}{' '}
                                                    </span>
                                                    <strong>
                                                        {providerStudents.slice(0, 3).map(s => s.full_name || s.username).join('، ')}
                                                        {providerStudents.length > 3 ? ` +${providerStudents.length - 3}` : ''}
                                                    </strong>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 2. Non-Contracted Providers & Student Verification Queue */}
                    <div className="verification-requests-box" style={{ marginTop: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '8px' }}>
                            <div>
                                <h4 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <FileCheck size={18} className="text-primary" />
                                    {lang === 'ar' ? 'طلبات التحقق للجهات غير المتعاقد معها (Verification Requests)' : 'Non-Contracted Providers Verification Queue'}
                                </h4>
                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-2)' }}>
                                    {lang === 'ar' 
                                        ? 'مراجعة وتدقيق مستندات ووثائق التدريب الخارجي المرفوعة من قبل الطلاب لاعتماد جهة التدريب غير المعتمدة رسمياً.'
                                        : 'Review and audit student-uploaded training verification documents for non-contracted companies.'}
                                </p>
                            </div>
                            <button className="btn btn-outline btn-sm" onClick={fetchVerificationRequests} disabled={loadingVerifications}>
                                {loadingVerifications ? <Loader2 className="spin" size={14} /> : <RotateCcw size={14} />}
                                {lang === 'ar' ? 'تحديث الكشف' : 'Refresh'}
                            </button>
                        </div>

                        {verificationRequests.length === 0 ? (
                            <div className="empty-tab" style={{ padding: '1.5rem 1rem' }}>
                                <CheckCircle size={32} style={{ color: '#22c55e' }} />
                                <p>{lang === 'ar' ? 'لا توجد طلبات تحقق مرفوعة في هذه الدورة حالياً.' : 'No verification requests submitted for this course.'}</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table className="verification-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>{lang === 'ar' ? 'المتدرب' : 'Student'}</th>
                                            <th>{lang === 'ar' ? 'جهة التدريب المخصصة' : 'Custom Provider'}</th>
                                            <th>{lang === 'ar' ? 'وثيقة الإثبات' : 'Document'}</th>
                                            <th>{lang === 'ar' ? 'الحالة' : 'Status'}</th>
                                            <th>{lang === 'ar' ? 'الملاحظات / سبب الرفض' : 'Feedback / Reason'}</th>
                                            <th>{lang === 'ar' ? 'الإجراء' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {verificationRequests.map((req, idx) => (
                                            <tr key={req.enrollment_id || idx}>
                                                <td>{idx + 1}</td>
                                                <td>
                                                    <strong>{req.trainee_name}</strong>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        {req.student_id ? `ID: ${req.student_id}` : req.trainee_email}
                                                    </div>
                                                </td>
                                                <td>
                                                    <strong>{req.custom_provider_name || 'Custom Company'}</strong>
                                                    <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                                                        {req.custom_provider_website && (
                                                            <a href={req.custom_provider_website} target="_blank" rel="noopener noreferrer" className="provider-link" style={{ fontSize: '0.74rem' }}>
                                                                <Globe size={11} /> {lang === 'ar' ? 'موقع' : 'Web'}
                                                            </a>
                                                        )}
                                                        {req.custom_provider_linkedin && (
                                                            <a href={req.custom_provider_linkedin} target="_blank" rel="noopener noreferrer" className="provider-link" style={{ fontSize: '0.74rem' }}>
                                                                <Linkedin size={11} /> LinkedIn
                                                            </a>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    {req.verification_doc_url ? (
                                                        <a
                                                            href={req.verification_doc_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn-outline btn-sm"
                                                            style={{ padding: '3px 8px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                        >
                                                            <Eye size={13} /> {lang === 'ar' ? 'معاينة الوثيقة' : 'View Document'}
                                                        </a>
                                                    ) : (
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{lang === 'ar' ? 'لم يتم الرفع' : 'Not uploaded'}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {req.verification_status === 'approved' ? (
                                                        <span className="badge badge-approved" style={{ fontSize: '0.75rem' }}>
                                                            <CheckCircle size={12} /> {lang === 'ar' ? 'معتمد ومقبول' : 'Approved'}
                                                        </span>
                                                    ) : req.verification_status === 'rejected' ? (
                                                        <span className="badge badge-rejected" style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#dc2626' }}>
                                                            <XCircle size={12} /> {lang === 'ar' ? 'مرفوض' : 'Rejected'}
                                                        </span>
                                                    ) : (
                                                        <span className="badge badge-pending" style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#d97706' }}>
                                                            <Clock size={12} /> {lang === 'ar' ? 'قيد المراجعة' : 'Pending'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ maxWidth: '220px', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                                                    {req.verification_feedback || '—'}
                                                </td>
                                                <td>
                                                    {isAdmin && (
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                                                                onClick={() => {
                                                                    setReviewingVerif(req);
                                                                    setVerifFeedback('');
                                                                    handleReviewVerificationSubmit('approved');
                                                                }}
                                                            >
                                                                <Check size={13} /> {lang === 'ar' ? 'اعتماد' : 'Approve'}
                                                            </button>
                                                            <button
                                                                className="btn btn-outline btn-sm"
                                                                style={{ padding: '3px 8px', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5' }}
                                                                onClick={() => {
                                                                    const reason = prompt(lang === 'ar' ? 'يرجى كتابة سبب رفض وثيقة التدريب لإبلاغ الطالب:' : 'Please enter rejection reason:');
                                                                    if (reason) {
                                                                        setReviewingVerif(req);
                                                                        setVerifFeedback(reason);
                                                                        handleReviewVerificationSubmit('rejected');
                                                                    }
                                                                }}
                                                            >
                                                                <X size={13} /> {lang === 'ar' ? 'رفض' : 'Reject'}
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Robotics Simulator Tab */}
            {activeTab === 'simulator' && isRoboticsCourse && (
                <div className="tab-content magy-simulator-view" data-magy-key="simulator">
                    <div className="tab-action-bar">
                        <div>
                            <h3>{lang === 'ar' ? 'مختبر المحاكاة وكتابة الكود للروبوتات (ROS2 Simulator)' : 'ROS2 & Embedded Robotics Code Simulator'}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.2rem 0 0 0' }}>
                                {lang === 'ar' ? 'اختبر كود C++ / Python المدمج والتحكم في إشارات الـ PWM قبل رفعه على البردة.' : 'Test C++ / Python node code and motor PWM signals in real time.'}
                            </p>
                        </div>
                        <button className="btn btn-primary" onClick={handleRunSim} disabled={simRunning}>
                            {simRunning ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
                            {lang === 'ar' ? 'تشغيل المحاكاة (Run Node)' : 'Run ROS2 Node'}
                        </button>
                    </div>

                    <div className="sim-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.25rem' }}>
                        <div className="sim-code-box" style={{ background: '#0f172a', borderRadius: '14px', padding: '1rem', border: '1px solid #1e293b' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                                <span>robotics_node.cpp (Embedded C++)</span>
                                <span style={{ color: '#22c55e' }}>● Live Editor</span>
                            </div>
                            <textarea
                                rows={14}
                                value={simCode}
                                onChange={e => setSimCode(e.target.value)}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    color: '#f8fafc',
                                    fontFamily: 'monospace',
                                    fontSize: '0.86rem',
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'vertical',
                                    lineHeight: 1.5
                                }}
                                data-magy-tip="محرر كود الأنظمة المدمجة. يرجى ضبط قيم التعديل بعرض النبضة (PWM) والتأكد من شروط التوقف الفوري (Emergency Stop) لمراقبة الاستجابة في المخرجات."
                            />
                        </div>

                        <div className="sim-output-box" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem' }}>
                                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                                    {lang === 'ar' ? 'مؤشر إشارة التحكم بالمحرك PWM' : 'Motor PWM Control Gauge'}
                                </h4>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ flex: 1, height: '14px', background: '#e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ width: `${pwmGauge}%`, height: '100%', background: 'linear-gradient(90deg, #dc2626, #f59e0b)', transition: 'width 0.4s ease' }} />
                                    </div>
                                    <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.1rem' }}>{pwmGauge}%</span>
                                </div>
                            </div>

                            <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '14px', padding: '1rem', flex: 1 }}>
                                <div style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                                    Serial Monitor & ROS2 Telemetry Output
                                </div>
                                <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#38bdf8', height: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {simLogs.map((log, idx) => (
                                        <div key={idx}>{log}</div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Trainees & Excel Import */}
            {activeTab === 'trainees' && (
                <div className="tab-content">
                    <div className="tab-action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                        <div>
                            <h3 style={{ margin: 0 }}>{isTrainer 
                                ? (lang === 'ar' ? 'كشف المتدربين المقيدين' : 'Enrolled Trainees') 
                                : (lang === 'ar' ? 'أعضاء فريق العمل المعتمد' : 'My Project Team Members')}
                            </h3>
                            {isTrainer && (
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {lang === 'ar' ? `إجمالي المتدربين: ${trainees.length}` : `Total Trainees: ${trainees.length}`}
                                </p>
                            )}
                        </div>
                        {isTrainer && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowAddStudentModal(true)}>
                                    <UserPlus size={16} /> {lang === 'ar' ? 'إضافة متدرب' : 'Add Student'}
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={() => setShowExcelModal(true)}>
                                    <FileSpreadsheet size={16} /> {lang === 'ar' ? 'استيراد Excel' : 'Import Excel'}
                                </button>
                                {trainees.length > 0 && (
                                    <button className="btn btn-danger btn-sm" onClick={handleRemoveAllTrainees} title={lang === 'ar' ? 'حذف جميع المتدربين المسجلين' : 'Clear All Trainees'}>
                                        <Trash2 size={16} /> {lang === 'ar' ? 'حذف جميع المتدربين' : 'Clear Trainees'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Search Input for Trainees */}
                    {isTrainer && trainees.length > 0 && (
                        <div style={{ position: 'relative', marginBottom: '1.25rem', width: '100%' }}>
                            <Search 
                                size={18} 
                                style={{ 
                                    position: 'absolute', 
                                    left: lang === 'ar' ? 'unset' : '14px', 
                                    right: lang === 'ar' ? '14px' : 'unset', 
                                    top: '50%', 
                                    transform: 'translateY(-50%)', 
                                    color: '#94a3b8',
                                    pointerEvents: 'none' 
                                }} 
                            />
                            <input 
                                type="text"
                                value={traineeSearchQuery}
                                onChange={e => setTraineeSearchQuery(e.target.value)}
                                placeholder={lang === 'ar' 
                                    ? 'بحث بالاسم، البريد الإلكتروني، الرقم الجامعي، أو جهة ومسار التدريب...' 
                                    : 'Search by name, email, student ID, track, or provider...'}
                                style={{
                                    width: '100%',
                                    padding: lang === 'ar' ? '0.7rem 2.75rem 0.7rem 1rem' : '0.7rem 1rem 0.7rem 2.75rem',
                                    borderRadius: '10px',
                                    border: '1.5px solid var(--border, #e2e8f0)',
                                    background: 'var(--bg-0, #ffffff)',
                                    color: 'var(--text-0, #0f172a)',
                                    fontSize: '0.92rem',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />
                            {traineeSearchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setTraineeSearchQuery('')}
                                    style={{
                                        position: 'absolute',
                                        right: lang === 'ar' ? 'unset' : '14px',
                                        left: lang === 'ar' ? '14px' : 'unset',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#94a3b8',
                                        fontSize: '0.9rem',
                                        padding: '4px'
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    )}

                    {(() => {
                        let baseList = isTrainer 
                            ? trainees 
                            : (myIdea?.team_members && myIdea.team_members.length > 0 
                                ? myIdea.team_members 
                                : [{ trainee_id: user?.id, full_name: user?.full_name, email: user?.email, student_id: user?.student_id, role: 'leader' }]);

                        const q = (traineeSearchQuery || '').trim().toLowerCase();
                        const filteredList = q 
                            ? baseList.filter(tr => {
                                const name = (tr.full_name || tr.username || '').toLowerCase();
                                const email = (tr.email || tr.academic_email || '').toLowerCase();
                                const sid = String(tr.student_id || tr.academic_id || '').toLowerCase();
                                const provider = String(tr.provider_name || tr.custom_provider_name || '').toLowerCase();
                                const track = String(tr.track_name || tr.final_track || '').toLowerCase();
                                return name.includes(q) || email.includes(q) || sid.includes(q) || provider.includes(q) || track.includes(q);
                            })
                            : baseList;

                        const isExternalCourse = (course?.course_type === 'external') || (totalExternal > 0 && totalInternal === 0);

                        const handleTraineeSort = (col) => {
                            if (traineeSortCol === col) {
                                setTraineeSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                            } else {
                                setTraineeSortCol(col);
                                setTraineeSortDir('asc');
                            }
                        };

                        const renderSortIcon = (col) => {
                            if (traineeSortCol !== col) {
                                return <span style={{ opacity: 0.35, fontSize: '0.72rem', marginInlineStart: '5px' }}>⇅</span>;
                            }
                            return traineeSortDir === 'asc' 
                                ? <ChevronUp size={13} style={{ display: 'inline', verticalAlign: 'middle', marginInlineStart: '4px', color: '#2563eb' }} />
                                : <ChevronDown size={13} style={{ display: 'inline', verticalAlign: 'middle', marginInlineStart: '4px', color: '#2563eb' }} />;
                        };

                        const sortedDisplayList = [...filteredList].sort((a, b) => {
                            let valA = '';
                            let valB = '';

                            if (traineeSortCol === 'num') {
                                return 0;
                            } else if (traineeSortCol === 'name') {
                                valA = (a.full_name || a.username || a.email || '').toLowerCase();
                                valB = (b.full_name || b.username || b.email || '').toLowerCase();
                            } else if (traineeSortCol === 'email') {
                                valA = (a.email || '').toLowerCase();
                                valB = (b.email || '').toLowerCase();
                            } else if (traineeSortCol === 'student_id') {
                                valA = String(a.student_id || a.academic_id || '').toLowerCase();
                                valB = String(b.student_id || b.academic_id || '').toLowerCase();
                            } else if (traineeSortCol === 'provider') {
                                valA = (a.provider_name || a.custom_provider_name || a.training_type || '').toLowerCase();
                                valB = (b.provider_name || b.custom_provider_name || b.training_type || '').toLowerCase();
                            } else if (traineeSortCol === 'started_date') {
                                valA = a.training_start_date || a.enrolled_at || '';
                                valB = b.training_start_date || b.enrolled_at || '';
                            } else if (traineeSortCol === 'role') {
                                valA = a.role || '';
                                valB = b.role || '';
                            }

                            if (valA < valB) return traineeSortDir === 'asc' ? -1 : 1;
                            if (valA > valB) return traineeSortDir === 'asc' ? 1 : -1;
                            return 0;
                        });

                        if (sortedDisplayList.length === 0) {
                            return (
                                <div className="empty-tab">
                                    <Users size={36} />
                                    <p>{q 
                                        ? (lang === 'ar' ? 'لا يوجد متدربون يطابقون نتائج البحث.' : 'No trainees match your search query.') 
                                        : (isTrainer ? (lang === 'ar' ? 'لا يوجد متدربون مقيدون بعد.' : 'No trainees enrolled yet.') : (lang === 'ar' ? 'لم يتم تعيين فريق عمل بعد.' : 'No team members assigned yet.'))
                                    }</p>
                                </div>
                            );
                        }

                        return (
                            <div className="table-responsive data-table-wrapper" style={{ overflowX: 'auto', width: '100%', borderRadius: '12px', border: '1px solid var(--border, #e2e8f0)', background: 'var(--bg-0, #ffffff)', WebkitOverflowScrolling: 'touch' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th 
                                                onClick={() => handleTraineeSort('num')} 
                                                style={{ width: '48px', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}
                                                title={lang === 'ar' ? 'ترتيب' : 'Sort'}
                                            >
                                                # {renderSortIcon('num')}
                                            </th>
                                            <th 
                                                onClick={() => handleTraineeSort('name')} 
                                                style={{ minWidth: '220px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                                                title={lang === 'ar' ? 'ترتيب حسب الاسم' : 'Sort by Name'}
                                            >
                                                {lang === 'ar' ? 'الاسم' : 'Name'} {renderSortIcon('name')}
                                            </th>
                                            <th 
                                                onClick={() => handleTraineeSort('email')} 
                                                style={{ minWidth: '200px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                                                title={lang === 'ar' ? 'ترتيب حسب البريد الإلكتروني' : 'Sort by Email'}
                                            >
                                                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email'} {renderSortIcon('email')}
                                            </th>
                                            <th 
                                                onClick={() => handleTraineeSort('student_id')} 
                                                style={{ minWidth: '130px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                                                title={lang === 'ar' ? 'ترتيب حسب الرقم الجامعي' : 'Sort by Student ID'}
                                            >
                                                {lang === 'ar' ? 'الرقم الجامعي' : 'Student ID'} {renderSortIcon('student_id')}
                                            </th>
                                            {isTrainer ? (
                                                <th 
                                                    onClick={() => handleTraineeSort('provider')} 
                                                    style={{ minWidth: '180px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                                                    title={lang === 'ar' ? 'ترتيب حسب نوع التدريب والجهة' : 'Sort by Training Type & Provider'}
                                                >
                                                    {lang === 'ar' ? 'نوع التدريب والجهة' : 'Training Type & Provider'} {renderSortIcon('provider')}
                                                </th>
                                            ) : (
                                                <th 
                                                    onClick={() => handleTraineeSort('role')} 
                                                    style={{ minWidth: '100px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                                                    title={lang === 'ar' ? 'ترتيب حسب الدور' : 'Sort by Role'}
                                                >
                                                    {lang === 'ar' ? 'الدور' : 'Role'} {renderSortIcon('role')}
                                                </th>
                                            )}
                                            {isExternalCourse && (
                                                <th 
                                                    onClick={() => handleTraineeSort('started_date')} 
                                                    style={{ minWidth: '150px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                                                    title={lang === 'ar' ? 'ترتيب حسب تاريخ البدء' : 'Sort by Started Date'}
                                                >
                                                    {lang === 'ar' ? 'تاريخ البدء' : 'Started Date'} {renderSortIcon('started_date')}
                                                </th>
                                            )}
                                            {isTrainer && <th style={{ minWidth: '170px', whiteSpace: 'nowrap' }}>{lang === 'ar' ? 'الإجراءات والشهادة' : 'Actions / Certificate'}</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedDisplayList.map((tr, idx) => (
                                            <tr key={tr.trainee_id || tr.user_id || tr.id || idx}>
                                                <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                                <td style={{ whiteSpace: 'nowrap' }}>
                                                    <strong style={{ display: 'inline-block', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{tr.full_name || tr.username || tr.email}</strong>
                                                    {!isExternalCourse && tr.role === 'leader' && (
                                                        <span style={{ marginInlineStart: '8px', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', fontWeight: 700, display: 'inline-block', whiteSpace: 'nowrap' }}>
                                                            {lang === 'ar' ? 'قائد الفريق' : 'Team Leader'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ whiteSpace: 'nowrap' }}>{tr.email || '-'}</td>
                                                <td style={{ whiteSpace: 'nowrap', fontFamily: 'var(--font-mono, monospace)' }}>{tr.student_id || '-'}</td>
                                                {isTrainer ? (
                                                    <td>
                                                        {tr.training_type === 'external' ? (
                                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                                <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.76rem', gap: '4px', whiteSpace: 'nowrap' }}>
                                                                    <Building2 size={12} />
                                                                    {tr.provider_name || tr.custom_provider_name || (lang === 'ar' ? 'تدريب خارجي' : 'External')}
                                                                    {tr.track_name ? ` • ${tr.track_name}` : ''}
                                                                </span>
                                                                {(tr.custom_provider_website || tr.provider_website_url) && (
                                                                    <a 
                                                                        href={tr.custom_provider_website || tr.provider_website_url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer" 
                                                                        title={lang === 'ar' ? 'رابط الموقع الرسمي لجهة التدريب' : 'Official Provider Website'}
                                                                        style={{ color: '#2563eb', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                                                                    >
                                                                        <Globe size={13} />
                                                                    </a>
                                                                )}
                                                                {(tr.custom_provider_linkedin || tr.provider_linkedin_url) && (
                                                                    <a 
                                                                        href={tr.custom_provider_linkedin || tr.provider_linkedin_url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer" 
                                                                        title={lang === 'ar' ? 'رابط صفحة LinkedIn لجهة التدريب' : 'Official Provider LinkedIn'}
                                                                        style={{ color: '#0284c7', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }}
                                                                    >
                                                                        <Linkedin size={13} />
                                                                    </a>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="badge" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                                                <GraduationCap size={12} />
                                                                {lang === 'ar' ? 'تدريب داخلي' : 'Internal'}
                                                                {tr.track_name ? ` • ${tr.track_name}` : ''}
                                                            </span>
                                                        )}
                                                    </td>
                                                ) : (
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        <span style={{ fontWeight: 600, color: tr.role === 'leader' ? '#d97706' : '#2563eb' }}>
                                                            {tr.role === 'leader' ? (lang === 'ar' ? 'قائد' : 'Leader') : (lang === 'ar' ? 'عضو' : 'Member')}
                                                        </span>
                                                    </td>
                                                )}
                                                {isExternalCourse && (
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        {tr.training_start_date ? (
                                                            <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                <Calendar size={12} />
                                                                {tr.training_start_date}
                                                            </span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>-</span>
                                                        )}
                                                    </td>
                                                )}
                                                {isTrainer && (
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                                                            {isAdmin && (
                                                                <button
                                                                    className="btn btn-ghost btn-sm"
                                                                    style={{ padding: '2px 6px', fontSize: '0.74rem' }}
                                                                    title={lang === 'ar' ? 'تعديل مسار ونوع التدريب' : 'Reassign Track / Provider'}
                                                                    onClick={() => {
                                                                        setReassignStudent(tr);
                                                                        setReassignForm({
                                                                            training_type: tr.training_type || 'internal',
                                                                            provider_id: tr.provider_id ? String(tr.provider_id) : '',
                                                                            track_id: tr.track_id ? String(tr.track_id) : '',
                                                                            custom_provider_name: tr.custom_provider_name || '',
                                                                            custom_provider_website: tr.custom_provider_website || '',
                                                                            custom_provider_linkedin: tr.custom_provider_linkedin || ''
                                                                        });
                                                                        setShowReassignStudentModal(true);
                                                                    }}
                                                                >
                                                                    <Edit3 size={13} /> {lang === 'ar' ? 'تعديل المسار' : 'Track'}
                                                                </button>
                                                            )}

                                                            {(tr.evaluation_status === 'pass' || (Number(tr.evaluation_score) >= 60)) ? (
                                                                <button 
                                                                    className="btn btn-outline btn-sm"
                                                                    style={{ gap: '0.35rem', borderColor: 'var(--amber)', color: 'var(--amber)', fontSize: '0.74rem', padding: '2px 8px' }}
                                                                    disabled={issuingCertId === (tr.trainee_id || tr.id)}
                                                                    onClick={() => handleIssueCertificate(tr.trainee_id || tr.id, tr.full_name)}
                                                                >
                                                                    <Award size={13} />
                                                                    {issuingCertId === (tr.trainee_id || tr.id) ? '...' : (lang === 'ar' ? 'الشهادة' : 'Cert')}
                                                                </button>
                                                            ) : (
                                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                                    {tr.evaluation_status === 'fail' 
                                                                        ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{lang === 'ar' ? 'راسب' : 'Failed'}</span>
                                                                        : '—'
                                                                    }
                                                                </span>
                                                            )}

                                                            <button
                                                                className="btn btn-ghost btn-sm"
                                                                style={{ padding: '2px 6px', fontSize: '0.74rem', color: '#dc2626' }}
                                                                title={lang === 'ar' ? 'حذف المتدرب من الدورة' : 'Remove Student'}
                                                                onClick={() => handleRemoveTrainee(tr.trainee_id || tr.id, tr.full_name || tr.username)}
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* Tab 3: Trainee Project Idea */}
            {activeTab === 'idea' && (
                <div className="tab-content">
                    {isTrainee ? (
                        <div className="idea-submission-box">
                            <div className="tab-action-bar" style={{ marginBottom: '1.2rem' }}>
                                <h3>{lang === 'ar' ? 'تقديم فكرة المشروع التدريبي' : 'Training Project Idea Submission'}</h3>
                            </div>

                            {/* Official Academic Proposal & Documentation Standout Card */}
                            {myIdea && (
                                <div className="official-doc-standout-card" style={{ marginBottom: '1.5rem' }}>
                                    <div className="standout-card-header">
                                        <div className="standout-title-group">
                                            <div className="standout-icon-badge">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <h4>{lang === 'ar' ? 'المقترح الأكاديمي والتوثيق المعتمد' : 'Official Academic Proposal & Documentation'}</h4>
                                                    <span className={`status-badge status-${myIdea.status || 'submitted'}`}>
                                                        {myIdea.status === 'approved' ? (lang === 'ar' ? 'معتمد رسمياً' : 'Approved') : (myIdea.status || 'Submitted')}
                                                    </span>
                                                </div>
                                                <p className="standout-subtitle">
                                                    {myIdea.title || 'Official NMU Summer Training Proposal'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="standout-actions">
                                            <button
                                                type="button"
                                                onClick={handleDownloadMyIdeaDocx}
                                                disabled={downloadingIdeaDocx}
                                                className="btn btn-primary btn-sm"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: downloadingIdeaDocx ? 'wait' : 'pointer' }}
                                            >
                                                {downloadingIdeaDocx ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
                                                <span>{downloadingIdeaDocx ? (lang === 'ar' ? 'جارٍ التحميل...' : 'Downloading...') : (lang === 'ar' ? 'تحميل ملف Word (.docx)' : 'Download Word (.docx)')}</span>
                                            </button>
                                            <Link
                                                to="/submitted-projects"
                                                className="btn btn-outline btn-sm"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                                            >
                                                <ExternalLink size={15} />
                                                <span>{lang === 'ar' ? 'فتح لوحة المشروع والتوثيق' : 'Open Project Portal'}</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="ai-generator-card" style={{ marginBottom: '1.5rem' }}>
                                <div className="ai-card-header">
                                    <div className="ai-title-row">
                                        <Sparkles size={18} className="ai-sparkle" />
                                        <h4>{lang === 'ar' ? 'مساعد الذكاء الاصطناعي لتوليد الأفكار' : 'AI Idea Proposal Generator'}</h4>
                                        <span className="ai-badge">{lang === 'ar' ? 'توليد ذكي' : 'AI Powered'}</span>
                                    </div>
                                    <p className="ai-subtitle">
                                        {lang === 'ar' ? 'أدخل عنوان الفكرة أو اختر موضوعاً سريعاً لتوليد المقترح بالكامل' : 'Enter keywords or pick a topic to generate a full project proposal.'}
                                    </p>
                                </div>
                                <div className="ai-input-row">
                                    <input 
                                        type="text" 
                                        placeholder={lang === 'ar' ? 'مثال: منصة تعليم ذكية لمنسوبي الجامعة' : 'e.g. Smart E-Learning Platform for University'}
                                        value={aiKeyword}
                                        onChange={e => setAiKeyword(e.target.value)}
                                    />
                                    <button className="btn-ai-generate" type="button" onClick={handleGenerateAiProposal} disabled={generatingAi || !aiKeyword.trim()}>
                                        {generatingAi ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
                                        <span>{lang === 'ar' ? 'توليد تلقائي' : 'Generate Proposal'}</span>
                                    </button>
                                </div>
                                <div className="ai-sample-pills">
                                    <span className="pill-label">{lang === 'ar' ? 'مقترحات سريعة:' : 'Quick Topics:'}</span>
                                    {[
                                        { ar: 'نظام حضور ذكي', en: 'Smart Attendance System' },
                                        { ar: 'شات بوت الدعم الأكاديمي', en: 'Academic Support AI Chatbot' },
                                        { ar: 'لوحة تحليلات الطاقة', en: 'Energy Analytics Dashboard' }
                                    ].map((pill, idx) => (
                                        <button 
                                            key={idx}
                                            type="button" 
                                            className="ai-pill-btn"
                                            onClick={() => setAiKeyword(lang === 'ar' ? pill.ar : pill.en)}
                                        >
                                            {lang === 'ar' ? pill.ar : pill.en}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {ideaSubmitError && (
                                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                                    {ideaSubmitError}
                                </div>
                            )}

                            {myIdea && !myIdea.is_team_leader && (
                                <div className="alert alert-info" style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', padding: '0.85rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Users size={20} />
                                    <span>
                                        {lang === 'ar' 
                                            ? `أنت مسجل في هذا المشروع كـ (عضو فريق). قائد المشروع: ${myIdea.trainee_name || myIdea.owner_name || 'قائد الفريق'}` 
                                            : `You are enrolled in this project as a (Team Member). Team Leader: ${myIdea.trainee_name || myIdea.owner_name || 'Team Leader'}`}
                                    </span>
                                </div>
                            )}

                            <form onSubmit={handleSubmitIdea} className="form-section-card">
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'عنوان المشروع (بالإنجليزي) *' : 'Project Title  *'}</label>
                                    <div className="input-with-icon">
                                        <FileText size={16} className="field-icon" />
                                        <input type="text" required value={ideaTitleEn} onChange={e => setIdeaTitleEn(e.target.value)} placeholder={lang === 'ar' ? 'عنوان المشروع...' : 'e.g. Smart Attendance System'} readOnly={myIdea && !myIdea.is_team_leader} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'وصف المشروع *' : 'Project Description *'}</label>
                                    <textarea rows="4" required value={ideaDescEn} onChange={e => setIdeaDescEn(e.target.value)} placeholder={lang === 'ar' ? 'شرح فكرة المشروع وأهدافه...' : 'Describe the project idea and goals...'} readOnly={myIdea && !myIdea.is_team_leader} />
                                </div>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'التقنيات المستهدفة (Tech Stack)' : 'Target Tech Stack'}</label>
                                    <div className="input-with-icon">
                                        <Code size={16} className="field-icon" />
                                        <input type="text" value={techStack} onChange={e => setTechStack(e.target.value)} placeholder="React, PHP, MySQL, Docker..." readOnly={myIdea && !myIdea.is_team_leader} />
                                    </div>
                                </div>
                                <div className="form-grid-2">
                                    <div className="form-group">
                                        <label>{lang === 'ar' ? 'المشكلة المعالجة' : 'Problem Statement'}</label>
                                        <textarea rows="3" value={problemStmt} onChange={e => setProblemStmt(e.target.value)} placeholder={lang === 'ar' ? 'ما هي المشكلة المعالجة؟' : 'What problem does this solve?'} readOnly={myIdea && !myIdea.is_team_leader} />
                                    </div>
                                    <div className="form-group">
                                        <label>{lang === 'ar' ? 'المخرجات المتوقعة' : 'Expected Deliverables'}</label>
                                        <textarea rows="3" value={expectedOutput} onChange={e => setExpectedOutput(e.target.value)} placeholder={lang === 'ar' ? 'المخرجات النهائية للتسليم...' : 'Expected final outputs...'} readOnly={myIdea && !myIdea.is_team_leader} />
                                    </div>
                                </div>

                                {/* Teammate Selector Component — Only for Internal Courses (External projects are individual) */}
                                {!isExternalCourse ? (
                                    <TeammateSelector 
                                        courseId={courseId}
                                        selectedTeammates={selectedTeammates}
                                        onTeammatesChange={setSelectedTeammates}
                                        currentIdeaId={myIdea?.id}
                                        disabled={submittingIdea}
                                        readOnly={myIdea && !myIdea.is_team_leader}
                                    />
                                ) : (
                                    <div style={{ padding: '0.85rem 1rem', background: 'rgba(59, 130, 246, 0.06)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-1)' }}>
                                        <User size={16} style={{ color: '#2563eb' }} />
                                        <span>{lang === 'ar' ? 'مشاريع التدريب الخارجي هي مشاريع فردية مستقلة لكل طالب (Individual Project).' : 'External training projects are strictly individual.'}</span>
                                    </div>
                                )}

                                {(!myIdea || myIdea.is_team_leader) && (
                                    <button type="submit" className="btn btn-primary btn-lg" style={{ marginTop: '0.5rem', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '8px' }} disabled={submittingIdea}>
                                        {submittingIdea ? <Loader2 className="spin" size={18} /> : <><Send size={18} /> {lang === 'ar' ? 'حفظ وإرسال الفكرة' : 'Save & Submit Idea'}</>}
                                    </button>
                                )}
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
                                            <h4>{idea.title}</h4>
                                            <span className={`status-badge status-${idea.status}`}>{idea.status}</span>
                                        </div>
                                        <p className="idea-author">Submitted by: <strong>{idea.trainee_name}</strong> ({idea.trainee_email})</p>
                                        
                                        {/* Team Roster display for trainers */}
                                        {idea.team_members && idea.team_members.length > 0 && (
                                            <div className="idea-team-members-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '0.5rem 0', alignItems: 'center' }}>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                                                    {lang === 'ar' ? 'فريق العمل:' : 'Team:'}
                                                </span>
                                                {idea.team_members.map(m => (
                                                    <button 
                                                        key={m.user_id || m.id}
                                                        type="button"
                                                        onClick={() => setViewingMember(m)}
                                                        title={lang === 'ar' ? `انقر لعرض بيانات ${m.full_name || m.username}` : `Click to view profile of ${m.full_name || m.username}`}
                                                        style={{
                                                            fontSize: '0.74rem',
                                                            fontWeight: 600,
                                                            padding: '0.15rem 0.55rem',
                                                            borderRadius: '6px',
                                                            background: m.role === 'leader' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                                                            color: m.role === 'leader' ? '#d97706' : '#2563eb',
                                                            border: m.role === 'leader' ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid rgba(59, 130, 246, 0.25)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                    >
                                                        {m.role === 'leader' ? <Crown size={12} style={{ color: '#d97706' }} /> : <Users size={12} />} {m.full_name || m.username} {m.student_id ? `(${m.student_id})` : ''}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <p className="idea-body">{idea.description}</p>

                                        <div className="idea-actions">
                                            {(!idea.status || idea.status === 'submitted' || idea.status === 'under_review' || idea.status === 'draft' || idea.status === 'pending') && (
                                                <>
                                                    <button className="btn btn-success btn-sm" onClick={() => handleEvaluateIdea(idea.id, 'approved', 'Great proposal!')}>
                                                        <CheckCircle size={14} /> {lang === 'ar' ? 'قبول' : 'Approve'}
                                                    </button>
                                                    <button className="btn btn-danger btn-sm" onClick={() => handleEvaluateIdea(idea.id, 'rejected', 'Needs modification.')}>
                                                        <XCircle size={14} /> {lang === 'ar' ? 'رفض' : 'Reject'}
                                                    </button>
                                                </>
                                            )}
                                            {idea.status === 'approved' && (
                                                <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => handleEvaluateIdea(idea.id, 'rejected', 'Needs modification.')}>
                                                    <XCircle size={14} /> {lang === 'ar' ? 'تغيير إلى مرفوض' : 'Change to Rejected'}
                                                </button>
                                            )}
                                            {idea.status === 'rejected' && (
                                                <button className="btn btn-ghost btn-sm" style={{ color: '#10b981' }} onClick={() => handleEvaluateIdea(idea.id, 'approved', 'Great proposal!')}>
                                                    <CheckCircle size={14} /> {lang === 'ar' ? 'إعادة القبول' : 'Re-Approve'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}



            {/* Tab 5: Evaluations */}
            {activeTab === 'evaluations' && (
                <div className="tab-content">
                    {isTrainee ? (
                        <div className="eval-result-card" style={{ background: 'var(--bg-1, #ffffff)', border: '1.5px solid var(--border, #e2e8f0)', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-0)' }}>
                                        {lang === 'ar' ? 'نتيجة تقييم التدريب الميداني الأكاديمي' : 'Academic Field Training Evaluation Result'}
                                    </h3>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {lang === 'ar' ? 'معايير التقييم والدرجات المعتمدة من المشرف الأكاديمي والمدرب' : 'Evaluation criteria and grades certified by the supervising trainer.'}
                                    </p>
                                </div>
                                {myEval && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            padding: '0.5rem 1.25rem',
                                            borderRadius: '12px',
                                            background: myEval.status === 'pass' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                            color: myEval.status === 'pass' ? '#16a34a' : '#ef4444',
                                            fontWeight: 800,
                                            fontSize: '1.1rem',
                                            border: `1px solid ${myEval.status === 'pass' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                        }}>
                                            {myEval.final_score} / 100 ({myEval.status === 'pass' ? 'PASS' : 'FAIL'})
                                        </div>
                                    </div>
                                )}
                            </div>

                            {myEval ? (
                                <div className="eval-details">
                                    {/* Dynamic Course Rubrics Breakdown */}
                                    {(() => {
                                        let stored = {};
                                        try {
                                            stored = typeof myEval.criteria_scores === 'string' ? JSON.parse(myEval.criteria_scores || '{}') : (myEval.criteria_scores || {});
                                        } catch (_) {}

                                        if (!stored || Object.keys(stored).length === 0) {
                                            return null;
                                        }

                                        const finalScore = parseFloat(myEval.final_score) || 0;
                                        const rubricsList = (courseCriteria && courseCriteria.length > 0) ? courseCriteria : defaultRubrics;

                                        const renderedRubrics = rubricsList.map(c => {
                                            const critName = c.name;
                                            const maxW = parseFloat(c.weight) || 0;
                                            let val = undefined;
                                            if (stored[critName] !== undefined) val = Number(stored[critName]);
                                            else if (stored[critName.toLowerCase()] !== undefined) val = Number(stored[critName.toLowerCase()]);
                                            else if (c.id && stored[c.id] !== undefined) val = Number(stored[c.id]);

                                            if (val === undefined || isNaN(val)) {
                                                val = Math.min(maxW, Math.round((finalScore * (maxW / 100)) * 10) / 10);
                                            } else {
                                                val = Math.min(maxW, Math.max(0, val));
                                            }

                                            return {
                                                name: critName,
                                                max: maxW,
                                                val: val
                                            };
                                        });

                                        return (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                                {renderedRubrics.map((r, idx) => (
                                                    <div key={idx} style={{ background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '12px', padding: '1rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>
                                                                {r.name}
                                                            </span>
                                                            <strong style={{ fontSize: '0.9rem', color: 'var(--primary, #002D56)' }}>
                                                                {r.val} / {r.max}
                                                            </strong>
                                                        </div>
                                                        <div style={{ width: '100%', height: '7px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${r.max > 0 ? Math.min(100, Math.round((r.val / r.max) * 100)) : 0}%`, height: '100%', background: 'linear-gradient(90deg, #002D56, #3b82f6)', borderRadius: '4px' }}></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}

                                    {myEval.feedback && (
                                        <div style={{ background: 'rgba(0, 45, 86, 0.04)', border: '1px solid rgba(0, 45, 86, 0.12)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
                                            <strong style={{ color: 'var(--primary, #002D56)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.35rem' }}>
                                                <MessageSquare size={15} /> {lang === 'ar' ? 'ملاحظات المشرف وتوجيهات التقييم:' : 'Trainer Feedback & Evaluation Notes:'}
                                            </strong>
                                            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-0)', lineHeight: 1.5 }}>
                                                "{myEval.feedback}"
                                            </p>
                                        </div>
                                    )}

                                    <p className="eval-meta" style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <UserCheck size={14} /> {lang === 'ar' ? 'تاريخ التقييم:' : 'Evaluated on:'} <span>{myEval.evaluated_at}</span>
                                    </p>

                                    {myEval.status === 'pass' && (
                                        <div className="cert-claim-card" style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(0, 45, 86, 0.08) 0%, rgba(200, 169, 81, 0.15) 100%)', border: '1.5px solid rgba(200, 169, 81, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #b8860b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                                                    <Award size={26} />
                                                </div>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-1)' }}>
                                                        {lang === 'ar' ? 'تهانينا! شهادة إتمام التدريب جاهزة' : 'Congratulations! Certificate of Completion Ready'}
                                                    </h4>
                                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                        {lang === 'ar' ? 'لقد اجتزت التقييم النهائي بنجاح، يمكنك الآن معاينة وتنزيل شهادتك الرسمية.' : 'You have successfully passed the final evaluation. Preview and download your official credential now.'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <button 
                                                    className="btn btn-outline"
                                                    style={{ gap: '0.5rem', cursor: 'pointer', borderColor: 'var(--amber)', color: 'var(--amber)' }}
                                                    onClick={() => handleViewCertificate(user.id, user.full_name)}
                                                >
                                                    <Award size={18} />
                                                    {lang === 'ar' ? 'معاينة الشهادة' : 'Preview Certificate'}
                                                </button>
                                                <a 
                                                    href={`/api/training/certificates/download.php?course_id=${courseId}&trainee_id=${user.id}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-primary"
                                                    style={{ background: 'linear-gradient(135deg, var(--primary), #b8860b)', border: 'none', gap: '0.5rem', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                                                    download={`NMU_Certificate_${(user.full_name || 'Trainee').replace(/\s+/g, '_')}.pdf`}
                                                >
                                                    <Download size={18} />
                                                    {lang === 'ar' ? 'تنزيل الشهادة (PDF)' : 'Download Certificate (PDF)'}
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-muted" style={{ padding: '1rem 0' }}>{lang === 'ar' ? 'لم يتم رصد التقييم النهائي بعد من قبل المدرب المشرف.' : 'Your training evaluation has not been entered yet by the supervising trainer.'}</p>
                            )}
                        </div>
                    ) : (
                        <div className="evals-trainer-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            {/* Header */}
                            <div>
                                <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-0, #0f172a)' }}>
                                    {lang === 'ar' ? 'تقييم ورصد درجات المتدربين (المعايير الأكاديمية)' : 'Grade & Evaluate Trainees (Academic Rubrics)'}
                                </h3>
                                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted, #64748b)' }}>
                                    {lang === 'ar' 
                                        ? 'قم بتهيئة معايير تقييم الدورة، ثم اختر المتدرب لرصد درجاته المعتمدة.' 
                                        : 'Manage the course evaluation criteria, then select a trainee and enter their scores.'}
                                </p>
                            </div>

                            {/* SECTION 1: Simple Evaluation Criteria Card */}
                            <div style={{
                                background: 'var(--bg-subtle, #f8fafc)',
                                border: '1px solid var(--border, #e2e8f0)',
                                borderRadius: '14px',
                                padding: '1.5rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', color: 'var(--text-0, #1e293b)' }}>
                                    <Settings size={18} style={{ color: '#94a3b8' }} />
                                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                                        {lang === 'ar' ? 'معايير التقييم' : 'Evaluation Criteria'}
                                    </h4>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.15rem', width: '100%', boxSizing: 'border-box' }}>
                                    {courseCriteria.map((c, idx) => (
                                        <div key={c.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', width: '100%', boxSizing: 'border-box' }}>
                                            <input 
                                                type="text" 
                                                value={c.name}
                                                onChange={e => handleCriterionFieldChange(idx, 'name', e.target.value)}
                                                placeholder={lang === 'ar' ? 'اسم المعيار' : 'Criterion Name'}
                                                style={{
                                                    flex: 1,
                                                    minWidth: 0,
                                                    padding: '0.65rem 0.85rem',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border, #cbd5e1)',
                                                    background: 'var(--bg-0, #ffffff)',
                                                    fontSize: '0.92rem',
                                                    fontWeight: 500,
                                                    color: 'var(--text-0, #0f172a)',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '2px',
                                                background: 'var(--bg-0, #ffffff)',
                                                border: '1px solid var(--border, #cbd5e1)',
                                                borderRadius: '8px',
                                                padding: '0 0.45rem',
                                                flexShrink: 0,
                                                height: '38px',
                                                boxSizing: 'border-box'
                                            }}>
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    max="100" 
                                                    value={c.weight} 
                                                    onChange={e => handleCriterionFieldChange(idx, 'weight', e.target.value)}
                                                    style={{
                                                        width: '42px',
                                                        textAlign: 'center',
                                                        padding: '0',
                                                        border: 'none',
                                                        background: 'transparent',
                                                        fontSize: '0.92rem',
                                                        fontWeight: 700,
                                                        color: 'var(--text-0, #0f172a)',
                                                        outline: 'none',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                                <span style={{ color: 'var(--text-muted, #64748b)', fontWeight: 700, fontSize: '0.85rem' }}>%</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCriterion(idx)}
                                                title={lang === 'ar' ? 'حذف المعيار' : 'Delete Criterion'}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    padding: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    borderRadius: '6px',
                                                    flexShrink: 0
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div style={{ marginBottom: '1.25rem' }}>
                                    <span style={{
                                        fontSize: '0.92rem',
                                        fontWeight: 800,
                                        color: isWeightValid ? '#16a34a' : '#ef4444'
                                    }}>
                                        {lang === 'ar' 
                                            ? `المجموع: ${totalCriteriaWeight}% ${!isWeightValid ? '(يجب أن يساوي 100%)' : ''}`
                                            : `Total: ${totalCriteriaWeight}% ${!isWeightValid ? '(Must equal 100%)' : ''}`}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                    <button
                                        type="button"
                                        onClick={handleAddCriterion}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '0.55rem 1.15rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border, #cbd5e1)',
                                            background: 'var(--bg-0, #ffffff)',
                                            color: 'var(--text-0, #0f172a)',
                                            fontSize: '0.88rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Plus size={15} />
                                        {lang === 'ar' ? 'إضافة معيار' : '+ Add Criterion'}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={savingCriteria || !isWeightValid}
                                        onClick={handleSaveCriteria}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '0.55rem 1.35rem',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: '#8B1E2F',
                                            color: '#ffffff',
                                            fontSize: '0.88rem',
                                            fontWeight: 700,
                                            cursor: savingCriteria || !isWeightValid ? 'not-allowed' : 'pointer',
                                            opacity: savingCriteria || !isWeightValid ? 0.6 : 1
                                        }}
                                    >
                                        {savingCriteria ? <Loader2 className="spin" size={15} /> : null}
                                        {lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleResetToDefaultCriteria}
                                        style={{
                                            padding: '0.55rem 1.15rem',
                                            borderRadius: '8px',
                                            border: '1px solid var(--border, #cbd5e1)',
                                            background: 'var(--bg-0, #ffffff)',
                                            color: 'var(--text-muted, #64748b)',
                                            fontSize: '0.88rem',
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                </div>
                            </div>

                            {/* SECTION 2: Grade Trainees Form */}
                            <div className="evals-trainer-view" style={{ background: 'var(--bg-1, #ffffff)', border: '1.5px solid var(--border, #e2e8f0)', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                <div style={{ marginBottom: '1.25rem' }}>
                                    <h3 style={{ margin: '0 0 0.35rem 0', fontSize: '1.25rem', fontWeight: 800 }}>
                                        {lang === 'ar' ? 'تقييم ورصد درجات المتدربين' : 'Grade & Evaluate Trainees'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {lang === 'ar' 
                                            ? 'اختر المتدرب وأدخل الدرجات المخصصة لكل معيار من معايير هذه الدورة. يتم احتساب الدرجة النهائية تلقائياً.' 
                                            : 'Select a trainee and enter scores for each configured criterion. Final score is automatically calculated.'}
                                    </p>
                                </div>

                                <div className="eval-form-box" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                    <div>
                                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                            <label style={{ fontWeight: 800, display: 'block', marginBottom: '0.75rem', fontSize: '1.05rem', color: 'var(--primary)' }}>
                                                {lang === 'ar' ? '1. اختر المتدرب المراد تقييمه' : '1. Select Trainee to Evaluate'}
                                            </label>
                                            
                                            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                                                <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                <input 
                                                    type="text" 
                                                    placeholder={lang === 'ar' ? 'ابحث باسم المتدرب، المشروع، أو البريد الإلكتروني...' : 'Search by trainee name, project title, or email...'}
                                                    value={evalSearchQuery}
                                                    onChange={e => setEvalSearchQuery(e.target.value)}
                                                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', borderRadius: '10px', border: '1.5px solid var(--border)', fontSize: '0.95rem', outline: 'none', background: '#ffffff', transition: 'border-color 0.2s' }}
                                                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                                />
                                            </div>

                                            {(() => {
                                                const q = (evalSearchQuery || '').toLowerCase();
                                                const fIdeas = (allIdeas || []).map(idea => {
                                                    const titleMatch = idea.title?.toLowerCase().includes(q);
                                                    const fMembers = (idea.team_members || []).filter(tm => 
                                                        tm.full_name?.toLowerCase().includes(q) || 
                                                        tm.student_id?.toLowerCase().includes(q) || 
                                                        tm.email?.toLowerCase().includes(q)
                                                    );
                                                    if (titleMatch || fMembers.length > 0) {
                                                        return { ...idea, team_members: titleMatch ? idea.team_members : fMembers };
                                                    }
                                                    return null;
                                                }).filter(Boolean);

                                                return (
                                                    <div style={{ width: '100%', maxHeight: '280px', overflowY: 'auto', borderRadius: '10px', border: '1.5px solid var(--border)', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                                                        {fIdeas.length === 0 ? (
                                                            <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem' }}>
                                                                {evalSearchQuery 
                                                                    ? (lang === 'ar' ? 'لا يوجد نتائج مطابقة للبحث.' : 'No matching results found.') 
                                                                    : (lang === 'ar' ? 'لا يوجد متدربون لديهم مشاريع مقدمة بعد للتقييم. (يجب على المتدرب تقديم أو الانضمام لفكرة مشروع أولاً ليتم تقييمه).' : 'No trainees have submitted or joined a project idea yet. (A project idea is required for evaluation).')}
                                                            </div>
                                                        ) : null}

                                                        {fIdeas.length > 0 && fIdeas.map(idea => (
                                                            <div key={idea.id}>
                                                                <div style={{ padding: '0.65rem 1rem', background: '#f8fafc', fontSize: '0.85rem', fontWeight: 800, color: '#475569', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                                                                    {idea.title || (lang === 'ar' ? 'مشروع بدون عنوان' : 'Untitled Project')}
                                                                </div>
                                                                {idea.team_members && idea.team_members.map(tm => (
                                                                    <div 
                                                                        key={tm.user_id} 
                                                                        onClick={() => setSelectedTraineeForEval(tm.user_id)}
                                                                        style={{
                                                                            padding: '0.75rem 1rem',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'space-between',
                                                                            borderBottom: '1px solid var(--border)',
                                                                            background: selectedTraineeForEval == tm.user_id ? 'rgba(0, 45, 86, 0.08)' : '#ffffff',
                                                                            color: selectedTraineeForEval == tm.user_id ? 'var(--primary)' : 'inherit',
                                                                            fontWeight: selectedTraineeForEval == tm.user_id ? 700 : 500,
                                                                            transition: 'background 0.15s'
                                                                        }}
                                                                    >
                                                                        <span>{tm.full_name} ({tm.student_id ? `${tm.student_id} - ` : ''}{tm.email})</span>
                                                                        <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '6px', background: '#e2e8f0', color: '#334155', fontWeight: 700 }}>
                                                                            {tm.role === 'leader' ? (lang === 'ar' ? 'قائد' : 'Leader') : (lang === 'ar' ? 'عضو' : 'Member')}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        <div style={{ marginBottom: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                            <div style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>
                                                    {lang === 'ar' ? '2. إدخال درجات المعايير' : '2. Enter Rubric Scores'}
                                                </div>
                                            </div>
                                            
                                            <div className="dynamic-rubrics-grid" style={{ background: '#ffffff', padding: '1.25rem', borderTop: '1px solid var(--border)', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                                            {courseCriteria.map((crit, idx) => (
                                                <div key={crit.id || idx} className="rubric-field-card">
                                                    <label>
                                                        <span>{crit.name || `Criterion #${idx + 1}`}</span>
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--primary, #002D56)', fontWeight: 800 }}>
                                                            ({crit.weight}%)
                                                        </span>
                                                    </label>
                                                    <input 
                                                        type="number" 
                                                        min="0" 
                                                        max={crit.weight} 
                                                        step="0.5"
                                                        value={evalCriteriaScores[crit.name] ?? ''} 
                                                        onChange={e => handleCriterionScoreChange(crit.name, e.target.value, crit.weight)}
                                                        placeholder={`0 - ${crit.weight}`}
                                                        style={{ width: '100%', padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                                                    />
                                                </div>
                                            ))}
                                            </div>
                                        </div>

                                        <div className="form-row" style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap', padding: '1.5rem', background: '#f0f9ff', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                                            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                                                <label style={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#0369a1' }}>
                                                    <span>{lang === 'ar' ? 'الدرجة النهائية' : 'Final Score'}</span>
                                                    <span style={{ fontSize: '0.78rem', color: '#0ea5e9' }}>{lang === 'ar' ? '(تلقائي)' : '(Auto)'}</span>
                                                </label>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="number"
                                                        value={evalScore}
                                                        readOnly={true}
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.85rem 3.5rem 0.85rem 1.25rem',
                                                            borderRadius: '10px',
                                                            border: '2px solid #38bdf8',
                                                            background: '#f1f5f9',
                                                            fontWeight: 900,
                                                            fontSize: '1.35rem',
                                                            color: '#0284c7',
                                                            outline: 'none',
                                                            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.15)',
                                                            cursor: 'not-allowed'
                                                        }}
                                                    />
                                                    <span style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', color: '#94a3b8', fontWeight: 800 }}>/ 100</span>
                                                </div>
                                            </div>
                                            <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                                                <label style={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--primary)' }}>
                                                    <span>{lang === 'ar' ? 'حالة الاعتماد' : 'Evaluation Status'}</span>
                                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{lang === 'ar' ? '(تلقائي)' : '(Auto)'}</span>
                                                </label>
                                                <div
                                                    style={{ 
                                                        width: '100%', 
                                                        padding: '1.05rem 0.85rem', 
                                                        borderRadius: '10px', 
                                                        border: '1.5px solid var(--border)', 
                                                        fontWeight: 800, 
                                                        fontSize: '1.05rem', 
                                                        background: evalStatus === 'pass' ? '#dcfce7' : '#fee2e2', 
                                                        color: evalStatus === 'pass' ? '#166534' : '#991b1b',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}
                                                >
                                                    {evalStatus === 'pass' ? (lang === 'ar' ? 'ناجح معتمد (PASS)' : 'PASS') : (lang === 'ar' ? 'راسب (FAIL)' : 'FAIL')}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                                            <label style={{ fontWeight: 800, display: 'block', marginBottom: '0.75rem', fontSize: '1.05rem', color: 'var(--primary)' }}>
                                                {lang === 'ar' ? '3. ملاحظات وتوجيهات المشرف الأكاديمي' : '3. Trainer Feedback & Notes'}
                                            </label>
                                            <textarea 
                                                rows="4" 
                                                value={evalFeedback} 
                                                onChange={e => setEvalFeedback(e.target.value)} 
                                                placeholder={lang === 'ar' ? 'أدخل ملاحظات بناءة وتوجيهات للطالب حول مشروعه وأدائه...' : 'Constructive feedback for the trainee...'} 
                                                style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1.5px solid var(--border)', fontSize: '0.95rem', background: '#ffffff', outline: 'none', transition: 'border-color 0.2s', resize: 'vertical' }}
                                                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                                                onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                            />
                                        </div>

                                        <button 
                                            type="button" 
                                            onClick={(e) => {
                                                console.log("Submit clicked", {selectedTraineeForEval, evalScore, useRubrics});
                                                handleSubmitEvaluation(e);
                                            }}
                                            className="btn btn-primary" 
                                            disabled={submittingEval}
                                            style={{ 
                                                width: '100%', 
                                                padding: '1rem', 
                                                fontWeight: 800, 
                                                fontSize: '1.1rem', 
                                                borderRadius: '12px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center', 
                                                gap: '8px', 
                                                boxShadow: '0 4px 15px rgba(0,45,86,0.15)' 
                                            }}
                                        >
                                            {submittingEval ? <Loader2 className="spin" size={20} /> : <CheckCircle size={20} />}
                                            {lang === 'ar' ? 'حفظ ونشر التقييم النهائي' : 'Save & Publish Grade'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: End-of-Course Top 5 Project Voting */}
            {activeTab === 'voting' && isTrainer && (
                <div className="tab-content">
                    {/* Voting Header & Status Bar */}
                    <div className="card p-4" style={{ 
                        background: 'var(--bg-0, #ffffff)', 
                        border: '1px solid var(--border, #e2e8f0)', 
                        borderRadius: '16px', 
                        padding: '1.75rem', 
                        marginBottom: '1.75rem',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ flex: 1, minWidth: '280px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.4rem' }}>
                                    <Vote size={24} style={{ color: 'var(--primary, #002D56)' }} />
                                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>
                                        {lang === 'ar' ? 'تصويت نهاية الدورة لاختيار أفضل 5 مشاريع' : 'End-of-Course Top 5 Project Voting'}
                                    </h3>
                                </div>
                                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted, #64748b)' }}>
                                    {lang === 'ar'
                                        ? 'نظام تصويت مخصص للمشرفين والمدربين لإضافة وتعديل وحذف اختياراتهم حتى 5 مشاريع متميزة في ختام الدورة التدريبية.'
                                        : 'Dedicated voting system for faculty & trainers to add, edit, and remove their selections (up to 5 standout projects).'}
                                </p>
                            </div>

                            {/* Status and Admin/Trainer Controls */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.6rem' }}>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '0.4rem 0.9rem',
                                    borderRadius: '20px',
                                    fontSize: '0.84rem',
                                    fontWeight: 700,
                                    background: courseVotingStatus === 'open' ? 'rgba(22, 163, 74, 0.12)' : courseVotingStatus === 'closed' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.12)',
                                    color: courseVotingStatus === 'open' ? '#16a34a' : courseVotingStatus === 'closed' ? '#b45309' : '#64748b',
                                    border: `1px solid ${courseVotingStatus === 'open' ? 'rgba(22, 163, 74, 0.3)' : courseVotingStatus === 'closed' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(100, 116, 139, 0.3)'}`
                                }}>
                                    {courseVotingStatus === 'open' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a', display: 'inline-block' }}></span>}
                                    {courseVotingStatus === 'open' ? (lang === 'ar' ? 'التصويت مفتوح حالياً' : 'Voting is Open') :
                                     courseVotingStatus === 'closed' ? (lang === 'ar' ? 'اكتمل التصويت — تم اعتماد الـ Top 5' : 'Voting Closed — Top 5 Finalized') :
                                     (lang === 'ar' ? 'التصويت لم يبدأ بعد' : 'Voting Not Started')}
                                </div>

                                {isTrainer && (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {courseVotingStatus !== 'open' && (
                                            <button 
                                                type="button" 
                                                className="btn btn-primary btn-sm"
                                                disabled={updatingVotingStatus}
                                                onClick={() => handleUpdateCourseVotingStatus('open')}
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                                            >
                                                {updatingVotingStatus ? <Loader2 className="spin" size={14} /> : <Vote size={14} />}
                                                {courseVotingStatus === 'closed' ? (lang === 'ar' ? 'إعادة فتح التصويت' : 'Re-open Voting') : (lang === 'ar' ? 'فتح باب التصويت' : 'Open Voting')}
                                            </button>
                                        )}
                                        {courseVotingStatus === 'open' && (
                                            <button 
                                                type="button" 
                                                className="btn btn-sm"
                                                disabled={updatingVotingStatus}
                                                onClick={() => handleUpdateCourseVotingStatus('closed')}
                                                style={{ 
                                                    display: 'inline-flex', 
                                                    alignItems: 'center', 
                                                    gap: '5px', 
                                                    fontSize: '0.82rem', 
                                                    padding: '0.45rem 0.85rem',
                                                    background: '#8B1E2F',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontWeight: 700
                                                }}
                                            >
                                                {updatingVotingStatus ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />}
                                                {lang === 'ar' ? 'إغلاق التصويت واعتماد الـ 5 الأفضل' : 'Close Voting & Finalize Top 5'}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Active Voter Selection / Management Bar (Add, Edit, Delete, Clear, Submit) */}
                        {courseVotingStatus === 'open' && canUserVote && (
                            <div style={{
                                marginTop: '1.25rem',
                                paddingTop: '1.25rem',
                                borderTop: '1px solid var(--border, #e2e8f0)',
                                background: 'rgba(0, 45, 86, 0.03)',
                                padding: '1.25rem',
                                borderRadius: '12px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                                    <div>
                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: myVotedProjectIds.length === 5 ? '#16a34a' : 'var(--text-0, #0f172a)' }}>
                                            {lang === 'ar' 
                                                ? `المشاريع المحددة لتصويتك: ${myVotedProjectIds.length} من أصل 5` 
                                                : `Your Selected Votes: ${myVotedProjectIds.length} / 5`}
                                        </span>
                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: '8px', marginRight: '8px' }}>
                                            ({5 - myVotedProjectIds.length} {lang === 'ar' ? 'متبقية' : 'remaining'})
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        {myVotedProjectIds.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={handleClearAllVotes}
                                                disabled={submittingVotes}
                                                className="btn btn-sm btn-outline"
                                                style={{ borderColor: '#ef4444', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}
                                            >
                                                <Trash2 size={13} />
                                                {lang === 'ar' ? 'مسح كافة الاختيارات' : 'Clear All'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleSubmitVotes}
                                            disabled={submittingVotes || myVotedProjectIds.length === 0}
                                            className="btn btn-primary btn-sm"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.5rem 1.25rem', fontWeight: 700, borderRadius: '8px' }}
                                        >
                                            {submittingVotes ? <Loader2 className="spin" size={14} /> : <CheckCircle2 size={14} />}
                                            {lang === 'ar' ? 'حفظ وتأكيد التصويت' : 'Submit / Save Votes'}
                                        </button>
                                    </div>
                                </div>

                                {/* Active Selected Project Chips (with instant Delete button per vote) */}
                                {myVotedProjectIds.length === 0 ? (
                                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted, #64748b)' }}>
                                        ℹ️ {lang === 'ar' 
                                            ? 'لم تختر أي مشروع بعد. اضغط على زر "+ إضافة للتصويت" في بطاقات المشاريع أدناه لإضافتها.' 
                                            : 'No projects selected yet. Click "+ Add Vote" on any project below to select it.'}
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                                        {myVotedProjectIds.map((pId, idx) => {
                                            const proj = votingProjects.find(p => Number(p.id) === Number(pId));
                                            return (
                                                <div 
                                                    key={pId} 
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        background: '#ffffff',
                                                        border: '1.5px solid #16a34a',
                                                        borderRadius: '20px',
                                                        padding: '0.3rem 0.75rem',
                                                        fontSize: '0.82rem',
                                                        fontWeight: 700,
                                                        boxShadow: '0 2px 6px rgba(22, 163, 74, 0.15)'
                                                    }}
                                                >
                                                    <span style={{ color: '#16a34a' }}>#{idx + 1}</span>
                                                    <span>{proj?.title || `Project #${pId}`}</span>
                                                    {proj?.trainee_name && <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>({proj.trainee_name})</span>}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteVote(pId)}
                                                        title={lang === 'ar' ? 'حذف هذا الصوت' : 'Remove this vote'}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#ef4444',
                                                            cursor: 'pointer',
                                                            padding: '0 2px',
                                                            display: 'inline-flex',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Trainee Informative Note */}
                        {courseVotingStatus === 'open' && !canUserVote && (
                            <div style={{
                                marginTop: '1rem',
                                padding: '0.85rem 1rem',
                                background: 'rgba(0, 45, 86, 0.04)',
                                borderRadius: '8px',
                                fontSize: '0.85rem',
                                color: 'var(--text-muted)'
                            }}>
                                ℹ️ {lang === 'ar' 
                                    ? 'التصويت متاح لأعضاء هيئة التدريس والمدربين المشرفين. سيتم إعلان المشاريع الـ 5 الفائزة فور اكتمال وإغلاق التصويت.' 
                                    : 'Voting is conducted by faculty and supervising trainers. Top 5 winning projects will be published here once voting closes.'}
                            </div>
                        )}
                    </div>

                    {/* Top 5 Showcase (if voting closed or results ready) */}
                    {votingTop5.length > 0 && (
                        <div style={{
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)',
                            border: '1.5px solid rgba(245, 158, 11, 0.4)',
                            borderRadius: '16px',
                            padding: '1.75rem',
                            marginBottom: '2rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Trophy size={22} style={{ color: '#F59E0B' }} />
                                    <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#92400e' }}>
                                        {lang === 'ar' ? 'المشاريع الـ 5 الأفضل في تصويت نهاية الدورة' : 'Top 5 Projects Selected by End-of-Course Voting'}
                                    </h4>
                                </div>
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: '12px',
                                    background: '#F59E0B',
                                    color: '#ffffff'
                                }}>
                                    {votingTop5.length} {lang === 'ar' ? 'مشاريع متصدرة' : 'Top Projects'}
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                                {votingTop5.map(tp => (
                                    <div key={tp.id} className="top5-gold-winner-card" style={{
                                        borderRadius: '14px',
                                        padding: '1.25rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                                                <span className="top5-shiny-gold-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                    <Trophy size={13} /> #{tp.vote_rank} in Votes
                                                </span>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    fontSize: '0.82rem',
                                                    fontWeight: 800,
                                                    color: '#b45309'
                                                }}>
                                                    <Vote size={13} /> {tp.vote_count} {lang === 'ar' ? 'أصوات' : 'votes'}
                                                </span>
                                            </div>
                                            <h5 style={{ margin: '0 0 0.4rem 0', fontSize: '1.02rem', fontWeight: 800, color: 'var(--text-0, #0f172a)' }}>
                                                {tp.title}
                                            </h5>
                                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                                                <User size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '3px' }} />
                                                {tp.trainee_name}
                                                {tp.team_members && tp.team_members.length > 1 && (
                                                    <span> ({tp.team_members.length} {lang === 'ar' ? 'أعضاء' : 'members'})</span>
                                                )}
                                            </p>
                                        </div>

                                        {tp.evaluation_score !== null && (
                                            <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                {lang === 'ar' ? 'الدرجة الأكاديمية:' : 'Academic Score:'} <strong style={{ color: 'var(--text-0)' }}>{tp.evaluation_score}/100</strong>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Eligible Projects Voting Grid with Add/Edit/Delete Vote controls */}
                    <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                                {lang === 'ar' ? 'مشاريع الدورة التدريبية المؤهلة للتصويت' : 'Eligible Course Projects'} ({votingProjects.length})
                            </h4>
                            <Link to={`/leaderboard?course_id=${courseId}`} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                <Trophy size={14} style={{ color: '#F59E0B' }} />
                                {lang === 'ar' ? 'عرض لوحة الترتيب الأكاديمي الكاملة' : 'View Full Academic Leaderboard'}
                            </Link>
                        </div>

                        {loadingVoting ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <Loader2 className="spin" size={32} />
                            </div>
                        ) : votingProjects.length === 0 ? (
                            <div className="card p-4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                <Lightbulb size={40} strokeWidth={1.5} style={{ marginBottom: '0.5rem' }} />
                                <p style={{ margin: 0 }}>{lang === 'ar' ? 'لا توجد مشاريع مسجلة في هذه الدورة بعد.' : 'No submitted projects found in this course yet.'}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                                {votingProjects.map(proj => {
                                    const isSelected = myVotedProjectIds.includes(Number(proj.id));
                                    const canSelectMore = myVotedProjectIds.length < 5;

                                    return (
                                        <div 
                                            key={proj.id}
                                            className={proj.is_top_5 ? 'top5-gold-winner-card' : ''}
                                            style={{
                                                background: isSelected 
                                                    ? 'rgba(22, 163, 74, 0.04)' 
                                                    : proj.is_top_5 
                                                    ? undefined 
                                                    : 'var(--bg-0, #ffffff)',
                                                border: isSelected 
                                                    ? '2px solid #16a34a' 
                                                    : proj.is_top_5 
                                                    ? undefined 
                                                    : '1px solid var(--border, #e2e8f0)',
                                                borderRadius: '14px',
                                                padding: '1.25rem',
                                                boxShadow: isSelected ? '0 4px 14px rgba(22, 163, 74, 0.12)' : undefined,
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.6rem' }}>
                                                    <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-0, #0f172a)' }}>
                                                        {proj.title}
                                                    </h4>
                                                    {proj.is_top_5 && (
                                                        <span className="top5-shiny-gold-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <Trophy size={13} /> Top 5 Winner (#{proj.vote_rank})
                                                        </span>
                                                    )}
                                                </div>

                                                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.84rem', color: 'var(--text-muted, #64748b)', lineHeight: 1.45 }}>
                                                    {proj.description ? proj.description.substring(0, 110) + '…' : (lang === 'ar' ? 'مشروع تدريبي مقدم ضمن الدورة.' : 'Training project idea.')}
                                                </p>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem', fontSize: '0.82rem', color: 'var(--text-1, #334155)' }}>
                                                    <User size={13} className="text-primary" />
                                                    <strong>{proj.trainee_name}</strong>
                                                    {proj.student_id && <span style={{ color: 'var(--text-muted)' }}>({proj.student_id})</span>}
                                                    {proj.team_members && proj.team_members.length > 1 && (
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                                            + {proj.team_members.length - 1} {lang === 'ar' ? 'أعضاء' : 'teammates'}
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                                    {/* Academic Score Pill */}
                                                    <span style={{
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        padding: '0.2rem 0.55rem',
                                                        borderRadius: '6px',
                                                        background: 'rgba(0, 45, 86, 0.06)',
                                                        color: 'var(--primary, #002D56)'
                                                    }}>
                                                        {lang === 'ar' ? 'الدرجة الأكاديمية:' : 'Eval Score:'} {proj.evaluation_score !== null ? `${proj.evaluation_score}/100` : (lang === 'ar' ? 'قيد التقييم' : 'Pending')}
                                                    </span>

                                                    {/* Votes Count Pill */}
                                                    <span style={{
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        padding: '0.2rem 0.55rem',
                                                        borderRadius: '6px',
                                                        background: proj.vote_count > 0 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(100, 116, 139, 0.08)',
                                                        color: proj.vote_count > 0 ? '#b45309' : '#64748b',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <Vote size={12} /> {proj.vote_count} {lang === 'ar' ? 'أصوات' : 'votes'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Button for Authorized Voters when Open */}
                                            {courseVotingStatus === 'open' && canUserVote && (
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    {isSelected ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteVote(proj.id)}
                                                            style={{
                                                                flex: 1,
                                                                padding: '0.65rem 1rem',
                                                                borderRadius: '8px',
                                                                fontSize: '0.88rem',
                                                                fontWeight: 700,
                                                                cursor: 'pointer',
                                                                border: '1.5px solid #16a34a',
                                                                background: '#16a34a',
                                                                color: '#ffffff',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '6px',
                                                                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            <CheckCircle2 size={16} />
                                                            {lang === 'ar' ? 'تم التصويت (اضغط للحذف)' : 'Voted (Click to Remove)'}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAddVote(proj.id)}
                                                            disabled={!canSelectMore}
                                                            style={{
                                                                flex: 1,
                                                                padding: '0.65rem 1rem',
                                                                borderRadius: '8px',
                                                                fontSize: '0.88rem',
                                                                fontWeight: 700,
                                                                cursor: !canSelectMore ? 'not-allowed' : 'pointer',
                                                                border: '1.5px solid var(--border, #cbd5e1)',
                                                                background: 'var(--bg-0, #ffffff)',
                                                                color: !canSelectMore ? 'var(--text-muted)' : 'var(--text-0, #0f172a)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '6px',
                                                                opacity: !canSelectMore ? 0.6 : 1,
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            <Plus size={16} />
                                                            {lang === 'ar' ? '+ إضافة للتصويت' : '+ Add Vote'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Trainers (Admin Only) */}
            {activeTab === 'trainers' && isAdmin && (
                <div className="tab-content">
                    <div className="tab-action-bar">
                        <h3>{lang === 'ar' ? 'إدارة مدربي الدورة' : 'Manage Course Trainers'}</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        {/* Current Trainers */}
                        <div className="card p-4" style={{ background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-1)' }}>{lang === 'ar' ? 'المدربون الحاليون' : 'Assigned Trainers'}</h4>
                            <div className="members-list">
                                {trainers.length === 0 ? (
                                    <p className="text-muted">{lang === 'ar' ? 'لا يوجد مدربون حالياً.' : 'No trainers assigned yet.'}</p>
                                ) : (
                                    trainers.map(t => (
                                        <div key={t.assignment_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: 'var(--text-1)' }}>{t.full_name}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.email} {t.department ? `- ${t.department}` : ''}</div>
                                            </div>
                                            <button 
                                                className="btn btn-sm btn-outline-danger" 
                                                style={{ borderColor: '#ef4444', color: '#ef4444' }}
                                                onClick={() => handleRemoveTrainer(t.assignment_id)}
                                            >
                                                {lang === 'ar' ? 'إزالة' : 'Remove'}
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Search & Assign */}
                        <div className="card p-4" style={{ background: 'var(--bg-0)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
                            <h4 style={{ marginBottom: '1rem', color: 'var(--text-1)' }}>{lang === 'ar' ? 'تعيين مدرب جديد' : 'Assign New Trainer'}</h4>
                            <div className="form-group" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <input 
                                    type="text" 
                                    placeholder={lang === 'ar' ? 'ابحث عن مدرب بالاسم...' : 'Search trainer by name...'}
                                    value={searchTrainerQuery}
                                    onChange={e => {
                                        setSearchTrainerQuery(e.target.value);
                                        if (e.target.value === '') setHasSearched(false);
                                    }}
                                    onKeyDown={e => e.key === 'Enter' && handleSearchTrainers()}
                                    style={{ flex: 1 }}
                                />
                                <button className="btn btn-secondary" onClick={handleSearchTrainers} disabled={searchingTrainers}>
                                    {searchingTrainers ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'بحث' : 'Search')}
                                </button>
                            </div>

                            <div className="search-results" style={{ marginTop: '1.5rem' }}>
                                {availableTrainers.length > 0 && availableTrainers.map(tr => (
                                    <div key={tr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            {tr.avatar_url ? (
                                                <img src={tr.avatar_url} alt="avatar" style={{width: 32, height: 32, borderRadius: '50%', objectFit: 'cover'}} />
                                            ) : (
                                                <div style={{width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem'}}>
                                                    {tr.full_name.charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: 'var(--text-1)' }}>{tr.full_name}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{tr.email} • {tr.role}</div>
                                            </div>
                                        </div>
                                        <button 
                                            className="btn btn-sm btn-primary" 
                                            onClick={() => handleAssignTrainer(tr.id)}
                                            disabled={assigningTrainer || trainers.some(t => t.trainer_id === tr.id)}
                                        >
                                            {trainers.some(t => t.trainer_id === tr.id) 
                                                ? (lang === 'ar' ? 'معين مسبقاً' : 'Assigned') 
                                                : (lang === 'ar' ? 'تعيين' : 'Assign')}
                                        </button>
                                    </div>
                                ))}
                                {availableTrainers.length === 0 && hasSearched && !searchingTrainers && (
                                    <p className="text-sm text-muted mt-2">{lang === 'ar' ? 'لم يتم العثور على نتائج.' : 'No results found.'}</p>
                                )}
                            </div>
                        </div>
                    </div>
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
            {/* Add Student Modal */}
            <AddStudentModal 
                isOpen={showAddStudentModal}
                onClose={() => setShowAddStudentModal(false)}
                courseId={courseId}
                courseName={course ? (course.name) : ''}
                onStudentAdded={() => fetchTrainees()}
            />
            {/* Certificate Preview Modal */}
            {showCertModal && certData && (
                <CertificateModal
                    isOpen={showCertModal}
                    onClose={() => setShowCertModal(false)}
                    studentName={certData.studentName}
                    courseTitle={certData.courseTitle}
                    issueDate={certData.issueDate}
                    certCode={certData.certCode}
                    downloadUrl={certData.downloadUrl}
                    isPendingIssuance={certData.isPendingIssuance}
                    onConfirmIssuance={handleConfirmIssueCertificate}
                    issuing={confirmIssuing}
                    courseId={courseId}
                    traineeId={certData.traineeId}
                    trainers={trainers}
                />
            )}
            {/* Edit Course Modal */}
            {showEditCourseModal && (
                <div className="modal-overlay" onClick={() => setShowEditCourseModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-row">
                            <h2>{lang === 'ar' ? 'تعديل بيانات الدورة' : 'Edit Course'}</h2>
                            <button type="button" className="modal-close-btn" onClick={() => setShowEditCourseModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'اسم الدورة التدريبية' : 'Course Name'}</label>
                                <input type="text" value={editCourseForm.name} onChange={e => setEditCourseForm({...editCourseForm, name: e.target.value})} required />
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'وصف الدورة' : 'Course Description'}</label>
                                <textarea rows="3" value={editCourseForm.description} onChange={e => setEditCourseForm({...editCourseForm, description: e.target.value})} />
                            </div>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'تاريخ البدء' : 'Start Date'}</label>
                                    <input type="date" value={editCourseForm.start_date} onChange={e => setEditCourseForm({...editCourseForm, start_date: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'تاريخ الانتهاء' : 'End Date'}</label>
                                    <input type="date" value={editCourseForm.end_date} onChange={e => setEditCourseForm({...editCourseForm, end_date: e.target.value})} />
                                </div>
                            </div>
                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'الساعات التدريبية' : 'Duration (Hours)'}</label>
                                    <input type="number" min="1" value={editCourseForm.duration_hours} onChange={e => setEditCourseForm({...editCourseForm, duration_hours: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'المسار التدريبي' : 'Track / Category'}</label>
                                    <input type="text" value={editCourseForm.category} onChange={e => setEditCourseForm({...editCourseForm, category: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'مستوى المهارة' : 'Skill Level'}</label>
                                    <input type="text" value={editCourseForm.level} onChange={e => setEditCourseForm({...editCourseForm, level: e.target.value})} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'نوع التدريب للدورة' : 'Training Course Type'}</label>
                                <select 
                                    className="form-control"
                                    value={editCourseForm.course_type || 'both'} 
                                    onChange={e => setEditCourseForm({...editCourseForm, course_type: e.target.value})}
                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                                >
                                    <option value="both">{lang === 'ar' ? 'تدريب داخلي وخارجي معاً (Internal & External)' : 'Internal & External (Both)'}</option>
                                    <option value="internal">{lang === 'ar' ? 'تدريب داخلي فقط (Internal Only)' : 'Internal Training Only'}</option>
                                    <option value="external">{lang === 'ar' ? 'تدريب ميداني خارجي فقط (External Only)' : 'External Training Only'}</option>
                                </select>
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowEditCourseModal(false)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isUpdatingCourse}>
                                    {isUpdatingCourse ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Update / Re-upload Proposal Modal */}
            {showUpdateProposalModal && (
                <div className="modal-overlay" onClick={() => setShowUpdateProposalModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="modal-header-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Edit3 size={20} className="text-primary" />
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                                    {lang === 'ar' ? 'تحديث ورفع نسخة المقترح المعدلة' : 'Update Proposal / Upload Manual Edit'}
                                </h3>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowUpdateProposalModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <p style={{ margin: '0.5rem 0 1.25rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {lang === 'ar'
                                ? 'قم باختيار ملف المقترح أو التقرير المعدل يدوياً (.docx أو .pdf) لاستبدال النسخة الحالية ومزامنتها فوراً مع لوحة المشرفين.'
                                : 'Select your manually edited proposal/report file (.docx or .pdf) to replace the current version and sync with the supervisor.'
                            }
                        </p>
                        <form onSubmit={handleUpdateProposalSubmit}>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.5rem' }}>
                                    {lang === 'ar' ? 'ملف المقترح المحدث (.docx, .pdf, .zip) *' : 'Updated Proposal File (.docx, .pdf, .zip) *'}
                                </label>
                                <div className="custom-file-dropzone" style={{ padding: '1.5rem', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: '12px', background: 'var(--bg-subtle, #f8fafc)' }}>
                                    <input type="file" required accept=".docx,.doc,.pdf,.zip" onChange={e => setProposalFile(e.target.files[0])} />
                                    <Upload size={24} style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} />
                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                        {proposalFile ? proposalFile.name : (lang === 'ar' ? 'اضغط لاختيار الملف من جهازك' : 'Click to choose updated file')}
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowUpdateProposalModal(false)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={updatingProposal || !proposalFile}>
                                    {updatingProposal ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'رفع وتحديث المقترح' : 'Upload & Update')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Member Details Modal */}
            {viewingMember && (
                <MemberDetailModal 
                    member={viewingMember} 
                    onClose={() => setViewingMember(null)} 
                />
            )}

            {/* Delete Course Confirmation Modal */}
            <ConfirmModal 
                isOpen={showDeleteCourseModal}
                onClose={() => setShowDeleteCourseModal(false)}
                onConfirm={handleDeleteCourse}
                title={lang === 'ar' ? 'حذف الدورة التدريبية' : 'Delete Training Course'}
                message={lang === 'ar' 
                    ? `هل أنت متأكد من رغبتك في حذف الدورة "${course?.name}"؟ سيتم حذف جميع المواضيع والمواد التدريبية والمشاريع والتقييمات المرتبطة بها نهائياً.` 
                    : `Are you sure you want to delete "${course?.name}"? All associated topics, materials, student enrollments, ideas, and certificates will be permanently removed.`}
                confirmText={lang === 'ar' ? 'نعم، احذف الدورة' : 'Yes, Delete Course'}
                cancelText={lang === 'ar' ? 'إلغاء' : 'Cancel'}
                isLoading={isDeletingCourse}
                variant="danger"
            />

            {/* External Training: Create Provider Modal */}
            {showAddProviderModal && (
                <div className="modal-overlay" onClick={() => setShowAddProviderModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="modal-header-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building2 size={20} className="text-primary" />
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                                    {lang === 'ar' ? 'إنشاء جهة تدريب خارجية جديدة' : 'Create External Training Provider'}
                                </h3>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowAddProviderModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateProviderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'اسم جهة التدريب (باللغة الإنجليزية أو الرسمية) *' : 'Provider Name *'}</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Information Technology Institute (ITI)"
                                    value={newProviderForm.name}
                                    onChange={e => setNewProviderForm({ ...newProviderForm, name: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>{lang === 'ar' ? 'الاسم باللغة العربية (اختياري)' : 'Arabic Name (Optional)'}</label>
                                <input
                                    type="text"
                                    placeholder="مثال: معهد تكنولوجيا المعلومات"
                                    value={newProviderForm.name}
                                    onChange={e => setNewProviderForm({ ...newProviderForm, name_ar: e.target.value })}
                                />
                            </div>

                            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'الموقع الرسمي (Website)' : 'Official Website'}</label>
                                    <input
                                        type="url"
                                        placeholder="https://iti.gov.eg"
                                        value={newProviderForm.website_url}
                                        onChange={e => setNewProviderForm({ ...newProviderForm, website_url: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'رابط صفحة لينكد إن (LinkedIn)' : 'LinkedIn Page URL'}</label>
                                    <input
                                        type="url"
                                        placeholder="https://linkedin.com/school/iti"
                                        value={newProviderForm.linkedin_url}
                                        onChange={e => setNewProviderForm({ ...newProviderForm, linkedin_url: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!newProviderForm.is_contracted}
                                        onChange={e => setNewProviderForm({ ...newProviderForm, is_contracted: e.target.checked ? 1 : 0 })}
                                    />
                                    <strong>{lang === 'ar' ? 'جهة معتمدة ومتعاقد معها رسمياً من الجامعة (Contracted)' : 'Official Contracted University Provider'}</strong>
                                </label>
                            </div>

                            <div className="modal-actions" style={{ marginTop: '0.5rem' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAddProviderModal(false)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={savingProvider}>
                                    {savingProvider ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'حفظ وربط بالدورة' : 'Save & Link to Course')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* External Training: Associate Existing Provider Modal */}
            {showAssociateProviderModal && (
                <div className="modal-overlay" onClick={() => setShowAssociateProviderModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building2 size={20} className="text-primary" />
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                                    {lang === 'ar' ? 'ربط جهة تدريب مسجلة بالدورة' : 'Associate Provider with Course'}
                                </h3>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowAssociateProviderModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAssociateProviderSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'اختر جهة التدريب المسجلة *' : 'Select Registered Provider *'}</label>
                                <select
                                    required
                                    className="form-control"
                                    value={associatingProviderId}
                                    onChange={e => setAssociatingProviderId(e.target.value)}
                                    style={{ padding: '0.5rem', borderRadius: '6px', width: '100%' }}
                                >
                                    <option value="">{lang === 'ar' ? '-- اختر الجهة --' : '-- Select Provider --'}</option>
                                    {allGlobalProviders
                                        .filter(p => !courseExternalProviders.some(cp => cp.id === p.id))
                                        .map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.is_contracted ? (lang === 'ar' ? '[معتمد]' : '[Contracted]') : ''}
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAssociateProviderModal(false)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={!associatingProviderId}>
                                    {lang === 'ar' ? 'تأكيد الربط' : 'Confirm Association'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* External Training: Add Track Modal */}
            {showAddTrackModal && (
                <div className="modal-overlay" onClick={() => setShowAddTrackModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
                        <div className="modal-header-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={20} className="text-primary" />
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                                    {lang === 'ar' ? 'إضافة مسار تدريبي (Track)' : 'Add Training Track'}
                                </h3>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowAddTrackModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTrackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'جهة التدريب التابع لها المسار' : 'Associated Provider'}</label>
                                <select
                                    className="form-control"
                                    value={newTrackForm.provider_id}
                                    onChange={e => setNewTrackForm({ ...newTrackForm, provider_id: e.target.value })}
                                    style={{ padding: '0.5rem', borderRadius: '6px', width: '100%' }}
                                >
                                    <option value="">{lang === 'ar' ? 'مسار عام / تدريب داخلي' : 'General / Internal Course Track'}</option>
                                    {courseExternalProviders.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>{lang === 'ar' ? 'عنوان المسار التدريبي (Track Title) *' : 'Track Title *'}</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Web Development & Full-Stack, AI / Machine Learning..."
                                    value={newTrackForm.title}
                                    onChange={e => setNewTrackForm({ ...newTrackForm, title: e.target.value })}
                                />
                            </div>

                            <div className="form-group">
                                <label>{lang === 'ar' ? 'وصف مختصر (اختياري)' : 'Description (Optional)'}</label>
                                <textarea
                                    rows={3}
                                    placeholder="Description of track competencies, frameworks..."
                                    value={newTrackForm.description}
                                    onChange={e => setNewTrackForm({ ...newTrackForm, description: e.target.value })}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowAddTrackModal(false)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={savingTrack}>
                                    {savingTrack ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'إنشاء المسار' : 'Create Track')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* External Training: Reassign Student Track Modal */}
            {showReassignStudentModal && reassignStudent && (
                <div className="modal-overlay" onClick={() => setShowReassignStudentModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                        <div className="modal-header-row">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Edit3 size={20} className="text-primary" />
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                                    {lang === 'ar' ? 'تعديل مسار ونوع التدريب للطالب' : 'Reassign Student Training Track'}
                                </h3>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowReassignStudentModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <p style={{ margin: '0.4rem 0 1rem 0', fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                            <strong>{reassignStudent.full_name || reassignStudent.username}</strong> ({reassignStudent.student_id ? `ID: ${reassignStudent.student_id}` : reassignStudent.email})
                        </p>
                        <form onSubmit={handleReassignStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${reassignForm.training_type === 'internal' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setReassignForm({ ...reassignForm, training_type: 'internal', provider_id: '' })}
                                    style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <GraduationCap size={14} />
                                    <span>{lang === 'ar' ? 'تدريب داخلي' : 'Internal'}</span>
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${reassignForm.training_type === 'external' ? 'btn-primary' : 'btn-outline'}`}
                                    onClick={() => setReassignForm({ ...reassignForm, training_type: 'external' })}
                                    style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <Building2 size={14} />
                                    <span>{lang === 'ar' ? 'تدريب خارجي' : 'External'}</span>
                                </button>
                            </div>

                            {reassignForm.training_type === 'external' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', background: 'var(--bg-2)', borderRadius: '8px' }}>
                                    <div className="form-group">
                                        <label>{lang === 'ar' ? 'جهة التدريب الخارجية:' : 'External Provider:'}</label>
                                        <select
                                            className="form-control"
                                            value={reassignForm.provider_id}
                                            onChange={e => setReassignForm({ ...reassignForm, provider_id: e.target.value })}
                                            style={{ padding: '0.45rem', width: '100%' }}
                                        >
                                            <option value="">{lang === 'ar' ? '-- جهة أخرى / مخصصة --' : '-- Custom / Other Provider --'}</option>
                                            {courseExternalProviders.map(p => (
                                                <option key={p.id} value={p.id}>{p.name} {p.is_contracted ? (lang === 'ar' ? '[معتمد]' : '[Contracted]') : ''}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {!reassignForm.provider_id && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            <input
                                                type="text"
                                                placeholder={lang === 'ar' ? 'اسم جهة التدريب المخصصة *' : 'Custom Provider Name *'}
                                                value={reassignForm.custom_provider_name}
                                                onChange={e => setReassignForm({ ...reassignForm, custom_provider_name: e.target.value })}
                                            />
                                            <input
                                                type="url"
                                                placeholder={lang === 'ar' ? 'الموقع الإلكتروني (اختياري)' : 'Website URL (Optional)'}
                                                value={reassignForm.custom_provider_website}
                                                onChange={e => setReassignForm({ ...reassignForm, custom_provider_website: e.target.value })}
                                            />
                                            <input
                                                type="url"
                                                placeholder={lang === 'ar' ? 'رابط لينكد إن (اختياري)' : 'LinkedIn URL (Optional)'}
                                                value={reassignForm.custom_provider_linkedin}
                                                onChange={e => setReassignForm({ ...reassignForm, custom_provider_linkedin: e.target.value })}
                                            />
                                        </div>
                                    )}

                                    <div className="form-group">
                                        <label>{lang === 'ar' ? 'المسار التدريبي (Track):' : 'Track:'}</label>
                                        <select
                                            className="form-control"
                                            value={reassignForm.track_id}
                                            onChange={e => setReassignForm({ ...reassignForm, track_id: e.target.value })}
                                            style={{ padding: '0.45rem', width: '100%' }}
                                        >
                                            <option value="">{lang === 'ar' ? '-- بدون مسار محدد --' : '-- General / None --'}</option>
                                            {topics
                                                .filter(t => !reassignForm.provider_id || !t.provider_id || String(t.provider_id) === String(reassignForm.provider_id))
                                                .map(t => (
                                                    <option key={t.id} value={t.id}>{t.title}</option>
                                                ))
                                            }
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>{lang === 'ar' ? 'المسار الداخلي (اختياري):' : 'Internal Track (Optional):'}</label>
                                    <select
                                        className="form-control"
                                        value={reassignForm.track_id}
                                        onChange={e => setReassignForm({ ...reassignForm, track_id: e.target.value })}
                                        style={{ padding: '0.45rem', width: '100%' }}
                                    >
                                        <option value="">{lang === 'ar' ? '-- بدون مسار محدد --' : '-- None --'}</option>
                                        {topics.filter(t => !t.provider_id).map(t => (
                                            <option key={t.id} value={t.id}>{t.title}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowReassignStudentModal(false)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={savingReassign}>
                                    {savingReassign ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'حفظ التعيين' : 'Save Assignment')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Eng. Magy Assistant Mascot (Robotics Courses) */}
            <EngMagyMascot 
                forceShow={isRoboticsCourse} 
                courseTrack={course?.category || course?.name || ''} 
            />
        </div>
    );
}
