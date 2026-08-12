import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Volume2, VolumeX, Minus, X, RefreshCw } from 'lucide-react';
import './EngMagyMascot.css';

// Formal engineering guidance repository for Eng. Magy (Strictly formal, technical, zero emojis)
const ENG_MAGY_TIPS = {
    welcome: {
        title: "المهندسة ماجي - المستشار الأكاديمي",
        text: "أهلاً بكم في وحدة الأنظمة الذاتية والتصاميم الروبوتية. سأقوم بتزويدكم بالإرشادات الهندسية الدقيقة والمعايير المعملية أثناء تفاعلكم مع محاور المقرر."
    },
    topics: {
        title: "المنهج والوحدات التدريبية",
        text: "يتضمن المقرر التحليل الرياضي للأنظمة الروبوتية، بدءاً من معالجة إشارات المعالجات المدمجة، صياغة مصفوفات تحويل الحركة (Kinematics Transformation Matrices)، وحتى بيئات التشغيل الذاتية ROS2."
    },
    simulator: {
        title: "مختبر الكود والمحاكاة",
        text: "بيئة اختبار الشفرات البرمجية بخواص الوقت الفعلي. يتم التحقق من إشارات الـ PWM وحلقات التغذية الراجعة (PID Control Loop) واستجابة المحركات قبل الرفع على العتاد."
    },
    hardware: {
        title: "عتاد الهاردوير والحساسات",
        text: "قائمة فحص المكونات الصلبة. ينبغي التأكد من توافق مستويات الجهد، وربط الخط الأرضي المشترك (Common GND)، ومعايرة انحراف وحدة MPU6050 قبل التشغيل."
    },
    idea: {
        title: "مشاريع التخرج والابتكار",
        text: "المشاريع التطبيقية تعتمد على حل المشكلات الهندسية كالتتبع الذاتي والملاحة باستخدام تقنيات SLAM والرؤية الحاسوبية وفق معمارية محددة للعتاد والبرمجيات."
    },
    docs: {
        title: "التوثيق والتكليفات الهندسية",
        text: "يتطلب التوثيق الهندسي تقديم مواصفات النظام (SRS)، ومخططات الدوائر الإلكترونية المعيارية، بالإضافة إلى الشفرات البرمجية المرفقة بملفات التكوين."
    },
    evaluations: {
        title: "التقييمات والاختبارات الدورية",
        text: "تقيس التقييمات مدى الاستيعاب التطبيقي لمعادلات الكينماتيكا العكسية، وتحليل أداء المولدات، واستجابة الأنظمة الخطية تحت قيود الوقت الفعلي."
    },
    trainees: {
        title: "المنتدى الهندسي للمناقشات",
        text: "منتدى النقاش المخصص لاستعراض الأخطاء البرمجية (Debugging) وتحليل سلوك الدوائر الإلكترونية بالتنسيق مع الفريق الأكاديمي."
    },
    materials: {
        title: "المراجع والمخططات الهندسية",
        text: "تتضمن المواد المعملية مخططات الدوائر الإلكترونية، والتصاميم الميكانيكية، ومكتبات المعالجات المعتمدة لبدء التجارب العملية."
    },
    certificate: {
        title: "الشهادة الأكاديمية المعتمدة",
        text: "يتم إصدار الشهادة الأكاديمية الموثقة فور استيفاء كافة التكليفات المعملية واجتياز تقييم المشروع النهائي بنجاح."
    }
};

const RANDOM_MAGY_QUOTES = [
    "تأكد دائماً من إجراء معايرة الحساسات (Calibration Offset) قبل قياس بيانات التسارع وزاوية الميل.",
    "عند ظهور خطأ في الاتصال التسلسلي (Serial Communication)، تحقق من توافق معدل البود (Baud Rate) بين المعالج والواجهة.",
    "تحسين استجابة النظام يتطلب ضبط معامل التناسب (Kp) ومعامل التكامل (Ki) في حلقة التحكم المغلقة.",
    "استخدام المكثفات عند أطراف محركات التيار المستمر يقلل التشويش الكهرومغناطيسي على إشارات الـ PWM.",
    "تضمن معمارية ROS2 الفصل الكامل بين عقد المعالجة، مما يسهل اختبار واجهات الاستشعار بشكل مستقل.",
    "ينبغي فصل مصدر تغذية المحركات عن تغذية المعالج مع الربط بين خطوط الأرضي (Common GND) لحماية الدوائر."
];

