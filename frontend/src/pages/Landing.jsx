import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { getPublicStats } from '../services/api';
import { ArrowRight, Cpu, Users, LayoutDashboard, MessageCircle, Activity, Zap, Briefcase, GraduationCap, Star, Sun, Moon, Languages } from 'lucide-react';
import StaffRegisterModal from '../components/StaffRegisterModal';
import './Landing.css';

/* ═══ Scroll Reveal Hook ═══ */
function useScrollReveal(options = {}) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                el.classList.add('revealed');
                observer.disconnect();
            }
        }, { threshold: options.threshold || 0.15, rootMargin: options.rootMargin || '0px' });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return ref;
}

/* ═══ Animated Counter ═══ */
function AnimatedCounter({ target, duration = 2000 }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                const start = Date.now();
                const tick = () => {
                    const elapsed = Date.now() - start;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setCount(Math.floor(eased * target));
                    if (progress < 1) requestAnimationFrame(tick);
                };
                tick();
                observer.disconnect();
            }
        }, { threshold: 0.3 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [target, duration]);
    return <span ref={ref}>{count.toLocaleString()}</span>;
}

/* ═══ Text Scramble Component ═══ */
function TextScramble({ text, delay = 0 }) {
    const [display, setDisplay] = useState('');
    const [started, setStarted] = useState(false);
    const ref = useRef(null);
    const chars = '!<>-_\\/[]{}—=+*^?#_アイウエオカキクケコ';

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setTimeout(() => setStarted(true), delay);
                observer.disconnect();
            }
        }, { threshold: 0.3 });
        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [delay]);

    useEffect(() => {
        if (!started) return;
        let frame = 0;
        const totalFrames = text.length * 2 + 20;
        const tick = () => {
            frame++;
            let result = '';
            for (let i = 0; i < text.length; i++) {
                const revealAt = Math.floor((i / text.length) * (totalFrames - 10));
                if (frame > revealAt + 10) {
                    result += text[i];
                } else if (frame > revealAt) {
                    result += chars[Math.floor(Math.random() * chars.length)];
                } else {
                    result += text[i] === ' ' ? ' ' : chars[Math.floor(Math.random() * chars.length)];
                }
            }
            setDisplay(result);
            if (frame < totalFrames) requestAnimationFrame(tick);
            else setDisplay(text);
        };
        tick();
    }, [started, text]);

    return <span ref={ref} className="text-scramble">{display || '\u00A0'}</span>;
}

/* ═══ Magnetic Card Component ═══ */
function MagneticCard({ children, className, style, ...props }) {
    const cardRef = useRef(null);

    const handleMouseMove = useCallback((e) => {
        const card = cardRef.current;
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    }, []);

    const handleMouseLeave = useCallback(() => {
        const card = cardRef.current;
        if (!card) return;
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    }, []);

    return (
        <div
            ref={cardRef}
            className={className}
            style={style}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            {children}
        </div>
    );
}

