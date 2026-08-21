import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import {
    Award, CheckCircle2, XCircle, AlertCircle, Clock, FileText,
    Users, Settings, Plus, Trash2, Edit3, MessageSquare, Download,
    GraduationCap, Building2, RefreshCw, UserCheck, Save, Search,
    Loader2, Check, X, ShieldAlert, Sparkles, ChevronRight, BookOpen
} from 'lucide-react';
import CertificateModal from '../components/CertificateModal';
import './Evaluations.css';

export default function Evaluations() {
    const toast = useToast();
    const { lang } = useI18n();
    const { user, profile } = useAuth();
    const role = (user?.role || profile?.role || 'trainee').toLowerCase();
    const isAdmin = !!(user?.is_admin || role === 'admin' || profile?.is_admin);
    const staffRoles = ['trainer', 'professor', 'ta', 'lecturer', 'supervisor', 'instructor', 'evaluator'];
    const isTrainer = isAdmin || staffRoles.includes(role);
    const isTrainee = !isTrainer;

    const authHeaders = (extra = {}) => ({
        ...extra,
        ...(user?.id ? { 'X-User-Id': String(user.id), 'Authorization': `Bearer ${user.id}` } : {})
    });

    const [searchParams, setSearchParams] = useSearchParams();
    const queryCourseId = searchParams.get('course_id') || '';

    const [courses, setCourses] = useState([]);
    const [selectedCourseId, setSelectedCourseId] = useState(queryCourseId);
    const [loadingCourses, setLoadingCourses] = useState(true);

    // Trainer subtab: 'grades' | 'criteria'
    const [trainerTab, setTrainerTab] = useState('grades');

    // Trainee Eval Data
    const [myEval, setMyEval] = useState(null);
    const [loadingMyEval, setLoadingMyEval] = useState(false);

    // Course Criteria (Rubrics)
    const [courseCriteria, setCourseCriteria] = useState([]);
    const [savingCriteria, setSavingCriteria] = useState(false);
    const [criteriaMsg, setCriteriaMsg] = useState('');

    // Trainer: All Trainees & Evals
    const [trainees, setTrainees] = useState([]);
    const [allEvals, setAllEvals] = useState([]);
    const [loadingTrainees, setLoadingTrainees] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Grading Modal State
    const [gradingTrainee, setGradingTrainee] = useState(null);
    const [gradingScores, setGradingScores] = useState({});
    const [gradingStatus, setGradingStatus] = useState('pass');
    const [gradingFeedback, setGradingFeedback] = useState('');
    const [submittingGrade, setSubmittingGrade] = useState(false);
    const [gradeError, setGradeError] = useState('');

    // Certificate Modal State
    const [showCertModal, setShowCertModal] = useState(false);
    const [certData, setCertData] = useState(null);
    const [issuingCertId, setIssuingCertId] = useState(null);
    const [confirmIssuing, setConfirmIssuing] = useState(false);

    const defaultRubrics = [
        { name: lang === 'ar' ? 'التنفيذ التقني والأكاديمي' : 'Technical Execution', weight: 40 },
        { name: lang === 'ar' ? 'العرض والمناقشة الشفهية' : 'Oral Presentation', weight: 20 },
        { name: lang === 'ar' ? 'توثيق مقترح المشروع' : 'Project Proposal Documentation', weight: 20 },
        { name: lang === 'ar' ? 'الالتزام والانضباط الميداني' : 'Attendance & Discipline', weight: 20 }
    ];

    // Load available courses
    useEffect(() => {
        fetchCourses();
    }, [isTrainer, user?.id]);

    const fetchCourses = async () => {
        setLoadingCourses(true);
        try {
            const res = await fetch('/api/training/courses/list.php', {
                credentials: 'include',
                headers: authHeaders()
            });
            const data = await res.json();
            if (res.ok) {
                const list = data.courses || [];
                setCourses(list);
                if (list.length > 0) {
                    const matched = list.find(c => String(c.id) === String(queryCourseId));
                    setSelectedCourseId(prev => (prev ? prev : (matched ? String(matched.id) : String(list[0].id))));
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingCourses(false);
        }
    };

    const handleCourseChange = (id) => {
        setSelectedCourseId(id);
        setSearchParams({ course_id: id });
    };

    // Load evaluation data when selectedCourseId changes
    useEffect(() => {
        if (isTrainee) {
            fetchMyEval(selectedCourseId);
            if (selectedCourseId) {
                fetchCourseCriteria(selectedCourseId);
            }
        } else if (selectedCourseId) {
            fetchCourseCriteria(selectedCourseId);
            fetchTraineesAndEvals(selectedCourseId);
        }
    }, [selectedCourseId, isTrainee, user?.id]);

    const fetchCourseCriteria = async (cId) => {
        if (!cId) return;
        try {
            const res = await fetch(`/api/training/criteria/list.php?course_id=${cId}`, {
                credentials: 'include',
                headers: authHeaders()
            });
            const data = await res.json();
            if (res.ok && data.criteria && data.criteria.length > 0) {
                setCourseCriteria(data.criteria);
            } else {
                setCourseCriteria(defaultRubrics);
            }
        } catch (e) {
            setCourseCriteria(defaultRubrics);
        }
    };

    const fetchMyEval = async (cId) => {
        setLoadingMyEval(true);
        try {
            const url = cId
                ? `/api/training/evaluations/get.php?course_id=${cId}`
                : '/api/training/evaluations/get.php';
            const res = await fetch(url, {
                credentials: 'include',
                headers: authHeaders()
            });
            const data = await res.json();
            if (res.ok && data.evaluation) {
                setMyEval(data.evaluation);
                if (data.evaluation.course_id && (!selectedCourseId || selectedCourseId !== String(data.evaluation.course_id))) {
                    setSelectedCourseId(String(data.evaluation.course_id));
                }
            } else {
                setMyEval(null);
            }
        } catch (e) {
            console.error(e);
            setMyEval(null);
        } finally {
            setLoadingMyEval(false);
        }
    };

    const fetchTraineesAndEvals = async (cId) => {
        if (!cId) return;
        setLoadingTrainees(true);
        try {
            const [tRes, eRes] = await Promise.all([
                fetch(`/api/training/enrollments/list.php?course_id=${cId}`, {
                    credentials: 'include',
                    headers: authHeaders()
                }),
                fetch(`/api/training/evaluations/list.php?course_id=${cId}`, {
                    credentials: 'include',
                    headers: authHeaders()
                })
            ]);
            const tData = await tRes.json();
            const eData = await eRes.json();
            if (tRes.ok) setTrainees(tData.trainees || []);
            if (eRes.ok) setAllEvals(eData.evaluations || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingTrainees(false);
        }
    };

    // Criteria management handlers
    const totalCriteriaWeight = courseCriteria.reduce((sum, c) => sum + (parseFloat(c.weight) || 0), 0);
    const isWeightValid = Math.abs(totalCriteriaWeight - 100) < 0.01;

    const handleAddCriterion = () => {
        setCourseCriteria([...courseCriteria, { name: '', weight: 10 }]);
    };

    const handleDeleteCriterion = (idx) => {
        if (courseCriteria.length <= 1) {
            toast?.warning(lang === 'ar' ? 'يجب أن يحتوي التقييم على معيار واحد على الأقل.' : 'At least one criterion is required.');
            return;
        }
        setCourseCriteria(courseCriteria.filter((_, i) => i !== idx));
    };

    const handleCriterionChange = (idx, field, val) => {
        const updated = [...courseCriteria];
        updated[idx] = { ...updated[idx], [field]: val };
        setCourseCriteria(updated);
    };

    const handleSaveCriteria = async () => {
        if (!isWeightValid) {
            toast?.warning(lang === 'ar' ? 'يجب أن يكون مجموع أوزان المعايير 100% بالضبط.' : 'Total weights must equal 100%');
            return;
        }
        setSavingCriteria(true);
        setCriteriaMsg('');
        try {
            const res = await fetch('/api/training/criteria/save.php', {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    course_id: selectedCourseId,
                    criteria: courseCriteria
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setCriteriaMsg(lang === 'ar' ? 'تم حفظ معايير التقييم بنجاح' : 'Criteria saved successfully');
                toast?.success(lang === 'ar' ? 'تم حفظ معايير التقييم بنجاح' : 'Criteria saved successfully');
                setTimeout(() => setCriteriaMsg(''), 4000);
            } else {
                toast?.error(data.error || 'Failed to save criteria');
            }
        } catch (e) {
            toast?.error('Connection error');
        } finally {
            setSavingCriteria(false);
        }
    };

    // Grading modal handlers
    const openGradingModal = (trainee) => {
        const targetTid = String(trainee.trainee_id || trainee.id || trainee.user_id || '');
        const existingEval = allEvals.find(ev => String(ev.trainee_id || ev.user_id || '') === targetTid);
        setGradingTrainee(trainee);
        setGradeError('');
        
        let initialScores = {};
        if (existingEval?.criteria_scores) {
            try {
                initialScores = typeof existingEval.criteria_scores === 'string'
                    ? JSON.parse(existingEval.criteria_scores)
                    : existingEval.criteria_scores;
            } catch (_) {}
        }

        courseCriteria.forEach(c => {
            if (initialScores[c.name] === undefined) {
                initialScores[c.name] = existingEval ? Math.round((parseFloat(existingEval.final_score) || 80) * (c.weight / 100)) : Math.round(c.weight * 0.85);
            }
        });

        setGradingScores(initialScores);
        setGradingStatus(existingEval?.status || 'pass');
        setGradingFeedback(existingEval?.feedback || '');
    };

    const computeTotalLiveScore = () => {
        return Object.values(gradingScores).reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
    };

    const handleSubmitGrade = async (e) => {
        e.preventDefault();
        if (!gradingTrainee || !selectedCourseId) return;

        const totalScore = computeTotalLiveScore();
        setSubmittingGrade(true);
        setGradeError('');

        try {
            const res = await fetch('/api/training/evaluations/submit.php', {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    course_id: selectedCourseId,
                    trainee_id: gradingTrainee.trainee_id || gradingTrainee.id || gradingTrainee.user_id,
                    status: gradingStatus,
                    final_score: totalScore,
                    feedback: gradingFeedback,
                    criteria_scores: gradingScores
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setGradingTrainee(null);
                fetchTraineesAndEvals(selectedCourseId);
                toast?.success(lang === 'ar' ? 'تم حفظ التقييم بنجاح' : 'Evaluation saved successfully');
            } else {
                setGradeError(data.error || (lang === 'ar' ? 'فشل حفظ التقييم' : 'Failed to save evaluation'));
            }
        } catch (e) {
            setGradeError(lang === 'ar' ? 'حدث خطأ في الاتصال' : 'Connection error');
        } finally {
            setSubmittingGrade(false);
        }
    };

    // Certificate handlers
    const handleViewCertificate = async (traineeId, traineeName) => {
        setIssuingCertId(traineeId);
        const currentCourse = courses.find(c => String(c.id) === String(selectedCourseId));
        try {
            const res = await fetch(`/api/training/certificates/get.php?course_id=${selectedCourseId}&trainee_id=${traineeId}`, {
                credentials: 'include',
                headers: authHeaders()
            });
            const data = await res.json();
            if (res.ok && data.certificate) {
                setCertData({
                    studentName: data.certificate.trainee_name || traineeName || user?.full_name || 'Trainee',
                    courseTitle: data.certificate.course_title || currentCourse?.name || 'Field Training Program',
                    issueDate: data.certificate.issued_at ? new Date(data.certificate.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('en-GB'),
                    certCode: data.certificate.cert_code,
                    downloadUrl: `/api/training/certificates/download.php?code=${data.certificate.cert_code}`,
                    isPendingIssuance: false
                });
                setShowCertModal(true);
            } else {
                setCertData({
                    studentName: traineeName || user?.full_name || 'Trainee',
                    courseTitle: currentCourse?.name || 'Summer Training Program',
                    issueDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
                    certCode: 'NMU-PREVIEW',
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

    const handleConfirmIssueCertificate = async () => {
        if (!certData || !certData.traineeId || !selectedCourseId) return;
        setConfirmIssuing(true);
        try {
            const res = await fetch('/api/training/certificates/issue.php', {
                method: 'POST',
                credentials: 'include',
                headers: authHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    course_id: selectedCourseId,
                    trainee_id: certData.traineeId
                })
            });
            const data = await res.json();
            if (res.ok && data.certificate) {
                setCertData({
                    studentName: data.trainee?.name || certData.studentName,
                    courseTitle: data.course?.title || certData.courseTitle,
                    issueDate: data.certificate.issued_at ? new Date(data.certificate.issued_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : certData.issueDate,
                    certCode: data.certificate.cert_code,
                    downloadUrl: `/api/training/certificates/download.php?code=${data.certificate.cert_code}`,
                    isPendingIssuance: false,
                    traineeId: certData.traineeId
                });
                if (selectedCourseId) {
                    if (isTrainee) fetchMyEval(selectedCourseId);
                    else fetchTraineesAndEvals(selectedCourseId);
                }
                toast?.success(lang === 'ar' ? 'تم اعتماد وإصدار الشهادة بنجاح' : 'Certificate issued successfully');
            } else {
                toast?.error(data.error || 'Failed to issue certificate');
            }
        } catch (e) {
            console.error(e);
            toast?.error('Network error while issuing certificate');
        } finally {
            setConfirmIssuing(false);
        }
    };

    const currentSelectedCourse = courses.find(c => String(c.id) === String(selectedCourseId));

    return (
        <div className="evaluations-page container">
            {/* Certificate Modal */}
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
                    courseId={selectedCourseId}
                    traineeId={certData.traineeId}
                />
            )}

            {/* Header Card */}
            <div className="eval-header-card">
                <div className="eval-header-title">
                    <h1>
                        <Award size={26} className="text-primary" />
                        <span>{lang === 'ar' ? 'التقييم الأكاديمي ورصد الدرجات' : 'Academic Evaluations & Grading'}</span>
                    </h1>
                    <p>
                        {isTrainee
                            ? (lang === 'ar' ? 'نتائج التقييم النهائي ومعايير الدرجات والشهادات المعتمدة' : 'Final evaluation results, academic rubrics, and certified completion credentials.')
                            : (lang === 'ar' ? 'إدارة ورصد درجات المتدربين واعتماد معايير التقييم والشهادات' : 'Evaluate trainees, configure course rubrics, and issue academic certificates.')}
                    </p>
                </div>

                {courses.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <BookOpen size={18} style={{ color: 'var(--primary-l, #3b82f6)' }} />
                        <select
                            className="eval-course-select"
                            value={selectedCourseId}
                            onChange={(e) => handleCourseChange(e.target.value)}
                            aria-label={lang === 'ar' ? 'اختيار الدورة التدريبية' : 'Select Training Course'}
                        >
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name || (lang === 'ar' ? `دورة تدريبية #${c.id}` : `Course #${c.id}`)}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════════════
                TRAINEE VIEW: MY EVALUATION RESULT
            ══════════════════════════════════════════════════════════════════ */}
            {isTrainee && (
                <div>
                    {loadingMyEval ? (
                        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                            <Loader2 className="spin" size={32} style={{ color: '#2563eb' }} />
                            <p style={{ marginTop: '0.75rem', color: '#64748b' }}>
                                {lang === 'ar' ? 'جاري تحميل نتيجة التقييم...' : 'Loading evaluation data...'}
                            </p>
                        </div>
                    ) : myEval ? (
                        <div className="eval-trainee-result-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-0)' }}>
                                        {currentSelectedCourse?.name || (lang === 'ar' ? 'الدورة التدريبية' : 'Training Course')}
                                    </h2>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {lang === 'ar' ? 'المشرف الأكاديمي:' : 'Supervisor:'} <strong>{myEval.evaluator_name || (lang === 'ar' ? 'مشرف التدريب' : 'Course Trainer')}</strong>
                                    </span>
                                </div>
                                <div className={`eval-score-badge ${myEval.status === 'pass' ? 'pass' : 'fail'}`}>
                                    {myEval.status === 'pass' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                    <span>{myEval.final_score} / 100 ({myEval.status === 'pass' ? 'PASS' : 'FAIL'})</span>
                                </div>
                            </div>

                            {/* Rubrics Breakdown */}
                            <div className="rubrics-grid">
                                {(() => {
                                    let stored = {};
                                    try {
                                        stored = typeof myEval.criteria_scores === 'string' ? JSON.parse(myEval.criteria_scores || '{}') : (myEval.criteria_scores || {});
                                    } catch (_) {}

                                    const finalScore = parseFloat(myEval.final_score) || 0;
                                    const rubricsList = courseCriteria.length > 0 ? courseCriteria : defaultRubrics;

                                    return rubricsList.map((r, idx) => {
                                        const maxW = parseFloat(r.weight) || 0;
                                        let val = stored[r.name] !== undefined ? Number(stored[r.name]) : Math.min(maxW, Math.round((finalScore * (maxW / 100)) * 10) / 10);
                                        val = Math.min(maxW, Math.max(0, val));
                                        const pct = maxW > 0 ? Math.min(100, Math.round((val / maxW) * 100)) : 0;

                                        return (
                                            <div key={idx} className="rubric-item-card">
                                                <div className="rubric-item-header">
                                                    <span className="rubric-item-title">{r.name}</span>
                                                    <span className="rubric-item-score">{val} / {maxW}</span>
                                                </div>
                                                <div className="rubric-progress-bar">
                                                    <div className="rubric-progress-fill" style={{ width: `${pct}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            {/* Supervisor Feedback */}
                            {myEval.feedback && (
                                <div className="eval-feedback-box">
                                    <strong style={{ color: 'var(--primary, #002D56)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.35rem', fontSize: '0.92rem' }}>
                                        <MessageSquare size={16} />
                                        {lang === 'ar' ? 'ملاحظات وتوجيهات المشرف الأكاديمي:' : 'Supervisor Feedback & Notes:'}
                                    </strong>
                                    <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.5, color: 'var(--text-0)' }}>
                                        "{myEval.feedback}"
                                    </p>
                                </div>
                            )}

                            {/* Certificate Claim Banner */}
                            {myEval.status === 'pass' && (
                                <div className="eval-cert-banner">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary, #002D56), #b8860b)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                                            <Award size={26} />
                                        </div>
                                        <div>
                                            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.08rem', fontWeight: 800 }}>
                                                {lang === 'ar' ? 'تهانينا! شهادة إتمام التدريب الأكاديمي جاهزة' : 'Congratulations! Official Certificate Ready'}
                                            </h3>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {lang === 'ar' ? 'لقد اجتزت التقييم بنجاح، يمكنك الآن معاينة وتنزيل شهادتك المعتمدة مع رمز التحقق الرسمي.' : 'You have successfully passed the evaluation. Download your credential with official verification code.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        <button
                                            type="button"
                                            className="btn btn-outline"
                                            onClick={() => handleViewCertificate(myEval.trainee_id || user?.id, myEval.trainee_name || user?.full_name)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                                        >
                                            <Award size={16} />
                                            <span>{lang === 'ar' ? 'معاينة الشهادة' : 'Preview Certificate'}</span>
                                        </button>
                                        <a
                                            href={myEval.cert_code ? `/api/training/certificates/download.php?code=${myEval.cert_code}` : `/api/training/certificates/download.php?course_id=${selectedCourseId}&trainee_id=${myEval.trainee_id || user?.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, background: 'linear-gradient(135deg, var(--primary, #002D56), #b8860b)', border: 'none' }}
                                        >
                                            <Download size={16} />
                                            <span>{lang === 'ar' ? 'تنزيل الشهادة (PDF)' : 'Download (PDF)'}</span>
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="eval-trainee-result-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
                            <Clock size={40} style={{ color: '#94a3b8', margin: '0 auto 12px auto' }} />
                            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem' }}>
                                {lang === 'ar' ? 'لم يتم رصد التقييم النهائي بعد' : 'Evaluation in Progress'}
                            </h3>
                            <p style={{ margin: '0 auto', maxWidth: '480px', color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                                {lang === 'ar'
                                    ? 'يقوم المدرب والمشرف الأكاديمي بمراجعة مخرجات مشروعك التدريبي وتقييم المعايير. سيظهر التقييم والشهادة فور اعتمادهما.'
                                    : 'Your supervisor is reviewing your project deliverables and evaluating rubrics. Results will appear here once approved.'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                TRAINER / ADMIN VIEW: TRAINEE GRADES TABLE & CRITERIA SETUP
            ══════════════════════════════════════════════════════════════════ */}
            {isTrainer && (
                <div>
                    {/* Subtabs bar */}
                    <div className="eval-tabs-bar">
                        <button
                            type="button"
                            className={`eval-tab-button ${trainerTab === 'grades' ? 'active' : ''}`}
                            onClick={() => setTrainerTab('grades')}
                        >
                            <Users size={16} />
                            <span>{lang === 'ar' ? 'رصد وتقييم درجات المتدربين' : 'Trainee Grading & Scores'}</span>
                        </button>
                        <button
                            type="button"
                            className={`eval-tab-button ${trainerTab === 'criteria' ? 'active' : ''}`}
                            onClick={() => setTrainerTab('criteria')}
                        >
                            <Settings size={16} />
                            <span>{lang === 'ar' ? 'إعداد معايير وأوزان التقييم' : 'Rubrics & Weights Setup'}</span>
                        </button>
                    </div>

                    {/* Subtab 1: Trainee Grades Table */}
                    {trainerTab === 'grades' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
                                    <div className="catalog-search-box" style={{ width: '100%', maxWidth: '400px' }}>
                                        <Search size={16} />
                                        <input
                                            type="text"
                                            placeholder={lang === 'ar' ? 'بحث بالاسم أو الرقم الجامعي...' : 'Search by name or student ID...'}
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => fetchTraineesAndEvals(selectedCourseId)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <RefreshCw size={13} />
                                        <span>{lang === 'ar' ? 'تحديث البيانات' : 'Refresh'}</span>
                                    </button>
                                </div>
                            </div>

                            {loadingTrainees ? (
                                <div style={{ textAlign: 'center', padding: '3.5rem 0' }}>
                                    <Loader2 className="spin" size={28} style={{ color: '#2563eb' }} />
                                    <p style={{ marginTop: '0.75rem', color: '#64748b' }}>
                                        {lang === 'ar' ? 'جاري تحميل قائمة المتدربين...' : 'Loading trainees...'}
                                    </p>
                                </div>
                            ) : (() => {
                                const filtered = trainees.filter(t => {
                                    if (!searchQuery) return true;
                                    const q = searchQuery.toLowerCase();
                                    const name = (t.full_name || t.email || '').toLowerCase();
                                    const studentId = String(t.student_id || t.academic_id || '').toLowerCase();
                                    const email = (t.email || '').toLowerCase();
                                    const provider = (t.provider_name || '').toLowerCase();
                                    return name.includes(q) || studentId.includes(q) || email.includes(q) || provider.includes(q);
                                });

                                if (filtered.length === 0) {
                                    return (
                                        <div className="empty-tab" style={{ padding: '3rem 0', textAlign: 'center', background: 'var(--bg-subtle, #f8fafc)', borderRadius: '14px', border: '1px solid var(--border)' }}>
                                            <Users size={36} style={{ color: '#94a3b8', margin: '0 auto 8px auto' }} />
                                            <p style={{ margin: 0, color: '#64748b', fontWeight: 600 }}>
                                                {lang === 'ar' ? 'لا يوجد متدربون مسجلون في هذه الدورة.' : 'No trainees enrolled in this course.'}
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="table-responsive data-table-wrapper" style={{ overflowX: 'auto', borderRadius: '14px', border: '1px solid var(--border, #e2e8f0)', background: 'var(--bg-0, #ffffff)' }}>
                                        <table className="data-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '45px', textAlign: 'center' }}>#</th>
                                                    <th style={{ minWidth: '220px' }}>{lang === 'ar' ? 'اسم المتدرب' : 'Trainee Name'}</th>
                                                    <th style={{ minWidth: '130px' }}>{lang === 'ar' ? 'الرقم الجامعي' : 'Student ID'}</th>
                                                    <th style={{ minWidth: '130px' }}>{lang === 'ar' ? 'الدرجة النهائية' : 'Final Grade'}</th>
                                                    <th style={{ minWidth: '130px' }}>{lang === 'ar' ? 'حالة التقييم' : 'Status'}</th>
                                                    <th style={{ minWidth: '180px', textAlign: 'center' }}>{lang === 'ar' ? 'الإجراءات والشهادات' : 'Actions / Certificate'}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filtered.map((tr, idx) => {
                                                    const tId = String(tr.trainee_id || tr.id || tr.user_id || '');
                                                    const ev = allEvals.find(e => String(e.trainee_id) === tId);
                                                    const hasPassed = ev?.status === 'pass' || Number(tr.evaluation_score) >= 60;
                                                    const isExternal = tr.training_type === 'external';

                                                    return (
                                                        <tr key={tId || idx}>
                                                            <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                                            <td>
                                                                <strong style={{ display: 'block', color: 'var(--text-0)' }}>{tr.full_name || tr.username || tr.email}</strong>
                                                                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{tr.email}</span>
                                                            </td>
                                                            <td style={{ fontFamily: 'var(--font-mono, monospace)' }}>{tr.student_id || '-'}</td>
                                                            <td>
                                                                {ev ? (
                                                                    <strong style={{ fontSize: '1rem', color: ev.status === 'pass' ? '#16a34a' : '#dc2626' }}>
                                                                        {ev.final_score} / 100
                                                                    </strong>
                                                                ) : (
                                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {ev ? (
                                                                    <span style={{
                                                                        padding: '3px 10px',
                                                                        borderRadius: '12px',
                                                                        fontSize: '0.78rem',
                                                                        fontWeight: 700,
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        background: ev.status === 'pass' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                                        color: ev.status === 'pass' ? '#16a34a' : '#dc2626',
                                                                        border: `1px solid ${ev.status === 'pass' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                                                    }}>
                                                                        {ev.status === 'pass' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                                                                        {ev.status === 'pass' ? (lang === 'ar' ? 'ناجح' : 'Passed') : (lang === 'ar' ? 'راسب' : 'Failed')}
                                                                    </span>
                                                                ) : (
                                                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px' }}>
                                                                        {lang === 'ar' ? 'غير مقيم' : 'Ungraded'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-primary btn-sm"
                                                                        onClick={() => openGradingModal(tr)}
                                                                        style={{ padding: '3px 10px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                                                                    >
                                                                        <Edit3 size={13} />
                                                                        <span>{ev ? (lang === 'ar' ? 'تعديل التقييم' : 'Edit Grade') : (lang === 'ar' ? 'رصد الدرجات' : 'Grade')}</span>
                                                                    </button>

                                                                    {hasPassed && (
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-outline btn-sm"
                                                                            onClick={() => handleViewCertificate(tId, tr.full_name)}
                                                                            style={{ padding: '3px 9px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: 'var(--amber, #d97706)', color: 'var(--amber, #d97706)' }}
                                                                        >
                                                                            <Award size={13} />
                                                                            <span>{lang === 'ar' ? 'الشهادة' : 'Cert'}</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    {/* Subtab 2: Criteria Settings */}
                    {trainerTab === 'criteria' && (
                        <div className="criteria-editor-box">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.25rem' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800 }}>
                                        {lang === 'ar' ? 'معايير وأوزان التقييم للدورة' : 'Evaluation Criteria & Rubrics'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {lang === 'ar' ? 'حدد المعايير ونسبة كل معيار من الدرجة الإجمالية (يجب أن يساوي المجموع 100%).' : 'Define assessment rubrics and percentage weights (total must sum to 100%).'}
                                    </p>
                                </div>
                                <div style={{
                                    padding: '6px 14px',
                                    borderRadius: '10px',
                                    fontWeight: 800,
                                    fontSize: '0.92rem',
                                    background: isWeightValid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: isWeightValid ? '#16a34a' : '#dc2626',
                                    border: `1px solid ${isWeightValid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                }}>
                                    {lang === 'ar' ? `المجموع الحالي: ${totalCriteriaWeight}%` : `Total Weight: ${totalCriteriaWeight}%`}
                                </div>
                            </div>

                            {criteriaMsg && (
                                <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
                                    {criteriaMsg}
                                </div>
                            )}

                            <div style={{ marginBottom: '1.25rem' }}>
                                {courseCriteria.map((c, idx) => (
                                    <div key={idx} className="criteria-row">
                                        <input
                                            type="text"
                                            className="criteria-input"
                                            placeholder={lang === 'ar' ? 'اسم المعيار (مثال: التنفيذ التقني)...' : 'Criterion name...'}
                                            value={c.name}
                                            onChange={e => handleCriterionChange(idx, 'name', e.target.value)}
                                        />
                                        <div className="criteria-weight-input-group">
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                className="criteria-weight-input"
                                                value={c.weight}
                                                onChange={e => handleCriterionChange(idx, 'weight', e.target.value)}
                                            />
                                            <span style={{ fontWeight: 700, color: '#64748b' }}>%</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteCriterion(idx)}
                                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleAddCriterion}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                                >
                                    <Plus size={15} />
                                    <span>{lang === 'ar' ? 'إضافة معيار جديد' : 'Add Criterion'}</span>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    disabled={savingCriteria || !isWeightValid}
                                    onClick={handleSaveCriteria}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
                                >
                                    {savingCriteria ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
                                    <span>{savingCriteria ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ المعايير' : 'Save Criteria')}</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════════════════════════════════
                INTERACTIVE GRADING MODAL
            ══════════════════════════════════════════════════════════════════ */}
            {gradingTrainee && (
                <div className="modal-overlay" onClick={() => setGradingTrainee(null)}>
                    <div className="modal-box" style={{ maxWidth: '560px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                                    {lang === 'ar' ? 'رصد وتقييم درجات المتدرب' : 'Grade & Evaluate Trainee'}
                                </h3>
                                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    <strong>{gradingTrainee.full_name || gradingTrainee.username}</strong> ({gradingTrainee.student_id || gradingTrainee.email})
                                </p>
                            </div>
                            <button className="modal-close" onClick={() => setGradingTrainee(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitGrade} className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
                            {gradeError && (
                                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                                    {gradeError}
                                </div>
                            )}

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                                    {lang === 'ar' ? 'توزيع درجات المعايير:' : 'Criteria Scores Breakdown:'}
                                </label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {courseCriteria.map((c, idx) => {
                                        const score = gradingScores[c.name] ?? Math.round(c.weight * 0.85);
                                        return (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                                                    {c.name} ({c.weight}%)
                                                </span>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={c.weight}
                                                        step="0.5"
                                                        value={score}
                                                        onChange={e => setGradingScores({ ...gradingScores, [c.name]: parseFloat(e.target.value) || 0 })}
                                                        style={{ width: '55px', textAlign: 'center', padding: '4px', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: 700 }}
                                                    />
                                                    <span style={{ fontSize: '0.82rem', color: '#64748b' }}>/ {c.weight}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Live Total Score & Status */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,45,86,0.04)', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid rgba(0,45,86,0.12)', marginBottom: '1.25rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block' }}>{lang === 'ar' ? 'المجموع النهائي:' : 'Final Total Score:'}</span>
                                    <strong style={{ fontSize: '1.25rem', color: 'var(--primary, #002D56)' }}>
                                        {computeTotalLiveScore()} / 100
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${gradingStatus === 'pass' ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setGradingStatus('pass')}
                                        style={gradingStatus === 'pass' ? { background: '#16a34a', borderColor: '#16a34a' } : {}}
                                    >
                                        <CheckCircle2 size={13} /> {lang === 'ar' ? 'اجتياز (PASS)' : 'PASS'}
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${gradingStatus === 'fail' ? 'btn-primary' : 'btn-ghost'}`}
                                        onClick={() => setGradingStatus('fail')}
                                        style={gradingStatus === 'fail' ? { background: '#dc2626', borderColor: '#dc2626' } : {}}
                                    >
                                        <XCircle size={13} /> {lang === 'ar' ? 'رسوب (FAIL)' : 'FAIL'}
                                    </button>
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                                    {lang === 'ar' ? 'ملاحظات المشرف وتوجيهات التقييم (اختياري):' : 'Supervisor Notes & Comments (Optional):'}
                                </label>
                                <textarea
                                    rows={3}
                                    value={gradingFeedback}
                                    onChange={e => setGradingFeedback(e.target.value)}
                                    placeholder={lang === 'ar' ? 'أدخل ملاحظات حول أداء الطالب في المشروع...' : 'Enter feedback regarding trainee performance...'}
                                    style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.88rem' }}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                <button type="button" className="btn btn-ghost" onClick={() => setGradingTrainee(null)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={submittingGrade} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                    {submittingGrade ? <Loader2 className="spin" size={15} /> : <Save size={15} />}
                                    <span>{submittingGrade ? (lang === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (lang === 'ar' ? 'اعتماد التقييم' : 'Submit Evaluation')}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
