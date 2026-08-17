import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    BookOpen, Users, Lightbulb, FileText, Award, Plus, Upload, 
    CheckCircle, XCircle, FileSpreadsheet, Sparkles, Download, 
    ExternalLink, Trash2, Edit3, Loader2, ArrowLeft, Video, Link as LinkIcon, X, FileCheck, UserPlus, Code, Send,
    Play, Cpu, Terminal, Zap, ShieldAlert, Layers, Calendar, MessageSquare, UserCheck, Crown, ChevronDown, ChevronUp, AlertCircle
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
    const [activeTab, setActiveTab] = useState(urlTab || 'topics');

    useEffect(() => {
        const t = searchParams.get('tab');
        if (t) setActiveTab(t);
    }, [searchParams]);

    const [course, setCourse] = useState(null);
    const [topics, setTopics] = useState([]);
    const [trainers, setTrainers] = useState([]);
    const [trainees, setTrainees] = useState([]);
    
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
        name: '', description: '', start_date: '', end_date: '', duration_hours: 40, category: '', level: ''
    });

    // Delete Course state
    const [showDeleteCourseModal, setShowDeleteCourseModal] = useState(false);
    const [isDeletingCourse, setIsDeletingCourse] = useState(false);

    const openEditCourseModal = () => {
        setEditCourseForm({
            name: course?.name || '',
            description: course?.description || '',
            start_date: course?.start_date || '',
            end_date: course?.end_date || '',
            duration_hours: course?.duration_hours || 40,
            category: course?.category || '',
            level: course?.level || ''
        });
        setShowEditCourseModal(true);
    };

    const handleUpdateCourse = async (e) => {
        e.preventDefault();
        setIsUpdatingCourse(true);
        try {
            const res = await fetch('/api/training/courses/update.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
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
        course?.name_en?.toLowerCase()?.includes('robot') ||
        course?.name_ar?.includes('روبوت') ||
        course?.name_ar?.includes('الروبوتات') ||
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
            await downloadProposalDocx(myIdea.id, myIdea.title_en || myIdea.title || 'Proposal');
        } catch (err) {
            alert(err.message || 'Error downloading Word document');
        } finally {
            setDownloadingIdeaDocx(false);
        }
    };

    // Trainer Evaluation Form state
    const [evalScore, setEvalScore] = useState(100);
    const [evalStatus, setEvalStatus] = useState('pass');
    const [evalFeedback, setEvalFeedback] = useState('');
    const [submittingEval, setSubmittingEval] = useState(false);
    const [evalAttendance, setEvalAttendance] = useState(15);
    const [evalArchitecture, setEvalArchitecture] = useState(20);
    const [evalImplementation, setEvalImplementation] = useState(25);
    const [evalPresentation, setEvalPresentation] = useState(20);
    const [evalDocumentation, setEvalDocumentation] = useState(20);

    const handleFinalScoreChange = (val) => {
        const score = Math.min(100, Math.max(0, Number(val) || 0));
        setEvalScore(score);
        const att = Math.min(15, Math.round(score * 0.15));
        const arch = Math.min(20, Math.round(score * 0.20));
        const impl = Math.min(25, Math.round(score * 0.25));
        const pres = Math.min(20, Math.round(score * 0.20));
        const doc = Math.min(20, Math.max(0, Math.round(score - (att + arch + impl + pres))));
        setEvalAttendance(att);
        setEvalArchitecture(arch);
        setEvalImplementation(impl);
        setEvalPresentation(pres);
        setEvalDocumentation(doc);
        if (score >= 60) setEvalStatus('pass');
        else if (score >= 50) setEvalStatus('needs_revision');
        else setEvalStatus('fail');
    };

    const updateCriteriaScore = (crit, val) => {
        const num = Math.max(0, Number(val) || 0);
        let att = crit === 'attendance' ? Math.min(15, num) : evalAttendance;
        let arch = crit === 'architecture' ? Math.min(20, num) : evalArchitecture;
        let impl = crit === 'implementation' ? Math.min(25, num) : evalImplementation;
        let pres = crit === 'presentation' ? Math.min(20, num) : evalPresentation;
        let doc = crit === 'documentation' ? Math.min(20, num) : evalDocumentation;

        if (crit === 'attendance') setEvalAttendance(att);
        if (crit === 'architecture') setEvalArchitecture(arch);
        if (crit === 'implementation') setEvalImplementation(impl);
        if (crit === 'presentation') setEvalPresentation(pres);
        if (crit === 'documentation') setEvalDocumentation(doc);

        const total = att + arch + impl + pres + doc;
        setEvalScore(total);
        if (total >= 60) setEvalStatus('pass');
        else if (total >= 50) setEvalStatus('needs_revision');
        else setEvalStatus('fail');
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
            const res = await fetch(`/api/training/courses/get.php?id=${courseId}`);
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
                fetchTrainees();
                fetchIdeas();
                fetchDocs();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'trainees') {
            fetchTrainees();
        } else if (activeTab === 'idea') {
            fetchIdeas();
        } else if (activeTab === 'docs') {
            fetchDocs();
        } else if (activeTab === 'evaluations') {
            fetchEvals();
            fetchTrainees();
            const poll = setInterval(() => {
                fetchEvals();
            }, 5000);
            return () => clearInterval(poll);
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
            const res = await fetch(`/api/users/search-trainers.php?q=${encodeURIComponent(searchTrainerQuery)}`);
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
                    course_id: courseId,
                    title: ideaTitleEn,
                    description: ideaDescEn,
                    tech_stack: techStack,
                    problem_statement: problemStmt,
                    expected_output: expectedOutput,
                    teammate_ids: selectedTeammates.map(t => t.id || t.user_id)
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                fetchIdeas();
                alert(lang === 'ar' ? 'تم حفظ وإرسال فكرة المشروع وفريق العمل بنجاح' : 'Project idea and team members saved successfully');
            } else {
                const msg = data.error || (lang === 'ar' ? 'حدث خطأ أثناء حفظ الفكرة' : 'Failed to save project idea');
                setIdeaSubmitError(msg);
                alert(msg);
            }
        } catch (e) { 
            console.error(e); 
            setIdeaSubmitError('Network error');
        }
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
        fetch(`/api/training/evaluations/get.php?course_id=${courseId}&trainee_id=${selectedTraineeForEval}`)
            .then(r => r.json())
            .then(d => {
                if (d.evaluation) {
                    const ev = d.evaluation;
                    const fScore = parseFloat(ev.final_score) || 0;
                    setEvalScore(fScore);
                    setEvalStatus(ev.status || (fScore >= 60 ? 'pass' : (fScore >= 50 ? 'needs_revision' : 'fail')));
                    setEvalFeedback(ev.feedback || '');
                    let c = {};
                    try {
                        c = typeof ev.criteria_scores === 'string' ? JSON.parse(ev.criteria_scores) : (ev.criteria_scores || {});
                    } catch (_) {}

                    let att = Number(c.attendance);
                    let arch = Number(c.architecture);
                    let impl = Number(c.implementation);
                    let pres = Number(c.presentation);
                    let doc = Number(c.documentation);
                    const rawSum = (att || 0) + (arch || 0) + (impl || 0) + (pres || 0) + (doc || 0);

                    if (isNaN(att) || isNaN(arch) || isNaN(impl) || isNaN(pres) || isNaN(doc) || Math.abs(rawSum - fScore) > 1 || (rawSum === 100 && fScore !== 100)) {
                        att = Math.min(15, Math.round(fScore * 0.15));
                        arch = Math.min(20, Math.round(fScore * 0.20));
                        impl = Math.min(25, Math.round(fScore * 0.25));
                        pres = Math.min(20, Math.round(fScore * 0.20));
                        doc = Math.min(20, Math.max(0, Math.round(fScore - (att + arch + impl + pres))));
                    }

                    setEvalAttendance(att);
                    setEvalArchitecture(arch);
                    setEvalImplementation(impl);
                    setEvalPresentation(pres);
                    setEvalDocumentation(doc);
                } else {
                    handleFinalScoreChange(100);
                    setEvalFeedback('');
                }
            })
            .catch(() => {});
    }, [selectedTraineeForEval, courseId]);

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
                    feedback: evalFeedback,
                    criteria_scores: {
                        attendance: evalAttendance,
                        architecture: evalArchitecture,
                        implementation: evalImplementation,
                        presentation: evalPresentation,
                        documentation: evalDocumentation
                    }
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                const trObj = trainees.find(t => t.trainee_id == selectedTraineeForEval);
                const traineeName = trObj ? trObj.full_name : 'Trainee';
                const successMsg = lang === 'ar'
                    ? `تم حفظ ونشر التقييم بنجاح للمتدرب (${traineeName})! الدرجة المعتمدة: ${evalScore}/100`
                    : `Evaluation saved and published successfully for (${traineeName})! Grade: ${evalScore}/100`;
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
            formData.append('title', myIdea?.title_en || myIdea?.title || 'Updated Official Field Training Proposal');

            const res = await fetch('/api/training/docs/upload.php', {
                method: 'POST',
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
            const res = await fetch(`/api/training/certificates/get.php?course_id=${courseId}&trainee_id=${traineeId}`);
            const data = await res.json();
            if (res.ok && data.certificate) {
                setCertData({
                    studentName: data.certificate.trainee_name || traineeName || 'Trainee',
                    courseTitle: data.certificate.course_title || (lang === 'ar' && course?.name_ar ? course.name_ar : course?.name),
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
                    courseTitle: (lang === 'ar' && course?.name_ar ? course.name_ar : course?.name) || 'Summer Training Program',
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
            const res = await fetch(`/api/training/certificates/get.php?course_id=${courseId}&trainee_id=${traineeId}`);
            const data = await res.json();
            if (res.ok && data.certificate) {
                setCertData({
                    studentName: data.certificate.trainee_name || traineeName || user?.full_name || 'Trainee',
                    courseTitle: data.certificate.course_title || (lang === 'ar' && course?.name_ar ? course.name_ar : course?.name),
                    issueDate: data.certificate.issued_at ? new Date(data.certificate.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '10 August 2026',
                    certCode: data.certificate.cert_code,
                    downloadUrl: `/api/training/certificates/download.php?code=${data.certificate.cert_code}`,
                    isPendingIssuance: false
                });
                setShowCertModal(true);
            } else {
                setCertData({
                    studentName: traineeName || user?.full_name || 'Trainee',
                    courseTitle: (lang === 'ar' && course?.name_ar ? course.name_ar : course?.name) || 'Summer Training Program',
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
                    <h1>{course.name}</h1>
                    <p>{course.description}</p>
                </div>
                {isTrainer && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary" onClick={openEditCourseModal}>
                            <Edit3 size={18} /> {lang === 'ar' ? 'تعديل بيانات الدورة' : 'Edit Course'}
                        </button>
                        <button className="btn btn-primary" onClick={() => setShowAddStudentModal(true)}>
                            <UserPlus size={18} />
                            {lang === 'ar' ? 'إضافة متدرب' : 'Add Student'}
                        </button>
                        <button className="btn btn-outline" onClick={() => setShowExcelModal(true)}>
                            <FileSpreadsheet size={18} />
                            {lang === 'ar' ? 'استيراد كشف المتدربين (Excel)' : 'Import Trainees (Excel)'}
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
                                            <h4>{t.title} {t.title_ar ? `( ${t.title_ar} )` : ''}</h4>
                                            {t.description && <p className="topic-desc">{t.description}</p>}
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
                    <div className="tab-action-bar">
                        <h3>{isTrainer 
                            ? (lang === 'ar' ? 'كشف المتدربين المقيدين' : 'Enrolled Trainees') 
                            : (lang === 'ar' ? 'أعضاء فريق العمل المعتمد' : 'My Project Team Members')}
                        </h3>
                        {isTrainer && (
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowAddStudentModal(true)}>
                                    <UserPlus size={16} /> {lang === 'ar' ? 'إضافة متدرب' : 'Add Student'}
                                </button>
                                <button className="btn btn-outline btn-sm" onClick={() => setShowExcelModal(true)}>
                                    <FileSpreadsheet size={16} /> {lang === 'ar' ? 'استيراد Excel' : 'Import Excel'}
                                </button>
                            </div>
                        )}
                    </div>

                    {(() => {
                        const displayList = isTrainer 
                            ? trainees 
                            : (myIdea?.team_members && myIdea.team_members.length > 0 
                                ? myIdea.team_members 
                                : [{ trainee_id: user?.id, full_name: user?.full_name, email: user?.email, student_id: user?.student_id, role: 'leader', source: 'Self' }]);

                        if (displayList.length === 0) {
                            return (
                                <div className="empty-tab">
                                    <Users size={36} />
                                    <p>{isTrainer ? (lang === 'ar' ? 'لا يوجد متدربون مقيدون بعد.' : 'No trainees enrolled yet.') : (lang === 'ar' ? 'لم يتم تعيين فريق عمل بعد.' : 'No team members assigned yet.')}</p>
                                </div>
                            );
                        }

                        return (
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                                        <th>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                                        <th>{lang === 'ar' ? 'الرقم الجامعي' : 'Student ID'}</th>
                                        <th>{isTrainer ? (lang === 'ar' ? 'المصدر' : 'Source') : (lang === 'ar' ? 'الدور' : 'Role')}</th>
                                        {isTrainer && <th>{lang === 'ar' ? 'الشهادة' : 'Certificate'}</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayList.map((tr, idx) => (
                                        <tr key={tr.trainee_id || tr.user_id || tr.id || idx}>
                                            <td>{idx + 1}</td>
                                            <td>
                                                <strong>{tr.full_name || tr.username || tr.email}</strong>
                                                {tr.role === 'leader' && (
                                                    <span style={{ marginLeft: '6px', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', fontWeight: 700 }}>
                                                        {lang === 'ar' ? 'قائد الفريق' : 'Team Leader'}
                                                    </span>
                                                )}
                                            </td>
                                            <td>{tr.email || '-'}</td>
                                            <td>{tr.student_id || '-'}</td>
                                            <td>
                                                {isTrainer ? (
                                                    <span className="source-tag">{tr.source || 'Registered'}</span>
                                                ) : (
                                                    <span style={{ fontWeight: 600, color: tr.role === 'leader' ? '#d97706' : '#2563eb' }}>
                                                        {tr.role === 'leader' ? (lang === 'ar' ? 'قائد' : 'Leader') : (lang === 'ar' ? 'عضو' : 'Member')}
                                                    </span>
                                                )}
                                            </td>
                                            {isTrainer && (
                                                <td>
                                                    {(tr.evaluation_status === 'pass' || (Number(tr.evaluation_score) >= 60)) ? (
                                                        <button 
                                                            className="btn btn-outline btn-sm"
                                                            style={{ gap: '0.35rem', borderColor: 'var(--amber)', color: 'var(--amber)' }}
                                                            disabled={issuingCertId === (tr.trainee_id || tr.id)}
                                                            onClick={() => handleIssueCertificate(tr.trainee_id || tr.id, tr.full_name)}
                                                        >
                                                            <Award size={14} />
                                                            {issuingCertId === (tr.trainee_id || tr.id) ? '...' : (lang === 'ar' ? 'معاينة وإصدار الشهادة' : 'Preview & Issue Certificate')}
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                                            {tr.evaluation_status === 'fail' 
                                                                ? <span style={{ color: '#ef4444', fontWeight: 600 }}>{lang === 'ar' ? 'راسب' : 'Failed'}</span>
                                                                : tr.evaluation_status === 'needs_revision'
                                                                ? <span style={{ color: '#d97706', fontWeight: 600 }}>{lang === 'ar' ? 'يحتاج مراجعة' : 'Needs Revision'}</span>
                                                                : '—'
                                                            }
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                                                    {myIdea.title_en || myIdea.title || 'Official NMU Summer Training Proposal'}
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

                                {/* Teammate Selector Component */}
                                <TeammateSelector 
                                    courseId={courseId}
                                    selectedTeammates={selectedTeammates}
                                    onTeammatesChange={setSelectedTeammates}
                                    currentIdeaId={myIdea?.id}
                                    disabled={submittingIdea}
                                    readOnly={myIdea && !myIdea.is_team_leader}
                                />

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
                                            background: myEval.status === 'pass' ? 'rgba(34, 197, 94, 0.12)' : (myEval.status === 'needs_revision' ? 'rgba(234, 179, 8, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
                                            color: myEval.status === 'pass' ? '#16a34a' : (myEval.status === 'needs_revision' ? '#ca8a04' : '#ef4444'),
                                            fontWeight: 800,
                                            fontSize: '1.1rem',
                                            border: `1px solid ${myEval.status === 'pass' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                        }}>
                                            {myEval.final_score} / 100 ({myEval.status.toUpperCase()})
                                        </div>
                                    </div>
                                )}
                            </div>

                            {myEval ? (
                                <div className="eval-details">
                                    {/* 5 Academic Rubric Breakdown */}
                                    {(() => {
                                        let c = {};
                                        try {
                                            c = typeof myEval.criteria_scores === 'string' ? JSON.parse(myEval.criteria_scores || '{}') : (myEval.criteria_scores || {});
                                        } catch (_) {}

                                        const finalScore = parseFloat(myEval.final_score) || 0;
                                        let att = Number(c.attendance);
                                        let arch = Number(c.architecture);
                                        let impl = Number(c.implementation);
                                        let pres = Number(c.presentation);
                                        let doc = Number(c.documentation);
                                        const rawSum = (att || 0) + (arch || 0) + (impl || 0) + (pres || 0) + (doc || 0);

                                        if (isNaN(att) || isNaN(arch) || isNaN(impl) || isNaN(pres) || isNaN(doc) || Math.abs(rawSum - finalScore) > 1 || (rawSum === 100 && finalScore !== 100)) {
                                            att = Math.min(15, Math.round(finalScore * 0.15));
                                            arch = Math.min(20, Math.round(finalScore * 0.20));
                                            impl = Math.min(25, Math.round(finalScore * 0.25));
                                            pres = Math.min(20, Math.round(finalScore * 0.20));
                                            doc = Math.min(20, Math.max(0, Math.round(finalScore - (att + arch + impl + pres))));
                                        }

                                        const rubrics = [
                                            { key: 'attendance', labelEn: 'Attendance & Discipline', labelAr: 'الحضور والالتزام بالتدريب', max: 15, val: att },
                                            { key: 'architecture', labelEn: 'System Architecture & Design', labelAr: 'التصميم وبنية النظام', max: 20, val: arch },
                                            { key: 'implementation', labelEn: 'Implementation & Code Quality', labelAr: 'التنفيذ وجودة الكود البرمجي', max: 25, val: impl },
                                            { key: 'presentation', labelEn: 'Final Presentation & Defense', labelAr: 'العرض التقديمي والمناقشة', max: 20, val: pres },
                                            { key: 'documentation', labelEn: 'Final Project Documentation', labelAr: 'توثيق وتقرير المشروع النهائي', max: 20, val: doc },
                                        ];

                                        return (
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                                                {rubrics.map((r, idx) => (
                                                    <div key={idx} style={{ background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '12px', padding: '1rem' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>
                                                                {lang === 'ar' ? r.labelAr : r.labelEn}
                                                            </span>
                                                            <strong style={{ fontSize: '0.9rem', color: 'var(--primary, #002D56)' }}>
                                                                {r.val} / {r.max}
                                                            </strong>
                                                        </div>
                                                        <div style={{ width: '100%', height: '7px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                                                            <div style={{ width: `${Math.min(100, Math.round((r.val / r.max) * 100))}%`, height: '100%', background: 'linear-gradient(90deg, #002D56, #3b82f6)', borderRadius: '4px' }}></div>
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
                        <div className="evals-trainer-view" style={{ background: 'var(--bg-1, #ffffff)', border: '1.5px solid var(--border, #e2e8f0)', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem', fontWeight: 800 }}>{lang === 'ar' ? 'تقييم ورصد درجات المتدربين الأكاديمية' : 'Grade & Evaluate Trainees (Academic Rubrics)'}</h3>
                            <p style={{ margin: '0 0 1.5rem 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {lang === 'ar' ? 'قم بتحديد المتدرب وإدخال درجات معايير التقييم الخمسة المعتمدة.' : 'Select a trainee and enter the 5 certified academic rubric scores.'}
                            </p>

                            <div className="eval-form-box">
                                <form onSubmit={handleSubmitEvaluation}>
                                    <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                        <label style={{ fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>{lang === 'ar' ? 'اختر المتدرب المراد تقييمه:' : 'Select Trainee to Evaluate:'}</label>
                                        <select 
                                            required 
                                            value={selectedTraineeForEval || ''} 
                                            onChange={e => setSelectedTraineeForEval(e.target.value)}
                                            style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border)', fontSize: '0.95rem' }}
                                        >
                                            <option value="">{lang === 'ar' ? '-- اختر المتدرب --' : '-- Choose Trainee --'}</option>
                                            {trainees.map(tr => (
                                                <option key={tr.trainee_id} value={tr.trainee_id}>
                                                    {tr.full_name} ({tr.student_id ? `${tr.student_id} - ` : ''}{tr.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 5 Academic Rubrics Inputs */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem', background: 'var(--bg-subtle, #f8fafc)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Calendar size={14} /> {lang === 'ar' ? 'الحضور والالتزام (15)' : 'Attendance (15)'}
                                            </label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="15" 
                                                value={evalAttendance} 
                                                onChange={e => updateCriteriaScore('attendance', e.target.value)}
                                                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Layers size={14} /> {lang === 'ar' ? 'بنية وتصميم النظام (20)' : 'Architecture (20)'}
                                            </label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="20" 
                                                value={evalArchitecture} 
                                                onChange={e => updateCriteriaScore('architecture', e.target.value)}
                                                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Code size={14} /> {lang === 'ar' ? 'التنفيذ وجودة الكود (25)' : 'Implementation (25)'}
                                            </label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="25" 
                                                value={evalImplementation} 
                                                onChange={e => updateCriteriaScore('implementation', e.target.value)}
                                                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <FileText size={14} /> {lang === 'ar' ? 'العرض والمناقشة (20)' : 'Presentation (20)'}
                                            </label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="20" 
                                                value={evalPresentation} 
                                                onChange={e => updateCriteriaScore('presentation', e.target.value)}
                                                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <FileCheck size={14} /> {lang === 'ar' ? 'التوثيق والتقرير (20)' : 'Documentation (20)'}
                                            </label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="20" 
                                                value={evalDocumentation} 
                                                onChange={e => updateCriteriaScore('documentation', e.target.value)}
                                                style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid var(--border)', marginTop: '4px' }}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                                        <div className="form-group" style={{ flex: 1, minWidth: '160px' }}>
                                            <label style={{ fontWeight: 700 }}>{lang === 'ar' ? 'الدرجة الكلية (من 100)' : 'Final Score (0 - 100)'}</label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                max="100" 
                                                required 
                                                value={evalScore} 
                                                onChange={e => handleFinalScoreChange(e.target.value)} 
                                                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1.5px solid var(--primary, #002D56)', fontWeight: 800, fontSize: '1.1rem' }}
                                            />
                                        </div>
                                        <div className="form-group" style={{ flex: 1, minWidth: '160px' }}>
                                            <label style={{ fontWeight: 700 }}>{lang === 'ar' ? 'حالة الاعتماد' : 'Evaluation Status'}</label>
                                            <select 
                                                value={evalStatus} 
                                                onChange={e => setEvalStatus(e.target.value)}
                                                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border)', fontWeight: 700 }}
                                            >
                                                <option value="pass">PASS (ناجح معتمد)</option>
                                                <option value="needs_revision">NEEDS REVISION (يحتاج مراجعة)</option>
                                                <option value="fail">FAIL (راسب)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                        <label style={{ fontWeight: 700 }}>{lang === 'ar' ? 'ملاحظات وتوجيهات المشرف الأكاديمي' : 'Trainer Feedback & Notes'}</label>
                                        <textarea 
                                            rows="3" 
                                            value={evalFeedback} 
                                            onChange={e => setEvalFeedback(e.target.value)} 
                                            placeholder={lang === 'ar' ? 'أدخل ملاحظات بناءة وتوجيهات للطالب حول مشروعه وأدائه...' : 'Constructive feedback for the trainee...'} 
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)' }}
                                        />
                                    </div>

                                    <button type="submit" className="btn btn-primary" disabled={submittingEval} style={{ padding: '0.75rem 2rem', fontWeight: 700, borderRadius: '10px' }}>
                                        {submittingEval ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'حفظ ونشر التقييم النهائي' : 'Save & Publish Grade')}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
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

            {/* Eng. Magy Assistant Mascot (Robotics Courses) */}
            <EngMagyMascot 
                forceShow={isRoboticsCourse} 
                courseTrack={course?.category || course?.name || ''} 
            />
        </div>
    );
}
