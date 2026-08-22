import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import {
    Search, Filter, CheckCircle2, XCircle, AlertCircle, Clock, FileText,
    Send, User, BookOpen, Loader2, Sparkles, Plus, Edit3, X, Vote,
    ThumbsUp, ThumbsDown, Users, Trash2, Paperclip, Upload, Download,
    ExternalLink, Code, UserCheck, Layers, Bot, Cpu, Zap, Crown,
    FolderOpen, Shield, Link as LinkIcon, Activity, UserPlus, Check,
    Video, Globe, ArrowRight, Award, RefreshCw, AlertTriangle, HardDrive, Lock,
    Building2, FileCheck, ShieldCheck, Eye, Wand2, GraduationCap, Target, Info,
    Smartphone, ShieldAlert, FileUp, ClipboardCopy, CheckCircle, Save, Lightbulb, Mail
} from 'lucide-react';
import TeammateSelector from '../components/TeammateSelector';
import MemberDetailModal from '../components/MemberDetailModal';
import ProposalViewer from '../components/ProposalViewer';
import ProposalDocModal from '../components/ProposalDocModal';
import { useToast, useConfirm } from '../components/Toast';
import { downloadProposalDocx } from '../services/api';
import { EXTERNAL_TRACK_PROJECTS, EXTERNAL_TRACK_CATEGORIES } from '../data/externalTrackProjects';
import './TrainingCourseDetail.css';
import './TraineeProjects.css';

const TRACK_SUGGESTED_IDEAS = {
    web: [
        {
            title: 'E-Commerce Platform for Local Artisans',
            titleAr: 'منصة تجارة إلكترونية للحرف اليدوية المحلية',
            desc: 'A full-featured responsive web platform connecting local handmade craftsmen with buyers, featuring shopping carts, order tracking, and online payments.',
            descAr: 'منصة ويب متكاملة ومتجاوبة تربط الحرفيين المحليين بالمشترين، مع سلة تسوق، وتتبع الطلبات، والدفع الإلكتروني.'
        },
        {
            title: 'University Clinic & Appointment Booking Portal',
            titleAr: 'بوابة حجز مواعيد العيادات الطبية الجامعية',
            desc: 'A web-based healthcare management and reservation system allowing students and staff to schedule doctor appointments, view lab results, and manage medical records.',
            descAr: 'نظام إدارة وحجوزات طبية عبر الويب يتيح للطلاب وأعضاء هيئة التدريس حجز مواعيد الأطباء، والاطلاع على نتائج التحاليل، وإدارة السجلات الطبية.'
        },
        {
            title: 'Student Internship & Field Training Placement Portal',
            titleAr: 'منصة التقديم والتدريب الميداني لطلاب الجامعة',
            desc: 'A centralized portal connecting university trainees with companies offering internship opportunities, automated supervisor approvals, and progress report submissions.',
            descAr: 'منصة موحدة تربط المتدربين بالشركات التي تقدم فرص تدريب ميداني، مع نظام موافقة المشرفين ورفع تقارير الإنجاز الدورية.'
        },
        {
            title: 'Real Estate & Property Rental Management System',
            titleAr: 'نظام إدارة وتأجير العقارات والوحدات السكنية',
            desc: 'A modern web application for landlords and tenants to browse verified property listings, submit rental applications, and handle digital lease agreements.',
            descAr: 'تطبيق ويب حديث لأصحاب العقارات والمستأجرين لاستعراض الوحدات المتاحة، وتقديم طلبات الإيجار، وتوثيق عقود الإيجار الرقمية.'
        },
        {
            title: 'Freelance Services Marketplace & Escrow Platform',
            titleAr: 'سوق رقمي لخدمات العمل الحر والخدمات المصغرة',
            desc: 'An online marketplace enabling freelance professionals to post service gigs, negotiate client project requirements, and manage milestone deliverables safely.',
            descAr: 'سوق إلكتروني يمكّن المستقلين من عرض خدماتهم، والتفاوض مع العملاء على متطلبات المشاريع، وتسليم المراحل بأمان.'
        },
        {
            title: 'Restaurant Online Ordering & Table Reservation System',
            titleAr: 'نظام طلبات المطاعم وحجز الطاولات الإلكتروني',
            desc: 'A smart web system featuring interactive digital menus, QR table ordering, kitchen order dispatching, and automated invoice generation.',
            descAr: 'نظام ويب ذكي يشمل قوائم طعام تفاعلية، وطلب عبر رمز QR على الطاولات، وإرسال الطلبات للمطبخ، وإصدار الفواتير آلياً.'
        },
        {
            title: 'Course Management & Virtual Learning Portal (LMS Lite)',
            titleAr: 'نظام إدارة المقررات والتعلم الإلكتروني المبسط',
            desc: 'An educational portal allowing instructors to publish course materials, create weekly assignments, conduct quizzes, and track trainee completion progress.',
            descAr: 'بوابة تعليمية تتيح للمدربين نشر المواد التدريبية، وإنشاء الواجبات الأسبوعية، وإجراء الاختبارات، ومتابعة نسبة إنجاز المتدربين.'
        },
        {
            title: 'Event Management & Digital Ticketing Platform',
            titleAr: 'منصة تنظيم الفعاليات والمؤتمرات وحجز التذاكر',
            desc: 'A web platform for organizing academic conferences and workshops with online registration, QR badge validation, and speaker schedules.',
            descAr: 'منصة ويب لتنظيم المؤتمرات وورش العمل الأكاديمية مع التسجيل الإلكتروني، والتحقق من بطاقات الحضور عبر QR، وجداول المتحدثين.'
        },
        {
            title: 'Customer Support Helpdesk & Ticketing System',
            titleAr: 'نظام خدمة العملاء والدعم الفني وإدارة التذاكر',
            desc: 'A customer support portal featuring ticket lifecycles, priority assignment, live agent assignment, and customer satisfaction feedback surveys.',
            descAr: 'بوابة دعم فني تشمل دورة حياة التذاكر، وتحديد أولويات المشاكل، وتوزيع التذاكر على الفنيين، واستطلاعات رضا العملاء.'
        },
        {
            title: 'Digital Portfolio & Interactive CV Builder',
            titleAr: 'موقع إنشاء معارض الأعمال والسير الذاتية التفاعلية',
            desc: 'A dynamic web builder allowing graduates to showcase technical projects, customize portfolio templates, and generate shareable live links and PDF resumes.',
            descAr: 'أداة ويب ديناميكية تتيح للخريجين استعراض مشاريعهم التقنية، وتخصيص قوالب السيرة الذاتية، وتوليد روابط حية وملفات PDF جاهزة للمشاركة.'
        }
    ],
    mobile: [
        {
            title: 'Campus Navigation & Indoor Interactive Guide App',
            titleAr: 'تطبيق الملاحة والإرشاد الذكي داخل الحرم الجامعي',
            desc: 'A cross-platform mobile application providing interactive campus maps, lecture hall localization, schedule notifications, and route directions.',
            descAr: 'تطبيق هاتف ذكي يوفر خرائط تفاعلية للحرم الجامعي، وتحديد مواقع قاعات المحاضرات، وإشعارات الجداول الدراسية، وتوجيهات المسار.'
        },
        {
            title: 'Personal Expense Tracker & Smart Budgeting App',
            titleAr: 'تطبيق إدارة المصروفات والميزانية المالية الشخصية',
            desc: 'A mobile finance assistant helping users log daily expenses, set budget thresholds, view categorized spending charts, and receive saving tips.',
            descAr: 'مساعد مالي للهواتف يساعد المستخدمين على تسجيل المصروفات اليومية، وتحديد سقف الميزانية، والاطلاع على الرسوم البيانية للنفقات.'
        },
        {
            title: 'Fitness Workout Companion & Daily Nutrition Planner',
            titleAr: 'تطبيق متابعة التمارين الرياضية والحمية الغذائية',
            desc: 'A fitness mobile app with custom workout timers, exercise video guides, calorie tracking, and daily water hydration reminders.',
            descAr: 'تطبيق لياقة بدنية يتضمن مؤقتات للتمارين، ودليل مرئي للحركات، وتتبع السعرات الحرارية، وتنبيهات شرب الماء اليومية.'
        },
        {
            title: 'Smart Grocery Delivery & Local Supermarket Order App',
            titleAr: 'تطبيق طلب وتوصيل مقاضي البقالة والمتاجر المحلية',
            desc: 'A quick-commerce mobile app allowing users to browse nearby grocery stores, build dynamic shopping lists, and track delivery drivers in real-time.',
            descAr: 'تطبيق تجارة سريعة يتيح للمستخدمين تصفح محلات البقالة القريبة، وإنشاء قوائم تسوق ذكية، وتتبع مندوب التوصيل لحظياً على الخريطة.'
        },
        {
            title: 'Telehealth & Quick Doctor Consultation App',
            titleAr: 'تطبيق الاستشارات الطبية وحجز المواعيد عن بعد',
            desc: 'A mobile telehealth solution for patients to schedule video consultations, chat with certified medical specialists, and store e-prescriptions.',
            descAr: 'تطبيق رعاية صحية عن بعد يتيح للمرضى حجز استشارات مرئية، والمحادثة مع الأطباء المتخصصين، وحفظ الروشتات الإلكترونية.'
        },
        {
            title: 'University Carpooling & Ride Sharing App',
            titleAr: 'تطبيق مشاركة الرحلات والتنقل المشترك لطلاب الجامعة',
            desc: 'A safe peer-to-peer carpooling mobile app connecting university students and staff traveling on matching daily commuting routes.',
            descAr: 'تطبيق آمن لمشاركة الرحلات يربط طلاب وموظفي الجامعة المسافرين على نفس المسارات اليومية لتوفير تكلفة الوقود والوقت.'
        },
        {
            title: 'Productivity Habit Tracker & Focus Timer App',
            titleAr: 'تطبيق بناء العادات اليومية وتنظيم المهام وتقنية بومودورو',
            desc: 'A sleek habit development mobile app with streak tracking, Pomodoro focus timers, and motivational daily productivity analytics.',
            descAr: 'تطبيق أنيق لبناء العادات اليومية مع تتبع أيام الالتزام المتتالية، ومؤقت تركيز بومودورو، وإحصائيات إنتاجية محفزة.'
        },
        {
            title: 'Medicine Reminder & Prescription Refill App',
            titleAr: 'تطبيق تذكير مواعيد الأدوية وطلب إعادة صرف الروشتات',
            desc: 'A smart healthcare reminder app that alerts users to take prescription dosages on time, scans pill packaging, and tracks pharmacy refills.',
            descAr: 'تطبيق ذكي للتنبيه بمواعيد تناول جرعات الأدوية بدقة، مع مسح علب الدواء، وتتبع مواعيد إعادة صرف الوصفات من الصيدلية.'
        },
        {
            title: 'Community Lost & Found Finder App',
            titleAr: 'تطبيق المجتمع للإبلاغ عن المفقودات والمقتنيات والعثور عليها',
            desc: 'A community mobile application allowing users to report lost or found items with geo-tagged images, categories, and secure return claims.',
            descAr: 'تطبيق مجتمعي يتيح الإبلاغ عن المقتنيات المفقودة أو التي تم العثور عليها مع الصور والموقع الجغرافي ونظام استلام آمن.'
        },
        {
            title: 'Interactive Language Learning & Flashcard Quiz App',
            titleAr: 'تطبيق تفاعلي لتعلم اللغات وبطاقات الاستذكار السريع',
            desc: 'A gamified mobile application featuring spaced-repetition flashcards, audio pronunciation practice, and daily vocabulary quizzes.',
            descAr: 'تطبيق تفاعلي مرح لتعلم اللغات عبر بطاقات التكرار المتباعد، وتدريبات النطق الصوتي، واختبارات المفردات اليومية.'
        }
    ],
    cyber: [
        {
            title: 'Automated Web Vulnerability Scanner & Port Inspector',
            titleAr: 'أداة مسح واكتشاف الثغرات الأمنية وفحص المنافذ تلقائياً',
            desc: 'A security analysis tool that scans web endpoints for OWASP Top 10 vulnerabilities (SQLi, XSS, SSRF), verifies open ports, and generates remediation reports.',
            descAr: 'أداة تحليل أمني تفحص تطبيقات الويب لكشف ثغرات OWASP Top 10 (مثل حقن SQL وحقن XSS)، وفحص المنافذ المفتوحة، وتوليد تقارير المعالجة.'
        },
        {
            title: 'Secure Password Manager & Vault with AES-256 Encryption',
            titleAr: 'خزنة ومدير كلمات المرور المشفر بخوارزمية AES-256',
            desc: 'A zero-knowledge password management system featuring client-side cryptographic hashing, password strength scoring, and breach notification checks.',
            descAr: 'نظام إدارة كلمات مرور بمعمارية Zero-Knowledge مع تشفير طرفي قوي، وتقييم قوة كلمات المرور، وفحص التسريبات الأمنية.'
        },
        {
            title: 'Phishing Email & Malicious URL Detection Engine',
            titleAr: 'محرك كشف رسائل البريد الاحتيالي والروابط الخبيثة',
            desc: 'A cybersecurity tool analyzing email headers, SPF/DKIM verification, domain age, and lexical features of URLs to detect phishing threats.',
            descAr: 'أداة أمن سيبراني تحلل ترويسات البريد الإلكتروني، وفحص SPF/DKIM، وعمر النطاق، والخصائص النصية للروابط لكشف محاولات التصيد.'
        },
        {
            title: 'Network Packet Sniffer & Traffic Anomaly Analyzer',
            titleAr: 'أداة التقاط حزم البيانات وتحليل الشذوذ في حركة مرور الشبكة',
            desc: 'A network defense application capturing live PCAP traffic, visualizing protocol distributions, and flagging suspicious traffic bursts and port scans.',
            descAr: 'تطبيق دفاع شبكي يلتقط حزم البيانات الحية (PCAP)، ويعرض توزيع البروتوكولات، وينبه عند رصد طفرات مرورية مشبوهة ومسح منافذ.'
        },
        {
            title: 'File Integrity Monitoring System (FIM) with Hash Validation',
            titleAr: 'نظام مراقبة تكامل وسلامة ملفات النظام الحساسة (FIM)',
            desc: 'A host-based security monitoring service that computes SHA-256 checksums of sensitive system files and alerts administrators upon unauthorized tampering.',
            descAr: 'خدمة مراقبة أمنية على مستوى النظام تحسب بصمات SHA-256 للملفات الحساسة وتنبه المسؤولين فورياً عند حدوث أي تعديل غير مصرح به.'
        },
        {
            title: 'Time-Based One-Time Password (TOTP / 2FA) Authenticator Server',
            titleAr: 'خادم ومولد رموز المصادقة الثنائية (TOTP / 2FA)',
            desc: 'A standardized RFC 6238 compliant Two-Factor Authentication service enabling applications to issue QR seeds, verify time-synced OTP tokens, and backup keys.',
            descAr: 'خدمة مصادقة ثنائية متوافقة مع معيار RFC 6238 تتيح للتطبيقات إصدار بذور QR، والتحقق من رموز OTP المتزامنة زمنياً، وإدارة مفاتيح الاسترداد.'
        },
        {
            title: 'Web Application Firewall (WAF) Rule Engine & Request Filter',
            titleAr: 'محرك جدار حماية تطبيقات الويب (WAF) وفلترة الطلبات الخبيثة',
            desc: 'A reverse proxy security layer that inspects incoming HTTP payloads, blocks signature-based exploit attempts, and throttles brute-force attacks.',
            descAr: 'طبقة أمنية تعمل كـ Reverse Proxy تفحص حمولات HTTP الواردة، وتحظر محاولات الاستغلال بناءً على التوقيعات، وتحد من هجمات التخمين.'
        },
        {
            title: 'Ransomware Canary & File Behavior Monitor',
            titleAr: 'نظام مراقبة السلوك للكشف المبكر عن برمجيات الفدية (Canary)',
            desc: 'An early-warning defense tool deploying canary honeypot files to detect bulk encryption activities and instantly terminate malicious processes.',
            descAr: 'أداة دفاعية للإنذار المبكر تنشر ملفات طُعم (Canary) لرصد أنشطة التشفير الجماعي وإيقاف العمليات الخبيثة فورياً.'
        },
        {
            title: 'End-to-End Encrypted File Transfer & Secure Share Tool',
            titleAr: 'أداة تبادل ونقل الملفات المشفرة طرفاً لطرف (E2EE)',
            desc: 'A privacy-focused utility implementing asymmetric public-key cryptography to encrypt documents before transmission, with automatic link expiration.',
            descAr: 'أداة خصوصية تطبق التشفير اللاتماثلي بالمفاتيح العامة لتشفير المستندات قبل إرسالها، مع انتهاء صلاحية الروابط تلقائياً.'
        },
        {
            title: 'Security Information & Event Log Collector (SIEM Lite)',
            titleAr: 'نظام خفيف لجمع وتحليل سجلات الأحداث والتهديدات الأمنية',
            desc: 'A lightweight centralized security log aggregation engine with rule-based alerting, log normalization, and interactive security incident dashboards.',
            descAr: 'محرك مركزي لجمع سجلات الأمان مع تنبيهات قائمة على القواعد، وتوحيد صيغ السجلات، ولوحة تحكم تفاعلية لمتابعة الحوادث الأمنية.'
        }
    ]
};

