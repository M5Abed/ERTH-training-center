import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import './EngMagyMascot.css';

// Egyptian dialect, professional engineering lecturer, zero emojis
const ENG_MAGY_TIPS = {
    welcome: {
        title: "المهندسة ماجي",
        text: "يا أهلا بالمهندسين في معمل الروبوتات والأنظمة الذاتية. ركزوا معايا عشان هنمشي على المعايير الهندسية بالمللي في الكورس ده."
    },
    topics: {
        title: "المنهج والوحدات",
        text: "المنهج هنا مش مجرد نظري، هندخل في تفاصيل تحويلات الحركة (Kinematics) لحد ما نوصل لبيئة ROS2، عايز تركيز عالي."
    },
    simulator: {
        title: "مختبر الكود والمحاكاة",
        text: "بلاش نجرب في الهاردوير على طول ونحرق الدنيا، الكود بيتجرب الأول في المحاكي عشان نتأكد من إشارات الـ PWM وحلقات الـ PID."
    },
    idea: {
        title: "مشاريع التخرج",
        text: "مشاريع التخرج مش مجرد فكرة حلوة، لازم تحل مشكلة حقيقية زي التتبع والملاحة باستخدام الـ SLAM وتكون المعمارية مظبوطة."
    },
    docs: {
        title: "التوثيق الهندسي",
        text: "التوثيق ده نص الشغل، لازم تسلم الـ SRS ومخططات الدوائر مظبوطة مع الكود، المهندس الشاطر شغله مترتب."
    },
    evaluations: {
        title: "التقييمات والاختبارات",
        text: "التقييمات دي عشان نتأكد إنك هضمت الكينماتيكا العكسية واستجابة الأنظمة الخطية، استعدوا كويس للمناقشة."
    },
    trainees: {
        title: "إدارة المتدربين",
        text: "هنا كشف بأسماء الباشمهندسين المسجلين معانا. نقدر نتابع تقدمهم، نضيف ناس جديدة، أو نرفع كشف الإكسيل الخاص بالدفعة."
    },
    materials: {
        title: "المراجع والمخططات",
        text: "المراجع والمخططات موجودة كلها، راجعوها كويس قبل ما تبدأوا أي تجربة عملية في المعمل."
    },
    certificate: {
        title: "الشهادة الأكاديمية",
        text: "الشهادة دي مش مجرد ورقة، دي إثبات إنك خلصت كل التكليفات ونجحت في مناقشة المشروع النهائي بامتياز."
    }
};

const RANDOM_MAGY_QUOTES = [
    "دايماً اعمل Calibration للحساسات قبل ما تقيس زاوية الميل، الغلطة بفورة.",
    "لو الـ Serial Communication مش شغال، راجع الـ Baud Rate الأول قبل ما تشك في المعالج.",
    "تظبيط الـ Kp والـ Ki في الـ PID Controller محتاج صبر وتجربة، مفيش حاجة بتيجي من أول مرة.",
    "ماتنساش المكثفات على أطراف مواتير الـ DC عشان نقلل التشويش على إشارات الـ PWM.",
    "الـ ROS2 بيسهل عليك تفصل الـ Nodes عن بعضها وتختبر كل حساس لوحده، ريح دماغك واستخدمه صح.",
    "افصل باور المواتير عن باور المعالج، بس اوعى تنسى توصل الـ Common GND عشان متطيرش البوردة."
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

    const [activeTip, setActiveTip] = useState(ENG_MAGY_TIPS.welcome);
    const [bubbleVisible, setBubbleVisible] = useState(true);
    const [isBouncing, setIsBouncing] = useState(false);
    const [quoteIndex, setQuoteIndex] = useState(0);

    const autoHideTimerRef = useRef(null);

    useEffect(() => {
        const handleMouseOver = (e) => {
            const target = e.target.closest('[data-magy-tip], [data-magy-key], .nav-tab, .course-tab-btn, input, select, .card');
            if (!target) return;

            const customTip = target.getAttribute('data-magy-tip');
            const customTitle = target.getAttribute('data-magy-title');
            if (customTip) {
                showTip({
                    title: customTitle || "ملاحظة هندسية",
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
    }, []);

    const showTip = (tipObj) => {
        if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
        setActiveTip(tipObj);
        setBubbleVisible(true);

        autoHideTimerRef.current = setTimeout(() => {
            setBubbleVisible(false);
        }, 10000);
    };

    const handleMascotClick = () => {
        setIsBouncing(true);
        setTimeout(() => setIsBouncing(false), 600);

        const nextQuote = RANDOM_MAGY_QUOTES[quoteIndex % RANDOM_MAGY_QUOTES.length];
        setQuoteIndex(prev => prev + 1);

        showTip({
            title: "ملاحظة معملية",
            text: nextQuote
        });
    };

    return (
        <aside className="magy-mascot-widget" aria-label="Eng. Magy Robotics Assistant">
            {bubbleVisible && activeTip && (
                <div className="magy-speech-bubble magy-bubble-pop">
                    <div className="magy-bubble-header">
                        <div className="magy-avatar-title">
                            <strong>{activeTip.title || "المهندسة ماجي"}</strong>
                        </div>
                    </div>
                    <p className="magy-bubble-text">
                        {activeTip.text}
                    </p>
                </div>
            )}

            <div className="magy-mascot-container">
                <div 
                    className={`magy-figure-wrapper ${isBouncing ? 'magy-bounce' : 'magy-float'}`}
                    onClick={handleMascotClick}
                    title="المهندسة ماجي - اضغط للحصول على ملاحظة"
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
