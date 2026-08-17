import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { createProject, aiWrite, aiSuggestSkills } from '../services/api';
import { COLLEGES, SKILLS_CATALOG, COURSES_BY_FACULTY, MAJORS_BY_FACULTY, COURSES_BY_MAJOR } from '../data/constants';
import { Send, X, Loader2, Wand2, Brain, BookOpen, FileText, GraduationCap, ChevronDown } from 'lucide-react';
import './PostProject.css';

export default function PostProject() {
    const { t, lang } = useI18n();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [type, setType] = useState('');
    const [college, setCollege] = useState('');
    const [customCollege, setCustomCollege] = useState('');
    const [major, setMajor] = useState('');
    const [teamSize, setTeamSize] = useState(3);
    const [deadline, setDeadline] = useState('');
    const [course, setCourse] = useState('');
    const [reqSkills, setReqSkills] = useState([]);
    const [prefSkills, setPrefSkills] = useState([]);
    const [skillSearch, setSkillSearch] = useState('');
    const [customSkill, setCustomSkill] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [openSkillCats, setOpenSkillCats] = useState({});

    // Course options based on selected college and major
    const courseOptions = (major && COURSES_BY_MAJOR && COURSES_BY_MAJOR[major])
        ? COURSES_BY_MAJOR[major]
        : COURSES_BY_FACULTY[college] || [];

    // Major options based on selected college
    const majorOptions = MAJORS_BY_FACULTY[college] || [];

    // AI Writer state
    const [aiLoading, setAiLoading] = useState(false);
    const [aiSkillLoading, setAiSkillLoading] = useState(false);

    // Skill toggle: not selected → required → preferred → not selected
    const toggleSkill = (id) => {
        if (reqSkills.includes(id)) {
            // Move to preferred
            setReqSkills(prev => prev.filter(x => x !== id));
            setPrefSkills(prev => [...prev, id]);
        } else if (prefSkills.includes(id)) {
            // Remove entirely
            setPrefSkills(prev => prev.filter(x => x !== id));
        } else {
            // Add as required
            setReqSkills(prev => [...prev, id]);
        }
    };

    const handleAddCustomSkill = (e) => {
        e.preventDefault();
        const trimmed = customSkill.trim();
        if (!trimmed) return;
        
        // Prevent exact duplicates
        if (!reqSkills.includes(trimmed) && !prefSkills.includes(trimmed)) {
            setReqSkills(prev => [...prev, trimmed]);
        }
        setCustomSkill('');
    };

    // Callback from AI suggestion injection
    const handleInjectAISkills = (skills) => {
        if (Array.isArray(skills)) {
            const validIds = new Set(SKILLS_CATALOG.map(s => s.id));
            const matched = skills
                .map(s => s.trim().toLowerCase())
                .filter(id => validIds.has(id) && !reqSkills.includes(id));
            if (matched.length > 0) setReqSkills(prev => [...new Set([...prev, ...matched])]);
        }
    };

    // AI: Improve description
    const handleAiExpand = async () => {
        if (!desc.trim()) return;
        setAiLoading(true);
        const { text, error: aiErr } = await aiWrite(desc, 'expand');
        setAiLoading(false);
        if (text) setDesc(text);
        else if (aiErr) setError(aiErr);
    };

    // AI: Suggest skills from description
    const handleAiSkills = async () => {
        if (!desc.trim()) return;
        setAiSkillLoading(true);
        const suggestions = await aiSuggestSkills(desc);
        setAiSkillLoading(false);
        if (suggestions.length > 0) {
            handleInjectAISkills(suggestions);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Enforce all required fields
        const errors = {};
        if (!title.trim()) errors.title = lang === 'ar' ? 'عنوان المشروع مطلوب' : 'Project title is required';
        if (!desc.trim()) errors.desc = lang === 'ar' ? 'وصف المشروع مطلوب' : 'Project description is required';
        if (!type) errors.type = lang === 'ar' ? 'نوع المشروع مطلوب' : 'Project type is required';
        if (!college) {
            errors.college = lang === 'ar' ? 'يرجى اختيار الكلية المستهدفة' : 'Target college is required';
        } else if (college === 'other' && !customCollege.trim()) {
            errors.college = lang === 'ar' ? 'يرجى كتابة اسم الكلية' : 'Please type your college name';
        }
        if (!teamSize || teamSize < 2) errors.teamSize = lang === 'ar' ? 'حجم الفريق مطلوب (2 على الأقل)' : 'Team size is required (min 2)';
        if (!deadline) errors.deadline = lang === 'ar' ? 'الموعد النهائي مطلوب' : 'Deadline is required';
        // Course is required for non-graduation project types
        const effectiveCourse = course === '__custom' ? '' : course;
        if (type && type !== 'graduation' && !effectiveCourse.trim()) {
            errors.course = lang === 'ar' ? 'يرجى اختيار المقرر الدراسي أو كتابة اسمه' : 'Course name is required for this project type';
        }
        if (Object.keys(errors).length) {
            setFieldErrors(errors);
            setError(Object.values(errors)[0]);
            return;
        }
        setFieldErrors({});
        setSaving(true); setError('');
        try {
            const courseFinal = course === '__custom' ? '' : course;
            const collegeFinal = college === 'other' ? customCollege.trim() : college;
            const result = await createProject({
                title: title, description: desc,
                type, college_key: collegeFinal || null,
                major: major || null,
                team_size_needed: teamSize,
                deadline: deadline || null, course_name: courseFinal || null,
                required_skills: reqSkills, preferred_skills: prefSkills,
            });
            setSaving(false);
            if (result && (result.id || result.project_id)) {
                navigate(`/project/${result.id || result.project_id}`);
            } else {
                setError(lang === 'ar' ? 'حدث خطأ أثناء إنشاء المشروع. يرجى المحاولة مرة أخرى.' : 'Failed to create project. Please try again.');
            }
        } catch (err) {
            setSaving(false);
            console.error('CreateProject error:', err);
            setError(err?.message || (lang === 'ar' ? 'حدث خطأ أثناء إنشاء المشروع.' : 'Failed to create project. Please try again.'));
        }
    };

    const getSkillName = (id) => { const s = SKILLS_CATALOG.find(x => x.id === id); return s ? (lang === 'ar' ? s.ar : s.en) : id; };

    return (
        <div className="post-project-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('post_title')}</h1>
                    <p className="page-subtitle">
                        {lang === 'ar' 
                            ? 'أنشئ ورشة عمل أو مشروع تخرج أو فكرة بحثية جديدة وابحث عن أفضل المتدربين والشركاء' 
                            : 'Create a new project proposal, research paper, or graduation project to recruit top trainees.'}
                    </p>
                </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <form className="pp-form" onSubmit={handleSubmit}>
                {/* Project Title */}
                <div className={`form-group ${fieldErrors.title ? 'has-error' : ''}`}>
                    <label>{t('project_title_en')} <span className="req">*</span></label>
                    <div className="input-with-icon">
                        <FileText size={18} className="field-icon" />
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => { setTitle(e.target.value); setFieldErrors(p => ({ ...p, title: false })); }} 
                            placeholder={lang === 'ar' ? 'أدخل عنوان مشروعك الواضح والمعبر...' : 'Enter a clear, descriptive project title...'}
                            required 
                        />
                    </div>
                    {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
                </div>

                {/* Description with AI Expander */}
                <div className={`form-group ${fieldErrors.desc ? 'has-error' : ''}`}>
                    <div className="label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <label>{t('project_desc_en')} <span className="req">*</span></label>
                        <button type="button" className="ai-btn ai-btn--sm" onClick={handleAiExpand} disabled={aiLoading || !desc.trim()}>
                            {aiLoading ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />}
                            {t('ai_improve') || 'AI Expand Idea'}
                        </button>
                    </div>
                    <textarea 
                        value={desc} 
                        onChange={e => { setDesc(e.target.value); setFieldErrors(p => ({ ...p, desc: false })); }} 
                        rows={4} 
                        placeholder={lang === 'ar' ? 'اشرح رؤية المشروع والمخرجات المتوقعة بالتفصيل...' : 'Describe your project idea, objectives, and expected deliverables...'} 
                        className={fieldErrors.desc ? 'has-error-textarea' : ''} 
                    />
                    {fieldErrors.desc && <span className="field-error">{fieldErrors.desc}</span>}
                </div>

                <div className="pp-grid pp-grid--3">
                    <div className={`form-group ${fieldErrors.type ? 'has-error' : ''}`}>
                        <label>{t('project_type')} <span className="req">*</span></label>
                        <div className="type-buttons" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                            {[
                                { id: 'project', label: t('type_project'), icon: <BookOpen size={16} /> },
                                { id: 'research', label: t('type_research'), icon: <FileText size={16} /> },
                                { id: 'graduation', label: t('type_graduation'), icon: <GraduationCap size={16} /> }
                            ].map(tObj => (
                                <button
                                    key={tObj.id}
                                    type="button"
                                    className={`btn ${type === tObj.id ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ padding: '0.75rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.85rem' }}
                                    onClick={() => { setType(tObj.id); setFieldErrors(p => ({ ...p, type: undefined })); }}
                                >
                                    {tObj.icon}
                                    {tObj.label}
                                </button>
                            ))}
                        </div>
                        {fieldErrors.type && <span className="field-error">{lang === 'ar' ? 'يرجى اختيار نوع المشروع' : 'Please select a project type'}</span>}
                    </div>
                    <div className={`form-group ${fieldErrors.college ? 'has-error' : ''}`}>
                        <label>{t('project_college')}</label>
                        <select value={college} onChange={e => { setCollege(e.target.value); setCourse(''); setMajor(''); setCustomCollege(''); setFieldErrors(p => ({ ...p, college: undefined })); }} required>
                            <option value="">{lang === 'ar' ? 'اختر الكلية' : 'Select college'}</option>
                            {COLLEGES.map(c => <option key={c.key} value={c.key}>{lang === 'ar' ? c.ar : c.en}</option>)}
                        </select>
                        {fieldErrors.college && <span className="field-error">{fieldErrors.college}</span>}
                    </div>
                    {college === 'other' && (
                        <div className={`form-group animate-fade-in ${fieldErrors.college ? 'has-error' : ''}`}>
                            <label>{lang === 'ar' ? 'اسم الكلية المخصصة' : 'Custom College Name'} <span className="req">*</span></label>
                            <input
                                type="text"
                                value={customCollege}
                                onChange={e => { setCustomCollege(e.target.value); setFieldErrors(p => ({ ...p, college: undefined })); }}
                                placeholder={lang === 'ar' ? 'اكتب اسم كليتك هنا...' : 'Type your college name here...'}
                                required
                            />
                            {fieldErrors.college && <span className="field-error">{fieldErrors.college}</span>}
                        </div>
                    )}
                    <div className={`form-group ${fieldErrors.teamSize ? 'has-error' : ''}`}>
                        <label>{t('team_size_label')}</label>
                        <input type="number" min={2} max={20} value={teamSize} onChange={e => { setTeamSize(Number(e.target.value)); setFieldErrors(p => ({ ...p, teamSize: undefined })); }} />
                        {fieldErrors.teamSize && <span className="field-error">{fieldErrors.teamSize}</span>}
                    </div>
                </div>

                {/* Major field — depends on college */}
                <div className="pp-grid">
                    <div className="form-group">
                        <label>{lang === 'ar' ? 'التخصص (اختياري)' : 'Target Major (optional)'}</label>
                        {!college ? (
                            <input type="text" disabled placeholder={lang === 'ar' ? 'اختر الكلية أولاً' : 'Select a college first'} className="pp-disabled" />
                        ) : majorOptions.length > 0 ? (
                            <select value={major} onChange={e => setMajor(e.target.value)}>
                                <option value="">{lang === 'ar' ? 'جميع التخصصات' : 'All majors'}</option>
                                {majorOptions.map(m => <option key={m.value} value={m.value}>{lang === 'ar' ? m.label_ar : m.label}</option>)}
                            </select>
                        ) : (
                            <input type="text" value={major} onChange={e => setMajor(e.target.value)} placeholder={lang === 'ar' ? 'مثال: هندسة مدنية' : 'e.g. Civil Engineering'} />
                        )}
                    </div>
                </div>
                <div className="pp-grid">
                    <div className={`form-group ${fieldErrors.deadline ? 'has-error' : ''}`}>
                        <label>{t('deadline')}</label>
                        <input type="date" value={deadline} onChange={e => { setDeadline(e.target.value); setFieldErrors(p => ({ ...p, deadline: undefined })); }} dir="ltr" min={new Date().toISOString().split('T')[0]} />
                        {fieldErrors.deadline && <span className="field-error">{fieldErrors.deadline}</span>}
                    </div>
                    {type !== 'graduation' && (
                        <div className={`form-group ${fieldErrors.course ? 'has-error' : ''}`}>
                            <label>{t('course_name')}</label>
                            {!college ? (
                                /* Disabled until college chosen */
                                <input
                                    type="text"
                                    disabled
                                    placeholder={lang === 'ar' ? 'اختر الكلية أولاً' : 'Select a college first'}
                                    className="pp-disabled"
                                />
                            ) : courseOptions.length > 0 ? (
                                /* College has predefined courses — show dropdown */
                                <select value={course} onChange={e => { setCourse(e.target.value); setFieldErrors(p => ({ ...p, course: undefined })); }}>
                                    <option value="">{lang === 'ar' ? 'اختر المقرر' : 'Select Course'}</option>
                                    {courseOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                    <option value="__custom">{lang === 'ar' ? 'أخرى...' : 'Other...'}</option>
                                </select>
                            ) : (
                                /* College has no predefined courses — free text */
                                <input
                                    type="text"
                                    value={course === '__custom' ? '' : course}
                                    onChange={e => { setCourse(e.target.value); setFieldErrors(p => ({ ...p, course: undefined })); }}
                                    placeholder={lang === 'ar' ? 'اكتب اسم المقرر' : 'Type your course name...'}
                                />
                            )}
                            {/* Custom name input for dropdown colleges */}
                            {course === '__custom' && courseOptions.length > 0 && (
                                <input
                                    type="text"
                                    style={{ marginTop: '0.5rem' }}
                                    onChange={e => { setCourse(e.target.value); setFieldErrors(p => ({ ...p, course: undefined })); }}
                                    placeholder={lang === 'ar' ? 'اكتب اسم المقرر' : 'Type course name...'}
                                    autoFocus
                                />
                            )}
                            {fieldErrors.course && <span className="field-error">{fieldErrors.course}</span>}
                        </div>
                    )}
                </div>

                {/* Skills — grouped tag browser */}
                <div className="pp-skills-section">
                    <div className="pp-skills-header">
                        <span className="pp-skills-title">
                            {lang === 'ar' ? 'المهارات المطلوبة' : 'Required & Preferred Skills'}
                        </span>
                    </div>

                    {/* Mini search to filter the tag browser */}
                    <div className="pp-skill-search-bar">
                        <input
                            type="text"
                            className="pp-skill-search-input"
                            placeholder={lang === 'ar' ? 'ابحث لتصفية المهارات...' : 'Filter skills...'}
                            value={skillSearch}
                            onChange={e => setSkillSearch(e.target.value)}
                        />
                        {skillSearch && (
                            <button type="button" className="pp-skill-search-clear" onClick={() => setSkillSearch('')}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    
                    {/* Add Custom Skill */}
                    <div className="pp-skill-search-bar" style={{ marginTop: '0.5rem' }}>
                        <input
                            type="text"
                            className="pp-skill-search-input"
                            placeholder={lang === 'ar' ? 'أضف مهارة غير موجودة في القائمة...' : 'Add a custom skill...'}
                            value={customSkill}
                            onChange={e => setCustomSkill(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddCustomSkill();
                                }
                            }}
                        />
                        <button 
                            type="button" 
                            className="btn btn-secondary btn-sm" 
                            style={{ margin: '4px', whiteSpace: 'nowrap' }}
                            onClick={handleAddCustomSkill}
                            disabled={!customSkill.trim()}
                        >
                            {lang === 'ar' ? 'إضافة مهارة' : 'Add Skill'}
                        </button>
                    </div>

                    {/* How-to hint */}
                    <p className="pp-skills-tip">
                        {lang === 'ar'
                            ? 'انقر مرة: مطلوبة  •  انقر مرتين: مفضّلة  •  انقر ثلاث مرات: إزالة'
                            : 'Click once: Required  •  Click twice: Preferred  •  Click again: Remove'}
                    </p>

                    {/* Grouped skill tags */}
                    <div className="pp-skill-groups">
                        {(() => {
                            // Build category groups, filtered by search
                            const groups = {};
                            SKILLS_CATALOG
                                .filter(s => {
                                    if (!skillSearch) return true;
                                    return s.en.toLowerCase().includes(skillSearch.toLowerCase()) ||
                                        s.ar.includes(skillSearch);
                                })
                                .forEach(s => {
                                    const cat = lang === 'ar' ? s.cat_ar : s.cat_en;
                                    if (!groups[cat]) groups[cat] = [];
                                    groups[cat].push(s);
                                });
                            return Object.entries(groups).map(([cat, items]) => {
                                const selectedCount = items.filter(s => reqSkills.includes(s.id) || prefSkills.includes(s.id)).length;
                                const isOpen = skillSearch ? true : !!openSkillCats[cat];
                                return (
                                <div key={cat} className={`pp-skill-group ${isOpen ? 'pp-skill-group--open' : ''}`}>
                                    <div
                                        className="pp-skill-group-header"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setOpenSkillCats(prev => ({ ...prev, [cat]: !prev[cat] }))}
                                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenSkillCats(prev => ({ ...prev, [cat]: !prev[cat] })); } }}
                                        style={{ position: 'relative', zIndex: 2 }}
                                    >
                                        <ChevronDown size={14} className={`pp-skill-group-chevron ${isOpen ? 'pp-skill-group-chevron--open' : ''}`} />
                                        <span className="pp-skill-group-title">{cat}</span>
                                        {selectedCount > 0 && <span className="pp-skill-group-count">{selectedCount}</span>}
                                    </div>
                                    {isOpen && (
                                    <div className="pp-skill-tag-row">
                                        {items.map(s => {
                                            const isReq = reqSkills.includes(s.id);
                                            const isPref = prefSkills.includes(s.id);
                                            return (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    className={`pp-skill-tag ${isReq ? 'pp-skill-tag--req' :
                                                        isPref ? 'pp-skill-tag--pref' : ''
                                                        }`}
                                                    onClick={() => toggleSkill(s.id)}
                                                    title={
                                                        isReq
                                                            ? (lang === 'ar' ? 'انقر للتحويل إلى مفضّلة' : 'Click to make Preferred')
                                                            : isPref
                                                                ? (lang === 'ar' ? 'انقر للإزالة' : 'Click to remove')
                                                                : (lang === 'ar' ? 'انقر للإضافة كمطلوبة' : 'Click to add as Required')
                                                    }
                                                >
                                                    {lang === 'ar' ? s.ar : s.en}
                                                    {isReq && <span className="pp-skill-badge pp-skill-badge--req">R</span>}
                                                    {isPref && <span className="pp-skill-badge pp-skill-badge--pref">P</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    )}
                                </div>
                                );
                            });
                        })()}
                    </div>

                    {/* Selected skills summary */}
                    {(reqSkills.length > 0 || prefSkills.length > 0) && (
                        <div className="pp-skills-summary">
                            {reqSkills.length > 0 && (
                                <div className="pp-skills-summary-row">
                                    <span className="pp-summary-label pp-summary-label--req">
                                        {lang === 'ar' ? 'مطلوبة' : 'Required'} ({reqSkills.length})
                                    </span>
                                    <div className="pp-tag-list">
                                        {reqSkills.map(id => (
                                            <span key={id} className="skill-tag skill-tag--req">
                                                {SKILLS_CATALOG.find(x => x.id === id)?.[lang === 'ar' ? 'ar' : 'en'] || id}
                                                <button type="button" onClick={() => setReqSkills(prev => prev.filter(x => x !== id))}><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {prefSkills.length > 0 && (
                                <div className="pp-skills-summary-row">
                                    <span className="pp-summary-label pp-summary-label--pref">
                                        {lang === 'ar' ? 'مفضّلة' : 'Preferred'} ({prefSkills.length})
                                    </span>
                                    <div className="pp-tag-list">
                                        {prefSkills.map(id => (
                                            <span key={id} className="skill-tag skill-tag--pref">
                                                {SKILLS_CATALOG.find(x => x.id === id)?.[lang === 'ar' ? 'ar' : 'en'] || id}
                                                <button type="button" onClick={() => setPrefSkills(prev => prev.filter(x => x !== id))}><X size={12} /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* AI Suggest — adds to Required */}
                    <div className="pp-skills-ai-hint">
                        <button type="button" className="ai-btn ai-btn--skills" onClick={handleAiSkills} disabled={aiSkillLoading || !desc.trim()}>
                            {aiSkillLoading ? <Loader2 size={14} className="spin" /> : <Brain size={14} />}
                            {lang === 'ar' ? 'اقتراح مهارات بالذكاء الاصطناعي (تُضاف للمطلوبة)' : 'AI Suggest Skills (adds to Required)'}
                        </button>
                        {!desc.trim() && <span className="pp-skills-ai-tip">{lang === 'ar' ? 'أضف وصفاً أولاً' : 'Add a description first to enable'}</span>}
                    </div>
                </div>

                <button className="btn btn-primary btn-lg pp-submit" type="submit" disabled={saving}>
                    {saving ? <Loader2 size={18} className="spin" /> : <><Send size={18} /> {t('post_project')}</>}
                </button>
            </form>
        </div>
    );
}