export default function EngMagyMascot({ forceShow = false, courseTrack = '' }) {
    const location = useLocation();
    const pathname = location.pathname.toLowerCase();

    // STRICT SCOPE ISOLATION:
    const isRoboticsRoute = forceShow || 
        pathname.includes('/courses/robotics') || 
        pathname.includes('robotics') ||
        courseTrack.toLowerCase().includes('robotics');

    if (!isRoboticsRoute) {
        return null;
    }

    const [isMinimized, setIsMinimized] = useState(() => {
        return localStorage.getItem('eng_magy_minimized') === 'true';
    });
    const [isMuted, setIsMuted] = useState(() => {
        return localStorage.getItem('eng_magy_muted') === 'true';
    });
    const [activeTip, setActiveTip] = useState(ENG_MAGY_TIPS.welcome);
    const [bubbleVisible, setBubbleVisible] = useState(true);
    const [isBouncing, setIsBouncing] = useState(false);
    const [quoteIndex, setQuoteIndex] = useState(0);

    const autoHideTimerRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('eng_magy_minimized', isMinimized ? 'true' : 'false');
    }, [isMinimized]);

    useEffect(() => {
        localStorage.setItem('eng_magy_muted', isMuted ? 'true' : 'false');
    }, [isMuted]);

    useEffect(() => {
        const handleMouseOver = (e) => {
            if (isMuted || isMinimized) return;

            const target = e.target.closest('[data-magy-tip], [data-magy-key], button, .nav-tab, .course-tab-btn, input, select, .card');
            if (!target) return;

            const customTip = target.getAttribute('data-magy-tip');
            const customTitle = target.getAttribute('data-magy-title');
            if (customTip) {
                showTip({
                    title: customTitle || "إرشاد هندسي",
                    text: customTip
                });
                return;
            }

            const key = target.getAttribute('data-magy-key') || target.id;
            if (key && ENG_MAGY_TIPS[key]) {
                showTip(ENG_MAGY_TIPS[key]);
                return;
            }

            const text = (target.textContent || '').toLowerCase();
            if (text.includes('موضوع') || text.includes('منهج') || text.includes('syllabus') || text.includes('topic')) {
                showTip(ENG_MAGY_TIPS.topics);
            } else if (text.includes('محاكاة') || text.includes('كود') || text.includes('simulator') || text.includes('code')) {
                showTip(ENG_MAGY_TIPS.simulator);
            } else if (text.includes('عتاد') || text.includes('حساس') || text.includes('hardware') || text.includes('sensor')) {
                showTip(ENG_MAGY_TIPS.hardware);
            } else if (text.includes('فكرة') || text.includes('مشروع') || text.includes('idea') || text.includes('capstone')) {
                showTip(ENG_MAGY_TIPS.idea);
            } else if (text.includes('تسليم') || text.includes('ملف') || text.includes('submit') || text.includes('doc')) {
                showTip(ENG_MAGY_TIPS.docs);
            } else if (text.includes('تقييم') || text.includes('اختبار') || text.includes('quiz') || text.includes('eval')) {
                showTip(ENG_MAGY_TIPS.evaluations);
            } else if (text.includes('متدرب') || text.includes('نقاش') || text.includes('trainee') || text.includes('forum')) {
                showTip(ENG_MAGY_TIPS.trainees);
            }
        };

        window.addEventListener('mouseover', handleMouseOver);
        return () => window.removeEventListener('mouseover', handleMouseOver);
    }, [isMuted, isMinimized]);

    const showTip = (tipObj) => {
        if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
        setActiveTip(tipObj);
        setBubbleVisible(true);

        autoHideTimerRef.current = setTimeout(() => {
            if (tipObj !== ENG_MAGY_TIPS.welcome) {
                setBubbleVisible(false);
            }
        }, 10000);
    };

    const handleMascotClick = () => {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 600);

        const nextQuote = RANDOM_MAGY_QUOTES[quoteIndex % RANDOM_MAGY_QUOTES.length];
        setQuoteIndex(prev => prev + 1);

        showTip({
            title: "ملاحظة تطبيقية",
            text: nextQuote
        });
    };

    if (isMinimized) {
        return (
            <div className="magy-mascot-minimized" onClick={() => setIsMinimized(false)} title="إظهار المهندسة ماجي">
                <div className="magy-mini-avatar">
                    <img src="/assets/maggie-mascot.png" alt="Eng. Magy" />
                </div>
                <div className="magy-mini-badge">
                    <span>م. ماجي</span>
                </div>
            </div>
        );
    }

    return (
        <aside className="magy-mascot-widget" aria-label="Eng. Magy Robotics Assistant">
            {/* Pure Floating Pop-up Text (No background box) */}
            {bubbleVisible && activeTip && (
                <div className="magy-speech-bubble magy-bubble-pop">
                    <div className="magy-bubble-header">
                        <div className="magy-avatar-title">
                            <strong>{activeTip.title || "م. ماجي"}</strong>
                        </div>
                        <button 
                            className="magy-close-bubble-btn" 
                            onClick={() => setBubbleVisible(false)}
                            title="إغلاق"
                        >
                            <X size={13} />
                        </button>
                    </div>

                    <p className="magy-bubble-text">
                        {activeTip.text}
                    </p>

                    <div className="magy-bubble-footer">
                        <span className="magy-sub-tag">NMU Engineering</span>
                        <button 
                            className="magy-next-tip-btn"
                            onClick={handleMascotClick}
                        >
                            <RefreshCw size={11} />
                            <span>ملاحظة أفقية</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Seamless Floating Animated Character SVG Style */}
            <div className="magy-mascot-container">
                <div className="magy-controls-bar">
                    <button 
                        className={`magy-control-btn ${isMuted ? 'active' : ''}`}
                        onClick={() => setIsMuted(!isMuted)}
                        title={isMuted ? "تفعيل الإرشادات" : "كتم الإرشادات"}
                    >
                        {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>
                    <button 
                        className="magy-control-btn"
                        onClick={() => setIsMinimized(true)}
                        title="تصغير"
                    >
                        <Minus size={13} />
                    </button>
                </div>

                <div 
                    className={`magy-figure-wrapper ${isBouncing ? 'magy-bounce' : 'magy-float'}`}
                    onClick={handleMascotClick}
                    title="المهندسة ماجي - اضغط للحصول على ملاحظة معملية"
                >
                    <img 
                        src="/assets/maggie-mascot.png" 
                        alt="Eng. Magy - NMU Robotics Assistant" 
                        className="magy-image"
                    />
                </div>
            </div>
        </aside>
    );
}
