import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { getPublicStats } from '../services/api';
import {
    ArrowRight, BookOpen, Users, FileCheck, Award,
    Shield, Languages, Terminal, CheckCircle2, AlertCircle,
    Cpu, Code, Activity, Search, QrCode, Sparkles,
    Check, ArrowUpRight
} from 'lucide-react';
import StaffRegisterModal from '../components/StaffRegisterModal';
import { landingEN, landingAR } from '../data/landing-translations';
import './Landing.css';

/* ── local translator ── */
function useLandingT(lang) {
    const { t: base } = useI18n();
    const tbl = lang === 'ar' ? landingAR : landingEN;
    return (key) => tbl[key] ?? base(key);
}

/* ── Animated counter ── */
function Counter({ to, duration = 1800 }) {
    const [v, setV] = useState(0);
    const ref = useRef(null);
    const done = useRef(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !done.current) {
                done.current = true;
                const t0 = Date.now();
                const tick = () => {
                    const p = Math.min((Date.now() - t0) / duration, 1);
                    setV(Math.floor((1 - (1 - p) ** 3) * to));
                    if (p < 1) requestAnimationFrame(tick);
                };
                tick(); obs.disconnect();
            }
        }, { threshold: 0.3 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [to, duration]);
    return <span ref={ref}>{v.toLocaleString()}</span>;
}

/* ── Reveal observer ── */
function useReveal(threshold = 0.08) {
    const ref = useRef(null);
    const [on, setOn] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) {
                setOn(true);
                obs.disconnect();
            }
        }, { threshold });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, on];
}

