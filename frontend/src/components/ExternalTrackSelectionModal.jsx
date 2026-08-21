import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import {
    Layers, CheckCircle2, Building2, Sparkles, Loader2,
    Globe, Link2, Calendar, Info, Check, ShieldCheck,
    FileCheck, Upload
} from 'lucide-react';

const OFFICIAL_PROVIDERS = [
    {
        id: 1,
        code: 'iti',
        name: 'Information Technology Institute (ITI)',
        name_ar: 'معهد تكنولوجيا المعلومات (ITI)',
        website_url: 'https://iti.gov.eg',
        linkedin_url: 'https://www.linkedin.com/school/information-technology-institute-iti/'
    },
    {
        id: 2,
        code: 'nti',
        name: 'National Telecommunication Institute (NTI)',
        name_ar: 'المعهد القومي للاتصالات (NTI)',
        website_url: 'https://nti.sci.eg',
        linkedin_url: 'https://www.linkedin.com/school/national-telecommunication-institute/'
    },
    {
        id: 3,
        code: 'creativa',
        name: 'Creativa Innovation Hubs',
        name_ar: 'مراكز إبداع مصر الرقمية (Creativa)',
        website_url: 'https://creativa.gov.eg',
        linkedin_url: 'https://www.linkedin.com/company/creativa-hubs/'
    },
    {
        id: 4,
        code: 'depi',
        name: 'Digital Egypt Pioneers Initiative (DEPI)',
        name_ar: 'مبادرة رواد مصر الرقمية (DEPI)',
        website_url: 'https://depi.gov.eg',
        linkedin_url: 'https://www.linkedin.com/company/digital-egypt-pioneers-initiative-depi/'
    }
];

const PREDEFINED_TRACKS = [
    {
        id: 'web_dev',
        en: 'Web Development (Front-End, Back-End, Full-Stack)',
        ar: 'تطوير تطبيقات ومواقع الويب (Front-End / Back-End / Full-Stack)',
        short: 'Web Development'
    },
    {
        id: 'mobile_dev',
        en: 'Mobile App Development (Flutter, React Native, Native iOS/Android)',
        ar: 'تطوير تطبيقات الموبايل (Flutter / React Native / Native iOS & Android)',
        short: 'Mobile App Development'
    },
    {
        id: 'ai_data',
        en: 'AI & Data Science (Machine Learning, Deep Learning, Data Analytics)',
        ar: 'الذكاء الاصطناعي وعلوم البيانات (Machine Learning / Deep Learning / Data Science)',
        short: 'AI & Data Science'
    },
    {
        id: 'cybersecurity',
        en: 'Cybersecurity & Ethical Hacking (Penetration Testing, InfoSec)',
        ar: 'الأمن السيبراني واختبار الاختراق وحماية المعلومات (Cybersecurity)',
        short: 'Cybersecurity & InfoSec'
    },
    {
        id: 'cloud_devops',
        en: 'Cloud Computing & DevOps (AWS, Azure, Docker, CI/CD)',
        ar: 'الحوسبة السحابية وهندسة العمليات (Cloud & DevOps)',
        short: 'Cloud & DevOps'
    },
    {
        id: 'embedded_iot',
        en: 'Embedded Systems & IoT (Microcontrollers, Robotics, Firmware)',
        ar: 'الأنظمة المدمجة وإنترنت الأشياء (Embedded Systems & IoT)',
        short: 'Embedded Systems & IoT'
    },
    {
        id: 'ui_ux',
        en: 'UI/UX Design & Product Design (Figma, Design Systems, UX Research)',
        ar: 'تصميم واجهات وتجربة المستخدم (UI/UX Design)',
        short: 'UI/UX Design'
    },
    {
        id: 'qa_testing',
        en: 'Software Quality Assurance & Testing (Automation, QA)',
        ar: 'اختبار وجودة البرمجيات (Software QA & Testing)',
        short: 'Software QA & Testing'
    },
    {
        id: 'game_dev',
        en: 'Game Design & Development (Unity, Unreal Engine)',
        ar: 'تطوير وتصميم الألعاب (Game Development)',
        short: 'Game Development'
    },
    {
        id: 'networks',
        en: 'Network Engineering & System Administration',
        ar: 'هندسة الشبكات وإدارة الأنظمة والبنية التحتية',
        short: 'Network Engineering'
    },
    {
        id: 'custom',
        en: '✏️ Other / Custom Technical Track (Type your own)',
        ar: '✏️ مسار تقني تخصصي آخر (كتابة مسار مخصص يدوي)',
        short: 'Custom Track'
    }
];