export default function TraineeProjects({ courseIdOverride, isEmbedded = false }) {
    const toast = useToast();
    const confirm = useConfirm();
    const { lang } = useI18n();
    const { user, profile } = useAuth();
    const role = (user?.role || profile?.role || 'trainee').toLowerCase();
    const isAdmin = !!(user?.is_admin || role === 'admin' || profile?.is_admin);
    const staffRoles = ['trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator'];
    const isTrainer = isAdmin || staffRoles.includes(role);
    const isEvaluator = isTrainer;

    const [searchParams] = useSearchParams();
    const effectiveCourseId = courseIdOverride || searchParams.get('course_id') || '';

    const [projects, setProjects] = useState([]);
    const [courses, setCourses] = useState([]);
    const [allActiveCourses, setAllActiveCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters (Evaluator view)
    const [selectedCourse, setSelectedCourse] = useState(effectiveCourseId ? String(effectiveCourseId) : '');
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
    const [evalError, setEvalError] = useState('');
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
    const [selectedCatalogId, setSelectedCatalogId] = useState(null);
    const [submissionTab, setSubmissionTab] = useState('catalog'); // 'catalog' | 'custom'
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

    // Option 3: Submit External / Completed Project state
    const [externalTitle, setExternalTitle]               = useState('');
    const [externalCompany, setExternalCompany]           = useState('');
    const [externalLink, setExternalLink]                 = useState('');
    const [externalAbstract, setExternalAbstract]         = useState('');
    const [externalProblem, setExternalProblem]           = useState('');
    const [externalObjectives, setExternalObjectives]     = useState('');
    const [externalArchitecture, setExternalArchitecture] = useState('');
    const [externalTechStack, setExternalTechStack]       = useState('');
    const [externalDeliverables, setExternalDeliverables] = useState('');
    const [externalFile, setExternalFile]                 = useState(null);
    const [savingExternalDraft, setSavingExternalDraft]   = useState(false);
    const [submittingExternal, setSubmittingExternal]     = useState(false);

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

    // External Training Wording Assistant & Verification State
    const [refiningField, setRefiningField] = useState(null);
    const [wordingSuggestion, setWordingSuggestion] = useState(null);
    const [uploadingVerifFile, setUploadingVerifFile] = useState(false);
    const [verifDocFile, setVerifDocFile] = useState(null);
    const [verifCustomName, setVerifCustomName] = useState('');
    const [verifCustomWeb, setVerifCustomWeb] = useState('');
    const [verifCustomLi, setVerifCustomLi] = useState('');
    const [verifUploadMsg, setVerifUploadMsg] = useState(null);

    const activeSelectedCourse = (isEvaluator ? (allActiveCourses.length > 0 ? allActiveCourses : courses) : courses).find(c => String(c.id) === String(submitCourseId)) 
        || (courses.length === 1 ? courses[0] : null);

    const isExternalTrainee = Boolean(
        !isAdmin && !isTrainer && (
            user?.is_external === true ||
            user?.is_external === 1 ||
            user?.is_external === '1' ||
            profile?.is_external === true ||
            profile?.is_external === 1 ||
            profile?.is_external === '1' ||
            user?.training_type === 'external' ||
            profile?.training_type === 'external' ||
            activeProject?.training_type === 'external' ||
            activeProject?.course_type === 'external' ||
            activeSelectedCourse?.course_type === 'external' ||
            activeSelectedCourse?.training_type === 'external'
        )
    );
    const isExternalStudent = isExternalTrainee;

    const studentRawTrack = String(user?.final_track || profile?.final_track || user?.track || profile?.track || '').toLowerCase();
    const studentTrackKey = studentRawTrack.includes('mobile') || studentRawTrack.includes('android') || studentRawTrack.includes('flutter') || studentRawTrack.includes('ios') 
        ? 'mobile' 
        : studentRawTrack.includes('cyber') || studentRawTrack.includes('security') || studentRawTrack.includes('أمن') 
        ? 'cyber' 
        : studentRawTrack.includes('ai') || studentRawTrack.includes('intelligence') || studentRawTrack.includes('machine') || studentRawTrack.includes('ذكاء') 
        ? 'ai' 
        : 'web';

    const trackLabelMap = {
        web: { ar: 'تطوير المواقع والويب (Web Development)', en: 'Web Development Track' },
        mobile: { ar: 'تطبيقات الهواتف الذكية (Mobile Development)', en: 'Mobile Development Track' },
        cyber: { ar: 'الأمن السيبراني (Cyber Security)', en: 'Cyber Security Track' },
        ai: { ar: 'الذكاء الاصطناعي (AI & Data Track)', en: 'AI & Data Track' },
    };

    useEffect(() => {
        if (isExternalTrainee && dashboardTab === 'team') {
            setDashboardTab('overview');
        }
    }, [isExternalTrainee, dashboardTab]);

    const handleRefineWording = async (field, currentText, setter) => {
        if (!currentText || !currentText.trim()) {
            toast?.warning(lang === 'ar' ? 'يرجى كتابة نص أولاً ليقوم المساعد بصياغته وتحسينه.' : 'Please enter text first to refine.');
            return;
        }
        setRefiningField(field);
        try {
            const res = await fetch('/api/training/ideas/ai_wording_assistant.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: currentText,
                    field: field,
                    language: lang
                })
            });
            const data = await res.json();
            if (res.ok && data.refined_text) {
                setWordingSuggestion({
                    field: field,
                    original: currentText,
                    refined: data.refined_text,
                    setter: setter
                });
            } else {
                toast?.error(data.error || 'Failed to refine wording');
            }
        } catch (e) {
            toast?.error('Connection error');
        } finally {
            setRefiningField(null);
        }
    };

    const handleApplyWordingSuggestion = () => {
        if (wordingSuggestion && wordingSuggestion.setter) {
            wordingSuggestion.setter(wordingSuggestion.refined);
            setWordingSuggestion(null);
        }
    };

    const handleUploadVerificationDoc = async (e) => {
        e.preventDefault();
        if (!verifDocFile || !activeProject?.course_id) return;
        setUploadingVerifFile(true);
        setVerifUploadMsg(null);

        const formData = new FormData();
        formData.append('course_id', activeProject.course_id);
        formData.append('verification_file', verifDocFile);
        if (verifCustomName) formData.append('custom_provider_name', verifCustomName);
        if (verifCustomWeb) formData.append('custom_provider_website', verifCustomWeb);
        if (verifCustomLi) formData.append('custom_provider_linkedin', verifCustomLi);

        try {
            const res = await fetch('/api/training/verification/upload.php', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setVerifUploadMsg({ type: 'success', text: lang === 'ar' ? 'تم رفع وثيقة التدريب بنجاح وقيد المراجعة والاعتماد.' : 'Verification document uploaded successfully.' });
                fetchProjects();
            } else {
                setVerifUploadMsg({ type: 'error', text: data.error || 'Upload failed' });
            }
        } catch (err) {
            setVerifUploadMsg({ type: 'error', text: 'Network error' });
        } finally {
            setUploadingVerifFile(false);
        }
    };

    const handleDownloadProjectDocx = async (ideaId, title) => {
        if (!ideaId) return;
        setDownloadingDocxId(ideaId);
        try {
            await downloadProposalDocx(ideaId, title || 'Proposal');
        } catch (err) {
            toast?.error(err.message || 'Error downloading Word document');
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
    const [invitingMember, setInvitingMember] = useState(false);
    const [teamActionError, setTeamActionError] = useState('');
    const [teamActionSuccess, setTeamActionSuccess] = useState('');
    const [myPendingInvitations, setMyPendingInvitations] = useState([]);
    const [respondingInvitation, setRespondingInvitation] = useState(false);
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
        if (effectiveCourseId) {
            setSelectedCourse(String(effectiveCourseId));
            setSubmitCourseId(String(effectiveCourseId));
        }
        fetchCourses();
        fetchProjects();
        fetchCatalogProjects(false, effectiveCourseId || null);
    }, [selectedCourse, selectedStatus, effectiveCourseId]);

    // Auto-select active project for Trainee
    useEffect(() => {
        if (!isEvaluator && !loading && projects.length > 0) {
            const proj = effectiveCourseId 
                ? (projects.find(p => String(p.course_id) === String(effectiveCourseId)) || projects[0])
                : projects[0];
            if (!activeProject || activeProject.id !== proj.id) {
                setActiveProject(proj);
                fetchIdeaDocs(proj.id);
            }
        }
    }, [projects, isEvaluator, loading, effectiveCourseId]);

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
            const res = await fetch('/api/training/courses/list.php', { credentials: 'include' });
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
            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (res.ok && data.courses) {
                setAllActiveCourses(data.courses);
                if (!isEvaluator) {
                    setCourses(data.courses);
                }
                if (effectiveCourseId) {
                    setSubmitCourseId(String(effectiveCourseId));
                } else if (data.courses.length > 0 && !submitCourseId) {
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
            const courseToFilter = effectiveCourseId || selectedCourse;
            if (courseToFilter) url += `course_id=${courseToFilter}&`;
            if (selectedStatus) url += `status=${selectedStatus}&`;

            const res = await fetch(url, { credentials: 'include' });
            const data = await res.json();
            if (res.ok) {
                if (data.my_pending_invitations) {
                    setMyPendingInvitations(data.my_pending_invitations);
                }
                if (data.ideas) {
                    let ideasList = data.ideas;
                    if (effectiveCourseId) {
                        ideasList = ideasList.filter(p => String(p.course_id) === String(effectiveCourseId));
                    }
                    setProjects(ideasList);
                    if (!isEvaluator && ideasList.length > 0) {
                        const matchedProj = preferredActiveId
                            ? ideasList.find(p => p.id == preferredActiveId) || ideasList[0]
                            : ideasList[0];
                        setActiveProject(matchedProj);
                        fetchIdeaDocs(matchedProj.id);
                    } else if (!isEvaluator && ideasList.length === 0) {
                        setActiveProject(null);
                    }
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

    const fetchCatalogProjects = async (force = false, courseIdParam = null) => {
        const targetCourseId = courseIdParam !== null ? courseIdParam : (submitCourseId || selectedCourse || '');
        if (!force && catalogProjects.length > 0 && !targetCourseId) return;
        setCatalogError('');
        setLoadingCatalog(true);
        try {
            const url = targetCourseId 
                ? `/api/training/ideas/catalog_list.php?course_id=${encodeURIComponent(targetCourseId)}`
                : '/api/training/ideas/catalog_list.php';
            const res = await fetch(url, { credentials: 'include' });
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
            const res = await fetch(`/api/training/docs/list.php?idea_id=${ideaId}`, { credentials: 'include' });
            const data = await res.json();
            if (res.ok) {
                const list = data.docs || data.documents || [];
                setProjectDocs(list);
            }
        } catch (e) {
            console.error('Error fetching project docs:', e);
        } finally {
            setLoadingDocs(false);
        }
    };

    const fetchTeamCandidates = async (query = '') => {
        if (!activeProject?.course_id) return;
        setLoadingTeamCandidates(true);
        try {
            const url = `/api/training/ideas/search_teammates.php?course_id=${activeProject.course_id}&q=${encodeURIComponent(query)}&current_idea_id=${activeProject.id}`;
            const res = await fetch(url, { credentials: 'include' });
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

    // ── TEAM MANAGEMENT & INVITATIONS HANDLERS ───────────────────────────────
    const handleInviteTeamMember = async (userId) => {
        if (!activeProject?.id || !userId) return;
        setInvitingMember(true);
        setTeamActionError('');
        setTeamActionSuccess('');

        try {
            const res = await fetch('/api/training/ideas/team_manage.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea_id: activeProject.id,
                    action: 'invite',
                    user_id: userId
                }),
                credentials: 'include'
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setTeamActionSuccess(data.message || (lang === 'ar' ? 'تم إرسال دعوة الانضمام للطالب بنجاح' : 'Invitation sent successfully'));
                setActiveProject(prev => prev ? { 
                    ...prev, 
                    team_members: data.team_members,
                    pending_invitations: data.pending_invitations 
                } : null);
                setProjects(prev => prev.map(p => p.id === activeProject.id ? { 
                    ...p, 
                    team_members: data.team_members,
                    pending_invitations: data.pending_invitations 
                } : p));
                setTeamSearchQuery('');
                setTeamSearchOpen(false);
                fetchTeamCandidates('');
                setTimeout(() => setTeamActionSuccess(''), 5000);
            } else {
                setTeamActionError(data.error || (lang === 'ar' ? 'فشل في إرسال الدعوة' : 'Failed to send invitation'));
            }
        } catch (err) {
            setTeamActionError(lang === 'ar' ? 'حدث خطأ في الاتصال بالخادم' : 'Connection error occurred');
        } finally {
            setInvitingMember(false);
        }
    };

    const handleCancelInvitation = async (invitationId) => {
        if (!activeProject?.id || !invitationId) return;
        const ok = await confirm({
            title: lang === 'ar' ? 'إلغاء الدعوة' : 'Cancel Invitation',
            message: lang === 'ar' ? 'هل أنت متأكد من إلغاء هذه الدعوة؟' : 'Are you sure you want to cancel this invitation?',
            variant: 'warning',
            confirmText: lang === 'ar' ? 'إلغاء الدعوة' : 'Cancel Invitation'
        });
        if (!ok) return;

        setInvitingMember(true);
        setTeamActionError('');
        setTeamActionSuccess('');

        try {
            const res = await fetch('/api/training/ideas/team_manage.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idea_id: activeProject.id,
                    action: 'cancel_invitation',
                    invitation_id: invitationId
                }),
                credentials: 'include'
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setTeamActionSuccess(data.message || (lang === 'ar' ? 'تم إلغاء الدعوة' : 'Invitation cancelled'));
                setActiveProject(prev => prev ? { 
                    ...prev, 
                    team_members: data.team_members,
                    pending_invitations: data.pending_invitations 
                } : null);
                setProjects(prev => prev.map(p => p.id === activeProject.id ? { 
                    ...p, 
                    team_members: data.team_members,
                    pending_invitations: data.pending_invitations 
                } : p));
                fetchTeamCandidates(teamSearchQuery);
                setTimeout(() => setTeamActionSuccess(''), 4000);
            } else {
                setTeamActionError(data.error || (lang === 'ar' ? 'فشل في إلغاء الدعوة' : 'Failed to cancel invitation'));
            }
        } catch (err) {
            setTeamActionError(lang === 'ar' ? 'حدث خطأ في الاتصال بالخادم' : 'Connection error occurred');
        } finally {
            setInvitingMember(false);
        }
    };

    const handleRespondInvitation = async (invitationId, decision) => {
        if (!invitationId || !decision) return;
        setRespondingInvitation(true);
        try {
            const res = await fetch('/api/training/ideas/team_manage.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'respond_invitation',
                    invitation_id: invitationId,
                    decision: decision
                }),
                credentials: 'include'
            });
            const data = await res.json();
            if (res.ok && data.success) {
                if (decision === 'accept') {
                    toast?.success(data.message || (lang === 'ar' ? 'تم الانضمام إلى الفريق بنجاح!' : 'Joined team successfully!'));
                } else {
                    toast?.info(data.message || (lang === 'ar' ? 'تم رفض الدعوة.' : 'Invitation rejected.'));
                }
                fetchProjects(data.idea_id || null);
            } else {
                toast?.error(data.error || 'فشلت العملية / Action failed');
            }
        } catch (err) {
            toast?.error(lang === 'ar' ? 'خطأ في الاتصال بالخادم' : 'Connection error occurred');
        } finally {
            setRespondingInvitation(false);
        }
    };

    const handleRemoveTeamMember = async (userId) => {
        if (!activeProject?.id || !userId) return;
        const ok = await confirm({
            title: lang === 'ar' ? 'إزالة عضو' : 'Remove Team Member',
            message: lang === 'ar' ? 'هل أنت متأكد من إزالة هذا العضو من الفريق؟' : 'Are you sure you want to remove this member from the team?',
            variant: 'danger',
            confirmText: lang === 'ar' ? 'إزالة' : 'Remove'
        });
        if (!ok) return;

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
                }),
                credentials: 'include'
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setTeamActionSuccess(lang === 'ar' ? 'تمت إزالة العضو من الفريق' : 'Member removed from team');
                setActiveProject(prev => prev ? { 
                    ...prev, 
                    team_members: data.team_members,
                    pending_invitations: data.pending_invitations 
                } : null);
                setProjects(prev => prev.map(p => p.id === activeProject.id ? { 
                    ...p, 
                    team_members: data.team_members,
                    pending_invitations: data.pending_invitations 
                } : p));
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
                credentials: 'include',
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
                credentials: 'include',
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
        const ok = await confirm({
            title: lang === 'ar' ? 'حذف المستند/الرابط' : 'Delete Deliverable',
            message: lang === 'ar' ? 'هل أنت متأكد من حذف هذا التوثيق/الرابط؟' : 'Are you sure you want to delete this deliverable/link?',
            variant: 'danger',
            confirmText: lang === 'ar' ? 'حذف' : 'Delete'
        });
        if (!ok) return;

        try {
            const res = await fetch('/api/training/docs/delete.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: docId })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                setProjectDocs(prev => prev.filter(d => d.id !== docId));
                fetchIdeaDocs(activeProject?.id);
                toast?.success(lang === 'ar' ? 'تم حذف الملف بنجاح' : 'Deliverable deleted successfully');
            } else {
                toast?.error(data.error || 'Failed to delete');
            }
        } catch (e) {
            toast?.error('Network error while deleting');
        }
    };

    const handleMarkAsFinished = async (ideaId) => {
        if (!ideaId) return;
        const ok = await confirm({
            title: lang === 'ar' ? 'تأكيد اكتمال المشروع' : 'Mark Project Finished',
            message: lang === 'ar' ? 'هل أنت متأكد من أنك أكملت جميع تسليمات المشروع وتريد تحديده كـ مكتمل؟' : 'Are you sure you have uploaded all deliverables and want to mark this project as finished?',
            variant: 'info',
            confirmText: lang === 'ar' ? 'نعم، اكتمل المشروع' : 'Yes, Mark Finished'
        });
        if (!ok) return;

        setCompletingProject(true);
        try {
            const res = await fetch('/api/training/ideas/complete.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idea_id: ideaId })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setActiveProject(prev => prev ? { ...prev, status: 'completed' } : null);
                fetchProjects();
                toast?.success(lang === 'ar' ? 'تم تحديد المشروع كمكتمل بنجاح!' : 'Project marked as completed successfully!');
            } else {
                toast?.error(data.error || 'Failed to mark project as finished');
            }
        } catch (err) {
            toast?.error('Error completing project');
        } finally {
            setCompletingProject(false);
        }
    };

    // ── SUBMISSION MODAL HANDLERS ────────────────────────────────────────────
    const openSubmitModal = (idea = null) => {
        setError('');
        setCatalogError('');
        const defaultList = isEvaluator ? (allActiveCourses.length > 0 ? allActiveCourses : courses) : courses;
        const initialCourse = idea?.course_id || activeProject?.course_id || submitCourseId || (defaultList.length > 0 ? defaultList[0].id : '');
        
        // Always pre-fetch catalog projects
        fetchCatalogProjects(true, initialCourse);

        if (idea) {
            setEditingIdeaId(idea.id);
            setCreatedIdeaId(idea.id);
            setSubmitCourseId(idea.course_id || initialCourse);
            setSubmitTitleEn(idea.title || '');
            setSubmitDescEn(idea.description || '');
            setSubmitTechStack(idea.tech_stack || '');
            setSubmitProblemStmt(idea.problem_statement || '');
            setSubmitExpectedOutput(idea.expected_output || '');

            const isExternalDoc = idea.proposal_json?.source === 'external_completed_project' || idea.is_external_project;
            if (idea.catalog_project_id) {
                setSubmissionTab('catalog');
            } else if (isExternalDoc) {
                setSubmissionTab('external_project');
            } else {
                setSubmissionTab('custom');
            }
            setSelectedCatalogId(idea.catalog_project_id || null);

            // Populate External Form fields
            setExternalTitle(idea.title || '');
            setExternalCompany(idea.proposal_json?.provider_name || idea.custom_provider_name || idea.provider_name || '');
            setExternalLink(idea.proposal_json?.project_link || '');
            setExternalAbstract(idea.description || '');
            setExternalProblem(idea.problem_statement || '');
            setExternalObjectives(idea.proposal_json?.sections?.find(s => s.key === 'objectives_scope')?.content || '');
            setExternalArchitecture(idea.proposal_json?.sections?.find(s => s.key === 'methodology' || s.key === 'expected_system_design')?.content || '');
            setExternalTechStack(idea.tech_stack || '');
            setExternalDeliverables(idea.expected_output || '');
            setExternalFile(null);

            const rawMembers = idea.team_members || [];
            const currentUserId = user?.id;
            const teammates = rawMembers.filter(m => (m.user_id || m.id) !== currentUserId && m.role !== 'leader');
            setSubmitTeammates(teammates);

            fetch(`/api/training/ideas/proposal_get.php?idea_id=${idea.id}`, { credentials: 'include' })
                .then(r => r.json())
                .then(d => {
                    if (d.proposal) {
                        setSelectedProposalData(d.proposal);
                        if (d.proposal?.source === 'external_completed_project') {
                            setSubmissionTab('external_project');
                            if (d.proposal.sections) {
                                const findSec = (k) => d.proposal.sections.find(s => s.key === k)?.content || '';
                                if (!externalAbstract) setExternalAbstract(findSec('abstract') || idea.description || '');
                                if (!externalProblem) setExternalProblem(findSec('problem_definition') || idea.problem_statement || '');
                                if (!externalObjectives) setExternalObjectives(findSec('objectives_scope') || '');
                                if (!externalArchitecture) setExternalArchitecture(findSec('methodology') || findSec('expected_system_design') || '');
                                if (!externalDeliverables) setExternalDeliverables(findSec('expected_output') || idea.expected_output || '');
                            }
                        }
                    }
                })
                .catch(() => {});
        } else {
            setEditingIdeaId(null);
            setCreatedIdeaId(null);
            setSelectedCatalogId(null);
            setSelectedProposalData(null);
            setSubmissionTab('catalog');
            setSubmitCourseId(initialCourse);
            setSubmitTitleEn('');
            setSubmitDescEn('');
            setSubmitTechStack('');
            setSubmitProblemStmt('');
            setSubmitExpectedOutput('');
            setSubmitTeammates([]);

            setExternalTitle('');
            setExternalCompany(user?.pending_external_course?.custom_provider_name || activeProject?.custom_provider_name || activeProject?.provider_name || '');
            setExternalLink('');
            setExternalAbstract('');
            setExternalProblem('');
            setExternalObjectives('');
            setExternalArchitecture('');
            setExternalTechStack('');
            setExternalDeliverables('');
            setExternalFile(null);
        }
        setShowSubmitModal(true);
        fetchActiveCourses();
    };

    // Auto-open catalog modal if action=catalog in URL query params
    useEffect(() => {
        const action = searchParams.get('action');
        const courseParam = searchParams.get('course_id');
        if (action === 'catalog' || action === 'submit') {
            if (courseParam) {
                setSubmitCourseId(courseParam);
                fetchCatalogProjects(true, courseParam);
            }
            openSubmitModal();
        }
    }, [searchParams]);

    const handleSelectCatalogIdea = async (catProject) => {
        if (catProject.is_taken && !catProject.taken_by_me) {
            setError(lang === 'ar'
                ? 'هذا المشروع محجوز بالفعل. لا يمكن لفريقين اختيار نفس الفكرة.'
                : 'This project has already been chosen. Two teams cannot choose the same idea.');
            return;
        }
        const defaultList = isEvaluator ? (allActiveCourses.length > 0 ? allActiveCourses : courses) : courses;
        const targetCourseId = submitCourseId || activeProject?.course_id || (defaultList.length > 0 ? defaultList[0].id : null);
        if (!targetCourseId) {
            setError(lang === 'ar' ? 'يرجى اختيار الدورة التدريبية أولاً من الأعلى' : 'Please select a course first from above');
            return;
        }
        setSelectingCatalog(true);
        setError('');
        try {
            const res = await fetch('/api/training/ideas/catalog_select.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    catalog_project_id: catProject.id,
                    course_id: targetCourseId,
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
                setShowSubmitModal(false);
                await fetchProjects(ideaId);
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
                    fetchProjects(ideaId);
                }, 2400);
            } else {
                setError(data.error || (lang === 'ar' ? 'فشل اختيار فكرة المشروع من الكتالوج' : 'Failed to select catalog idea'));
            }
        } catch (e) {
            setError(e?.message || (lang === 'ar' ? 'حدث خطأ في الاتصال بخدمة الكتالوج' : 'Error connecting to catalog service'));
        } finally {
            setSelectingCatalog(false);
        }
    };

    const handleApplyTrackSuggestion = (sug) => {
        const titleText = lang === 'ar' ? (sug.titleAr || sug.title) : sug.title;
        const descText = lang === 'ar' ? (sug.descAr || sug.desc) : sug.desc;
        setSubmitTitleEn(titleText);
        setSubmitDescEn(descText);
        setSubmitProblemStmt('');
        setSubmitExpectedOutput('');
        setSubmitTechStack('');
        setSelectedProposalData(null);
    };

    const handleGenerateAiProposal = async () => {
        const currentTitle = submitTitleEn.trim();
        const currentDesc = submitDescEn.trim();

        if (!currentTitle || !currentDesc) {
            setError(lang === 'ar'
                ? 'يرجى كتابة عنوان المشروع والوصف التفصيلي أولاً، ليعتمد عليهما الذكاء الاصطناعي في بناء المقترح بدقة.'
                : 'Please write the Project Title and a detailed Project Description first so AI can generate the proposal accurately.');
            return;
        }

        setGeneratingAi(true);
        setError('');
        try {
            const res = await fetch('/api/training/ideas/ai_generate.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: currentTitle,
                    description: currentDesc,
                    domain: (trackLabelMap && trackLabelMap[studentTrackKey]?.en) || 'Software / AI',
                    full_sections: true
                })
            });
            const data = await res.json();
            if (res.ok && data.success && data.proposal) {
                if (data.proposal.title && (!currentTitle || currentTitle.length < 8)) {
                    setSubmitTitleEn(data.proposal.title);
                }
                setSubmitProblemStmt(data.proposal.problem_statement || '');
                setSubmitTechStack(data.proposal.tech_stack || '');
                setSubmitExpectedOutput(data.proposal.expected_output || '');
                if (data.proposal.sections) {
                    setSelectedProposalData(data.proposal);
                }
            } else {
                const errMsg = (lang === 'ar' ? data.error_ar : data.error_en) ||
                    data.error ||
                    (lang === 'ar'
                        ? 'خدمة الذكاء الاصطناعي تشهد ضغطاً حالياً، يرجى المحاولة مرة أخرى بعد لحظات.'
                        : 'The AI service is currently experiencing high demand. Please try again in a few moments.');
                setError(errMsg);
            }
        } catch (e) {
            console.error(e);
            setError(lang === 'ar'
                ? 'خدمة الذكاء الاصطناعي تشهد ضغطاً حالياً، يرجى المحاولة مرة أخرى بعد لحظات.'
                : 'The AI service is currently experiencing high demand. Please try again in a few moments.');
        } finally {
            setGeneratingAi(false);
        }
    };

    // ── OPTION 3: SAVE PROPOSAL FILE AS DRAFT ─────────────────────────────────
    const handleSaveExternalDraft = async (e) => {
        if (e) e.preventDefault();
        const defaultList = isEvaluator ? (allActiveCourses.length > 0 ? allActiveCourses : courses) : courses;
        const targetCourseId = submitCourseId || activeProject?.course_id || (defaultList.length > 0 ? defaultList[0].id : null);
        
        const finalTitle = externalTitle.trim() || (externalFile ? externalFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : (lang === 'ar' ? 'مسودة مقترح مشروع' : 'Project Proposal Draft'));

        if (!targetCourseId) {
            setError(lang === 'ar' ? 'يرجى اختيار الدورة التدريبية' : 'Please select a training course');
            return;
        }

        setSavingExternalDraft(true);
        setError('');

        try {
            const sections = [
                { key: 'abstract', title: 'Executive Summary / Abstract', content: externalAbstract.trim() || 'Draft executive summary pending completion.', source: 'user_input' },
                { key: 'methodology', title: 'Methodology & Documentation', content: 'Draft proposal file attached.', source: 'user_input' }
            ];

            const proposalPayload = {
                source: 'external_completed_project',
                is_draft: true,
                project_title: finalTitle,
                provider_name: externalCompany.trim(),
                project_link: externalLink.trim(),
                file_name: externalFile ? externalFile.name : null,
                sections: sections,
                team: {
                    leader: user?.full_name || 'Student',
                    members: [],
                    course: activeSelectedCourse?.name || 'Field Training',
                    date: new Date().toLocaleDateString('en-GB')
                }
            };

            const submitRes = await fetch('/api/training/ideas/submit.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: targetCourseId,
                    title: finalTitle,
                    description: externalAbstract.trim() || (lang === 'ar' ? 'مسودة مقترح قيد الإعداد' : 'Draft proposal in progress'),
                    tech_stack: 'Applied Frameworks',
                    problem_statement: 'Draft',
                    expected_output: 'Draft',
                    is_draft: true,
                    status: 'draft',
                    proposal_json: proposalPayload
                })
            });

            const submitData = await submitRes.json();
            if (!submitRes.ok || !submitData.success) {
                setError(submitData.error || (lang === 'ar' ? 'فشل حفظ المسودة' : 'Failed to save draft'));
                setSavingExternalDraft(false);
                return;
            }

            const ideaId = submitData.idea_id || activeProject?.id;

            // If a document file is attached, upload it
            if (ideaId && externalFile) {
                const formData = new FormData();
                formData.append('idea_id', ideaId);
                formData.append('title', finalTitle || externalFile.name);
                formData.append('doc_type', 'external_project_file');
                formData.append('file', externalFile);

                await fetch('/api/training/docs/upload.php', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });
            }

            setShowSubmitModal(false);
            setExternalFile(null);
            fetchProjects(ideaId);
        } catch (err) {
            setError(lang === 'ar' ? 'حدث خطأ في الاتصال أثناء حفظ المسودة' : 'Network error saving draft');
        } finally {
            setSavingExternalDraft(false);
        }
    };

    // ── OPTION 3: SUBMIT PROPOSAL FILE (FINAL SUBMISSION) ─────────────────────
    const handleSubmitExternalProject = async (e) => {
        if (e) e.preventDefault();
        const defaultList = isEvaluator ? (allActiveCourses.length > 0 ? allActiveCourses : courses) : courses;
        const targetCourseId = submitCourseId || activeProject?.course_id || (defaultList.length > 0 ? defaultList[0].id : null);
        
        const finalTitle = externalTitle.trim() || (externalFile ? externalFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : '');

        if (!targetCourseId) {
            setError(lang === 'ar' ? 'يرجى اختيار الدورة التدريبية' : 'Please select a training course');
            return;
        }
        if (!finalTitle) {
            setError(lang === 'ar' ? 'يرجى كتابة عنوان المشروع أو إرفاق ملف المقترح' : 'Please provide project title or attach proposal file');
            return;
        }

        setSubmittingExternal(true);
        setError('');

        try {
            const sections = [
                { key: 'abstract', title: 'Executive Summary / Abstract', content: externalAbstract.trim() || `Official project proposal submitted for ${finalTitle}.`, source: 'user_input' },
                { key: 'introduction_background', title: 'Chapter 1 — Introduction & Context', content: `This project (${finalTitle}) was conducted as part of academic training${externalCompany.trim() ? ` at ${externalCompany.trim()}` : ''}.\n\n${externalAbstract.trim() || 'Comprehensive project proposal and documentation attached.'}`, source: 'user_input' },
                { key: 'methodology', title: 'Methodology & Implementation', content: 'Applied methodology, system design, and execution documented in attached official proposal file.', source: 'user_input' }
            ];

            const proposalPayload = {
                source: 'external_completed_project',
                is_draft: false,
                project_title: finalTitle,
                provider_name: externalCompany.trim(),
                project_link: externalLink.trim(),
                file_name: externalFile ? externalFile.name : null,
                sections: sections,
                team: {
                    leader: user?.full_name || 'Student',
                    members: [],
                    course: activeSelectedCourse?.name || 'Field Training',
                    date: new Date().toLocaleDateString('en-GB')
                }
            };

            const submitRes = await fetch('/api/training/ideas/submit.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: targetCourseId,
                    title: finalTitle,
                    description: externalAbstract.trim() || `Official proposal submission for ${finalTitle}`,
                    tech_stack: externalTechStack.trim() || 'Applied Frameworks & Tools',
                    problem_statement: 'Documented in attached proposal file',
                    expected_output: 'Complete project deliverables and report attached',
                    is_draft: false,
                    status: 'submitted',
                    proposal_json: proposalPayload
                })
            });

            const submitData = await submitRes.json();
            if (!submitRes.ok || !submitData.success) {
                setError(submitData.error || (lang === 'ar' ? 'فشل تقديم المقترح' : 'Failed to submit proposal'));
                setSubmittingExternal(false);
                return;
            }

            const ideaId = submitData.idea_id || activeProject?.id;

            // Upload attached proposal file
            if (ideaId && externalFile) {
                const formData = new FormData();
                formData.append('idea_id', ideaId);
                formData.append('title', finalTitle || externalFile.name);
                formData.append('doc_type', 'external_project_file');
                formData.append('file', externalFile);

                await fetch('/api/training/docs/upload.php', {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });
            }

            setShowSubmitModal(false);
            setExternalFile(null);
            await fetchProjects(ideaId);
        } catch (err) {
            setError(lang === 'ar' ? 'حدث خطأ في الاتصال أثناء تقديم المقترح' : 'Network error submitting proposal');
        } finally {
            setSubmittingExternal(false);
        }
    };

    const handleSubmitIdea = async (e) => {
        e?.preventDefault?.();
        const defaultList = isEvaluator ? (allActiveCourses.length > 0 ? allActiveCourses : courses) : courses;
        const targetCourseId = submitCourseId || activeProject?.course_id || (defaultList.length > 0 ? defaultList[0].id : null);
        if (!targetCourseId || !submitTitleEn.trim() || !submitDescEn.trim()) {
            setError(lang === 'ar' ? 'يرجى اختيار الدورة التدريبية وملء عنوان المشروع والوصف' : 'Please choose a course and fill in title and description');
            return;
        }
        setSubmittingIdea(true);
        setError('');

        try {
            let proposalDataToSave = selectedProposalData;

            // If proposalDataToSave exists, ensure its top-level and section fields match any edits
            if (proposalDataToSave && proposalDataToSave.sections) {
                proposalDataToSave.project_title = submitTitleEn;
                proposalDataToSave.description = submitDescEn;
                proposalDataToSave.tech_stack = submitTechStack;
                proposalDataToSave.problem_statement = submitProblemStmt;
                proposalDataToSave.expected_output = submitExpectedOutput;
                proposalDataToSave.sections = proposalDataToSave.sections.map(sec => {
                    if (sec.key === 'abstract' && submitDescEn) return { ...sec, content: submitDescEn };
                    if (sec.key === 'problem_definition' && submitProblemStmt) return { ...sec, content: submitProblemStmt };
                    return sec;
                });
            } else {
                // If not already generated via AI button, build standard 7-section structured proposal
                proposalDataToSave = {
                    source: 'custom_ai',
                    project_title: submitTitleEn,
                    description: submitDescEn,
                    tech_stack: submitTechStack,
                    problem_statement: submitProblemStmt,
                    expected_output: submitExpectedOutput,
                    sections: [
                        { key: 'abstract', title: 'Executive Summary / Abstract', content: submitDescEn, source: 'user_input' },
                        { key: 'introduction_background', title: 'Introduction & Background', content: `This project, titled "${submitTitleEn}", focuses on developing a tailored system to address practical requirements in the domain. Utilizing ${submitTechStack || 'modern engineering frameworks'}, the system bridges conceptual modeling with reliable implementation.`, source: 'user_input' },
                        { key: 'problem_definition', title: 'Problem Definition & Motivation', content: submitProblemStmt || `The project addresses critical challenges in the operational domain of ${submitTitleEn}, providing an automated and robust alternative to manual or unintegrated processes.`, source: 'user_input' },
                        { key: 'objectives_scope', title: 'Aim, Objectives & Scope', content: `Overall Aim: To design and implement ${submitTitleEn}.\n\nKey Deliverables:\n${submitExpectedOutput || '1. Functional prototype\n2. Documentation and test verification'}`, source: 'user_input' },
                        { key: 'related_work', title: 'Related Work & Comparative Analysis', content: `Existing approaches in the domain of ${submitTitleEn} frequently suffer from high implementation overhead or closed-source lock-in. This project provides a transparent, modular architecture built on ${submitTechStack || 'open modern stacks'}.`, source: 'user_input' },
                        { key: 'methodology', title: 'Methodology & Engineering Pipeline', content: `The technical methodology encompasses iterative development phases: requirements analysis, modular component engineering using ${submitTechStack || 'the designated stack'}, and empirical verification under realistic test scenarios.`, source: 'user_input' },
                        { key: 'expected_system_design', title: 'System Architecture & Design', content: `Architecture Overview:\n1. Client Presentation Layer for input capture and output rendering.\n2. Core Processing Engine executing domain business logic.\n3. Data Persistence Layer ensuring structured state management.`, source: 'user_input' }
                    ]
                };
            }

            const res = await fetch('/api/training/ideas/submit.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: targetCourseId,
                    title: submitTitleEn,
                    description: submitDescEn,
                    tech_stack: submitTechStack,
                    problem_statement: submitProblemStmt,
                    expected_output: submitExpectedOutput,
                    proposal_json: proposalDataToSave || undefined,
                    teammate_ids: isExternalTrainee ? [] : submitTeammates.map(t => t.id || t.user_id)
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
                setShowSubmitModal(false);
                setSubmitTitleEn('');
                setSubmitDescEn('');
                setSubmitTechStack('');
                setSubmitProblemStmt('');
                setSubmitExpectedOutput('');
                setAiKeyword('');
                setSelectedProposalData(null);
                setSubmitTeammates([]);
                await fetchProjects(data.idea_id);
            } else {
                setError(data.error || (lang === 'ar' ? 'فشل حفظ فكرة المشروع' : 'Failed to submit idea'));
            }
        } catch (e) {
            setError(e?.message || (lang === 'ar' ? 'حدث خطأ في الاتصال أثناء حفظ الفكرة' : 'Error submitting project idea'));
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
                credentials: 'include',
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
        setEvalError('');

        const isGolden = newStatus === 'golden_pass';

        try {
            const res = await fetch('/api/training/ideas/evaluate.php', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.id ? { 'X-User-Id': String(user.id), 'Authorization': `Bearer ${user.id}` } : {})
                },
                body: JSON.stringify({
                    idea_id: activeProject.id,
                    status: isGolden ? 'approved' : newStatus,
                    golden_pass: isGolden ? true : undefined,
                    feedback: feedback || voteNotes
                })
            });
            const data = await res.json();

            if (res.ok && data.success) {
                const msg = isGolden
                    ? (lang === 'ar' ? '🌟 تم منح الكارت الذهبي وتأهيل المشروع للوحة المتصدرين بنجاح!' : '🌟 Golden Pass awarded! Project added directly to the Leaderboard.')
                    : (lang === 'ar' ? 'تم تحديث حالة المشروع بنجاح' : 'Project status updated successfully');
                setEvalSuccess(msg);
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
                        status: isGolden ? 'approved' : newStatus,
                        is_golden_pass: isGolden ? 1 : prev.is_golden_pass,
                        feedback: feedback || voteNotes
                    }));
                    fetchProjects();
                    setTimeout(() => {
                        setActiveProject(null);
                        setEvalSuccess('');
                    }, 1400);
                }
            } else {
                setEvalError(data.error || (lang === 'ar' ? 'فشل حفظ التقييم' : 'Failed to update evaluation'));
            }
        } catch (e) {
            setEvalError(lang === 'ar' ? 'حدث خطأ في الاتصال أثناء حفظ التقييم' : 'Error submitting evaluation');
        } finally {
            setEvaluating(false);
        }
    };

    const handleCastVote = async (choice) => {
        if (!activeProject) return;
        setVoting(true);
        setEvalError('');
        setEvalSuccess('');

        try {
            const res = await fetch('/api/training/ideas/vote.php', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user?.id ? { 'X-User-Id': String(user.id), 'Authorization': `Bearer ${user.id}` } : {})
                },
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
                setEvalError(data.error || (lang === 'ar' ? 'فشل تسجيل التصويت' : 'Failed to cast vote'));
            }
        } catch (e) {
            setEvalError(lang === 'ar' ? 'حدث خطأ أثناء تسجيل التصويت' : 'Error submitting vote');
        } finally {
            setVoting(false);
        }
    };

    const filteredProjects = projects.filter(p => {
        const title = (p.title || '').toLowerCase();
        const traineeName = (p.trainee_name || '').toLowerCase();
        const studentId = (p.student_id || '').toLowerCase();
        const query = searchQuery.toLowerCase();
        return title.includes(query) || traineeName.includes(query) || studentId.includes(query);
    });

    const getStatusBadge = (st, isGolden = false) => {
        return (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {isGolden && (
                    <span className="status-badge badge-golden-pass" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', color: '#ffffff', border: '1px solid rgba(251, 191, 36, 0.6)', fontWeight: 700, boxShadow: '0 2px 8px rgba(245, 158, 11, 0.35)' }}>
                        <Sparkles size={13} /> {lang === 'ar' ? 'الكارت الذهبي' : 'Golden Pass'}
                    </span>
                )}
                {(() => {
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
                        case 'draft':
                            return <span className="status-badge badge-draft" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}><FileText size={14} /> {lang === 'ar' ? 'مسودة' : 'Draft'}</span>;
                        default:
                            return <span className="status-badge badge-pending"><Clock size={14} /> {lang === 'ar' ? 'قيد المراجعة' : 'Under Review'}</span>;
                    }
                })()}
            </div>
        );
    };

    const isOwner = activeProject && (String(activeProject.trainee_id) === String(user?.id) || String(activeProject.owner_id) === String(user?.id) || activeProject.is_team_leader);

    return (
        <div className={`trainee-projects-page ${isEmbedded ? 'trainee-projects-embedded' : ''}`}>
            {/* ── NMU Template Proposal Document Modal ─────────────────── */}
            {showProposalDoc && selectedProposalData && (
                <ProposalDocModal
                    proposal={selectedProposalData}
                    ideaId={createdIdeaId}
                    isEvaluator={isEvaluator}
                    lang={lang}
                    isExternal={isExternalTrainee || selectedProposalData?.training_type === 'external' || selectedProposalData?.course_type === 'external'}
                    onClose={() => setShowProposalDoc(false)}
                    onEvaluated={() => {
                        setShowProposalDoc(false);
                        fetchProjects();
                    }}
                />
            )}

            {/* ── Page Top Header ──────────────────────────────────────── */}
            {!isEmbedded && (
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                        <h1>
                            <FolderOpen size={24} className="text-primary" />
                            {isEvaluator
                                ? (lang === 'ar' ? 'المشاريع' : 'Projects')
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
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TRAINEE VIEW — UNIFIED MODERN PROJECT HUB
            ════════════════════════════════════════════════════════════════ */}
            {!isEvaluator && (
                <>
                    {/* Received Pending Team Invitations (Facebook-style invitation requests) */}
                    {myPendingInvitations && myPendingInvitations.length > 0 && (
                        <div className="received-invitations-container" style={{ marginBottom: '1.25rem' }}>
                            {myPendingInvitations.map(inv => (
                                <div key={inv.invitation_id} className="received-invitation-card" style={{
                                    background: 'linear-gradient(135deg, rgba(0, 45, 86, 0.05) 0%, rgba(37, 99, 235, 0.08) 100%)',
                                    border: '1.5px solid rgba(37, 99, 235, 0.25)',
                                    borderRadius: '16px',
                                    padding: '1.25rem 1.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '1.5rem',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                                    flexWrap: 'wrap',
                                    marginBottom: '0.75rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                        <div style={{
                                            width: '46px',
                                            height: '46px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #002D56 0%, #2563eb 100%)',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <Mail size={22} />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                                <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#2563eb', color: '#fff' }}>
                                                    {lang === 'ar' ? 'طلب انضمام جديد' : 'New Team Invitation'}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                    {inv.course_name}
                                                </span>
                                            </div>
                                            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-0)' }}>
                                                {inv.project_title}
                                            </h4>
                                            <p style={{ margin: '3px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {lang === 'ar' ? `دعاك زميلك قائد المشروع: ${inv.inviter_name} للانضمام إلى فريق عمل هذا المشروع` : `Invited by project leader: ${inv.inviter_name} to join this team`}
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            style={{ background: '#10b981', borderColor: '#10b981', padding: '0.65rem 1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                                            disabled={respondingInvitation}
                                            onClick={() => handleRespondInvitation(inv.invitation_id, 'accept')}
                                        >
                                            <Check size={16} />
                                            <span>{lang === 'ar' ? 'قبول الدعوة' : 'Accept Invitation'}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-ghost"
                                            style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', padding: '0.65rem 1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                                            disabled={respondingInvitation}
                                            onClick={() => handleRespondInvitation(inv.invitation_id, 'reject')}
                                        >
                                            <X size={16} />
                                            <span>{lang === 'ar' ? 'رفض' : 'Decline'}</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

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
                                {isExternalTrainee
                                    ? (lang === 'ar'
                                        ? 'قم بتسجيل مقترح مشروع التدريب الميداني الخاص بك أو إنشاء وتخصيص فكرتك بالذكاء الاصطناعي.'
                                        : 'Register your official field training project proposal or create your own custom project idea.')
                                    : (lang === 'ar'
                                        ? 'يمكنك الاختيار فوراً من دليل المشاريع الـ 64 المعتمدة مع المقترح الأكاديمي الكامل، أو إنشاء فكرتك الخاصة بالذكاء الاصطناعي.'
                                        : 'Select instantly from the 64 official pre-approved catalog projects or create your own custom idea.')
                                }
                            </p>
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '1.25rem' }}>
                                <button className="btn btn-primary" onClick={() => openSubmitModal()} style={{ gap: '8px', padding: '0.85rem 1.85rem', fontWeight: 700, fontSize: '0.95rem' }}>
                                    <Plus size={18} />
                                    {lang === 'ar' ? 'إضافة مشروع' : 'Add Project'}
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
                                        {activeProject.training_type === 'external' ? (
                                            <span className="hero-course-chip" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', borderColor: 'rgba(59, 130, 246, 0.3)' }}>
                                                <Building2 size={13} /> {activeProject.provider_name || activeProject.custom_provider_name || (lang === 'ar' ? 'تدريب خارجي' : 'External')}
                                                {activeProject.track_name ? ` • ${activeProject.track_name}` : ''}
                                            </span>
                                        ) : (
                                            <span className="hero-course-chip" style={{ background: 'var(--bg-2)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                <GraduationCap size={13} />
                                                {lang === 'ar' ? 'تدريب داخلي' : 'Internal'}
                                                {activeProject.track_name ? ` • ${activeProject.track_name}` : ''}
                                            </span>
                                        )}
                                        {getStatusBadge(activeProject.status, Number(activeProject.is_golden_pass) === 1)}
                                    </div>
                                    <h2 className="hero-project-title">
                                        {activeProject.title}
                                    </h2>
                                    <div className="hero-meta-row">
                                        {activeProject.training_type === 'external' && (activeProject.provider_name || activeProject.custom_provider_name) && (
                                            <span>
                                                <Building2 size={14} style={{ color: '#2563eb' }} />
                                                {lang === 'ar' ? 'جهة التدريب:' : 'Company / Provider:'} <strong>{activeProject.provider_name || activeProject.custom_provider_name}</strong>
                                            </span>
                                        )}
                                        <span>
                                            <UserCheck size={14} />
                                            {lang === 'ar' ? 'المدرب المشرف:' : 'Supervisor:'} <strong>{activeProject.reviewer_name || activeProject.effective_trainer_name || (lang === 'ar' ? 'مشرف الدورة' : 'Course Trainer')}</strong>
                                        </span>
                                        {!isExternalTrainee && activeProject.training_type !== 'external' && activeProject.course_type !== 'external' && (
                                            <span>
                                                <Users size={14} />
                                                {lang === 'ar' ? 'فريق العمل:' : 'Team:'} <strong>{(activeProject.team_members?.length || 1)} / 5 {lang === 'ar' ? 'أعضاء' : 'Members'}</strong>
                                            </span>
                                        )}
                                        <span>
                                            <Clock size={14} />
                                            {new Date(activeProject.updated_at || activeProject.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="hero-banner-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    {isOwner && activeProject.status === 'draft' && (
                                        <button
                                            type="button"
                                            className="btn-hero-action"
                                            onClick={() => openSubmitModal(activeProject)}
                                            style={{ background: '#2563eb', color: '#ffffff', borderColor: '#2563eb', fontWeight: 700 }}
                                            title={lang === 'ar' ? 'استكمال وتعديل مسودة المشروع' : 'Complete & Edit Project Draft'}
                                        >
                                            <Edit3 size={15} />
                                            <span>{lang === 'ar' ? 'استكمال المسودة' : 'Complete Draft'}</span>
                                        </button>
                                    )}
                                    {isEvaluator ? (
                                        <button
                                            type="button"
                                            className="btn-hero-action btn-hero-delete"
                                            onClick={(e) => handleDeleteIdea(e, activeProject.id)}
                                            title={lang === 'ar' ? 'حذف فكرة المشروع (صلاحية المشرف)' : 'Delete Project Proposal (Supervisor Action)'}
                                        >
                                            <Trash2 size={15} />
                                            <span>{lang === 'ar' ? 'حذف الفكرة' : 'Delete Idea'}</span>
                                        </button>
                                    ) : (isOwner && activeProject.status !== 'approved' && activeProject.status !== 'completed') ? (
                                        <button
                                            type="button"
                                            className="btn-hero-action btn-hero-delete"
                                            onClick={(e) => handleDeleteIdea(e, activeProject.id)}
                                            title={lang === 'ar' ? 'حذف فكرة المشروع واختيار فكرة أخرى' : 'Delete Project Proposal & Choose Another'}
                                        >
                                            <Trash2 size={15} />
                                            <span>{lang === 'ar' ? 'حذف واختيار فكرة أخرى' : 'Delete & Restart'}</span>
                                        </button>
                                    ) : (activeProject.status === 'approved' || activeProject.status === 'completed') ? (
                                        <span className="approved-lock-chip" title={lang === 'ar' ? 'تم اعتماد الفكرة رسمياً - لا يمكن تعديلها أو حذفها' : 'Idea approved - locked from edits/deletion'}>
                                            <Lock size={14} />
                                            <span>{lang === 'ar' ? 'فكرة معتمدة ومقفلة' : 'Approved & Locked'}</span>
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            {/* ── Rejected Idea Action Notice ── */}
                            {activeProject.status === 'rejected' && (
                                <div style={{
                                    margin: '1rem 0 1.25rem 0',
                                    padding: '1.25rem 1.5rem',
                                    borderRadius: '14px',
                                    background: '#fef2f2',
                                    border: '1.5px solid #fca5a5',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.85rem'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                        <AlertCircle size={24} style={{ color: '#dc2626', flexShrink: 0, marginTop: '2px' }} />
                                        <div style={{ flex: 1 }}>
                                            <h4 style={{ margin: 0, color: '#991b1b', fontSize: '1.05rem', fontWeight: 800 }}>
                                                {lang === 'ar' ? 'تم رفض فكرة المشروع' : 'Project Proposal Was Rejected'}
                                            </h4>
                                            {activeProject.feedback && (
                                                <p style={{ margin: '6px 0 0 0', color: '#b91c1c', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                                    <strong>{lang === 'ar' ? 'ملاحظات المشرف:' : 'Supervisor Feedback:'}</strong> {activeProject.feedback}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.86rem', color: '#7f1d1d' }}>
                                        {isExternalTrainee
                                            ? (lang === 'ar'
                                                ? 'تم رفض هذا المقترح، يمكنك الآن تقديم وتعديل مقترح مشروع جديد.'
                                                : 'This proposal was rejected. You can now submit a new project proposal.')
                                            : (lang === 'ar'
                                                ? 'تم رفض هذه الفكرة، يمكنك الآن اختيار فكرة جديدة فوراً من دليل الـ 64 مشروعاً المعتمدة مع المقترح الكامل.'
                                                : 'This proposal was rejected. You can now select a new project idea from the 64 official catalog templates.')
                                        }
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => openSubmitModal()}
                                            style={{
                                                padding: '0.65rem 1.65rem',
                                                fontSize: '0.92rem',
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                borderRadius: '8px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Plus size={16} />
                                            <span>{isExternalTrainee ? (lang === 'ar' ? 'إضافة مشروع جديد' : 'Add New Project') : (lang === 'ar' ? 'اختيار فكرة جديدة من الدليل (64 مشروعاً)' : 'Choose New Idea from Catalog')}</span>
                                        </button>
                                    </div>
                                </div>
                            )}

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
                                {activeProject.training_type !== 'external' && activeProject.course_type !== 'external' && !isExternalTrainee && (
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
                                )}
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
                                                            <span className={`step-number-badge ${ms.done ? 'done' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                {ms.done ? <Check size={13} style={{ strokeWidth: 3 }} /> : ms.step}
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
                                            {(activeProject.description) && !['no description available', 'no description provided', 'لا يوجد وصف متاح'].includes((activeProject.description).toLowerCase().trim()) && (
                                                <div className="highlight-box">
                                                    <label>{lang === 'ar' ? 'المستخلص ووصف المشروع' : 'Project Abstract'}</label>
                                                    <p>{activeProject.description}</p>
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
                                            isExternal={isExternalTrainee || activeProject.training_type === 'external' || activeProject.course_type === 'external'}
                                        />
                                    </div>
                                )}

                                {/* TAB 2: MY TEAM & COLLABORATORS — ONLY FOR INTERNAL COURSES */}
                                {dashboardTab === 'team' && !isExternalTrainee && activeProject.training_type !== 'external' && activeProject.course_type !== 'external' && (
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

                                        {/* Pending Sent Invitations Section (Awaiting student response) */}
                                        {isOwner && activeProject.pending_invitations && activeProject.pending_invitations.length > 0 && (
                                            <div className="pending-invitations-box" style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
                                                <h5 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Clock size={15} style={{ color: '#f59e0b' }} />
                                                    <span>{lang === 'ar' ? 'دعوات انضمام مرسلة (في انتظار قبول الطلاب):' : 'Pending Sent Invitations (Awaiting Acceptance):'}</span>
                                                </h5>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {activeProject.pending_invitations.map(inv => (
                                                        <div key={inv.invitation_id} style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '0.75rem 1rem',
                                                            background: 'var(--surface-card)',
                                                            border: '1px dashed #f59e0b',
                                                            borderRadius: '10px',
                                                            gap: '10px'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    borderRadius: '50%',
                                                                    background: 'rgba(245, 158, 11, 0.15)',
                                                                    color: '#f59e0b',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontWeight: 700,
                                                                    fontSize: '0.85rem'
                                                                }}>
                                                                    {inv.full_name ? inv.full_name.charAt(0).toUpperCase() : 'S'}
                                                                </div>
                                                                <div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        <strong>{inv.full_name}</strong>
                                                                        {inv.student_id && <span className="cand-id">{inv.student_id}</span>}
                                                                    </div>
                                                                    <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                                        <Clock size={11} /> {lang === 'ar' ? 'طلب انضمام مرسل (في انتظار رد الطالب)' : 'Invitation sent (awaiting response)'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="btn-remove-member"
                                                                onClick={() => handleCancelInvitation(inv.invitation_id)}
                                                                disabled={invitingMember}
                                                                title={lang === 'ar' ? 'إلغاء الدعوة' : 'Cancel invitation'}
                                                            >
                                                                <X size={15} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Capacity Full Notification */}
                                        {isOwner && ((activeProject.team_members?.length || 1) + (activeProject.pending_invitations?.length || 0)) >= 5 && (
                                            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', fontWeight: 700 }}>
                                                <CheckCircle2 size={20} />
                                                <div>
                                                    <div>{lang === 'ar' ? 'اكتمل أعضاء فريق المشروع (5 من 5 طلاب)' : 'Team Capacity Reached (5 / 5 Members)'}</div>
                                                    <span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-muted)' }}>{lang === 'ar' ? 'تم الوصول للحد الأقصى لعدد الطلاب المسموح به لكل مشروع (بما في ذلك الدعوات المعلقة).' : 'The maximum team limit has been reached for this project (including pending invites).'}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Invite / Add Classmates Section (For Leader/Owner, if < 5) ── */}
                                        {isOwner && ((activeProject.team_members?.length || 1) + (activeProject.pending_invitations?.length || 0)) < 5 && (
                                            <div className="team-invite-box" ref={teamSearchRef}>
                                                <div className="invite-box-title">
                                                    <UserPlus size={18} className="text-primary" />
                                                    <h4>{lang === 'ar' ? 'إضافة زميل إلى الفريق' : 'Add Classmate to Team'}</h4>
                                                </div>

                                                <div className="invite-inputs-grid" style={{ gridTemplateColumns: '1fr' }}>
                                                    {/* Search Classmates with Autocomplete */}
                                                    <div className="invite-search-col" style={{ width: '100%' }}>
                                                        <label>{lang === 'ar' ? 'البحث عن زميل في الدورة بالاسم أو الرقم الجامعي لإرسال دعوة انضمام:' : 'Search Enrolled Classmate to Send Team Invitation:'}</label>
                                                        <div className="search-input-wrapper">
                                                            <Search size={16} className="search-icon" />
                                                            <input
                                                                type="text"
                                                                placeholder={lang === 'ar' ? 'ابحث بالاسم، الرقم الجامعي، أو البريد الإلكتروني...' : 'Search student by name, student ID, email...'}
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
                                                                            const hasPendingInv = cand.has_pending_invitation || activeProject.pending_invitations?.some(inv => (inv.user_id || inv.id) === cand.id);

                                                                            return (
                                                                                <div
                                                                                    key={cand.id}
                                                                                    className={`candidate-row-item ${isAlreadyInTeam || isAlreadySelected || hasPendingInv ? 'disabled' : ''}`}
                                                                                    onClick={() => {
                                                                                        if (!isAlreadyInTeam && !isAlreadySelected && !hasPendingInv) {
                                                                                            handleInviteTeamMember(cand.id);
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
                                                                                            <span className="cand-badge added"><Check size={12} /> {lang === 'ar' ? 'مضاف بالفريق' : 'In Team'}</span>
                                                                                        ) : hasPendingInv ? (
                                                                                            <span className="cand-badge busy" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                                                                                                <Clock size={12} /> {lang === 'ar' ? 'تمت الدعوة (معلقة)' : 'Invited (Pending)'}
                                                                                            </span>
                                                                                        ) : isAlreadyInTeam ? (
                                                                                            <span className="cand-badge busy"><AlertTriangle size={12} /> {lang === 'ar' ? 'في فريق آخر' : 'In Another Team'}</span>
                                                                                        ) : (
                                                                                            <button type="button" className="btn-add-cand" disabled={invitingMember}>
                                                                                                <UserPlus size={13} />
                                                                                                {lang === 'ar' ? 'إرسال دعوة' : 'Send Invite'}
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

                                                                    {(String(d.trainee_id) === String(user?.id) || isOwner || isAdmin) && (
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
                EVALUATOR VIEW (Trainers & Admins) — SECTIONED BY COURSE
            ════════════════════════════════════════════════════════════════ */}
            {isEvaluator && (
                <>
                    {/* Course Quick-Switch Tab Pills */}
                    {!isEmbedded && !effectiveCourseId && (
                        <div className="course-quick-tabs">
                            <button
                                type="button"
                                className={`course-quick-tab ${selectedCourse === '' ? 'active' : ''}`}
                                onClick={() => setSelectedCourse('')}
                            >
                                <Layers size={15} />
                                <span>{lang === 'ar' ? 'جميع الدورات' : 'All Courses'}</span>
                                <span className="count-badge">{filteredProjects.length}</span>
                            </button>
                            {courses.map(c => {
                                const cProjectsCount = projects.filter(p => String(p.course_id) === String(c.id)).length;
                                return (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className={`course-quick-tab ${String(selectedCourse) === String(c.id) ? 'active' : ''}`}
                                        onClick={() => setSelectedCourse(String(c.id))}
                                    >
                                        <BookOpen size={14} />
                                        <span>{c.name}</span>
                                        <span className="count-badge">{cProjectsCount}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

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
                            {!isEmbedded && !effectiveCourseId && (
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
                            )}

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

                    {/* Projects Content Grouped by Course */}
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
                    ) : (() => {
                        const targetCourses = effectiveCourseId
                            ? (courses.filter(c => String(c.id) === String(effectiveCourseId)).length > 0
                                ? courses.filter(c => String(c.id) === String(effectiveCourseId))
                                : [{ id: effectiveCourseId, name: (activeProject?.course_name || (lang === 'ar' ? 'الدورة التدريبية' : 'Course')) }])
                            : (selectedCourse
                                ? courses.filter(c => String(c.id) === String(selectedCourse))
                                : courses);

                        const orphanProjects = effectiveCourseId
                            ? []
                            : filteredProjects.filter(p => !targetCourses.some(c => String(c.id) === String(p.course_id)));

                        return (
                            <div className="course-sections-list">
                                {targetCourses.map(c => {
                                    const cProjects = filteredProjects.filter(p => String(p.course_id) === String(c.id));
                                    if (cProjects.length === 0 && !selectedCourse) return null;

                                    const submittedCount = cProjects.filter(p => p.status === 'submitted').length;
                                    const approvedCount = cProjects.filter(p => p.status === 'approved').length;
                                    const votingCount = cProjects.filter(p => p.status === 'voting').length;

                                    return (
                                        <div key={c.id} className="course-section-container">
                                            <div className="course-section-header">
                                                <div className="course-section-title-wrap">
                                                    <BookOpen size={20} style={{ color: 'var(--primary)' }} />
                                                    <h3 className="course-section-title">{c.name}</h3>
                                                    {c.course_type === 'external' ? (
                                                        <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <Building2 size={12} />
                                                            {lang === 'ar' ? 'تدريب خارجي' : 'External'}
                                                        </span>
                                                    ) : c.course_type === 'internal' ? (
                                                        <span className="badge" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <GraduationCap size={12} />
                                                            {lang === 'ar' ? 'تدريب داخلي' : 'Internal'}
                                                        </span>
                                                    ) : (
                                                        <span className="badge" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                            <GraduationCap size={12} />
                                                            <Building2 size={12} />
                                                            {lang === 'ar' ? 'داخلي وخارجي' : 'Both Modes'}
                                                        </span>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                    <div className="course-section-stats-row">
                                                        <span className="course-stat-mini-pill">
                                                            <strong>{cProjects.length}</strong> {lang === 'ar' ? 'مشاريع' : 'Projects'}
                                                        </span>
                                                        {submittedCount > 0 && (
                                                            <span className="course-stat-mini-pill" style={{ color: '#d97706', borderColor: 'rgba(217, 119, 6, 0.3)' }}>
                                                                <Clock size={12} /> {submittedCount} {lang === 'ar' ? 'مراجعة' : 'Review'}
                                                            </span>
                                                        )}
                                                        {votingCount > 0 && (
                                                            <span className="course-stat-mini-pill" style={{ color: '#8b5cf6', borderColor: 'rgba(139, 92, 246, 0.3)' }}>
                                                                <Vote size={12} /> {votingCount} {lang === 'ar' ? 'تصويت' : 'Voting'}
                                                            </span>
                                                        )}
                                                        {approvedCount > 0 && (
                                                            <span className="course-stat-mini-pill" style={{ color: '#16a34a', borderColor: 'rgba(22, 163, 74, 0.3)' }}>
                                                                <CheckCircle2 size={12} /> {approvedCount} {lang === 'ar' ? 'معتمد' : 'Approved'}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <Link to={`/courses/${c.id}`} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem' }}>
                                                        <span>{lang === 'ar' ? 'إدارة الدورة' : 'Manage Course'}</span>
                                                        <ArrowRight size={13} />
                                                    </Link>
                                                </div>
                                            </div>

                                            {cProjects.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                                                    {lang === 'ar' ? 'لا توجد مشاريع مسجلة في هذه الدورة تطابق الفلاتر.' : 'No projects found in this course matching current filters.'}
                                                </div>
                                            ) : (
                                                <div className="projects-grid">
                                                    {cProjects.map(project => (
                                                        <div key={project.id} className="project-card">
                                                            <div className="project-card-header">
                                                                <div className="trainee-meta">
                                                                    <User size={16} className="trainee-icon" />
                                                                    <div>
                                                                        <h4 className="trainee-name">{project.trainee_name || 'Trainee'}</h4>
                                                                        {project.student_id && <span className="student-id-badge">{project.student_id}</span>}
                                                                    </div>
                                                                </div>
                                                                {getStatusBadge(project.status, Number(project.is_golden_pass) === 1)}
                                                            </div>

                                                            <div className="project-card-body">
                                                                <h3 className="project-title">
                                                                    {project.title}
                                                                </h3>
                                                                <div className="course-tag">
                                                                    <BookOpen size={13} />
                                                                    <span>{project.course_name}</span>
                                                                </div>

                                                                <p className="project-desc">
                                                                    {project.description || project.problem_statement || (lang === 'ar' ? 'لا يوجد وصف متاح' : 'No description provided')}
                                                                </p>

                                                                {project.training_type !== 'external' && project.course_type !== 'external' && project.team_members && project.team_members.length > 1 && (
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
                                                                                    fontWeight: 600,
                                                                                    display: 'inline-flex',
                                                                                    alignItems: 'center',
                                                                                    gap: '3px'
                                                                                }}
                                                                            >
                                                                                {m.role === 'leader' && <Crown size={11} />}
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
                                                                        onClick={() => handleDownloadProjectDocx(project.id, project.title)}
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
                                                                            setEvalError('');
                                                                            setEvalSuccess('');
                                                                            setError('');
                                                                            fetchIdeaDocs(project.id);
                                                                        }}
                                                                    >
                                                                        {lang === 'ar' ? 'مراجعة وتقييم' : 'Review & Evaluate'}
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => handleDeleteIdea(e, project.id)}
                                                                        className="btn btn-sm btn-outline"
                                                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#ef4444', borderColor: '#fca5a5', padding: '0.35rem 0.55rem' }}
                                                                        title={lang === 'ar' ? 'حذف فكرة المشروع' : 'Delete Project Idea'}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {orphanProjects.length > 0 && (
                                    <div className="course-section-container">
                                        <div className="course-section-header">
                                            <div className="course-section-title-wrap">
                                                <BookOpen size={20} style={{ color: 'var(--primary)' }} />
                                                <h3 className="course-section-title">{lang === 'ar' ? 'مشاريع عامة أخرى' : 'Other Submissions'}</h3>
                                            </div>
                                        </div>
                                        <div className="projects-grid">
                                            {orphanProjects.map(project => (
                                                <div key={project.id} className="project-card">
                                                    <div className="project-card-header">
                                                        <div className="trainee-meta">
                                                            <User size={16} className="trainee-icon" />
                                                            <div>
                                                                <h4 className="trainee-name">{project.trainee_name || 'Trainee'}</h4>
                                                                {project.student_id && <span className="student-id-badge">{project.student_id}</span>}
                             								</div>
                                                        </div>
                                                        {getStatusBadge(project.status, Number(project.is_golden_pass) === 1)}
                                                    </div>
                                                    <div className="project-card-body">
                                                        <h3 className="project-title">{project.title}</h3>
                                                        <p className="project-desc">{project.description || project.problem_statement || ''}</p>
                                                    </div>
                                                    <div className="project-card-footer">
                                                        <button
                                                            className="btn btn-primary btn-sm"
                                                            onClick={() => {
                                                                setActiveProject(project);
                                                                setFeedback(project.feedback || '');
                                                                setEvalError('');
                                                                setEvalSuccess('');
                                                                setError('');
                                                                fetchIdeaDocs(project.id);
                                                            }}
                                                        >
                                                            {lang === 'ar' ? 'مراجعة وتقييم' : 'Review & Evaluate'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
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
                                    <h2>{activeProject.title}</h2>
                                    {getStatusBadge(activeProject.status, Number(activeProject.is_golden_pass) === 1)}
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
                                    onClick={() => handleDownloadProjectDocx(activeProject.id, activeProject.title)}
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

                            {/* Supervisor Evaluation Controls Sidebar (Evaluators) or Status Summary (Trainees) */}
                            <div className="eval-modal-side-pane">
                                {isEvaluator ? (
                                    <div className="eval-sidebar-card">
                                        <div className="eval-sidebar-header">
                                            <Award size={22} className="text-primary" />
                                            <div>
                                                <h3>{lang === 'ar' ? 'لوحة تقييم واعتماد المشرف' : 'Supervisor Evaluation'}</h3>
                                                <p>{lang === 'ar' ? 'اتخاذ القرار الأكاديمي وتوجيه الملاحظات' : 'Review deliverables & decide'}</p>
                                            </div>
                                        </div>

                                        {evalSuccess && <div className="alert alert-success">{evalSuccess}</div>}
                                        {evalError && <div className="alert alert-error">{evalError}</div>}

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

                                            <button
                                                type="button"
                                                className="btn-eval-golden-pass"
                                                disabled={evaluating}
                                                onClick={() => handleEvaluate('golden_pass')}
                                                title={lang === 'ar' ? 'منح الكارت الذهبي وتأهيل المشروع مباشرةً للوحة الشرف والمتصدرين' : 'Award Golden Pass & Direct Fast-Track to Leaderboard'}
                                            >
                                                <Sparkles size={20} className="sparkle-gold-icon" />
                                                <div>
                                                    <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                        {lang === 'ar' ? 'منح الكارت الذهبي (Golden Pass)' : 'Award Golden Pass'}
                                                    </strong>
                                                    <span>
                                                        {lang === 'ar' ? 'تأهيل مباشر وحصري للوحة الشرف والمتصدرين' : 'Direct Fast-Track to Official Leaderboard'}
                                                    </span>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="eval-sidebar-card">
                                        <div className="eval-sidebar-header">
                                            <Shield size={22} className="text-primary" />
                                            <div>
                                                <h3>{lang === 'ar' ? 'حالة مراجعة المشروع' : 'Project Review Status'}</h3>
                                                <p>{lang === 'ar' ? 'متابعة ملاحظات وقرار المشرف الأكاديمي' : 'Supervisor review status & notes'}</p>
                                            </div>
                                        </div>

                                        <div style={{ padding: '1rem', background: 'var(--bg-2)', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                                                <Clock size={16} className="text-primary" />
                                                <strong style={{ fontSize: '0.9rem' }}>
                                                    {lang === 'ar' ? 'الحالة الحالية:' : 'Current Status:'}
                                                </strong>
                                                <span className={`badge badge-${activeProject?.status || 'submitted'}`}>
                                                    {activeProject?.status ? activeProject.status.replace(/_/g, ' ') : 'Under Review'}
                                                </span>
                                            </div>

                                            {activeProject?.feedback ? (
                                                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
                                                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                                        {lang === 'ar' ? 'ملاحظات وتوجيهات المشرف:' : 'Supervisor Notes & Guidance:'}
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                                        {activeProject.feedback}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    {lang === 'ar' 
                                                        ? 'المقترح قيد المراجعة حالياً من قبل المشرف الأكاديمي. ستظهر الملاحظات والتوجيهات هنا فور اعتمادها.' 
                                                        : 'Your proposal is currently under review by your academic supervisor. Feedback will appear here.'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
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

                        {/* ── Mode Selection Tabs (Unified 3 Options) ── */}
                        <div className="catalog-mode-tabs" style={{ margin: '0.75rem 1.5rem 1rem 1.5rem', flexWrap: 'wrap', gap: '8px' }}>
                            {/* Option 1: Select from Pre-defined Proposals */}
                            <button
                                type="button"
                                className={`catalog-mode-tab ${submissionTab === 'catalog' ? 'active' : ''}`}
                                onClick={() => { setSubmissionTab('catalog'); setError(''); }}
                                style={{ minWidth: '220px' }}
                            >
                                <BookOpen size={16} />
                                <span>
                                    {isExternalTrainee 
                                        ? (lang === 'ar' ? 'اختيار من دليل المشاريع (24 فكرة معتمدة)' : 'Select Pre-defined Idea (24 Ideas)')
                                        : (lang === 'ar' ? 'اختيار من دليل المشاريع (64 فكرة معتمدة)' : 'Official Projects Catalog (64 Ideas)')}
                                </span>
                                <span className="catalog-instant-badge" style={{ padding: '1px 6px', fontSize: '0.68rem' }}>
                                    {isExternalTrainee ? '24' : '64'}
                                </span>
                            </button>

                            {/* Option 2: Create My Own Idea */}
                            <button
                                type="button"
                                className={`catalog-mode-tab ${submissionTab === 'custom' ? 'active' : ''}`}
                                onClick={() => { setSubmissionTab('custom'); setError(''); }}
                                style={{ minWidth: '200px' }}
                            >
                                <Sparkles size={16} />
                                <span>{lang === 'ar' ? 'إنشاء فكرتي الخاصة (ERTH AI)' : 'Create My Own Idea (ERTH AI)'}</span>
                            </button>

                            {/* Option 3: Upload Completed Proposal / Documentation */}
                            <button
                                type="button"
                                className={`catalog-mode-tab ${submissionTab === 'external_project' ? 'active' : ''}`}
                                onClick={() => { setSubmissionTab('external_project'); setError(''); }}
                                style={{ minWidth: '220px' }}
                            >
                                <FileUp size={16} />
                                <span>{lang === 'ar' ? 'رفع مقترح / توثيق مكتمل' : 'Upload Completed Proposal File'}</span>
                                <span className="catalog-instant-badge" style={{ padding: '1px 6px', fontSize: '0.68rem', background: 'rgba(16,185,129,0.1)', color: '#059669', borderColor: 'rgba(16,185,129,0.25)' }}>
                                    {lang === 'ar' ? 'ملف / Word / PDF' : 'Word / PDF File'}
                                </span>
                            </button>
                        </div>

                        {/* ═══════════════════════════════════════════════════════════════
                            OPTION 1: PRE-DEFINED PROPOSALS CATALOG (24 Software for External, 64 for Internal)
                        ════════════════════════════════════════════════════════════════ */}
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
                                            onChange={e => {
                                                const val = e.target.value;
                                                setSubmitCourseId(val);
                                                fetchCatalogProjects(true, val);
                                            }}
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
                                        <span>
                                            {isExternalTrainee 
                                                ? (lang === 'ar' ? 'دليل مشاريع البرمجيات والذكاء الاصطناعي (24 فكرة معتمدة)' : '24 Approved Software & AI Proposals')
                                                : (lang === 'ar' ? 'دليل الأفكار المعتمد رسمياً (64 فكرة معتمدة)' : 'Official Pre-Approved Catalog (64 Ideas)')}
                                        </span>
                                    </div>
                                </div>

                                <div className="catalog-filter-bar" style={{ marginBottom: '0.75rem' }}>
                                    <div className="catalog-category-pills">
                                        {isExternalTrainee ? (
                                            <button
                                                type="button"
                                                className="catalog-category-pill active"
                                            >
                                                {lang === 'ar' ? 'مشاريع البرمجيات والذكاء الاصطناعي (24 فكرة)' : 'Software & AI Projects (24 Ideas)'}
                                            </button>
                                        ) : (
                                            (() => {
                                                const catCounts = {
                                                    all: catalogProjects.length || 64,
                                                    software: catalogProjects.filter(p => String(p.category || '').toLowerCase() === 'software').length || 24,
                                                    yanshee: catalogProjects.filter(p => String(p.category || '').toLowerCase() === 'yanshee').length || 15,
                                                    nao: catalogProjects.filter(p => String(p.category || '').toLowerCase() === 'nao').length || 15,
                                                    integrated: catalogProjects.filter(p => String(p.category || '').toLowerCase() === 'integrated').length || 10,
                                                };
                                                return [
                                                    { key: 'all', labelEn: `All (${catCounts.all})`, labelAr: `الكل (${catCounts.all})` },
                                                    { key: 'software', labelEn: `Software / AI (${catCounts.software})`, labelAr: `برمجيات وذكاء اصطناعي (${catCounts.software})` },
                                                    { key: 'yanshee', labelEn: `Yanshee Robots (${catCounts.yanshee})`, labelAr: `روبوت يانشي (${catCounts.yanshee})` },
                                                    { key: 'nao', labelEn: `NAO Robots (${catCounts.nao})`, labelAr: `روبوت ناو (${catCounts.nao})` },
                                                    { key: 'integrated', labelEn: `Integrated (${catCounts.integrated})`, labelAr: `مشاريع مدمجة (${catCounts.integrated})` },
                                                ].map(tab => (
                                                    <button
                                                        key={tab.key}
                                                        type="button"
                                                        className={`catalog-category-pill ${catalogCategory === tab.key ? 'active' : ''}`}
                                                        onClick={() => setCatalogCategory(tab.key)}
                                                    >
                                                        {lang === 'ar' ? tab.labelAr : tab.labelEn}
                                                    </button>
                                                ));
                                            })()
                                        )}
                                    </div>

                                    <div className="catalog-search-box">
                                        <Search size={15} />
                                        <input
                                            type="text"
                                            placeholder={isExternalTrainee ? (lang === 'ar' ? 'بحث في مشاريع البرمجيات والذكاء الاصطناعي...' : 'Search 24 Software & AI projects...') : (lang === 'ar' ? 'بحث في دليل المشاريع الـ 64...' : 'Search 64 projects catalog...')}
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
                                            {isExternalTrainee 
                                                ? (lang === 'ar' ? 'جاري تحميل مقترحات البرمجيات المعتمدة...' : 'Loading approved software proposals...')
                                                : (lang === 'ar' ? 'جاري تحميل دليل المشاريع الـ 64 المعتمدة...' : 'Loading 64 official project ideas...')}
                                        </p>
                                    </div>
                                ) : (() => {
                                    const filtered = catalogProjects.filter(p => {
                                        const pCat = String(p.category || '').trim().toLowerCase();
                                        if (isExternalTrainee && pCat !== 'software') return false;
                                        if (!isExternalTrainee && catalogCategory !== 'all' && pCat !== catalogCategory.toLowerCase()) return false;
                                        if (catalogSearch.trim()) {
                                            const q = catalogSearch.toLowerCase();
                                            return (p.title || '').toLowerCase().includes(q) ||
                                                (p.skills || '').toLowerCase().includes(q) ||
                                                (p.level || '').toLowerCase().includes(q) ||
                                                pCat.includes(q);
                                        }
                                        return true;
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <div className="empty-state" style={{ padding: '2rem 0' }}>
                                                <AlertCircle size={32} className="text-muted" />
                                                <p>{lang === 'ar' ? 'لا توجد مشاريع تطابق البحث' : 'No projects matched your search'}</p>
                                            </div>
                                        );
                                    }

                                    const getCatBadgeLabel = (catKey, rawCat) => {
                                        switch (catKey) {
                                            case 'software': return lang === 'ar' ? 'برمجيات وذكاء اصطناعي' : 'Software / AI';
                                            case 'yanshee': return lang === 'ar' ? 'روبوت يانشي' : 'Yanshee';
                                            case 'nao': return lang === 'ar' ? 'روبوت ناو' : 'NAO';
                                            case 'integrated': return lang === 'ar' ? 'مشاريع مدمجة' : 'Integrated';
                                            default: return rawCat || catKey;
                                        }
                                    };

                                    return (
                                        <div className="catalog-grid-64" style={{ flex: 1, paddingRight: '4px' }}>
                                            {filtered.map(proj => {
                                                const isSelected = selectedCatalogId === proj.id;
                                                const isTaken = proj.is_taken && !proj.taken_by_me;
                                                const catKey = String(proj.category || '').toLowerCase();

                                                return (
                                                    <div 
                                                        key={proj.id} 
                                                        className={`catalog-item-card ${isSelected ? 'selected' : ''} ${isTaken ? 'catalog-item-card--taken' : ''}`}
                                                        onClick={() => !isTaken && !selectingCatalog && handleSelectCatalogIdea(proj)}
                                                    >
                                                        <div>
                                                            <div className="catalog-item-top">
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <span className="catalog-item-id">#{proj.id}</span>
                                                                    <span className={`category-tag ${catKey}`}>
                                                                        {getCatBadgeLabel(catKey, proj.category)}
                                                                    </span>
                                                                </div>
                                                                {isTaken ? (
                                                                    <span className="catalog-taken-badge">
                                                                        <Lock size={10} />
                                                                        <span>{lang === 'ar' ? 'محجوزة مسبقاً' : 'Reserved'}</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="catalog-diff-badge" style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                                                                        {proj.level || 'Intermediate'}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-0, #0f172a)', lineHeight: 1.4 }}>
                                                                {proj.title}
                                                            </h4>

                                                            {proj.abstract && (
                                                                <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-2, #64748b)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                                    {proj.abstract}
                                                                </p>
                                                            )}

                                                            {proj.skills && (
                                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                                                                    {proj.skills.split(',').map((skill, sIdx) => (
                                                                        <span 
                                                                            key={sIdx} 
                                                                            style={{ 
                                                                                fontSize: '0.7rem', 
                                                                                padding: '2px 7px', 
                                                                                borderRadius: '6px', 
                                                                                background: 'var(--bg-subtle, #f1f5f9)', 
                                                                                color: 'var(--text-1, #475569)', 
                                                                                border: '1px solid var(--border, #e2e8f0)', 
                                                                                fontWeight: 600 
                                                                            }}
                                                                        >
                                                                            {skill.trim()}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div style={{ marginTop: '0.75rem' }}>
                                                            {isTaken ? (
                                                                <button
                                                                    type="button"
                                                                    className="btn-select-catalog-item disabled"
                                                                    disabled
                                                                >
                                                                    <Lock size={13} />
                                                                    <span>{lang === 'ar' ? 'فكرة محجوزة مسبقاً' : 'Idea Reserved'}</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="btn-select-catalog-item"
                                                                    style={isSelected ? { background: '#10b981', color: '#ffffff', borderColor: '#10b981' } : {}}
                                                                    disabled={selectingCatalog}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSelectCatalogIdea(proj);
                                                                    }}
                                                                >
                                                                    {isSelected ? <Check size={13} /> : <Plus size={13} />}
                                                                    <span>{isSelected ? (lang === 'ar' ? 'تم اختيار المشروع' : 'Selected Project') : (lang === 'ar' ? 'اختيار فوري للمشروع' : 'Select Project')}</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* ═══════════════════════════════════════════════════════════════
                            OPTION 2: CREATE MY OWN IDEA (ERTH AI)
                        ════════════════════════════════════════════════════════════════ */}
                        {submissionTab === 'custom' && (
                            <form onSubmit={handleSubmitIdea} className="custom-idea-form" style={{ padding: '0.75rem 1.75rem 1.5rem', maxHeight: '72vh', overflowY: 'auto' }}>
                                {/* Track Suggestions for External Trainees (Web, Mobile, Cyber Security) */}
                                {isExternalTrainee && studentTrackKey !== 'ai' && TRACK_SUGGESTED_IDEAS[studentTrackKey] && (
                                    <div className="track-suggestions-box" style={{ marginBottom: '1rem' }}>
                                        <div className="track-suggestions-header">
                                            <strong>
                                                <Lightbulb size={16} />
                                                <span>
                                                    {lang === 'ar' 
                                                        ? `مقترحات أفكار لمسار ${trackLabelMap[studentTrackKey]?.ar || studentTrackKey} (اضغط للاختيار والتعبئة الفورية):`
                                                        : `Suggested Ideas for ${trackLabelMap[studentTrackKey]?.en || studentTrackKey} (Click to auto-fill title & description):`}
                                                </span>
                                            </strong>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', background: 'rgba(245,158,11,0.15)', padding: '2px 8px', borderRadius: '12px' }}>
                                                {TRACK_SUGGESTED_IDEAS[studentTrackKey].length} {lang === 'ar' ? 'أفكار مقترحة' : 'Ideas'}
                                            </span>
                                        </div>
                                        <div className="track-suggestions-grid">
                                            {TRACK_SUGGESTED_IDEAS[studentTrackKey].map((sug, sIdx) => {
                                                const sugTitle = lang === 'ar' ? (sug.titleAr || sug.title) : sug.title;
                                                const sugDesc = lang === 'ar' ? (sug.descAr || sug.desc) : sug.desc;
                                                const isCurrentMatch = submitTitleEn === sugTitle;

                                                return (
                                                    <button
                                                        key={sIdx}
                                                        type="button"
                                                        className={`track-suggestion-chip ${isCurrentMatch ? 'active' : ''}`}
                                                        onClick={() => handleApplyTrackSuggestion(sug)}
                                                    >
                                                        <strong>{sugTitle}</strong>
                                                        <p>{sugDesc}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="custom-form-grid" style={{ marginTop: '0.5rem' }}>
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
                                            placeholder={lang === 'ar' ? 'اكتب عنوان المشروع بدقة ووضوح...' : 'Enter the project title clearly...'}
                                        />
                                    </div>
                                </div>

                                <div className="custom-form-group">
                                    <label>{lang === 'ar' ? 'وصف ومستخلص المشروع (تفصيلي)' : 'Project Description / Abstract (Detailed)'} *</label>
                                    <textarea
                                        rows={4}
                                        required
                                        value={submitDescEn}
                                        onChange={e => setSubmitDescEn(e.target.value)}
                                        className="custom-form-textarea"
                                        placeholder={lang === 'ar' ? 'اكتب وصفاً مفصلاً لفكرة المشروع، أهدافه، المشكلة التي يحلها، والجمهور المستهدف...' : 'Write a detailed description explaining the project concept, objectives, targeted problem, and beneficiaries...'}
                                    />
                                </div>

                                {/* AI Proposal Generator Action Card */}
                                <div className="custom-ai-synthesis-card" style={{
                                    margin: '1rem 0 1.25rem 0',
                                    padding: '1.25rem',
                                    borderRadius: '14px',
                                    background: 'linear-gradient(135deg, rgba(0, 45, 86, 0.05) 0%, rgba(59, 130, 246, 0.1) 100%)',
                                    border: '1.5px solid rgba(59, 130, 246, 0.28)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '1.25rem',
                                    flexWrap: 'wrap'
                                }}>
                                    <div style={{ flex: '1 1 320px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.35rem' }}>
                                            <Cpu size={18} style={{ color: '#2563eb' }} />
                                            <strong style={{ fontSize: '0.95rem', color: 'var(--text-0)' }}>
                                                {lang === 'ar' ? 'المساعد الأكاديمي لتوليد المقترح بالذكاء الاصطناعي (7 فصول)' : 'AI Academic Proposal Generator (7 Chapters)'}
                                            </strong>
                                        </div>
                                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                                            {lang === 'ar'
                                                ? 'بناءً على العنوان والوصف التفصيلي المدخلين أعلاه، يقوم الذكاء الاصطناعي باستنباط التقنيات، والمشكلة، وبناء وتفصيل كافة الفصول الأكاديمية السبعة للمشروع.'
                                                : 'Based on the title and detailed description entered above, AI generates the tech stack, problem statement, and all 7 official academic chapters.'}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleGenerateAiProposal}
                                        disabled={generatingAi || !submitTitleEn.trim() || !submitDescEn.trim()}
                                        className="btn btn-primary"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '0.5rem',
                                            padding: '0.7rem 1.35rem',
                                            fontWeight: 700,
                                            fontSize: '0.88rem',
                                            borderRadius: '10px',
                                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                                            opacity: (!submitTitleEn.trim() || !submitDescEn.trim()) ? 0.6 : 1,
                                            cursor: (!submitTitleEn.trim() || !submitDescEn.trim()) ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {generatingAi ? <Loader2 className="spin" size={16} /> : <FileText size={16} />}
                                        <span>
                                            {generatingAi
                                                ? (lang === 'ar' ? 'جاري التوليد بالذكاء الاصطناعي...' : 'Generating Full Proposal...')
                                                : (lang === 'ar' ? 'توليد وتفصيل المقترح بالذكاء الاصطناعي' : 'Generate Full Proposal with AI')}
                                        </span>
                                    </button>
                                </div>

                                {selectedProposalData?.sections && selectedProposalData.sections.length > 0 && (
                                    <>
                                        <div style={{
                                            margin: '0.75rem 0 0.5rem 0',
                                            padding: '0.85rem 1.15rem',
                                            borderRadius: '10px',
                                            background: 'rgba(34, 197, 94, 0.08)',
                                            border: '1px solid rgba(34, 197, 94, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px'
                                        }}>
                                            <CheckCircle2 size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
                                            <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>
                                                {lang === 'ar'
                                                    ? 'تم بنجاح توليد وتفصيل الفصول الأكاديمية السبعة للمشروع ومطابقتها للتصدير والعرض!'
                                                    : 'All 7 academic chapters have been dynamically generated and synchronized for UI and Word export!'}
                                            </span>
                                        </div>

                                        {/* Academic Disclaimer Alert Box */}
                                        <div className="custom-ai-disclaimer-box" style={{
                                            margin: '0.5rem 0 1rem 0',
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
                                                <strong style={{ fontWeight: 700 }}>{lang === 'ar' ? 'تنويه: ' : 'Disclaimer: '}</strong>
                                                {lang === 'ar'
                                                    ? 'المحتوى المعروض تم توليده بواسطة الذكاء الاصطناعي كنموذج استرشادي، ويقع على عاتق الطالب مسؤولية مراجعته وتدقيقه قبل تقديمه للجهة الأكاديمية. المنصة غير مسؤولة عن أي أخطاء أو نواقص في التقرير النهائي.'
                                                    : 'The content displayed was generated by AI as an academic guideline model. It is the student\'s responsibility to review and refine it before academic submission. The platform assumes no liability for errors or omissions in the final report.'}
                                            </div>
                                        </div>
                                    </>
                                )}

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

                                {error && (
                                    <div className="alert alert-error" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="custom-form-actions" style={{ display: 'flex', justifyContent: (editingIdeaId || createdIdeaId) ? 'space-between' : 'flex-end', alignItems: 'center' }}>
                                    {(editingIdeaId || createdIdeaId) && (
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={(e) => handleDeleteIdea(e, editingIdeaId || createdIdeaId)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ef4444', borderColor: '#fca5a5' }}
                                        >
                                            <Trash2 size={15} />
                                            <span>{lang === 'ar' ? 'حذف المشروع' : 'Delete Project'}</span>
                                        </button>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button type="button" className="btn btn-ghost" onClick={() => setShowSubmitModal(false)}>
                                            {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                        </button>
                                        <button type="submit" className="btn btn-primary btn-submit-project" disabled={submittingIdea}>
                                            {submittingIdea ? <Loader2 className="spin" size={16} /> : (isExternalTrainee ? <Sparkles size={16} /> : <CheckCircle2 size={16} />)}
                                            <span>
                                                {submittingIdea 
                                                    ? (lang === 'ar' ? 'جاري توليد المقترح بالذكاء الاصطناعي وتقديم المشروع...' : 'Generating Full AI Proposal & Submitting...') 
                                                    : (isExternalTrainee 
                                                        ? (lang === 'ar' ? 'تقديم المشروع (توليد المقترح بالذكاء الاصطناعي)' : 'Submit Project Proposal')
                                                        : (lang === 'ar' ? 'تقديم الفكرة واعتمادها' : 'Submit Project Proposal'))}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {/* ═══════════════════════════════════════════════════════════════
                            OPTION 3: UPLOAD COMPLETED PROPOSAL / DOCUMENTATION FILE
                        ════════════════════════════════════════════════════════════════ */}
                        {submissionTab === 'external_project' && (
                            <div className="custom-idea-form" style={{ padding: '0.85rem 1.75rem 1.5rem', maxHeight: '72vh', overflowY: 'auto' }}>
                                <div className="custom-ai-hero-box" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(5,150,105,0.08) 100%)', border: '1.5px solid rgba(16,185,129,0.25)' }}>
                                    <div className="custom-ai-hero-header">
                                        <FileUp size={18} style={{ color: '#059669' }} />
                                        <strong style={{ color: '#065f46' }}>
                                            {lang === 'ar' ? 'رفع وتوثيق ملف مقترح المشروع (قالب Word / PDF)' : 'Upload Completed Project Proposal / Documentation (Word / PDF)'}
                                        </strong>
                                    </div>
                                    <p className="custom-ai-hero-desc" style={{ color: '#047857', lineHeight: 1.5 }}>
                                        {lang === 'ar'
                                            ? 'خصص هذا الخيار لرفع ملف المقترح أو التوثيق الكامل مباشرة، سواء قمت بتعبئة قالب Word الجامعي المعتمد، أو كان لديك توثيق مشروع أنجزته مسبقاً خارج المنصة.'
                                            : 'Use this option to directly upload your completed proposal or project documentation file (Word template or PDF) completed offline or during field training.'}
                                    </p>
                                </div>

                                <div className="custom-form-grid">
                                    <div className="custom-form-group">
                                        <label>{lang === 'ar' ? 'الدورة التدريبية المستهدفة' : 'Target Training Course'} *</label>
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
                                            value={externalTitle}
                                            onChange={e => setExternalTitle(e.target.value)}
                                            className="custom-form-input"
                                            placeholder={lang === 'ar' ? 'اكتب عنوان المشروع أو سيتم تعيينه تلقائياً من اسم الملف...' : 'Enter project title or auto-filled from uploaded file...'}
                                        />
                                    </div>
                                </div>

                                <div className="custom-form-group">
                                    <label>{lang === 'ar' ? 'ملخص / نبذة مختصرة عن المشروع (اختياري)' : 'Brief Summary / Abstract (Optional)'}</label>
                                    <textarea
                                        rows={2}
                                        value={externalAbstract}
                                        onChange={e => setExternalAbstract(e.target.value)}
                                        className="custom-form-textarea"
                                        placeholder={lang === 'ar' ? 'نبذة موجزة توضح فكرة المشروع ومخرجاته...' : 'Brief summary describing the project idea and primary outcomes...'}
                                    />
                                </div>

                                <div className="custom-form-grid">
                                    <div className="custom-form-group">
                                        <label>{lang === 'ar' ? 'جهة / شركة التدريب الخارجي (اختياري)' : 'Company / Training Provider (Optional)'}</label>
                                        <input
                                            type="text"
                                            value={externalCompany}
                                            onChange={e => setExternalCompany(e.target.value)}
                                            className="custom-form-input"
                                            placeholder={lang === 'ar' ? 'اسم جهة التدريب أو الشركة...' : 'Company or Training Provider name...'}
                                        />
                                    </div>

                                    <div className="custom-form-group">
                                        <label>{lang === 'ar' ? 'رابط المشروع / المستودع الرقمي (اختياري)' : 'Project Repository / Live Link (Optional)'}</label>
                                        <input
                                            type="url"
                                            value={externalLink}
                                            onChange={e => setExternalLink(e.target.value)}
                                            className="custom-form-input"
                                            placeholder="https://github.com/... or https://..."
                                        />
                                    </div>
                                </div>

                                {/* Dedicated File Upload Box */}
                                <div className="custom-form-group" style={{ marginTop: '0.4rem' }}>
                                    <label style={{ fontWeight: 800, fontSize: '0.88rem', color: '#1e293b' }}>
                                        {lang === 'ar' ? 'ملف المقترح أو التوثيق الأكاديمي (.docx / .doc / .pdf / .zip) *' : 'Proposal / Documentation File (.docx / .doc / .pdf / .zip) *'}
                                    </label>
                                    <div className="file-dropzone-box" style={{ padding: '1.75rem 1rem', background: '#f8fafc', border: externalFile ? '2px solid #10b981' : '2px dashed #cbd5e1', borderRadius: '14px', textAlign: 'center', transition: 'all 0.2s' }}>
                                        <input
                                            type="file"
                                            accept=".docx,.doc,.pdf,.zip"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setExternalFile(file);
                                                    if (!externalTitle.trim()) {
                                                        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
                                                        setExternalTitle(cleanName);
                                                    }
                                                }
                                            }}
                                        />
                                        <FileUp size={36} style={{ color: externalFile ? '#10b981' : '#64748b', margin: '0 auto 8px auto', display: 'block' }} />
                                        {externalFile ? (
                                            <div>
                                                <strong style={{ color: '#059669', display: 'block', fontSize: '0.98rem', fontWeight: 800 }}>✓ {externalFile.name}</strong>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px', display: 'block' }}>({(externalFile.size / (1024 * 1024)).toFixed(2)} MB) — {lang === 'ar' ? 'جاهز للرفع والمزامنة' : 'Ready to upload and sync'}</span>
                                            </div>
                                        ) : (
                                            <div>
                                                <p style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: '#1e293b' }}>
                                                    {lang === 'ar' ? 'اضغط لاختيار ملف المقترح أو اسحبه هنا' : 'Click to select proposal file or drag and drop here'}
                                                </p>
                                                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                                                    {lang === 'ar' ? 'يقبل ملفات Word (.docx) أو PDF أو ZIP (حتى 35 ميجابايت)' : 'Accepts Word (.docx), PDF, or ZIP (Up to 35MB)'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {error && (
                                    <div className="alert alert-error" style={{ margin: '0.75rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="custom-form-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', flexWrap: 'wrap', gap: '10px' }}>
                                    <button type="button" className="btn btn-ghost" onClick={() => setShowSubmitModal(false)}>
                                        {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                    </button>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            disabled={savingExternalDraft || submittingExternal}
                                            onClick={handleSaveExternalDraft}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.65rem 1.25rem', fontWeight: 700 }}
                                        >
                                            {savingExternalDraft ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
                                            <span>{savingExternalDraft ? (lang === 'ar' ? 'جاري الحفظ كمسودة...' : 'Saving Draft...') : (lang === 'ar' ? 'حفظ كمسودة' : 'Save as Draft')}</span>
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            disabled={submittingExternal || savingExternalDraft}
                                            onClick={handleSubmitExternalProject}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0.65rem 1.45rem', fontWeight: 700, background: '#059669', borderColor: '#059669' }}
                                        >
                                            {submittingExternal ? <Loader2 className="spin" size={15} /> : <CheckCircle2 size={15} />}
                                            <span>{submittingExternal ? (lang === 'ar' ? 'جاري رفع الملف وتقديم المقترح...' : 'Uploading & Submitting...') : (lang === 'ar' ? 'تقديم المقترح والملف' : 'Submit Proposal File')}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
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