export default function Landing() {
    const { lang, setLang } = useI18n();
    const { user } = useAuth();
    const t = useLandingT(lang);
    const [stats, setStats] = useState({});
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Active track for the Hero Programs Showcase
    const [activeTrack, setActiveTrack] = useState(0);

    const [featRef, featOn] = useReveal(0.05);
    const [stepsRef, stepsOn] = useReveal(0.05);
    const [ctaRef, ctaOn] = useReveal(0.15);

    useEffect(() => { getPublicStats().then(setStats).catch(() => {}); }, []);
    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', fn);
        return () => window.removeEventListener('scroll', fn);
    }, []);

    const isAr = lang === 'ar';

    // Real Track Data for the Hero Inspector
    const tracks = [
        {
            id: 'ROB-01',
            title: isAr ? 'مسار الروبوتيكس والأتمتة' : 'Robotics & Automation Track',
            badge: isAr ? 'مُوصى به' : 'FLAGSHIP',
            level: 'TIER 01 // HARDWARE & ROS2',
            duration: isAr ? '٨ أسابيع · ٦٣ ساعة' : '8 Weeks · 63 Hours',
            tech: ['AI', 'Computer Vision', 'Mobile Dev', 'Web Tech', 'Robotics'],
            codeSnippet: `// ERTH Autonomous Rover Kinematics Engine\n#include <micro_ros/ros.h>\n\nvoid computeVelocity(float rx, float ry) {\n    motor_fl.setSpeed(rx + ry);\n    motor_fr.setSpeed(rx - ry);\n    telemetry.publish("SYSTEM_OK");\n}`,
            modules: isAr ? [
                'الذكاء الاصطناعي وتعلم الآلة',
                'التعلم العميق والرؤية الحاسوبية',
                'تطوير تطبيقات الموبايل وتقنيات الويب',
                'الابتكار والروبوتات I & II'
            ] : [
                'Artificial Intelligence & Machine Learning',
                'Deep Learning & Computer Vision',
                'Mobile Development & Web Technologies',
                'Innovation, Robotics I & II'
            ]
        },
        {
            id: 'AI-02',
            title: isAr ? 'مسار الذكاء الاصطناعي والرؤية الحاسوبية' : 'AI & Computer Vision Track',
            badge: isAr ? 'متقدم' : 'ADVANCED',
            level: 'TIER 02 // PYTORCH & EDGE AI',
            duration: isAr ? '٨ أسابيع · ٦٤ ساعة' : '8 Weeks · 64 Hours',
            tech: ['PyTorch', 'YOLOv8', 'OpenCV', 'TensorRT', 'Python'],
            codeSnippet: `# ERTH Real-time Vision Pipeline\nimport torch\nimport cv2\n\nmodel = torch.hub.load('ultralytics/yolov8', 'custom')\ndef detect_defects(frame):\n    results = model(frame)\n    return results.crop()`,
            modules: isAr ? [
                'معالجة الصور والشبكات العصبية Deep Learning',
                'كشف الأجسام وتحسين النماذج TensorRT',
                'المشروع النهائي: فحص جودة التجميع آلياً'
            ] : [
                'Deep Neural Networks & Vision Pipelines',
                'Model Edge Deployment & TensorRT',
                'Capstone: Automated Industrial QC'
            ]
        },
        {
            id: 'SYS-03',
            title: isAr ? 'مسار الهندسة البرمجية المتكاملة' : 'Full-Stack Software Engineering',
            badge: isAr ? 'شامل' : 'CORE',
            level: 'TIER 03 // WEB & ENTERPRISE ARCHITECTURE',
            duration: isAr ? '٦ أسابيع · ٥٠ ساعة' : '6 Weeks · 50 Hours',
            tech: ['React 18', 'PHP API', 'Docker', 'PostgreSQL', 'Tailwind'],
            codeSnippet: `// ERTH LMS Secure Grade Verification API\nasync function verifySubmission(submissionId) {\n    const res = await fetch('/api/verify', {\n        method: 'POST',\n        body: JSON.stringify({ submissionId })\n    });\n    return res.json();\n}`,
            modules: isAr ? [
                'معمارية التطبيقات والواجهات البرمجية REST APIs',
                'إدارة قواعد البيانات وتأمين البيانات',
                'المشروع النهائي: نظام إدارة تدريب مؤسسي'
            ] : [
                'Scalable REST API & Microservice Patterns',
                'Relational Database Architecture & Security',
                'Capstone: Enterprise LMS Platform'
            ]
        }
    ];

    const currentTrack = tracks[activeTrack];

    return (
        <div className="lp" dir={isAr ? 'rtl' : 'ltr'}>
            {/* Fixed Hollow Watermark */}
            <div className="lp-bg-wm" aria-hidden="true">ERTH</div>

            {/* ── NAV ── */}
            <header className={`lp-nav${scrolled ? ' lp-nav--solid' : ''}`}>
                <div className="lp-nav-in">
                    <Link to="/" className="lp-logo">
                        <img src="/assets/university_logo.png" alt="NMU ERTH" style={{ height: '40px', width: 'auto' }} />
                        <div className="lp-logo-text">
                            <span className="lp-logo-brand">NMU ERTH</span>
                            <span className="lp-logo-sub">{isAr ? 'مركز التدريب والتطوير' : 'TRAINING CENTER'}</span>
                        </div>
                    </Link>
                    <nav className="lp-navlinks">
                        <a href="#tracks" className="lp-nl">{isAr ? 'المسارات التدريبية' : 'Tracks'}</a>
                        <a href="#capabilities" className="lp-nl">{isAr ? 'قدرات المنصة' : 'Capabilities'}</a>
                        <a href="#pipeline" className="lp-nl">{isAr ? 'مراحل التدريب' : 'Pipeline'}</a>
                        <Link to="/verify" className="lp-nl">{isAr ? 'التحقق الرقمي' : 'Verify Certificate'}</Link>
                    </nav>
                    <div className="lp-nav-end">
                        <button className="lp-lang-btn" onClick={() => setLang(isAr ? 'en' : 'ar')}>
                            <Languages size={13} />
                            <span>{isAr ? 'EN' : 'العربية'}</span>
                        </button>
                        {!user ? (
                            <>
                                <Link to="/auth" className="lp-ghost">{isAr ? 'تسجيل الدخول' : 'Sign In'}</Link>
                                <Link to="/auth?tab=register" className="lp-cta-btn">
                                    {isAr ? 'الانضمام للمركز' : 'Enroll Now'} <ArrowRight size={14} />
                                </Link>
                            </>
                        ) : (
                            <Link to="/courses" className="lp-cta-btn">
                                {isAr ? 'لوحة التحكم' : 'Dashboard'} <ArrowRight size={14} />
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* ── HERO ARCHITECTURE ── */}
            <section className="lp-hero">
                <div className="lp-hero-grid">
                    
                    {/* Left Column: Editorial & Title */}
                    <div className="lp-hero-copy">
                        <div className="lp-tech-badge">
                            <Cpu size={14} />
                            <span>{isAr ? 'جامعة المنصورة الجديدة · كلية حاسبات وهندسة البرمجيات' : 'NEW MANSOURA UNIVERSITY · FACULTY OF CS & ENGINEERING'}</span>
                        </div>
                        
                        <h1 className="lp-h1">
                            <span className="lp-h1-sub">{isAr ? 'بناء وتطوير المستقبل الرقمي' : 'ARCHITECTING THE'}</span>
                            <span className="lp-h1-main">{isAr ? 'مركز إيرث للتدريب' : 'DIGITAL FUTURE'}</span>
                        </h1>

                        <p className="lp-sub">
                            {isAr 
                                ? 'الابتكار والتميز في مجالات الذكاء الاصطناعي، الأمن السيبراني، وهندسة البرمجيات. بيئة تدريبية تطبيقية متقدمة بالتعاون بين جامعة المنصورة الجديدة ومركز إيرث.'
                                : 'Pioneering education in AI, Cybersecurity, and Software Engineering. Join a faculty and training ecosystem dedicated to pushing the boundaries of technical innovation.'
                            }
                        </p>

                        <div className="lp-hero-actions">
                            {!user ? (
                                <>
                                    <Link to="/auth?tab=register" className="lp-cta-btn lp-cta-btn--lg">
                                        {isAr ? 'سجّل في المسار القادم' : 'Enroll in Next Cohort'} <ArrowUpRight size={18} />
                                    </Link>
                                    <Link to="/auth" className="lp-ghost lp-ghost--lg">
                                        {isAr ? 'تسجيل الدخول' : 'Sign In'}
                                    </Link>
                                </>
                            ) : (
                                <Link to="/courses" className="lp-cta-btn lp-cta-btn--lg">
                                    {isAr ? 'الذهاب إلى لوحة التحكم' : 'Access Training Portal'} <ArrowUpRight size={18} />
                                </Link>
                            )}
                        </div>

                        {/* Technical Spec Metrics */}
                        <div className="lp-spec-metrics">
                            <div className="lp-spec-item">
                                <span className="lp-spec-val"><Counter to={stats.total_students || 340} />+</span>
                                <span className="lp-spec-lbl">{isAr ? 'متدرب نشط' : 'TRAINEES ENROLLED'}</span>
                            </div>
                            <div className="lp-spec-divider" />
                            <div className="lp-spec-item">
                                <span className="lp-spec-val"><Counter to={stats.total_projects || 128} /></span>
                                <span className="lp-spec-lbl">{isAr ? 'مشروع معتمد' : 'CAPSTONES EVALUATED'}</span>
                            </div>
                            <div className="lp-spec-divider" />
                            <div className="lp-spec-item">
                                <span className="lp-spec-val">100%</span>
                                <span className="lp-spec-lbl">{isAr ? 'شهادات موثقة' : 'VERIFIABLE DIPLOMAS'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Clean & Simple Academic Programs Showcase */}
                    <div id="tracks" className="lp-inspector-frame">
                        <div className="lp-inspector-header">
                            <span className="lp-inspector-title" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                <BookOpen size={16} color="var(--accent)" /> {isAr ? 'البرامج الدراسية والمسارات' : 'Academic Programs Overview'}
                            </span>
                            <span className="lp-inspector-live" style={{ color: 'var(--accent)' }}>
                                {isAr ? 'دفعة ٢٠٢٦' : 'COHORT 2026'}
                            </span>
                        </div>

                        {/* Program Selectors */}
                        <div className="lp-track-tabs">
                            {tracks.map((tItem, idx) => (
                                <button
                                    key={tItem.id}
                                    className={`lp-track-tab ${activeTrack === idx ? 'active' : ''}`}
                                    onClick={() => setActiveTrack(idx)}
                                >
                                    <span className="lp-tab-id">{tItem.id}</span>
                                    <span className="lp-tab-name">{tItem.title}</span>
                                </button>
                            ))}
                        </div>

                        {/* Active Program Card */}
                        <div className="lp-inspector-body">
                            <div className="lp-track-meta-row">
                                <div>
                                    <span className="lp-meta-tag">{currentTrack.level}</span>
                                    <h3 className="lp-track-title">{currentTrack.title}</h3>
                                </div>
                                <span className="lp-badge-flag">{currentTrack.badge}</span>
                            </div>

                            <div className="lp-track-detail-pills">
                                <span className="lp-pill"><BookOpen size={13} /> {currentTrack.duration}</span>
                                <span className="lp-pill"><Award size={13} /> {isAr ? 'شهادة رقمية معتمدة' : 'Verifiable Diploma'}</span>
                            </div>

                            {/* Curriculum Modules */}
                            <div className="lp-syllabus-list" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                                <span className="lp-syll-title">{isAr ? 'الوحدات الرئيسية في المسار:' : 'Key Program Modules:'}</span>
                                {currentTrack.modules.map((m, i) => (
                                    <div key={i} className="lp-syll-item">
                                        <span className="lp-syll-num">0{i + 1}</span>
                                        <span className="lp-syll-text">{m}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Tech Stack Chips */}
                            <div className="lp-tech-chips" style={{ marginBottom: '1.2rem' }}>
                                <span className="lp-chips-label">{isAr ? 'التقنيات والأدوات:' : 'Technologies & Tools:'}</span>
                                <div className="lp-chips-wrap">
                                    {currentTrack.tech.map((tc, i) => (
                                        <span key={i} className="lp-chip">{tc}</span>
                                    ))}
                                </div>
                            </div>

                            <Link to="/courses" className="lp-cta-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                                {isAr ? 'تصفح كافة المسارات' : 'Explore All Programs'} <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>

                </div>
            </section>

            {/* ── SECTION 01: CAPABILITIES (ARCHITECTURAL GRID) ── */}
            <section id="capabilities" className="lp-sect lp-cap-sect">
                <div className="lp-sect-in" ref={featRef}>
                    <div className={`lp-sh lp-sh--left ${featOn ? 'lp-sh--on' : ''}`}>
                        <div className="lp-sh-index" aria-hidden="true">01</div>
                        <div className="lp-sh-text">
                            <span className="lp-label">{isAr ? 'قدرات المنصة' : 'PLATFORM CAPABILITIES'}</span>
                            <h2>{isAr ? 'نظام تدريبي هندسي متكامل' : 'Built for Rigorous Engineering Education'}</h2>
                            <p>{isAr ? 'أدوات تفاعلية صُممت لتسهيل متابعة الدروس، تسليم المشاريع، والتحقق من الشهادات دون تعقيد.' : 'Streamlined workflow from course enrolment to automated project evaluation and verifiable diploma issuance.'}</p>
                        </div>
                    </div>

                    {/* 4 Architectural Capability Modules */}
                    <div className="lp-cap-grid">

                        {/* Module 1: Project Evaluation Console */}
                        <div className="lp-cap-card">
                            <div className="lp-cap-card-head">
                                <Code size={20} className="lp-cap-icon" />
                                <h3>{isAr ? 'مراجعة وتقييم المشاريع' : 'Trainer Project Evaluation'}</h3>
                            </div>
                            <p className="lp-cap-desc">
                                {isAr 
                                    ? 'يتلقى المتدرب ملاحظات تفصيلية مباشرة من المدربين المعتمدين على كل مشروع تسليم مع نظام درجات دقيق.'
                                    : 'Structured code and hardware review feedback directly from trainers with itemized grade breakdowns.'
                                }
                            </p>
                            {/* Visual Console Widget */}
                            <div className="lp-console-widget">
                                <div className="lp-cw-header">
                                    <span>SUBMISSION #8492 // APPROVED</span>
                                    <span className="lp-cw-grade">SCORE: 96/100</span>
                                </div>
                                <div className="lp-cw-body">
                                    <div className="lp-cw-row">
                                        <CheckCircle2 size={14} color="#dc2626" />
                                        <span>Kinematics Matrix implementation correct</span>
                                    </div>
                                    <div className="lp-cw-row">
                                        <CheckCircle2 size={14} color="#dc2626" />
                                        <span>Code formatting complies with C++20 standard</span>
                                    </div>
                                    <div className="lp-cw-row">
                                        <CheckCircle2 size={14} color="#dc2626" />
                                        <span>Hardware serial telemetry verified</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Module 2: Official Academic Accreditation & Verifiable Diplomas */}
                        <div className="lp-cap-card">
                            <div className="lp-cap-card-head">
                                <Award size={20} className="lp-cap-icon" />
                                <h3>{isAr ? 'الاعتماد الأكاديمي والشهادات المعتمدة' : 'Accredited Academic Credentials'}</h3>
                            </div>
                            <p className="lp-cap-desc">
                                {isAr
                                    ? 'شهادات تدريب رسمية مشتركة صادرة بالتعاون بين جامعة المنصورة الجديدة وشركة إيرث للتكنولوجيا، قابلة للتحقق الرقمي المباشر.'
                                    : 'Official graduation diplomas issued jointly by New Mansoura University & ERTH Technology Solutions with instant digital verification.'
                                }
                            </p>
                            <div className="lp-telemetry-widget" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
                                    <Shield size={18} color="var(--accent)" />
                                    <div>
                                        <strong style={{ fontSize: '0.8rem', display: 'block', color: 'var(--text-hi)' }}>
                                            {isAr ? 'جامعة المنصورة الجديدة · كلية علوم وهندسة الحاسب' : 'New Mansoura University · Faculty of CS & Engineering'}
                                        </strong>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                            {isAr ? 'اعتماد مؤسسي مشترك 2026' : 'Joint Institutional Accreditation 2026'}
                                        </span>
                                    </div>
                                </div>
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        const code = e.target.elements.certCode.value.trim();
                                        if(code) window.location.href = `/verify?code=${code}`;
                                    }} 
                                    style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                                >
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-mid)', fontWeight: 600 }}>
                                        {isAr ? 'التحقق السريع من الشهادة' : 'Instant Credential Verification'}
                                    </span>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input 
                                            type="text" 
                                            name="certCode"
                                            placeholder={isAr ? 'أدخل كود الشهادة (مثال: NMU-CERT-...)' : 'Enter Certificate Code...'}
                                            style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', color: 'var(--text-hi)', fontSize: '0.8rem', outline: 'none' }}
                                            required
                                        />
                                        <button type="submit" className="lp-cta-btn" style={{ padding: '0.6rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                                            {isAr ? 'تحقق' : 'Verify'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Module 3: Real-Time Competency Matrix */}
                        <div className="lp-cap-card">
                            <div className="lp-cap-card-head">
                                <Activity size={20} className="lp-cap-icon" />
                                <h3>{isAr ? 'تتبع مستوى المهارات' : 'Real-Time Competency Telemetry'}</h3>
                            </div>
                            <p className="lp-cap-desc">
                                {isAr
                                    ? 'لوحة متابعة شفافة للمدرب والمتدرب تقيس تطور المهارات عبر المهام والمختبرات العملية.'
                                    : 'Transparent progress visualization measuring skill mastery across practical lab exercises.'
                                }
                            </p>
                            <div className="lp-telemetry-widget">
                                {[
                                    { name: isAr ? 'التحكم بالروبوتات' : 'Robotics Control', pct: 92 },
                                    { name: isAr ? 'الرؤية الاصطناعية' : 'Computer Vision', pct: 85 },
                                    { name: isAr ? 'تأمين البرمجيات' : 'Security Audit', pct: 78 }
                                ].map((bar, i) => (
                                    <div key={i} className="lp-bar-row">
                                        <div className="lp-bar-info">
                                            <span>{bar.name}</span>
                                            <span>{bar.pct}%</span>
                                        </div>
                                        <div className="lp-bar-track">
                                            <div className="lp-bar-fill" style={{ width: `${bar.pct}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Module 4: Administrative Dashboard Oversight */}
                        <div className="lp-cap-card">
                            <div className="lp-cap-card-head">
                                <Users size={20} className="lp-cap-icon" />
                                <h3>{isAr ? 'إدارة وإشراف أكاديمي' : 'Administrative Command Dashboard'}</h3>
                            </div>
                            <p className="lp-cap-desc">
                                {isAr
                                    ? 'إشراف كامل لإدارة المركز والمدربين لمتابعة الحضور، إصدار الشهادات، وتوليد التقارير.'
                                    : 'Comprehensive analytics for center admins to manage cohorts, monitor submissions, and issue certificates.'
                                }
                            </p>
                            <div className="lp-admin-widget">
                                <div className="lp-aw-stat">
                                    <span className="lp-aw-num">24/7</span>
                                    <span className="lp-aw-lbl">{isAr ? 'تحديث فوري' : 'Live Stream'}</span>
                                </div>
                                <div className="lp-aw-stat">
                                    <span className="lp-aw-num">100%</span>
                                    <span className="lp-aw-lbl">{isAr ? 'دقة البيانات' : 'Audit Trail'}</span>
                                </div>
                                <div className="lp-aw-stat">
                                    <span className="lp-aw-num">PDF/QR</span>
                                    <span className="lp-aw-lbl">{isAr ? 'تصدير الشهادات' : 'Export Ready'}</span>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ── SECTION 02: PIPELINE / HOW IT WORKS ── */}
            <section id="pipeline" className="lp-sect lp-pipe-sect">
                <div className="lp-sect-in" ref={stepsRef}>
                    <div className={`lp-sh lp-sh--left ${stepsOn ? 'lp-sh--on' : ''}`}>
                        <div className="lp-sh-index" aria-hidden="true">02</div>
                        <div className="lp-sh-text">
                            <span className="lp-label">{isAr ? 'مسار الانضمام' : 'TRAINING PIPELINE'}</span>
                            <h2>{isAr ? 'أربع خطوات نحو الاعتماد المهني' : 'Four Steps to Certified Competency'}</h2>
                        </div>
                    </div>

                    <div className={`lp-pipeline-grid ${stepsOn ? 'lp-pipeline-grid--on' : ''}`}>
                        {[
                            {
                                num: '01 // REGISTER',
                                title: isAr ? 'إنشاء الحساب وتحديد المسار' : 'Create Profile & Select Track',
                                desc: isAr ? 'سجّل بياناتك في منصة إيرث واختر المسار الهندسية الذي يناسب تخصصك وطموحك.' : 'Set up your trainee credentials and select the engineering track aligned with your goals.'
                            },
                            {
                                num: '02 // ENROLL',
                                title: isAr ? 'التسجيل في الدورات والمختبرات' : 'Course & Lab Admission',
                                desc: isAr ? 'انضم للدورات المتاحة واحصل على الموافقة للانضمام للورش العملية والتطبيقات.' : 'Apply to cohort courses and access structured curriculum materials and laboratory sessions.'
                            },
                            {
                                num: '03 // LABS & PROJECT',
                                title: isAr ? 'التطبيق وتطوير مشروع التخرج' : 'Practical Labs & Capstone',
                                desc: isAr ? 'نفّذ المشاريع التطبيقية، وسلّم المشروع النهائي للحصول على مراجعة المدربين.' : 'Execute hands-on assignments, write code, build hardware, and submit your capstone project.'
                            },
                            {
                                num: '04 // CERTIFICATION',
                                title: isAr ? 'استلام الشهادة الرقمية المعتمدة' : 'Issuance of Verifiable Diploma',
                                desc: isAr ? 'بعد تقييم المشروع واعتماده، احصل على شهادة موثقة رقمياً برمز QR وشفرة تحقق.' : 'Receive your digitally signed diploma, complete with verification hash and shareable QR seal.'
                            }
                        ].map((step, i) => (
                            <div key={i} className="lp-pipe-card">
                                <div className="lp-pipe-num">{step.num}</div>
                                <h3 className="lp-pipe-title">{step.title}</h3>
                                <p className="lp-pipe-desc">{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── SECTION 03: INSTITUTIONAL ADVANTAGES ── */}
            <section className="lp-sect lp-inst-sect">
                <div className="lp-sect-in">
                    <div className="lp-inst-grid">
                        
                        <div className="lp-inst-copy">
                            <span className="lp-label">{isAr ? 'لماذا مركز إيرث؟' : 'WHY ERTH CENTER'}</span>
                            <h2>{isAr ? 'بيئة تدريبية بمعايير هندسية صارمة' : 'Engineering Standard Educational Methodology'}</h2>
                            <p>
                                {isAr 
                                    ? 'نحن لا نقدم مجرد دروس نظرية، بل نصمم تجربة تطبيقية متكاملة تضمن إتقان المهارات التقنية وتوثيق الإنجازات.'
                                    : 'We bridge academic theory with real-world engineering capability through hands-on labs and peer-reviewed capstones.'
                                }
                            </p>

                            <div className="lp-inst-features">
                                {[
                                    isAr ? 'مناهج محدثة تتوافق مع متطلبات سوق العمل الهندسي' : 'Curriculum engineered to match current industrial requirements',
                                    isAr ? 'متابعة وتقييم شخصي مباشر من مدربين متخصصين' : 'Direct code-level evaluation and feedback from senior trainers',
                                    isAr ? 'شهادات موثقة رقمياً قابلة للتحقق الفوري من الشركات' : 'Cryptographically secure diplomas instantly verifiable online',
                                    isAr ? 'مشاريع حقيقية تصبح جزءاً أساسياً من ملفك المهني' : 'Portfolio-ready capstone projects evaluated by experts'
                                ].map((featText, idx) => (
                                    <div key={idx} className="lp-inst-feat-row">
                                        <Check size={16} className="lp-inst-check" />
                                        <span>{featText}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="lp-inst-visual">
                            <div className="lp-inst-card-frame">
                                <div className="lp-icf-head">
                                    <Sparkles size={16} />
                                    <span>INSTITUTIONAL METRICS // 2026</span>
                                </div>
                                <div className="lp-icf-metrics">
                                    <div className="lp-icf-m">
                                        <span className="lp-icf-val">98.4%</span>
                                        <span className="lp-icf-lbl">{isAr ? 'نسبة رضا المتدربين' : 'Trainee Satisfaction'}</span>
                                    </div>
                                    <div className="lp-icf-m">
                                        <span className="lp-icf-val">100%</span>
                                        <span className="lp-icf-lbl">{isAr ? 'شهادات موثقة' : 'Verified Certificates'}</span>
                                    </div>
                                    <div className="lp-icf-m">
                                        <span className="lp-icf-val">12+</span>
                                        <span className="lp-icf-lbl">{isAr ? 'مساراً وهدفاً تقنياً' : 'Specialized Modules'}</span>
                                    </div>
                                    <div className="lp-icf-m">
                                        <span className="lp-icf-val">4.9★</span>
                                        <span className="lp-icf-lbl">{isAr ? 'تقييم المدربين' : 'Trainer Rating'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className={`lp-cta-sect ${ctaOn ? 'lp-cta-sect--on' : ''}`} ref={ctaRef}>
                <div className="lp-cta-in">
                    <div className="lp-cta-tag">
                        <span>[ENROLLMENT Cohort 2026 // OPEN]</span>
                    </div>
                    <h2>{isAr ? 'ابدأ تطوير مهاراتك الهندسية اليوم' : 'Accelerate Your Engineering Career Today'}</h2>
                    <p>{isAr ? 'انضم إلى المتدربين في مركز إيرث وابدأ بالتعلم والتطبيق في مسارات تقنية معتمدة.' : 'Join ERTH Training Center to master robotics, AI, and software engineering with verified credentials.'}</p>
                    <div className="lp-cta-acts">
                        {!user ? (
                            <>
                                <Link to="/auth?tab=register" className="lp-cta-btn lp-cta-btn--lg">
                                    {isAr ? 'إنشاء حساب جديد' : 'Register Trainee Account'} <ArrowRight size={16} />
                                </Link>
                                <Link to="/auth" className="lp-ghost lp-ghost--lg">
                                    {isAr ? 'تسجيل الدخول' : 'Sign In'}
                                </Link>
                            </>
                        ) : (
                            <Link to="/courses" className="lp-cta-btn lp-cta-btn--lg">
                                {isAr ? 'الانتقال إلى الدورات' : 'Go to Course Catalog'} <ArrowRight size={16} />
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="lp-footer">
                <div className="lp-footer-in">
                    <div className="lp-footer-brand">
                        <img src="/assets/university_logo.png" alt="NMU" height="32" style={{ objectFit: 'contain' }} />
                        <span><strong>NMU Faculty of CS & Engineering</strong> · ERTH Platform</span>
                    </div>
                    <div className="lp-footer-links">
                        <a href="#tracks" className="lp-nl">{isAr ? 'المسارات' : 'Programs'}</a>
                        <a href="#capabilities" className="lp-nl">{isAr ? 'البحوث' : 'Research'}</a>
                        <Link to="/verify" className="lp-nl">{isAr ? 'التحقق الرقمي' : 'Verification'}</Link>
                        <Link to="/auth" className="lp-nl">{isAr ? 'تسجيل الدخول' : 'Sign In'}</Link>
                    </div>
                    <div style={{ textAlign: isAr ? 'left' : 'right' }}>
                        <p className="lp-footer-copy">© 2026 New Mansoura University - Faculty of Computer Science and Engineering.</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Engineered &amp; Powered by{' '}
                            <a 
                                href="https://erth.dev" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                style={{ color: 'var(--text-mid)', textDecoration: 'underline', fontWeight: 600 }}
                            >
                                ERTH Technology Solutions
                            </a>
                        </p>
                    </div>
                </div>
            </footer>

            {showStaffModal && <StaffRegisterModal onClose={() => setShowStaffModal(false)} />}
        </div>
    );
}
