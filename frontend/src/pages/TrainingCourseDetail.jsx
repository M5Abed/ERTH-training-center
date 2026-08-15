import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    BookOpen, Users, Lightbulb, FileText, Award, Plus, Upload, 
    CheckCircle, XCircle, FileSpreadsheet, Sparkles, Download, 
    ExternalLink, Trash2, Edit3, Loader2, ArrowLeft, Video, Link as LinkIcon, X, FileCheck, UserPlus, Code, Send,
    Play, Cpu, Terminal, Zap, ShieldAlert, Layers
} from 'lucide-react';
import AddStudentModal from '../components/AddStudentModal';
import CertificateModal from '../components/CertificateModal';
import EngMagyMascot from '../components/mascot/EngMagyMascot';
import TeammateSelector from '../components/TeammateSelector';
import MemberDetailModal from '../components/MemberDetailModal';
import './TrainingCourseDetail.css';

export default function TrainingCourseDetail({ courseIdOverride }) {
    const { id: paramCourseId } = useParams();
    const courseId = courseIdOverride || paramCourseId;
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

    // Edit Course state
    const [showEditCourseModal, setShowEditCourseModal] = useState(false);
    const [isUpdatingCourse, setIsUpdatingCourse] = useState(false);
    const [editCourseForm, setEditCourseForm] = useState({
        name: '', description: '', start_date: '', end_date: '', duration_hours: 40, category: '', level: ''
    });

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

    const isRoboticsCourse = false; // Disabled as per user request to hide hardware and sensor section

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

    // Hardware Checklist state
    const [hardwareItems] = useState([
        { id: 1, name: 'Arduino Uno R3 / ESP32 Board', category: 'Microcontroller', status: 'connected', tip: 'التحقق من اختيار منفذ الاتصال التسلسلي (COM Port) وتكامل برامج التشغيل (CH340 / CP2102).' },
        { id: 2, name: 'MPU6050 6-DOF Gyro & Accelerometer', category: 'IMU Sensor', status: 'calibrated', tip: 'ربط أطراف SDA و SCL بقنوات الاتصال I2C ومعايرة مصفوفة الانحراف (Gyroscope Offset Matrix).' },
        { id: 3, name: 'HC-SR04 Ultrasonic Distance Sensor', category: 'Rangefinder', status: 'ready', tip: 'توليد نبضة مشغل (Trig Pulse) بعرض 10 ميكروثانية واحتساب زمن استجابة صدى الصوت (Echo Response Time).' },
        { id: 4, name: 'L298N Dual H-Bridge Motor Driver', category: 'Actuation', status: 'connected', tip: 'ربط مصدر التغذية المستقل للمحركات وضمان توحيد خط الأرضي المشترك (Common GND) مع المعالج.' },
        { id: 5, name: '2x High-Torque DC Geared Motors', category: 'Motors', status: 'ready', tip: 'تركيب مكثفات التخميد السيراميكية للتخلص من الضوضاء الكهرومغناطيسية الناتجة عن إشارات PWM.' },
        { id: 6, name: '11.1V 3S LiPo Battery Pack', category: 'Power', status: 'calibrated', tip: 'قياس فرق الجهد للخلية الواحدة لضمان استقرار التشغيل فوق الحد الأدنى الموصى به (3.7V Per Cell).' }
    ]);

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

    // Trainer Evaluation Form state
    const [evalScore, setEvalScore] = useState(85);
    const [evalStatus, setEvalStatus] = useState('pass');
    const [evalFeedback, setEvalFeedback] = useState('');
    const [submittingEval, setSubmittingEval] = useState(false);

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
                    </div>
                )}
            </div>

            {/* Navigation Tabs */}
            <div className="tabs-nav">
                <button className={`tab-btn ${activeTab === 'topics' ? 'active' : ''}`} onClick={() => setActiveTab('topics')} data-magy-key="topics">
                    <BookOpen size={16} /> {lang === 'ar' ? 'المواضيع والمواد' : 'Topics & Materials'}
                </button>
                {isRoboticsCourse && (
                    <>
                        <button className={`tab-btn ${activeTab === 'simulator' ? 'active' : ''}`} onClick={() => setActiveTab('simulator')} data-magy-key="simulator">
                            <Code size={16} /> {lang === 'ar' ? 'مختبر كود المحاكاة' : 'ROS2 Code Simulator'}
                        </button>
                        <button className={`tab-btn ${activeTab === 'hardware' ? 'active' : ''}`} onClick={() => setActiveTab('hardware')} data-magy-key="hardware">
                            <Sparkles size={16} /> {lang === 'ar' ? 'عتاد الهاردوير والحساسات' : 'Hardware & Sensors'}
                        </button>
                    </>
                )}
                <button className={`tab-btn ${activeTab === 'trainees' ? 'active' : ''}`} onClick={() => setActiveTab('trainees')} data-magy-key="trainees">
                    <Users size={16} /> {lang === 'ar' ? 'المتدربين' : 'Trainees'}
                </button>
                <button className={`tab-btn ${activeTab === 'idea' ? 'active' : ''}`} onClick={() => setActiveTab('idea')} data-magy-key="idea">
                    <Lightbulb size={16} /> {lang === 'ar' ? 'فكرة المشروعات' : 'Project Idea'}
                </button>
                <button className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')} data-magy-key="docs">
                    <FileText size={16} /> {lang === 'ar' ? 'المستندات' : 'Documentation'}
                </button>
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

            {/* Hardware Diagnostic Tab */}
            {activeTab === 'hardware' && isRoboticsCourse && (
                <div className="tab-content magy-hardware-view" data-magy-key="hardware">
                    <div className="tab-action-bar">
                        <div>
                            <h3>{lang === 'ar' ? 'فحص جاهزية قطع الهاردوير والحساسات' : 'Hardware & Sensors Diagnostic Checklist'}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.2rem 0 0 0' }}>
                                {lang === 'ar' ? 'تأكد من سلامة توصيل المعالجات، درايفر المحركات، وحساسات الحركة قبل التجربة العملية.' : 'Verify microcontroller ports, motor driver H-bridge wiring, and sensor offsets.'}
                            </p>
                        </div>
                    </div>

                    <div className="hardware-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1.25rem' }}>
                        {hardwareItems.map(item => (
                            <div 
                                key={item.id} 
                                className="hardware-card"
                                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem' }}
                                data-magy-tip={item.tip}
                                data-magy-title={item.name}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', background: '#fef2f2', padding: '0.2rem 0.6rem', borderRadius: '50px' }}>
                                        {item.category}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: item.status === 'calibrated' || item.status === 'connected' ? '#16a34a' : '#3b82f6', background: item.status === 'calibrated' || item.status === 'connected' ? '#f0fdf4' : '#eff6ff', padding: '0.2rem 0.5rem', borderRadius: '8px' }}>
                                        ● {item.status.toUpperCase()}
                                    </span>
                                </div>
                                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', color: 'var(--text-main)' }}>{item.name}</h4>
                                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{item.tip}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Tab 2: Trainees & Excel Import */}
            {activeTab === 'trainees' && (
                <div className="tab-content">
                    <div className="tab-action-bar">
                        <h3>{lang === 'ar' ? 'كشف المتدربين المقيدين' : 'Enrolled Trainees'}</h3>
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
                                    {isTrainer && <th>{lang === 'ar' ? 'الشهادة' : 'Certificate'}</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {trainees.map((tr, idx) => (
                                    <tr key={tr.trainee_id}>
                                        <td>{idx + 1}</td>
                                        <td><strong>{tr.full_name || tr.username || tr.email}</strong></td>
                                        <td>{tr.email}</td>
                                        <td>{tr.student_id || '-'}</td>
                                        <td><span className="source-tag">{tr.source}</span></td>
                                        {isTrainer && (
                                            <td>
                                                <button 
                                                    className="btn btn-outline btn-sm"
                                                    style={{ gap: '0.35rem', borderColor: 'var(--amber)', color: 'var(--amber)' }}
                                                    disabled={issuingCertId === tr.trainee_id}
                                                    onClick={() => handleIssueCertificate(tr.trainee_id, tr.full_name)}
                                                >
                                                    <Award size={14} />
                                                    {issuingCertId === tr.trainee_id ? '...' : (lang === 'ar' ? 'معاينة وإصدار الشهادة' : 'Preview & Issue Certificate')}
                                                </button>
                                            </td>
                                        )}
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
                            <div className="tab-action-bar" style={{ marginBottom: '1.2rem' }}>
                                <h3>{lang === 'ar' ? 'تقديم فكرة المشروع التدريبي' : 'Training Project Idea Submission'}</h3>
                            </div>

                            <div className="ai-generator-card" style={{ marginBottom: '1.5rem' }}>
                                <div className="ai-card-header">
                                    <div className="ai-title-row">
                                        <Sparkles size={18} className="ai-sparkle" />
                                        <h4>{lang === 'ar' ? 'مساعد الذكاء الاصطناعي لتوليد الأفكار' : 'AI Idea Proposal Generator'}</h4>
                                        <span className="ai-badge">{lang === 'ar' ? 'ذكي' : 'AI Powered'}</span>
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
                                        { ar: '⚡ نظام حضور ذكي', en: 'Smart Attendance System' },
                                        { ar: '🤖 شات بوت الدعم الأكاديمي', en: 'Academic Support AI Chatbot' },
                                        { ar: '📊 لوحة تحليلات الطاقة', en: 'Energy Analytics Dashboard' }
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
                                                        {m.role === 'leader' ? '👑' : '👤'} {m.full_name || m.username} {m.student_id ? `(${m.student_id})` : ''}
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

            {/* Tab 4: Documentation Upload */}
            {activeTab === 'docs' && (
                <div className="tab-content">
                    <div className="doc-upload-box">
                        <h3>{lang === 'ar' ? 'رفع توثيق وتقارير أو روابط المشروع' : 'Upload Project Documentation & Links'}</h3>
                        <div className="doc-upload-tabs">
                            <button 
                                type="button" 
                                className={`btn btn-sm ${uploadMode === 'file' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setUploadMode('file')}
                            >
                                📁 {lang === 'ar' ? 'رفع ملف' : 'File Upload'}
                            </button>
                            <button 
                                type="button" 
                                className={`btn btn-sm ${uploadMode === 'link' ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => setUploadMode('link')}
                            >
                                🔗 {lang === 'ar' ? 'إضافة رابط (GitHub / Figma / Demo)' : 'Link Submission (GitHub, Figma, Demo)'}
                            </button>
                        </div>

                        <form onSubmit={handleUploadDoc} className="doc-form">
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'نوع التوثيق' : 'Document Category'}</label>
                                <select value={docType} onChange={e => setDocType(e.target.value)}>
                                    <option value="srs">SRS / System Architecture</option>
                                    <option value="report">Final Training Report</option>
                                    <option value="presentation">Presentation Slides (PPTX)</option>
                                    <option value="code_zip">Source Code Archive (ZIP)</option>
                                    <option value="github">GitHub Repository</option>
                                    <option value="figma">Figma UI/UX Design</option>
                                    <option value="demo">Live Project Demo / Website</option>
                                </select>
                            </div>

                            {uploadMode === 'file' ? (
                                <div className="form-group file-input-group">
                                    <label>{lang === 'ar' ? 'اختر الملف (PDF, DOCX, ZIP, PPTX)' : 'Select File (PDF, DOCX, ZIP, PPTX)'}</label>
                                    <div className="file-input-wrapper">
                                        <input ref={fileInputRef} type="file" required onChange={e => setDocFile(e.target.files[0])} />
                                    </div>
                                </div>
                            ) : (
                                <div className="link-inputs-row">
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>{lang === 'ar' ? 'عنوان الرابط / الوصف' : 'Link Title / Name'}</label>
                                        <input 
                                            type="text" 
                                            placeholder={lang === 'ar' ? 'مثال: مستودع كود المشروع على GitHub' : 'e.g., GitHub Code Repository'} 
                                            value={docTitle} 
                                            onChange={e => setDocTitle(e.target.value)} 
                                        />
                                    </div>
                                    <div className="form-group" style={{ flex: 1 }}>
                                        <label>{lang === 'ar' ? 'رابط URL' : 'URL Link'}</label>
                                        <input 
                                            type="url" 
                                            required 
                                            placeholder="https://github.com/..." 
                                            value={docUrl} 
                                            onChange={e => setDocUrl(e.target.value)} 
                                        />
                                    </div>
                                </div>
                            )}

                            <button type="submit" className="btn btn-primary submit-btn" disabled={uploadingDoc}>
                                {uploadingDoc ? <Loader2 className="spin" size={16} /> : (uploadMode === 'file' ? (lang === 'ar' ? 'رفع المستند' : 'Upload Document') : (lang === 'ar' ? 'حفظ الرابط' : 'Add Link'))}
                            </button>
                        </form>
                    </div>

                    <div className="docs-list">
                        <h4>{lang === 'ar' ? 'الملفات والروابط المرفوعة' : 'Uploaded Files & Project Links'}</h4>
                        {docs.length === 0 ? (
                            <p className="text-muted">No documents or project links uploaded yet.</p>
                        ) : (
                            <ul className="docs-ul">
                                {docs.map(d => (
                                    <li key={d.id} className="doc-li" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '0.75rem' }}>
                                        <FileText size={24} style={{ color: 'var(--amber)', flexShrink: 0 }} />
                                        <div className="doc-info" style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                <strong style={{ fontSize: '0.95rem' }}>{d.file_name}</strong>
                                                <span className="source-tag" style={{ textTransform: 'uppercase', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'var(--bg-subtle)' }}>{d.doc_type}</span>
                                            </div>
                                            <p style={{ margin: '0.25rem 0 0.15rem 0', fontSize: '0.85rem', color: '#b8860b', fontWeight: 600 }}>
                                                📁 {lang === 'ar' ? 'اسم المشروع:' : 'Project:'} {d.project_title || (lang === 'ar' ? 'مشروع التدريب الصيفي' : 'Summer Training Project')}
                                            </p>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                👤 {lang === 'ar' ? 'المعني/أعضاء الفريق:' : 'Submitted by:'} <strong>{d.trainee_name || 'Trainee'}</strong> {d.student_id ? `(${d.student_id})` : ''} — {d.trainee_email || ''}
                                                <span style={{ marginLeft: '0.75rem', opacity: 0.7 }}>🕒 {d.uploaded_at}</span>
                                            </p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <a href={d.file_url} download target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ gap: '0.25rem' }}>
                                                <Download size={14} /> {d.file_url.startsWith('http') && !d.file_url.includes('/uploads/') ? (lang === 'ar' ? 'فتح الرابط' : 'Open Link') : (lang === 'ar' ? 'تنزيل' : 'Download')}
                                            </a>
                                            <button 
                                                onClick={() => handleDeleteDoc(d.id)} 
                                                className="btn btn-ghost btn-sm" 
                                                style={{ color: '#ef4444' }}
                                                title={lang === 'ar' ? 'حذف' : 'Delete'}
                                            >
                                                <Trash2 size={14} /> {lang === 'ar' ? 'حذف' : 'Delete'}
                                            </button>
                                        </div>
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

                                    {myEval.status === 'pass' && (
                                        <div className="cert-claim-card" style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(0, 229, 255,0.12) 0%, rgba(212,175,55,0.15) 100%)', border: '1px solid rgba(212,175,55,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
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
                                                    {tr.full_name} ({tr.email})
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

            {/* EXCLUSIVE ROBOTICS MASCOT ASSISTANT */}
            <EngMagyMascot forceShow={isRoboticsCourse} courseTrack={course?.track || ''} />

            {/* Member Details Modal */}
            {viewingMember && (
                <MemberDetailModal 
                    member={viewingMember} 
                    onClose={() => setViewingMember(null)} 
                />
            )}
        </div>
    );
}