export default function Landing() {
    const { t, lang, setLang } = useI18n();
    const { user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const [stats, setStats] = useState({});
    const [showStaffModal, setShowStaffModal] = useState(false);

    const featuresRef = useScrollReveal();
    const stepsRef = useScrollReveal();
    const ctaRef = useScrollReveal();
    const statsRef = useScrollReveal({ threshold: 0.2 });

    useEffect(() => {
        getPublicStats().then(s => setStats(s));
    }, []);

    const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : '?';
    const userAvatar = user?.avatar_url || null;

    const features = [
        { icon: <Cpu size={24} />, title: t('feature_match_title'), desc: t('feature_match_desc'), color: 'var(--primary)' },
        { icon: <LayoutDashboard size={24} />, title: t('feature_board_title'), desc: t('feature_board_desc'), color: 'var(--primary)' },
        { icon: <Activity size={24} />, title: t('feature_heatmap_title'), desc: t('feature_heatmap_desc'), color: 'var(--primary)' },
        { icon: <MessageCircle size={24} />, title: t('feature_reviews_title'), desc: t('feature_reviews_desc'), color: 'var(--primary)' },
        { icon: <Briefcase size={24} />, title: t('feature_portfolio_title'), desc: t('feature_portfolio_desc'), color: 'var(--primary)' },
        { icon: <Zap size={24} />, title: t('feature_admin_title'), desc: t('feature_admin_desc'), color: 'var(--primary)' },
    ];

    const steps = [
        { num: 1, title: t('how_step1_title'), desc: t('how_step1_desc'), icon: <GraduationCap size={22} /> },
        { num: 2, title: t('how_step2_title'), desc: t('how_step2_desc'), icon: <LayoutDashboard size={22} /> },
        { num: 3, title: t('how_step3_title'), desc: t('how_step3_desc'), icon: <Users size={22} /> },
        { num: 4, title: t('how_step4_title'), desc: t('how_step4_desc'), icon: <Star size={22} /> },
    ];

    const MARQUEE_ITEMS_EN = ['Smart Matching', 'Skill Profiles', 'Team Formation', 'Peer Reviews', 'Project Board', 'Real-time Chat', 'Availability Heatmap', 'Academic Portfolio', 'AI-Powered Suggestions', 'Secure & Private'];
    const MARQUEE_ITEMS_AR = ['توافق ذكي', 'ملفات المهارات', 'تكوين الفرق', 'تقييمات الأقران', 'لوحة المشاريع', 'دردشة فورية', 'خريطة التوفر', 'ملف أكاديمي', 'اقتراحات بالذكاء الاصطناعي', 'آمن وخاص'];
    const marqueeText = (lang === 'ar' ? MARQUEE_ITEMS_AR : MARQUEE_ITEMS_EN).map(item => `✦ ${item}`).join('   ');

    return (
        <div className="landing">
            {/* ══ Floating Orbs ══ */}
            <div className="floating-orbs" aria-hidden="true">
                <div className="orb orb-1"></div>
                <div className="orb orb-2"></div>
                <div className="orb orb-3"></div>
            </div>

            {/* ══ Main Nav ══ */}
            <nav className="landing-nav">
                <div className="w-full landing-nav-inner">
                    <Link to="/" className="landing-logo">
                        <img src="/logo.png" alt="THINK TANK" className="landing-logo-img" />
                        <span className="landing-logo-name"><strong>THINK TANK</strong></span>
                    </Link>
                    <div className="landing-nav-links">
                        <a href="#features" className="nav-link">
                            <span className="nav-link-text">{lang === 'ar' ? 'المميزات' : 'Features'}</span>
                        </a>
                        <a href="#how" className="nav-link">
                            <span className="nav-link-text">{lang === 'ar' ? 'كيف يعمل' : 'How It Works'}</span>
                        </a>

                        {!user && (
                            <>
                                <Link to="/auth" className="btn btn-secondary btn-sm landing-nav-login-btn">{t('login')}</Link>
                                <Link to="/auth?tab=register" className="btn btn-primary btn-sm btn-glow landing-nav-register">{t('register')}</Link>
                            </>
                        )}
                        {user && (
                            <div className="landing-nav-user" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <Link to="/profile" className="landing-avatar-link" title={lang === 'ar' ? 'الملف الشخصي' : 'Profile'}>
                                    {userAvatar ? (
                                        <img src={userAvatar} alt="Profile" className="landing-avatar-img" />
                                    ) : (
                                        <div className="landing-avatar-placeholder">{userInitial}</div>
                                    )}
                                </Link>
                                <Link to="/projects" className="btn btn-primary btn-sm btn-glow">{t('back_to_projects')} <ArrowRight size={16} /></Link>
                            </div>
                        )}

                        <div className="landing-topbar-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginInlineStart: '0.5rem' }}>
                            <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} title={t('toggle_lang')}>
                                <Languages size={15} />
                                <span className="lang-text">{lang === 'en' ? 'العربية' : 'English'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ══ Hero — Split Layout ══ */}
            <section className="hero">
                <div className="bg-glow"></div>
                <div className="hero-scanlines" aria-hidden="true"></div>

                <div className="w-full hero-split">
                    {/* ── Left: Text Content ── */}
                    <div className="hero-left">
                        <div className="hero-pill animate-fade-in">
                            <span className="hero-pill-dot"></span>
                            <span className="label-mono">NMU</span>
                        </div>

                        <h1 className="hero-title hero-text-reveal">
                            <span className="hero-title-line">{t('hero_title')}</span>
                            <br />
                            <span className="text-gradient-cyan hero-title-line delay-2">{t('hero_university')}</span>
                        </h1>

                        <p className="hero-desc hero-text-reveal delay-3">{t('hero_subtitle')}</p>

                        <div className="hero-actions hero-text-reveal delay-4">
                            {user ? (
                                <Link to="/projects" className="btn btn-primary btn-lg btn-glow btn-shine">
                                    {t('back_to_projects')} <ArrowRight size={18} className="btn-arrow" />
                                </Link>
                            ) : (
                                <Link to="/auth?tab=register&role=student" className="btn btn-primary btn-lg btn-glow btn-shine">
                                    {t('hero_cta_primary')} <ArrowRight size={18} className="btn-arrow" />
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* ── Right: Bento Stats ── */}
                    <div className="hero-right" ref={statsRef}>
                        <div className="hero-bento scroll-reveal">
                            <div className="bento-card bento-card--large">
                                <div className="bento-card-icon"><Users size={20} /></div>
                                <div className="bento-card-value"><AnimatedCounter target={stats.total_students || stats.totalUsers || 0} /></div>
                                <div className="bento-card-label label-mono">{t('hero_stat_students')}</div>
                            </div>
                            <div className="bento-card bento-card--sm">
                                <div className="bento-card-icon"><Briefcase size={18} /></div>
                                <div className="bento-card-value"><AnimatedCounter target={stats.total_projects || stats.totalProjects || 0} /></div>
                                <div className="bento-card-label label-mono">{t('hero_stat_projects')}</div>
                            </div>
                            <div className="bento-card bento-card--sm">
                                <div className="bento-card-icon"><Zap size={18} /></div>
                                <div className="bento-card-value"><AnimatedCounter target={stats.teams_formed || stats.completedProjects || 0} /></div>
                                <div className="bento-card-label label-mono">{t('hero_stat_teams')}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ══ College Marquee ══ */}
            <section className="marquee-section">
                <div className="marquee-track">
                    <span className="marquee-text">{marqueeText}</span>
                    <span className="marquee-text">{marqueeText}</span>
                </div>
            </section>

            {/* ══ Features ══ */}
            <section id="features" className="section features-section">
                <div className="w-full" ref={featuresRef}>
                    <div className="section-header scroll-reveal">
                        <div className="section-tag label-mono">{lang === 'ar' ? 'أدوات المنصة' : 'Platform Tools'}</div>
                        <h2 className="section-title">{t('features_title')}</h2>
                        <p className="section-subtitle">{t('features_subtitle')}</p>
                    </div>
                    <div className="features-grid">
                        {features.map((f, i) => (
                            <MagneticCard key={i} className="feature-card scroll-reveal" style={{ animationDelay: `${i * 0.1}s`, '--i': i }}>
                                <div className="feature-card-glow" aria-hidden="true"></div>
                                <div className="feature-icon">{f.icon}</div>
                                <h3>{f.title}</h3>
                                <p>{f.desc}</p>
                                <div className="feature-card-border" aria-hidden="true"></div>
                            </MagneticCard>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ How it works ══ */}
            <section id="how" className="section steps-section">
                <div className="w-full" ref={stepsRef}>
                    <div className="section-header scroll-reveal">
                        <div className="section-tag label-mono">{lang === 'ar' ? 'الخطوات' : 'Getting Started'}</div>
                        <h2 className="section-title">{t('how_title')}</h2>
                    </div>
                    <div className="steps-grid">
                        {/* Animated connector line */}
                        <div className="steps-connector" aria-hidden="true">
                            <svg className="steps-connector-svg" viewBox="0 0 100 4" preserveAspectRatio="none">
                                <line x1="0" y1="2" x2="100" y2="2" stroke="url(#connectorGrad)" strokeWidth="2" strokeDasharray="6 4" />
                                <defs>
                                    <linearGradient id="connectorGrad">
                                        <stop offset="0%" stopColor="rgba(0,245,212,0)" />
                                        <stop offset="50%" stopColor="rgba(0,245,212,0.5)" />
                                        <stop offset="100%" stopColor="rgba(0,245,212,0)" />
                                    </linearGradient>
                                </defs>
                            </svg>
                        </div>
                        {steps.map((s, i) => (
                            <div key={i} className="step-card scroll-reveal" style={{ animationDelay: `${i * 0.15}s`, '--i': i }}>
                                <div className="step-num-ring">
                                    <span className="step-num">{String(s.num).padStart(2, '0')}</span>
                                    <svg className="step-ring" viewBox="0 0 60 60">
                                        <circle cx="30" cy="30" r="27" fill="none" stroke="rgba(0,245,212,0.1)" strokeWidth="2" />
                                        <circle cx="30" cy="30" r="27" fill="none" stroke="var(--primary)" strokeWidth="2"
                                            strokeDasharray="170" strokeDashoffset="170"
                                            className="step-ring-progress" style={{ animationDelay: `${0.5 + i * 0.2}s` }} />
                                    </svg>
                                </div>
                                <div className="step-icon">{s.icon}</div>
                                <h3>{s.title}</h3>
                                <p>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══ CTA ══ */}
            <section className="cta-banner" ref={ctaRef}>
                <div className="cta-blob" aria-hidden="true"></div>
                <div className="w-full cta-banner-inner scroll-reveal">
                    <div className="cta-banner-text">
                        <h2>{t('cta_title')}</h2>
                        <p>{t('cta_subtitle')}</p>
                    </div>
                    <div className="cta-banner-actions">
                        {user ? (
                            <Link to="/projects" className="btn btn-primary btn-glow btn-shine">{t('back_to_projects')} <ArrowRight size={16} className="btn-arrow" /></Link>
                        ) : (
                            <Link to="/auth?tab=register" className="btn btn-primary btn-glow btn-shine">{t('cta_btn')} <ArrowRight size={16} className="btn-arrow" /></Link>
                        )}
                    </div>
                </div>
            </section>

            {/* ══ Footer ══ */}
            <footer className="landing-footer">
                <div className="w-full footer-inner">
                    <div className="footer-brand">
                        <img src="/logo.png" alt="THINK TANK" style={{ height: '28px' }} />
                        <div className="footer-brand-name"><strong>THINK TANK</strong></div>
                    </div>
                    <div style={{ textAlign: lang === 'ar' ? 'left' : 'right' }}>
                        <p>&copy; 2026 THINK TANK</p>
                        <p style={{ marginTop: '4px' }}>
                            {lang === 'ar' ? 'تطوير ' : 'Developed by '}
                            <a href="https://erth.dev" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-1)', textDecoration: 'none', fontWeight: '600' }}>
                                ERTH
                            </a>
                        </p>
                    </div>
                </div>
            </footer>

            {showStaffModal && <StaffRegisterModal onClose={() => setShowStaffModal(false)} />}
        </div>
    );
}