export default function ExternalTrackSelectionModal() {
    const { user, reloadSession } = useAuth();
    const { lang } = useI18n();

    const [selectedTrackKey, setSelectedTrackKey]         = useState('');
    const [customTrackInput, setCustomTrackInput]         = useState('');
    const [selectedProviderKey, setSelectedProviderKey]   = useState('');
    const [customProviderInput, setCustomProviderInput]   = useState('');
    const [customWebsiteInput, setCustomWebsiteInput]     = useState('');
    const [customLinkedinInput, setCustomLinkedinInput]   = useState('');
    const [noCompanyLinks, setNoCompanyLinks]             = useState(false);
    const [trainingStartDate, setTrainingStartDate]       = useState('');
    const [verificationFile, setVerificationFile]         = useState(null);
    const [saving, setSaving]                             = useState(false);
    const [errorMsg, setErrorMsg]                         = useState('');

    const isOpen = Boolean(user && user.role === 'trainee' && user.needs_track_selection);

    useEffect(() => {
        if (user?.pending_external_course) {
            const pec = user.pending_external_course;
            
            // Match existing track if any
            if (pec.final_track) {
                const foundTrack = PREDEFINED_TRACKS.find(t => t.short.toLowerCase() === pec.final_track.toLowerCase() || t.en.toLowerCase() === pec.final_track.toLowerCase());
                if (foundTrack) {
                    setSelectedTrackKey(foundTrack.id);
                } else {
                    setSelectedTrackKey('custom');
                    setCustomTrackInput(pec.final_track);
                }
            }

            // Match provider
            const pId = parseInt(pec.provider_id, 10);
            if (pId && [1, 2, 3, 4].includes(pId)) {
                setSelectedProviderKey(String(pId));
                const prov = OFFICIAL_PROVIDERS.find(p => p.id === pId);
                if (prov) {
                    setCustomProviderInput(prov.name);
                    setCustomWebsiteInput(prov.website_url);
                    setCustomLinkedinInput(prov.linkedin_url);
                }
            } else if (pec.custom_provider_name) {
                // Check if custom_provider_name matches an official provider
                const matched = OFFICIAL_PROVIDERS.find(p => 
                    pec.custom_provider_name.toLowerCase().includes(p.code) ||
                    pec.custom_provider_name.toLowerCase().includes(p.name.toLowerCase())
                );
                if (matched) {
                    setSelectedProviderKey(String(matched.id));
                    setCustomProviderInput(matched.name);
                    setCustomWebsiteInput(matched.website_url);
                    setCustomLinkedinInput(matched.linkedin_url);
                } else {
                    setSelectedProviderKey('other');
                    setCustomProviderInput(pec.custom_provider_name || '');
                    setCustomWebsiteInput(pec.custom_provider_website || '');
                    setCustomLinkedinInput(pec.custom_provider_linkedin || '');
                }
            } else {
                setSelectedProviderKey('');
            }

            // Start date
            if (pec.training_start_date) {
                setTrainingStartDate(pec.training_start_date);
            }
        }
    }, [user]);

    // Handle provider selection change
    const handleProviderChange = (e) => {
        const val = e.target.value;
        setSelectedProviderKey(val);

        if (val === 'other') {
            setCustomProviderInput('');
            setCustomWebsiteInput('');
            setCustomLinkedinInput('');
        } else if (val) {
            const provId = parseInt(val, 10);
            const prov = OFFICIAL_PROVIDERS.find(p => p.id === provId);
            if (prov) {
                setCustomProviderInput(prov.name);
                setCustomWebsiteInput(prov.website_url);
                setCustomLinkedinInput(prov.linkedin_url);
            }
        } else {
            setCustomProviderInput('');
            setCustomWebsiteInput('');
            setCustomLinkedinInput('');
        }
    };

    if (!isOpen) return null;

    const isOfficialProvider = ['1', '2', '3', '4'].includes(selectedProviderKey);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMsg('');

        let finalTrackName = '';
        if (selectedTrackKey === 'custom') {
            finalTrackName = customTrackInput.trim();
        } else {
            const found = PREDEFINED_TRACKS.find(t => t.id === selectedTrackKey);
            finalTrackName = found ? found.short : '';
        }

        if (!finalTrackName) {
            setErrorMsg(lang === 'ar' ? 'يرجى اختيار مسار من القائمة أو كتابة اسم المسار التخصصي.' : 'Please select a technical track from the list or type your track name.');
            return;
        }

        if (!selectedProviderKey) {
            setErrorMsg(lang === 'ar' ? 'يرجى تحديد جهة التدريب الخارجي.' : 'Please select your external training provider.');
            return;
        }

        if (selectedProviderKey === 'other' && !customProviderInput.trim()) {
            setErrorMsg(lang === 'ar' ? 'يرجى إدخال اسم جهة التدريب الخارجي.' : 'Please enter your external training provider name.');
            return;
        }

        if (!trainingStartDate) {
            setErrorMsg(lang === 'ar' ? 'يرجى تحديد تاريخ بدء التدريب الفعلي (مطلوب).' : 'Please enter your actual training start date (Required).');
            return;
        }

        if (!verificationFile) {
            setErrorMsg(lang === 'ar' ? 'يرجى رفع وثيقة إثبات التدريب الميداني الخارجي (مطلوبة).' : 'Please upload your external training verification document (Required).');
            return;
        }

        setSaving(true);
        try {
            const courseId = user.pending_external_course?.course_id || 0;
            const provId = isOfficialProvider ? parseInt(selectedProviderKey, 10) : null;

            const res = await fetch('/api/training/enrollments/save_track.php', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    course_id: courseId,
                    track_name: finalTrackName,
                    provider_id: provId,
                    custom_provider: customProviderInput.trim(),
                    custom_provider_website: customWebsiteInput.trim(),
                    custom_provider_linkedin: customLinkedinInput.trim(),
                    training_start_date: trainingStartDate
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                // If a verification file was provided, upload it immediately
                if (verificationFile) {
                    try {
                        const formData = new FormData();
                        formData.append('course_id', courseId || data.course_id);
                        formData.append('verification_file', verificationFile);
                        formData.append('custom_provider_name', customProviderInput.trim());
                        formData.append('custom_provider_website', customWebsiteInput.trim());
                        formData.append('custom_provider_linkedin', customLinkedinInput.trim());

                        await fetch('/api/training/verification/upload.php', {
                            method: 'POST',
                            credentials: 'include',
                            body: formData
                        });
                    } catch (uploadErr) {
                        console.error('Error uploading verification file:', uploadErr);
                    }
                }

                // Refresh auth session so modal immediately disappears
                await reloadSession();
            } else {
                setErrorMsg(data.error || (lang === 'ar' ? 'فشل حفظ المسار التدريبي.' : 'Failed to save technical track.'));
            }
        } catch (err) {
            console.error('Error saving technical track:', err);
            setErrorMsg(lang === 'ar' ? 'حدث خطأ في الاتصال بالسيرفر.' : 'Connection error. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ zIndex: 99999, backdropFilter: 'blur(10px)', background: 'rgba(15, 23, 42, 0.82)' }}>
            <div 
                className="modal-box" 
                style={{ 
                    maxWidth: '580px', 
                    borderRadius: '20px', 
                    padding: '2rem', 
                    maxHeight: '92vh',
                    overflowY: 'auto',
                    boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
            >
                {/* Header Badge & Title */}
                <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
                    <div 
                        style={{ 
                            width: '58px', 
                            height: '58px', 
                            borderRadius: '18px', 
                            background: 'linear-gradient(135deg, #2563eb, #7c3aed)', 
                            color: '#fff', 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.45)',
                            marginBottom: '0.85rem'
                        }}
                    >
                        <Layers size={30} />
                    </div>

                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.45rem 0', color: 'var(--text-0)' }}>
                        {lang === 'ar' ? 'بيانات ومسار التدريب الخارجي' : 'External Training Setup & Track Selection'}
                    </h2>
                    
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-2)', lineHeight: 1.55, margin: 0 }}>
                        {lang === 'ar'
                            ? 'نظراً لقيدك في برنامج التدريب الخارجي، يرجى تحديد مسارك التقني وتزويدنا ببيانات جهة التدريب وتاريخ البدء لاعتماد وتوثيق ساعاتك التدريبية.'
                            : 'Since you are enrolled in external training, please select your technical track, training provider with official links, and start date to verify your training.'}
                    </p>
                </div>

                {errorMsg && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '12px', fontSize: '0.88rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={16} />
                        <span>{errorMsg}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* 1. General Technical Track Dropdown */}
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-0)', marginBottom: '0.45rem' }}>
                            <Sparkles size={16} style={{ color: '#2563eb' }} />
                            {lang === 'ar' ? 'المسار التقني العام *' : 'General Technical Track *'}
                        </label>
                        <select
                            className="form-control"
                            value={selectedTrackKey}
                            onChange={e => setSelectedTrackKey(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem 0.95rem',
                                borderRadius: '12px',
                                border: '1.5px solid var(--border)',
                                fontSize: '0.92rem',
                                background: 'var(--bg-1)',
                                color: 'var(--text-0)',
                                outline: 'none',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            <option value="">{lang === 'ar' ? '-- اختر المسار التقني من القائمة --' : '-- Select General Technical Track --'}</option>
                            {PREDEFINED_TRACKS.map(t => (
                                <option key={t.id} value={t.id}>
                                    {lang === 'ar' ? t.ar : t.en}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Track Input if "custom" selected */}
                    {selectedTrackKey === 'custom' && (
                        <div className="form-group" style={{ margin: 0, animation: 'fadeIn 0.2s ease-in' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-0)', marginBottom: '0.35rem' }}>
                                {lang === 'ar' ? 'اكتب اسم المسار التقني التخصصي بالتحديد *:' : 'Specify Custom Technical Track Name *:'}
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={customTrackInput}
                                onChange={e => setCustomTrackInput(e.target.value)}
                                placeholder={lang === 'ar' ? 'مثال: Flutter & Firebase / Data Engineering / Robotics' : 'e.g. Flutter & Firebase, Data Engineering, Robotics'}
                                required
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.95rem',
                                    borderRadius: '12px',
                                    border: '1.5px solid #2563eb',
                                    fontSize: '0.92rem',
                                    background: 'var(--bg-1)',
                                    color: 'var(--text-0)'
                                }}
                            />
                        </div>
                    )}

                    {/* 2. Training Provider Dropdown */}
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-0)', marginBottom: '0.45rem' }}>
                            <Building2 size={16} style={{ color: '#0284c7' }} />
                            {lang === 'ar' ? 'جهة التدريب الخارجي (Trainer Provider) *' : 'Training Provider *'}
                        </label>
                        <select
                            className="form-control"
                            value={selectedProviderKey}
                            onChange={handleProviderChange}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem 0.95rem',
                                borderRadius: '12px',
                                border: '1.5px solid var(--border)',
                                fontSize: '0.92rem',
                                background: 'var(--bg-1)',
                                color: 'var(--text-0)',
                                outline: 'none',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            <option value="">{lang === 'ar' ? '-- اختر جهة التدريب --' : '-- Select Training Provider --'}</option>
                            <optgroup label={lang === 'ar' ? 'الجهات التدريبية الرسمية المعتمدة' : 'Official Accredited Providers'}>
                                {OFFICIAL_PROVIDERS.map(p => (
                                    <option key={p.id} value={String(p.id)}>
                                        {lang === 'ar' ? p.name_ar : p.name}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label={lang === 'ar' ? 'جهات وشركات أخرى' : 'Other Companies & Providers'}>
                                <option value="other">
                                    {lang === 'ar' ? '🏢 جهة تدريب أو شركة أخرى (إدخال يدوي)' : '🏢 Other Industry Provider / Company (Manual Input)'}
                                </option>
                            </optgroup>
                        </select>
                    </div>

                    {/* If "Other" selected, show Custom Provider Name input */}
                    {selectedProviderKey === 'other' && (
                        <div className="form-group" style={{ margin: 0, animation: 'fadeIn 0.2s ease-in' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-0)', marginBottom: '0.35rem' }}>
                                {lang === 'ar' ? 'اسم جهة / شركة التدريب الخارجي *:' : 'Company / Provider Name *:'}
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={customProviderInput}
                                onChange={e => setCustomProviderInput(e.target.value)}
                                placeholder={lang === 'ar' ? 'مثال: Vodafone, Orange, Valeo, شركة...' : 'e.g. Vodafone, Orange, Valeo, Tech Company...'}
                                required
                                autoFocus
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 0.95rem',
                                    borderRadius: '12px',
                                    border: '1.5px solid var(--border)',
                                    fontSize: '0.92rem',
                                    background: 'var(--bg-1)',
                                    color: 'var(--text-0)'
                                }}
                            />
                        </div>
                    )}

                    {/* Official Links (Auto-filled for official providers, editable for other) */}
                    {selectedProviderKey && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem', background: isOfficialProvider ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-2)', borderRadius: '14px', border: isOfficialProvider ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isOfficialProvider ? '#2563eb' : 'var(--text-1)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {isOfficialProvider ? <ShieldCheck size={16} /> : <Link2 size={16} />}
                                    {isOfficialProvider 
                                        ? (lang === 'ar' ? 'الروابط الرسمية المعتمدة لجهة التدريب (معبأة تلقائياً)' : 'Verified Official Provider Links (Auto-filled)')
                                        : (lang === 'ar' ? 'الروابط الرسمية لجهة التدريب' : 'Official Provider Links')}
                                </span>
                                {isOfficialProvider && (
                                    <span style={{ fontSize: '0.74rem', background: '#2563eb', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                                        {lang === 'ar' ? 'موثق رسمياً' : 'Verified'}
                                    </span>
                                )}
                            </div>

                            {/* Official Website Link */}
                            <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.25rem' }}>
                                    <Globe size={13} style={{ color: '#2563eb' }} />
                                    {lang === 'ar' ? 'رابط الموقع الإلكتروني الرسمي (Official Website):' : 'Official Website URL:'}
                                </label>
                                <input
                                    type="url"
                                    className="form-control"
                                    value={customWebsiteInput}
                                    onChange={e => setCustomWebsiteInput(e.target.value)}
                                    placeholder={noCompanyLinks ? (lang === 'ar' ? 'الشركة ليس لديها روابط' : 'Company has no links') : "https://..."}
                                    readOnly={isOfficialProvider || noCompanyLinks}
                                    disabled={noCompanyLinks}
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        fontSize: '0.88rem',
                                        background: (isOfficialProvider || noCompanyLinks) ? 'var(--bg-0)' : 'var(--bg-1)',
                                        color: noCompanyLinks ? 'var(--text-muted)' : 'var(--text-0)',
                                        cursor: (isOfficialProvider || noCompanyLinks) ? 'not-allowed' : 'text',
                                        opacity: noCompanyLinks ? 0.6 : 1
                                    }}
                                />
                            </div>

                            {/* Official LinkedIn Link */}
                            <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.25rem' }}>
                                    <Link2 size={13} style={{ color: '#0284c7' }} />
                                    {lang === 'ar' ? 'رابط صفحة LinkedIn أو المنصة الرسمية:' : 'Official LinkedIn / Platform Profile URL:'}
                                </label>
                                <input
                                    type="url"
                                    className="form-control"
                                    value={customLinkedinInput}
                                    onChange={e => setCustomLinkedinInput(e.target.value)}
                                    placeholder={noCompanyLinks ? (lang === 'ar' ? 'الشركة ليس لديها روابط' : 'Company has no links') : "https://linkedin.com/company/..."}
                                    readOnly={isOfficialProvider || noCompanyLinks}
                                    disabled={noCompanyLinks}
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: '10px',
                                        border: '1px solid var(--border)',
                                        fontSize: '0.88rem',
                                        background: (isOfficialProvider || noCompanyLinks) ? 'var(--bg-0)' : 'var(--bg-1)',
                                        color: noCompanyLinks ? 'var(--text-muted)' : 'var(--text-0)',
                                        cursor: (isOfficialProvider || noCompanyLinks) ? 'not-allowed' : 'text',
                                        opacity: noCompanyLinks ? 0.6 : 1
                                    }}
                                />
                            </div>

                            {/* Checkbox: The company has no links */}
                            {!isOfficialProvider && (
                                <div style={{ marginTop: '0.35rem', paddingTop: '0.45rem', borderTop: '1px dashed var(--border)' }}>
                                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-1)', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={noCompanyLinks}
                                            onChange={e => {
                                                const checked = e.target.checked;
                                                setNoCompanyLinks(checked);
                                                if (checked) {
                                                    setCustomWebsiteInput('');
                                                    setCustomLinkedinInput('');
                                                }
                                            }}
                                            style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                                        />
                                        <span>{lang === 'ar' ? 'الشركة ليس لديها روابط (The company has no links)' : 'The company has no links'}</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 3. Training Started Date Field with Explanatory Note */}
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-0)', marginBottom: '0.35rem' }}>
                            <Calendar size={16} style={{ color: '#f59e0b' }} />
                            {lang === 'ar' ? 'تاريخ بدء التدريب (Started Date) *' : 'Training Start Date *'}
                        </label>
                        <input
                            type="date"
                            className="form-control"
                            value={trainingStartDate}
                            onChange={e => setTrainingStartDate(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '0.75rem 0.95rem',
                                borderRadius: '12px',
                                border: '1.5px solid var(--border)',
                                fontSize: '0.92rem',
                                background: 'var(--bg-1)',
                                color: 'var(--text-0)',
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        />

                        {/* Explanatory Note Callout */}
                        <div 
                            style={{ 
                                marginTop: '0.55rem', 
                                padding: '0.7rem 0.85rem', 
                                borderRadius: '10px', 
                                background: 'rgba(245, 158, 11, 0.08)', 
                                border: '1px solid rgba(245, 158, 11, 0.25)', 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: '8px' 
                            }}
                        >
                            <Info size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ margin: 0, fontSize: '0.81rem', color: 'var(--text-1)', lineHeight: 1.45 }}>
                                {lang === 'ar'
                                    ? 'ملاحظة: هذا التاريخ يمثل التاريخ الفعلي الذي بدأت فيه فترة تدريبك العملي لدى جهة التدريب، ويُستخدم لتوثيق فترتك وساعاتك التدريبية بشكل رسمي.'
                                    : 'Note: This represents the actual date you commenced your practical training with this provider, used to officially document your training timeline and hours.'}
                            </p>
                        </div>
                    </div>

                    {/* 4. External Training Verification Document (Required) */}
                    <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-0)', marginBottom: '0.35rem' }}>
                            <FileCheck size={16} style={{ color: '#10b981' }} />
                            {lang === 'ar' ? 'وثيقة إثبات التدريب الميداني الخارجي (Verification Document) *' : 'External Training Verification Document *'}
                        </label>

                        <div 
                            style={{ 
                                position: 'relative',
                                border: verificationFile ? '1.5px solid #10b981' : '1.5px dashed var(--border)',
                                borderRadius: '12px',
                                padding: '1rem',
                                textAlign: 'center',
                                background: verificationFile ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-1)',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            }}
                        >
                            <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.docx,.doc"
                                required
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) setVerificationFile(file);
                                }}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    opacity: 0,
                                    cursor: 'pointer',
                                    width: '100%',
                                    height: '100%'
                                }}
                            />
                            <Upload size={24} style={{ color: verificationFile ? '#10b981' : 'var(--text-2)', margin: '0 auto 6px auto', display: 'block' }} />
                            {verificationFile ? (
                                <div>
                                    <strong style={{ color: '#10b981', display: 'block', fontSize: '0.9rem' }}>✓ {verificationFile.name}</strong>
                                    <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>({(verificationFile.size / 1024).toFixed(1)} KB)</span>
                                </div>
                            ) : (
                                <div>
                                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-0)' }}>
                                        {lang === 'ar' ? 'اضغط لاختيار الوثيقة أو اسحب الملف هنا *' : 'Click to select or drag document here *'}
                                    </p>
                                    <span style={{ fontSize: '0.76rem', color: 'var(--text-2)' }}>PDF, PNG, JPG, DOCX (Max 25MB)</span>
                                </div>
                            )}
                        </div>

                        {/* Note with Examples as requested */}
                        <div 
                            style={{ 
                                marginTop: '0.55rem', 
                                padding: '0.7rem 0.85rem', 
                                borderRadius: '10px', 
                                background: 'rgba(16, 185, 129, 0.08)', 
                                border: '1px solid rgba(16, 185, 129, 0.25)', 
                                display: 'flex', 
                                alignItems: 'flex-start', 
                                gap: '8px' 
                            }}
                        >
                            <Info size={16} style={{ color: '#059669', flexShrink: 0, marginTop: '2px' }} />
                            <p style={{ margin: 0, fontSize: '0.81rem', color: 'var(--text-1)', lineHeight: 1.45 }}>
                                {lang === 'ar'
                                    ? 'ملاحظة: يمكنك رفع مستند إثبات التدريب (أمثلة: شهادة إتمام التدريب، إيميل القبول أو الموافقة، خطاب/إفادة رسمية مختومة وموقعة من جهة التدريب، أو أي ورقة رسمية تثبت التدريب).'
                                    : 'Note: You can upload your training verification document (Examples: Certificate or Approval mail, signed paper from external provider or any other official paper).'}
                            </p>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={
                            saving || 
                            !selectedTrackKey || 
                            (selectedTrackKey === 'custom' && !customTrackInput.trim()) ||
                            !selectedProviderKey ||
                            (selectedProviderKey === 'other' && !customProviderInput.trim()) ||
                            !trainingStartDate ||
                            !verificationFile
                        }
                        style={{
                            width: '100%',
                            padding: '0.85rem 1.25rem',
                            borderRadius: '14px',
                            fontSize: '0.98rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            marginTop: '0.4rem',
                            boxShadow: '0 10px 20px -5px rgba(37, 99, 235, 0.4)'
                        }}
                    >
                        {saving ? (
                            <>
                                <Loader2 className="spin" size={18} />
                                {lang === 'ar' ? 'جاري حفظ واعتماد البيانات...' : 'Saving & Confirming Details...'}
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} />
                                {lang === 'ar' ? 'تأكيد وحفظ بيانات التدريب' : 'Confirm & Save Training Setup'}
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
