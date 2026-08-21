import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPublicStats } from '../services/api';
import {
    ArrowRight, BookOpen, Users, Award,
    Shield, CheckCircle2,
    Code, Activity, Sparkles,
    Check, ArrowUpRight, Star
} from 'lucide-react';
import './Landing.css';

/* ── Animated counter with dynamic updates ── */
function Counter({ to = 0, duration = 1600, decimals = 0 }) {
    const targetNum = Number(to) || 0;
    const [v, setV] = useState(0);
    const ref = useRef(null);
    const isVisibleRef = useRef(false);
    const currentValRef = useRef(0);
    const animFrameRef = useRef(null);

    const animateTo = (target) => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        const startVal = currentValRef.current;
        const startTime = performance.now();

        const tick = (now) => {
            const progress = Math.min((now - startTime) / duration, 1);
            // Smooth cubic ease out: 1 - (1 - p)^3
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = startVal + (target - startVal) * ease;
            const displayVal = decimals > 0 ? Number(current.toFixed(decimals)) : Math.round(current);

            currentValRef.current = current;
            setV(displayVal);

            if (progress < 1) {
                animFrameRef.current = requestAnimationFrame(tick);
            } else {
                currentValRef.current = target;
                setV(target);
            }
        };

        animFrameRef.current = requestAnimationFrame(tick);
    };

    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting) {
                isVisibleRef.current = true;
                animateTo(targetNum);
            }
        }, { threshold: 0.1 });

        if (ref.current) obs.observe(ref.current);

        return () => {
            obs.disconnect();
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, []);

    // Reactive update whenever `to` prop updates (realtime sync or async fetch)
    useEffect(() => {
        if (isVisibleRef.current) {
            animateTo(targetNum);
        } else {
            currentValRef.current = targetNum;
            setV(targetNum);
        }
    }, [targetNum]);

    const formatted = decimals > 0 
        ? Number(v).toFixed(decimals) 
        : Math.round(v).toLocaleString();

    return <span ref={ref}>{formatted}</span>;
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
    const { user } = useAuth();
    const [stats, setStats] = useState({});
    const [scrolled, setScrolled] = useState(false);

    // Active track for the Hero Programs Showcase
    const [activeTrack, setActiveTrack] = useState(0);

    const [ctaRef, ctaOn] = useReveal(0.15);

    // Real-time synchronization
    useEffect(() => {
        let mounted = true;
        const fetchStats = () => {
            getPublicStats()
                .then(data => {
                    if (mounted && data && typeof data === 'object') {
                        setStats(data);
                    }
                })
                .catch(() => {});
        };

        // Initial fetch
        fetchStats();

        // 15-second realtime background sync
        const interval = setInterval(fetchStats, 15000);

        // Re-sync on window focus
        const onFocus = () => fetchStats();
        window.addEventListener('focus', onFocus);

        return () => {
            mounted = false;
            clearInterval(interval);
            window.removeEventListener('focus', onFocus);
        };
    }, []);

    useEffect(() => {
        const fn = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', fn);
        return () => window.removeEventListener('scroll', fn);
    }, []);

    // Current Active Track Data (Dynamic from stats or fallback)
    const currentTrack = stats.featuredCourse || {
        id: 'ROB-01',
        title: 'Robotics & Automation Track',
        duration: '8 Weeks · 63 Hours',
        tech: ['AI', 'Computer Vision', 'Mobile Dev', 'Web Tech', 'Robotics'],
        modules: [
            'Artificial Intelligence & Machine Learning',
            'Deep Learning & Computer Vision',
            'Mobile Development & Web Technologies',
            'Innovation, Robotics I & II'
        ]
    };

    return (
        <div className="lp" dir="ltr">
            {/* ── NAV ── */}
            <header className={`lp-nav${scrolled ? ' lp-nav--solid' : ''}`}>
                <div className="lp-nav-in">
                    <Link to="/" className="lp-logo">
                        <img src="/assets/university_logo.png" alt="NMU Training Center" style={{ height: '40px', width: 'auto' }} />
                        <div className="lp-logo-text">
                            <span className="lp-logo-brand">NMU</span>
                            <span className="lp-logo-sub">TRAINING CENTER</span>
                        </div>
                    </Link>
                    <nav className="lp-navlinks">
                        <a href="#tracks" className="lp-nl">Program</a>
                        <a href="#advantages" className="lp-nl">Why NMU</a>
                    </nav>
                    <div className="lp-nav-end">
                        {!user ? (
                            <Link to="/auth" className="lp-cta-btn">
                                Sign In <ArrowRight size={14} />
                            </Link>
                        ) : (
                            <Link to="/dashboard" className="lp-cta-btn">
                                Dashboard <ArrowRight size={14} />
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
                        
                        <h1 className="lp-h1">
                            <span className="lp-h1-sub">FIELD TRAINING HUB</span>
                            <span className="lp-h1-main">TRAINING CENTER</span>
                        </h1>

                        <p className="lp-sub">
                            Accelerating engineering capability through hands-on robotics labs, AI pipelines, and accredited summer training programs at New Mansoura University.
                        </p>

                        <div className="lp-hero-actions">
                            <Link to="/verify" className="lp-cta-btn lp-cta-btn--lg">
                                Verify Certificate <ArrowUpRight size={18} />
                            </Link>
                        </div>

                        {/* Technical Spec Metrics */}
                        <div className="lp-spec-metrics">
                            <div className="lp-spec-item">
                                <span className="lp-spec-val">
                                    <Counter to={stats.totalTrainees ?? stats.total_students ?? stats.totalUsers ?? 0} />+
                                </span>
                                <span className="lp-spec-lbl">TRAINEES ENROLLED</span>
                            </div>
                            <div className="lp-spec-divider" />
                            <div className="lp-spec-item">
                                <span className="lp-spec-val">
                                    <Counter to={stats.totalProjects ?? stats.total_projects ?? 0} />
                                </span>
                                <span className="lp-spec-lbl">CAPSTONES &amp; PROJECTS</span>
                            </div>
                            <div className="lp-spec-divider" />
                            <div className="lp-spec-item">
                                <span className="lp-spec-val">
                                    <Counter to={stats.verifiedCertificatesRate ?? 100} />%
                                </span>
                                <span className="lp-spec-lbl">VERIFIABLE DIPLOMAS</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Clean & Simple Academic Programs Showcase */}
                    <div id="tracks" className="lp-inspector-frame">
                        <div className="lp-inspector-header">
                            <span className="lp-inspector-title" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                                <BookOpen size={16} color="var(--accent)" /> Academic Programs Overview
                            </span>
                            <span className="lp-inspector-live" style={{ color: 'var(--accent)' }}>
                                COHORT 2026
                            </span>
                        </div>

                        {/* Active Program Card */}
                        <div className="lp-inspector-body">
                            <div className="lp-track-meta-row" style={{ marginBottom: '0.85rem' }}>
                                <h3 className="lp-track-title" style={{ margin: 0 }}>{currentTrack.title}</h3>
                            </div>

                            <div className="lp-track-detail-pills">
                                <span className="lp-pill"><BookOpen size={13} /> {currentTrack.duration}</span>
                                <span className="lp-pill"><Award size={13} /> Verifiable Diploma</span>
                            </div>

                            {/* Curriculum Modules */}
                            <div className="lp-syllabus-list" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
                                <span className="lp-syll-title">Key Program Modules:</span>
                                {currentTrack.modules.map((m, i) => (
                                    <div key={i} className="lp-syll-item">
                                        <span className="lp-syll-num">0{i + 1}</span>
                                        <span className="lp-syll-text">{m}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Tech Stack Chips */}
                            <div className="lp-tech-chips" style={{ marginBottom: '1.2rem' }}>
                                <span className="lp-chips-label">Technologies &amp; Tools:</span>
                                <div className="lp-chips-wrap">
                                    {currentTrack.tech.map((tc, i) => (
                                        <span key={i} className="lp-chip">{tc}</span>
                                    ))}
                                </div>
                            </div>

                            <Link to="/courses" className="lp-cta-btn" style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}>
                                Explore All Programs <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>

                </div>
            </section>

            {/* ── SECTION 03: INSTITUTIONAL ADVANTAGES ── */}
            <section id="advantages" className="lp-sect lp-inst-sect">
                <div className="lp-sect-in">
                    <div className="lp-inst-grid">
                        
                        <div className="lp-inst-copy">
                            <span className="lp-label">WHY ERTH CENTER</span>
                            <h2>Engineering Standard Educational Methodology</h2>
                            <p>
                                We bridge academic theory with real-world engineering capability through hands-on labs and peer-reviewed capstones.
                            </p>

                            <div className="lp-inst-features">
                                {[
                                    'Curriculum engineered to match current industrial requirements',
                                    'Direct code-level evaluation and feedback from senior trainers',
                                    'Cryptographically secure diplomas instantly verifiable online',
                                    'Portfolio-ready capstone projects evaluated by experts'
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
                                        <span className="lp-icf-val">
                                            <Counter to={stats.satisfactionRate ?? 98.4} decimals={1} />%
                                        </span>
                                        <span className="lp-icf-lbl">Trainee Satisfaction</span>
                                    </div>
                                    <div className="lp-icf-m">
                                        <span className="lp-icf-val">
                                            <Counter to={stats.verifiedCertificatesRate ?? 100} />%
                                        </span>
                                        <span className="lp-icf-lbl">Verified Certificates</span>
                                    </div>
                                    <div className="lp-icf-m">
                                        <span className="lp-icf-val">
                                            <Counter to={stats.totalModules ?? stats.totalTopics ?? 12} />+
                                        </span>
                                        <span className="lp-icf-lbl">Specialized Modules</span>
                                    </div>
                                    <div className="lp-icf-m">
                                        <span className="lp-icf-val" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                            <Star size={15} fill="currentColor" />
                                            <Counter to={stats.trainerRating ?? 4.9} decimals={1} />
                                        </span>
                                        <span className="lp-icf-lbl">Trainer Rating</span>
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
                    <h2>Accelerate Your Engineering Career Today</h2>
                    <p>Join ERTH Training Center to master robotics, AI, and software engineering with verified credentials.</p>
                    <div className="lp-cta-acts">
                        {!user ? (
                            <Link to="/auth" className="lp-cta-btn lp-cta-btn--lg">
                                Sign In to Training Center <ArrowRight size={16} />
                            </Link>
                        ) : (
                            <Link to="/courses" className="lp-cta-btn lp-cta-btn--lg">
                                Go to Course Catalog <ArrowRight size={16} />
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
                        <span><strong>NMU Faculty of CS &amp; Engineering</strong></span>
                    </div>
                    <div className="lp-footer-links">
                        <a href="#tracks" className="lp-nl">Program</a>
                        <a href="#advantages" className="lp-nl">Why ERTH</a>
                        <Link to="/verify" className="lp-nl">Verification</Link>
                        <Link to="/auth" className="lp-nl">Sign In</Link>
                    </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: '1.25rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border-medium, #cbd5e1)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <p className="lp-footer-copy" style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted, #64748b)' }}>
                        © 2026 New Mansoura University - Faculty of Computer Science and Engineering.
                    </p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted, #64748b)', margin: 0, padding: 0 }}>
                        Engineered &amp; Powered by{' '}
                        <a 
                            href="https://erth.dev" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ color: 'var(--text-hi, #0f172a)', textDecoration: 'underline', fontWeight: 600 }}
                        >
                            ERTH
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
}
