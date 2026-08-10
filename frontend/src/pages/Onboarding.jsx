import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { updateUserSkills, updateUserPreferences, upsertUserProfile } from '../services/api';
import { SKILLS_CATALOG, COURSES_BY_FACULTY, MAJORS_BY_FACULTY, COURSES_BY_MAJOR } from '../data/constants';
import { Check, ChevronRight, ChevronDown, Sparkles, BookOpen, X, Upload, Linkedin, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import './Onboarding.css';

/**
 * Extract all text from a PDF file (File object) using pdf.js.
 * Returns a single string of all text content from all pages.
 */
async function extractTextFromPDF(file) {
    const pdfjsLib = await import('pdfjs-dist');
    if (pdfjsLib.GlobalWorkerOptions) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
    const arrayBuffer = await file.arrayBuffer();
    // Use Uint8Array which is safer for the pdf.js API
    const data = new Uint8Array(arrayBuffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items
            .map(item => item.str || '')
            .filter(str => str.trim().length > 0);
        pages.push(strings.join(' '));
    }
    return pages.join('\n');
}

/**
 * Fuzzy-match extracted PDF text against SKILLS_CATALOG.
 * Returns an array of matched skill IDs.
 */
function matchSkillsFromText(text) {
    const normalizedText = text.toLowerCase();
    const matched = [];

    // Build lookup aliases for better matching
    const aliases = {
        'html_css': ['html', 'css', 'html/css', 'html5', 'css3'],
        'ml': ['machine learning'],
        'deep_learning': ['deep learning'],
        'nlp': ['natural language processing', 'nlp'],
        'cv': ['computer vision'],
        'data_mining': ['data mining'],
        'big_data': ['big data'],
        'ui_ux': ['ui/ux', 'ui design', 'ux design', 'user interface', 'user experience'],
        'rest_api': ['rest api', 'restful', 'rest apis'],
        'cicd': ['ci/cd', 'continuous integration', 'continuous deployment'],
        'acad_writing': ['academic writing'],
        'lit_review': ['literature review'],
        'data_collect': ['data collection'],
        'stat_analysis': ['statistical analysis'],
        'res_method': ['research methodology'],
        'prob_solving': ['problem solving', 'problem-solving'],
        'time_mgmt': ['time management'],
        'crit_think': ['critical thinking'],
        'project_mgmt': ['project management'],
        'net_sec': ['network security'],
        'pen_test': ['penetration testing'],
        'med_imaging': ['medical imaging'],
        'clin_data': ['clinical data'],
        'lin_alg': ['linear algebra'],
        'num_methods': ['numerical methods'],
        'discrete': ['discrete math', 'discrete mathematics'],
        'plc_programming': ['plc programming', 'plc'],
        'finite_element': ['finite element', 'fea'],
        'cad_design': ['cad design', 'cad'],
        'lab_research': ['laboratory research', 'lab research'],
        'organic_chemistry': ['organic chemistry'],
        'cell_biology': ['cell biology'],
        'molecular_biology': ['molecular biology'],
        'forensic_analysis': ['forensic analysis', 'forensics'],
        'experimental_design': ['experimental design'],
        'chemical_analysis': ['chemical analysis'],
        'financial_modeling': ['financial modeling', 'financial modelling'],
        'market_analysis': ['market analysis'],
        'strategic_planning': ['strategic planning'],
        'sales_strategy': ['sales strategy'],
        'digital_marketing': ['digital marketing'],
        'supply_chain': ['supply chain'],
        'investment_analysis': ['investment analysis'],
        'hr_management': ['human resources', 'hr management'],
        'operations_mgmt': ['operations management'],
        'power_systems': ['power systems'],
        'signal_processing': ['signal processing'],
        'control_systems': ['control systems'],
        'materials_science': ['materials science'],
        'embedded_systems': ['embedded systems'],
        'architecture_design': ['architecture design', 'architectural design'],
        'structural_analysis': ['structural analysis'],
        'electrical_circuits': ['electrical circuits'],
        'circuit_design': ['circuit design'],
        'fluid_mechanics': ['fluid mechanics'],
        'frontend_dev': ['frontend developer', 'front-end developer', 'front end developer'],
        'backend_dev': ['backend developer', 'back-end developer', 'back end developer'],
        'fullstack_dev': ['full stack developer', 'fullstack developer', 'full-stack developer'],
        'mobile_dev': ['mobile developer'],
        'ui_ux_designer': ['ui/ux designer', 'ux designer', 'ui designer'],
        'data_analyst': ['data analyst'],
        'data_scientist': ['data scientist'],
        'devops_eng': ['devops engineer'],
        'product_manager': ['product manager'],
        'project_manager': ['project manager'],
        'research_analyst': ['research analyst'],
        'content_writer': ['content writer', 'content writing'],
        'business_analyst': ['business analyst', 'business analysis'],
        'tech_lead': ['tech lead', 'technical lead'],
        'react_native': ['react native'],
    };

    // Very short skill names need exact word boundary matching
    const shortNames = new Set(['r_lang', 'go', 'sql', 'git', 'php', 'aws']);

    for (const skill of SKILLS_CATALOG) {
        const id = skill.id;
        const skillName = skill.en.toLowerCase();

        // Check aliases first
        if (aliases[id]) {
            const found = aliases[id].some(alias => {
                const regex = new RegExp('\\b' + alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
                return regex.test(normalizedText);
            });
            if (found) { matched.push(id); continue; }
        }

        // For short names (≤2 chars), require exact word boundary
        if (shortNames.has(id) || skillName.length <= 2) {
            const regex = new RegExp('\\b' + skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
            if (regex.test(normalizedText)) { matched.push(id); }
        } else {
            // Standard match: check if skill name appears in text
            const regex = new RegExp('\\b' + skillName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
            if (regex.test(normalizedText)) { matched.push(id); }
        }
    }
    return [...new Set(matched)];
}

export default function Onboarding() {
    const { t, lang } = useI18n();
    const { user, profile, refreshProfile } = useAuth();
    const navigate = useNavigate();

    // Redirect admins and trainers away from Onboarding screen
    useEffect(() => {
        const role = user?.role || profile?.role;
        const isAdmin = !!(user?.is_admin || user?.role === 'admin' || profile?.is_admin || profile?.role === 'admin' || role === 'admin');
        const isTrainer = role === 'trainer';

        if (isAdmin || isTrainer) {
            navigate('/courses', { replace: true });
        }
    }, [user, profile, navigate]);

    // Initialize state with existing profile data if available
    const initialSkills = useMemo(() => {
        const sm = {};
        if (profile?.user_skills) {
            profile.user_skills.forEach(sk => {
                sm[sk.skill_id] = sk.proficiency === 5 ? 3 : sk.proficiency >= 3 ? 2 : 1;
            });
        }
        return sm;
    }, [profile]);

    const [step, setStep] = useState(0);
    const [skills, setSkills] = useState(initialSkills);
    const [search, setSearch] = useState('');
    const [openCats, setOpenCats] = useState({});
    const [pressure, setPressure] = useState(profile?.working_prefs?.pressure || 3);
    const [leadership, setLeadership] = useState(profile?.working_prefs?.leadership || 3);
    const [execution, setExecution] = useState(profile?.working_prefs?.execution || 3);
    const [hours, setHours] = useState(profile?.working_prefs?.hours_per_week || 10);
    const [prefTypes, setPrefTypes] = useState(profile?.working_prefs?.preferred_types || []);
    const [saving, setSaving] = useState(false);

    // LinkedIn PDF import state
    const [linkedinOpen, setLinkedinOpen] = useState(false);
    const [linkedinStatus, setLinkedinStatus] = useState('idle'); // idle | loading | success | error
    const [linkedinResult, setLinkedinResult] = useState(null); // { matched: number, raw: string[] }
    const fileInputRef = useRef(null);

    // Courses + Major state
    const [enrolledCourses, setEnrolledCourses] = useState(profile?.enrolled_courses || []);
    const [customCourse, setCustomCourse] = useState('');
    const [major, setMajor] = useState(profile?.major || '');

    // Sync profile state when loaded asynchronously
    useEffect(() => {
        if (profile) {
            if (profile.user_skills && profile.user_skills.length > 0) {
                const sm = {};
                profile.user_skills.forEach(sk => {
                    sm[sk.skill_id] = sk.proficiency === 5 ? 3 : sk.proficiency >= 3 ? 2 : 1;
                });
                setSkills(prev => Object.keys(prev).length === 0 ? sm : prev);
            }
            if (profile.working_prefs) {
                if (profile.working_prefs.pressure) setPressure(profile.working_prefs.pressure);
                if (profile.working_prefs.leadership) setLeadership(profile.working_prefs.leadership);
                if (profile.working_prefs.execution) setExecution(profile.working_prefs.execution);
                if (profile.working_prefs.hours_per_week) setHours(profile.working_prefs.hours_per_week);
                if (profile.working_prefs.preferred_types) setPrefTypes(profile.working_prefs.preferred_types);
            }
            if (profile.enrolled_courses && profile.enrolled_courses.length > 0) {
                setEnrolledCourses(prev => prev.length === 0 ? profile.enrolled_courses : prev);
            }
            if (profile.major) {
                setMajor(prev => !prev ? profile.major : prev);
            }
        }
    }, [profile]);

    // Get available courses based on user's college
    const userCollege = profile?.college_key || '';
    const availableCourses = useMemo(() => {
        if (major && COURSES_BY_MAJOR && COURSES_BY_MAJOR[major]) {
            return COURSES_BY_MAJOR[major];
        }
        return COURSES_BY_FACULTY[userCollege] || [];
    }, [userCollege, major]);

    // Get available majors based on user's college
    const availableMajors = useMemo(() => {
        return MAJORS_BY_FACULTY[userCollege] || [];
    }, [userCollege]);

    // Show ALL skills from ALL faculties — grouped by category
    const categories = useMemo(() => {
        const cats = {};
        SKILLS_CATALOG.forEach(s => {
            const catName = lang === 'ar' ? s.cat_ar : s.cat_en;
            if (!cats[catName]) cats[catName] = [];
            cats[catName].push(s);
        });
        return cats;
    }, [lang]);


    const filteredCats = useMemo(() => {
        if (!search) return categories;
        const q = search.toLowerCase();
        const result = {};
        Object.entries(categories).forEach(([cat, items]) => {
            const filtered = items.filter(s => s.en.toLowerCase().includes(q) || s.ar.includes(q));
            if (filtered.length) result[cat] = filtered;
        });
        return result;
    }, [categories, search]);

    const toggleSkill = (id) => {
        setSkills(prev => {
            const current = prev[id] || 0;
            if (current >= 3) { const next = { ...prev }; delete next[id]; return next; }
            return { ...prev, [id]: current + 1 };
        });
    };

    const levelLabel = (lvl) => [t('skill_level_1'), t('skill_level_2'), t('skill_level_3')][lvl - 1] || '';
    const levelColor = (lvl) => ['var(--amber)', 'var(--teal)', 'var(--indigo)'][lvl - 1] || '';

    // Add a course from dropdown
    const addCourse = (course) => {
        if (course && !enrolledCourses.includes(course)) {
            setEnrolledCourses(prev => [...prev, course]);
        }
    };

    // Add custom course
    const addCustomCourse = () => {
        const trimmed = customCourse.trim();
        if (trimmed && !enrolledCourses.includes(trimmed)) {
            setEnrolledCourses(prev => [...prev, trimmed]);
            setCustomCourse('');
        }
    };

    // Remove a course
    const removeCourse = (course) => {
        setEnrolledCourses(prev => prev.filter(c => c !== course));
    };

    const handleSaveSkills = async () => {
        setSaving(true);
        const proficiencyMap = { 1: 1, 2: 3, 3: 5 }; // UI 1-3 → DB 1-5
        const skillsArr = Object.entries(skills).map(([id, level]) => ({
            skill_id: id,
            proficiency: proficiencyMap[level] || level,
        }));
        await updateUserSkills(skillsArr);
        // Save major and enrolled courses to profile
        if (major || enrolledCourses.length) {
            await upsertUserProfile({
                major: major || undefined,
                enrolled_courses: enrolledCourses.length ? enrolledCourses : undefined,
            });
        }
        setSaving(false);
        setStep(1);
    };

    const handleSavePrefs = async () => {
        setSaving(true);
        await updateUserPreferences({ pressure, leadership, execution, hours_per_week: hours, preferred_types: prefTypes });
        await refreshProfile();
        setSaving(false);
        setStep(2);
    };

    const togglePrefType = (type) => {
        setPrefTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
    };

    // ── LinkedIn PDF handler ──────────────────────────────────
    const handleLinkedInPDF = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') {
            setLinkedinStatus('error');
            setLinkedinResult({ matched: 0, raw: [], error: lang === 'ar' ? 'يرجى تحميل ملف PDF فقط' : 'Please upload a PDF file' });
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setLinkedinStatus('error');
            setLinkedinResult({ matched: 0, raw: [], error: lang === 'ar' ? 'الملف كبير جداً (الحد الأقصى 10 ميغابايت)' : 'File too large (max 10MB)' });
            return;
        }
        setLinkedinStatus('loading');
        try {
            const text = await extractTextFromPDF(file);
            console.log("PDF text extracted successfully.", text ? text.substring(0, 50) + "..." : "Empty text");
            const matchedIds = matchSkillsFromText(text);
            console.log("Matched skill IDs:", matchedIds);
            // Auto-select matched skills at level 1 (Beginner)
            setSkills(prev => {
                const next = { ...prev };
                matchedIds.forEach(id => { if (!next[id]) next[id] = 1; });
                return next;
            });
            setLinkedinStatus('success');
            setLinkedinResult({ matched: matchedIds.length, raw: matchedIds });
        } catch (err) {
            console.error('PDF parse detailed error:', err);
            console.error('Error name:', err.name);
            console.error('Error message:', err.message);
            console.error('Error stack:', err.stack);
            setLinkedinStatus('error');
            setLinkedinResult({ matched: 0, raw: [], error: lang === 'ar' ? `تعذر قراءة الملف: ${err.message}` : `Could not read this file: ${err.message}` });
        }
        // Reset file input so the same file can be re-uploaded
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [lang]);

    return (
        <div className="onboarding">
            {/* Progress bar */}
            <div className="ob-progress">
                {[t('step_skills'), t('step_style'), t('step_done')].map((label, i) => (
                    <div key={i} className={`ob-step ${i <= step ? 'ob-step--active' : ''} ${i < step ? 'ob-step--done' : ''}`}>
                        <div className="ob-step-dot">{i < step ? <Check size={14} /> : i + 1}</div>
                        <span className="ob-step-label">{label}</span>
                    </div>
                ))}
                <div className="ob-progress-bar"><div className="ob-progress-fill" style={{ width: `${(step / 2) * 100}%` }} /></div>
            </div>

            <div className="ob-header">
                <h1>{t('onboarding_title')}</h1>
                <p>{t('onboarding_subtitle')}</p>
            </div>

            {step === 0 && (<div className="ob-section animate-fade-in">

                <h2>{t('pick_skills')}</h2>
                <p className="ob-hint">{t('skill_level_hint')}</p>
                <input className="ob-search" type="text" placeholder={t('search') + '...'} value={search} onChange={e => setSearch(e.target.value)} />
                <div className="ob-skills">
                    {Object.entries(filteredCats).map(([cat, items]) => {
                        const selectedCount = items.filter(s => skills[s.id]).length;
                        const isOpen = search ? true : !!openCats[cat];
                        return (
                        <div key={cat} className={`ob-cat ${isOpen ? 'ob-cat--open' : ''}`}>
                            <div
                                className="ob-cat-header"
                                role="button"
                                tabIndex={0}
                                onClick={() => setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] }))}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenCats(prev => ({ ...prev, [cat]: !prev[cat] })); } }}
                                style={{ position: 'relative', zIndex: 2 }}
                            >
                                <ChevronDown size={16} className={`ob-cat-chevron ${isOpen ? 'ob-cat-chevron--open' : ''}`} />
                                <span className="ob-cat-title">{cat}</span>
                                {selectedCount > 0 && <span className="ob-cat-count">{selectedCount}</span>}
                            </div>
                            {isOpen && (
                            <div className="ob-cat-skills">
                                {items.map(s => {
                                    const lvl = skills[s.id] || 0;
                                    return (
                                        <button key={s.id} className={`ob-skill-btn ${lvl > 0 ? 'ob-skill-btn--active' : ''}`} onClick={() => toggleSkill(s.id)}
                                            style={lvl > 0 ? { borderColor: levelColor(lvl), background: `${levelColor(lvl)}12`, color: levelColor(lvl) } : {}}>
                                            <span className="ob-skill-name">{lang === 'ar' ? s.ar : s.en}</span>
                                            {lvl > 0 && <span className="ob-skill-level" style={{ color: levelColor(lvl) }}>{levelLabel(lvl)}</span>}
                                        </button>
                                    );
                                })}
                            </div>
                            )}
                        </div>
                        );
                    })}
                </div>

                {/* Major input (#7) */}
                <div className="ob-extra-section">
                    <h3 className="ob-section-title">
                        <BookOpen size={18} />
                        {lang === 'ar' ? 'التخصص والمقررات' : 'Major & Enrolled Courses'}
                    </h3>

                    <div className="ob-field-group">
                        <label className="ob-field-label">{lang === 'ar' ? 'التخصص' : 'Your Major'}</label>
                        {availableMajors.length > 0 ? (
                            <>
                                <select
                                    className="ob-field-select"
                                    value={availableMajors.some(m => m.value === major) ? major : (major ? 'other' : '')}
                                    onChange={e => {
                                        if (e.target.value === 'other') setMajor('');
                                        else setMajor(e.target.value);
                                    }}
                                >
                                    <option value="">{lang === 'ar' ? 'اختر تخصصك...' : 'Select your major...'}</option>
                                    {availableMajors.map(m => (
                                        <option key={m.value} value={m.value}>{lang === 'ar' ? m.label_ar : m.label}</option>
                                    ))}
                                    <option value="other">{lang === 'ar' ? 'أخرى (كتابة يدوية)' : 'Other (Manual entry)'}</option>
                                </select>

                                {/* Show text input if "other" is selected or if existing major is not in the list */}
                                {(!availableMajors.some(m => m.value === major) && major !== '') && (
                                    <input
                                        type="text"
                                        className="ob-field-input"
                                        style={{ marginTop: '0.5rem' }}
                                        placeholder={lang === 'ar' ? 'اكتب تخصصك هنا...' : 'Type your major here...'}
                                        value={major}
                                        onChange={e => setMajor(e.target.value)}
                                    />
                                )}
                            </>
                        ) : (
                            <input
                                type="text"
                                className="ob-field-input"
                                placeholder={lang === 'ar' ? 'مثال: الطب البشري' : 'e.g. Medicine'}
                                value={major}
                                onChange={e => setMajor(e.target.value)}
                            />
                        )}
                    </div>

                    {/* Courses by faculty/major dropdown (#6) */}
                    {availableCourses.length > 0 && (
                        <div className="ob-field-group">
                            <label className="ob-field-label">{lang === 'ar' ? 'المقررات المسجلة' : 'Enrolled Courses'}</label>
                            <select
                                className="ob-field-select"
                                value=""
                                onChange={e => { addCourse(e.target.value); e.target.value = ''; }}
                            >
                                <option value="">{lang === 'ar' ? 'اختر مقرر...' : 'Select a course...'}</option>
                                {availableCourses
                                    .filter(c => !enrolledCourses.includes(c))
                                    .map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {/* Custom course input */}
                    <div className="ob-field-group">
                        <label className="ob-field-label">
                            {availableCourses.length > 0
                                ? (lang === 'ar' ? 'أو أضف مقرر يدوياً' : 'Or add a custom course')
                                : (lang === 'ar' ? 'المقررات المسجلة' : 'Enrolled Courses')
                            }
                        </label>
                        <div className="ob-custom-course-row">
                            <input
                                type="text"
                                className="ob-field-input"
                                placeholder={lang === 'ar' ? 'اسم المقرر...' : 'Course name...'}
                                value={customCourse}
                                onChange={e => setCustomCourse(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomCourse(); } }}
                            />
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addCustomCourse} disabled={!customCourse.trim()}>
                                {lang === 'ar' ? 'إضافة' : 'Add'}
                            </button>
                        </div>
                    </div>

                    {/* Selected courses tags */}
                    {enrolledCourses.length > 0 && (
                        <div className="ob-course-tags">
                            {[...enrolledCourses].sort((a, b) => a.localeCompare(b, lang)).map(c => (
                                <span key={c} className="ob-course-tag">
                                    {c}
                                    <button type="button" onClick={() => removeCourse(c)} className="ob-course-tag-remove">
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                <div className="ob-divider" style={{ margin: '2rem 0', display: 'flex', alignItems: 'center', textAlign: 'center', color: 'var(--text-3)' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                    <span style={{ padding: '0 1rem', fontSize: '0.85rem' }}>{lang === 'ar' ? 'أو كبديل سريع' : 'Or as a quick alternative'}</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
                </div>

                {/* ── LinkedIn PDF Import ────────────────── */}
                <div className="ob-linkedin-section" style={{ border: '1px dashed var(--border)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', background: 'var(--bg-card)' }}>
                    <button
                        className={`ob-linkedin-btn ${linkedinOpen ? 'ob-linkedin-btn--open' : ''}`}
                        onClick={() => setLinkedinOpen(!linkedinOpen)}
                        type="button"
                        style={{ margin: '0 auto' }}
                    >
                        <Linkedin size={18} />
                        {lang === 'ar' ? 'استيراد المهارات من LinkedIn' : 'Import Skills from LinkedIn'}
                    </button>

                    {linkedinOpen && (
                        <div className="ob-linkedin-panel animate-fade-in" style={{ marginTop: '1rem', border: 'none', background: 'transparent', padding: 0 }}>
                            <div className="ob-linkedin-instructions">
                                <h4>{lang === 'ar' ? 'كيف تحصل على ملف PDF؟' : 'How to get your PDF?'}</h4>
                                <ol>
                                    <li>{lang === 'ar' ? 'افتح ملفك الشخصي على LinkedIn' : 'Open your LinkedIn profile'}</li>
                                    <li>{lang === 'ar' ? 'اضغط على زر "المزيد" (⋯) أسفل صورة الغلاف' : 'Click the "More" button (⋯) below your cover photo'}</li>
                                    <li>{lang === 'ar' ? 'اختر "حفظ كـ PDF" أو "Save to PDF"' : 'Select "Save to PDF"'}</li>
                                    <li>{lang === 'ar' ? 'ارفع الملف الذي تم تنزيله هنا' : 'Upload the downloaded file here'}</li>
                                </ol>
                            </div>

                            <label className="ob-linkedin-upload">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleLinkedInPDF}
                                    style={{ display: 'none' }}
                                />
                                {linkedinStatus === 'loading' ? (
                                    <span className="ob-linkedin-loading">
                                        <span className="ob-linkedin-spinner" />
                                        {lang === 'ar' ? 'جارٍ تحليل الملف...' : 'Analyzing your profile...'}
                                    </span>
                                ) : (
                                    <span className="ob-linkedin-upload-inner">
                                        <Upload size={18} />
                                        <FileText size={18} />
                                        {lang === 'ar' ? 'اختر ملف LinkedIn PDF' : 'Choose LinkedIn PDF'}
                                    </span>
                                )}
                            </label>

                            {linkedinStatus === 'success' && linkedinResult && (
                                <div className="ob-linkedin-result ob-linkedin-result--success">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        <CheckCircle2 size={18} />
                                        <strong>
                                            {lang === 'ar'
                                                ? `تم العثور على ${linkedinResult.matched} مهارة وتفعيلها تلقائياً!`
                                                : `Found and enabled ${linkedinResult.matched} skills!`}
                                        </strong>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', opacity: 0.9, margin: 0, paddingLeft: '1.5rem' }}>
                                        {lang === 'ar'
                                            ? 'ملاحظة: تمت إضافة المهارات المستخرجة بمستوى "مبتدئ" افتراضياً. يمكنك النقر عليها بالأسفل لترقيتها إلى متوسط أو خبير.'
                                            : 'Note: Extracted skills are set to "Beginner" level by default. Click them below to upgrade them to Intermediate or Expert.'}
                                    </p>
                                </div>
                            )}
                            {linkedinStatus === 'error' && (
                                <div className="ob-linkedin-result ob-linkedin-result--error">
                                    <AlertCircle size={18} />
                                    {linkedinResult?.error}
                                </div>
                            )}
                        </div>
                    )}
                </div>


                <div className="ob-actions">
                    <span className="ob-selected">{Object.keys(skills).length} {t('skills_section').toLowerCase()}</span>
                    <button className="btn btn-primary btn-md" onClick={handleSaveSkills} disabled={saving || Object.keys(skills).length === 0}>
                        {t('next')} <ChevronRight size={18} />
                    </button>
                </div>
            </div >
            )}

            {
                step === 1 && (
                    <div className="ob-section animate-fade-in">
                        <h2>{t('work_style_title')}</h2>
                        <p className="ob-hint">{t('work_style_desc')}</p>
                        <div className="ob-sliders">
                            {[
                                { label: t('q_pressure'), value: pressure, set: setPressure },
                                { label: t('q_leadership'), value: leadership, set: setLeadership },
                                { label: t('q_execution'), value: execution, set: setExecution },
                            ].map((q, i) => (
                                <div key={i} className="ob-slider-group">
                                    <label className="ob-slider-label">{q.label}</label>
                                    <div className="ob-slider-row">
                                        <span className="ob-slider-min">{t('not_at_all')}</span>
                                        <input type="range" min={1} max={5} value={q.value} onChange={e => q.set(Number(e.target.value))} className="ob-slider" />
                                        <span className="ob-slider-max">{t('very_much')}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="ob-slider-group">
                                <label className="ob-slider-label">{t('hours_per_week')}</label>
                                <div className="ob-hours-row">
                                    <input type="range" min={1} max={40} value={hours} onChange={e => setHours(Number(e.target.value))} className="ob-slider" />
                                    <span className="ob-hours-val">{hours}h</span>
                                </div>
                            </div>
                            <div className="ob-slider-group">
                                <label className="ob-slider-label">{t('project_types_pref')}</label>
                                <div className="ob-type-btns">
                                    {[{ key: 'project', label: t('type_project') }, { key: 'research', label: t('type_research') }, { key: 'graduation', label: t('type_graduation') }].map(pt => (
                                        <button key={pt.key} className={`ob-type-btn ${prefTypes.includes(pt.key) ? 'ob-type-btn--active' : ''}`} onClick={() => togglePrefType(pt.key)}>{pt.label}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="ob-actions">
                            <button className="btn btn-ghost btn-md" onClick={() => setStep(0)}>{t('back')}</button>
                            <button className="btn btn-primary btn-md" onClick={handleSavePrefs} disabled={saving}>
                                {t('submit')} <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )
            }

            {
                step === 2 && (
                    <div className="ob-section ob-done animate-scale-in">
                        <Sparkles size={48} className="ob-done-icon" />
                        <h2>{t('onboarding_done_title')}</h2>
                        <p>{t('onboarding_done_desc')}</p>
                        <button className="btn btn-primary btn-lg" onClick={() => navigate('/projects')}>
                            {t('go_to_projects')} <ChevronRight size={18} />
                        </button>
                    </div>
                )
            }

        </div >
    );
}
