import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { verifyOtp, resendOtp, requestPasswordReset, verifyResetOtp, resetSetPassword } from '../services/api';
import { MAJORS_BY_FACULTY } from '../data/constants';
import { Eye, EyeOff, ArrowRight, Loader2, Brain, Users, Star, ShieldCheck, Mail, ArrowLeft, RefreshCw, KeyRound, CheckCircle2, Circle } from 'lucide-react';
import './Auth.css';

// Extract student ID (trailing digits) from NMU email local part
const extractStudentId = (email) => {
    const local = (email || '').split('@')[0];
    const match = local.match(/(\d+)$/);
    return match ? match[1] : '';
};

// Strict NMU email validation
const isValidUniversityEmail = (email) => /^[a-zA-Z0-9._%+-]+@nmu\.edu\.eg$/i.test(email);



// Common weak passwords list (from old auth.js)
const COMMON_PASSWORDS = [
    'password', '123456', 'password123', '12345678', 'qwerty', 'abc123',
    'password1', '1234567', 'iloveyou', 'sunshine', 'princess', 'admin',
    'welcome', 'monkey', 'dragon', 'master', 'login', 'letmein',
];

function PasswordStrength({ password }) {
    const { score, label, color } = useMemo(() => {
        if (!password) return { score: 0, label: '', color: '' };
        let s = 0;
        if (password.length >= 8) s++;
        if (password.length >= 12) s++;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
        if (/[0-9]/.test(password)) s++;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) s++;
        if (COMMON_PASSWORDS.some(w => password.toLowerCase().includes(w))) s = Math.min(s, 1);
        const levels = [
            { color: '#f43f5e', label: 'Weak' },
            { color: '#f97316', label: 'Fair' },
            { color: '#eab308', label: 'Good' },
            { color: '#10b981', label: 'Strong' },
        ];
        const idx = Math.min(Math.max(Math.floor(s - 1), 0), 3);
        return { score: s, label: levels[idx].label, color: levels[idx].color };
    }, [password]);

    if (!password) return null;

    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    return (
        <div className="pw-meter-container" style={{ marginTop: '12px' }}>
            <div className="pw-meter">
                <div className="pw-bars">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="pw-bar" style={{ background: i < score ? color : 'var(--border)' }} />
                    ))}
                </div>
                <div className="pw-label" style={{ color }}>{label}</div>
            </div>
            
            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-1)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: hasLength ? 'var(--emerald)' : 'var(--text-2)' }}>
                    {hasLength ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    <span style={{ opacity: hasLength ? 1 : 0.7 }}>{document.documentElement.lang === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: hasUpper ? 'var(--emerald)' : 'var(--text-2)' }}>
                    {hasUpper ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    <span style={{ opacity: hasUpper ? 1 : 0.7 }}>{document.documentElement.lang === 'ar' ? 'حرف كبير واحد على الأقل' : 'At least one uppercase letter'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: hasLower ? 'var(--emerald)' : 'var(--text-2)' }}>
                    {hasLower ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    <span style={{ opacity: hasLower ? 1 : 0.7 }}>{document.documentElement.lang === 'ar' ? 'حرف صغير واحد على الأقل' : 'At least one lowercase letter'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: hasNumber ? 'var(--emerald)' : 'var(--text-2)' }}>
                    {hasNumber ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    <span style={{ opacity: hasNumber ? 1 : 0.7 }}>{document.documentElement.lang === 'ar' ? 'رقم واحد على الأقل' : 'At least one number'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: hasSpecial ? 'var(--emerald)' : 'var(--text-2)' }}>
                    {hasSpecial ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                    <span style={{ opacity: hasSpecial ? 1 : 0.7 }}>{document.documentElement.lang === 'ar' ? 'رمز خاص واحد على الأقل (!@#$)' : 'At least one special character (!@#$)'}</span>
                </div>
            </div>
        </div>
    );
}

export default function Auth() {
    const { t, lang } = useI18n();
    const { login, register, profile, reloadSession } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'login');
    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [shakeForm, setShakeForm] = useState(false);



    // Field-level errors
    const [fieldErrors, setFieldErrors] = useState({});

    // Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPw, setLoginPw] = useState('');

    // Forgot password state
    const [resetMode, setResetMode] = useState(false);  // show forgot password UI
    const [resetStep, setResetStep] = useState(1);       // 1=email, 2=otp, 3=new password
    const [resetEmail, setResetEmail] = useState('');
    const [resetOtpDigits, setResetOtpDigits] = useState(['', '', '', '', '', '']);
    const [resetToken, setResetToken] = useState('');
    const [resetNewPw, setResetNewPw] = useState('');
    const [resetConfirmPw, setResetConfirmPw] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const resetOtpRefs = useRef([]);

    // Reset OTP input handlers (reuse pattern from verify)
    const handleResetOtpChange = useCallback((index, value) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        setResetOtpDigits(prev => { const next = [...prev]; next[index] = digit; return next; });
        if (digit && index < 5) resetOtpRefs.current[index + 1]?.focus();
    }, []);
    const handleResetOtpKeyDown = useCallback((index, e) => {
        if (e.key === 'Backspace' && !resetOtpDigits[index] && index > 0) resetOtpRefs.current[index - 1]?.focus();
    }, [resetOtpDigits]);
    const handleResetOtpPaste = useCallback((e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) { setResetOtpDigits(pasted.split('')); resetOtpRefs.current[5]?.focus(); }
    }, []);

    // Step 1: Request reset
    const handleResetRequest = async (e) => {
        if (e) e.preventDefault();
        if (!resetEmail.trim()) { setError(lang === 'ar' ? 'Ø£Ø¯Ø®Ù„ Ø¨Ø±ÙŠØ¯Ùƒ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ' : 'Enter your email address'); return; }
        setResetLoading(true); setError('');
        const result = await requestPasswordReset(resetEmail);
        setResetLoading(false);
        if (result.error) { setError(result.error.message); return; }
        setResetStep(2);
        setResendCooldown(60);
    };

    // Step 2: Verify OTP
    const handleResetVerify = async (e) => {
        if (e) e.preventDefault();
        const code = resetOtpDigits.join('');
        if (code.length !== 6) { setError(lang === 'ar' ? 'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø±Ù…Ø² ÙƒØ§Ù…Ù„Ø§Ù‹' : 'Enter the full 6-digit code'); return; }
        setResetLoading(true); setError('');
        const result = await verifyResetOtp(resetEmail, code);
        setResetLoading(false);
        if (result.error) {
            setError(result.error.message);
            setResetOtpDigits(['', '', '', '', '', '']);
            resetOtpRefs.current[0]?.focus();
            return;
        }
        setResetToken(result.data.reset_token);
        setResetStep(3);
    };

    // Step 3: Set new password
    const handleResetSetPassword = async (e) => {
        if (e) e.preventDefault();
        if (resetNewPw.length < 8) { setError(lang === 'ar' ? 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ÙŠØ¬Ø¨ Ø£Ù† ØªÙƒÙˆÙ† 8 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„' : 'Password must be at least 8 characters'); return; }
        if (resetNewPw !== resetConfirmPw) { setError(lang === 'ar' ? 'ÙƒÙ„Ù…ØªØ§ Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± Ù…ØªØ·Ø§Ø¨Ù‚ØªÙŠÙ†' : 'Passwords do not match'); return; }
        setResetLoading(true); setError('');
        const result = await resetSetPassword(resetEmail, resetToken, resetNewPw);
        setResetLoading(false);
        if (result.error) { setError(result.error.message); return; }
        setResetSuccess(true);
        setTimeout(() => { setResetMode(false); setResetStep(1); setResetSuccess(false); setTab('login'); }, 2000);
    };

    // Register state
    const [regName, setRegName] = useState('');
    const [regUsername, setRegUsername] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPw, setRegPw] = useState('');
    const [regPwConfirm, setRegPwConfirm] = useState('');
    const [regCollege] = useState('cs');
    const [regYear, setRegYear] = useState('');
    const [regMajor, setRegMajor] = useState('');

    // â”€â”€ OTP Verification State â”€â”€
    const [verifyMode, setVerifyMode] = useState(false);
    const [verifyUserId, setVerifyUserId] = useState(null);
    const [verifyEmail, setVerifyEmail] = useState('');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpSuccess, setOtpSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendLoading, setResendLoading] = useState(false);
    const otpRefs = useRef([]);

    // Countdown timer for resend cooldown
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    // Auto-focus first OTP input when entering verify mode
    useEffect(() => {
        if (verifyMode && otpRefs.current[0]) {
            setTimeout(() => otpRefs.current[0]?.focus(), 100);
        }
    }, [verifyMode]);

    // Enter verification mode (called after register or login with unverified email)
    const enterVerifyMode = useCallback((userId, email) => {
        setVerifyUserId(userId);
        setVerifyEmail(email);
        setVerifyMode(true);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpSuccess(false);
        setError('');
        setResendCooldown(60); // 60s initial cooldown
    }, []);

    // Handle OTP digit input with auto-advance
    const handleOtpChange = useCallback((index, value) => {
        // Only allow digits
        const digit = value.replace(/\D/g, '').slice(-1);
        setOtpDigits(prev => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });
        // Auto-advance to next input
        if (digit && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    }, []);

    // Handle backspace in OTP inputs
    const handleOtpKeyDown = useCallback((index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    }, [otpDigits]);

    // Handle paste into OTP inputs
    const handleOtpPaste = useCallback((e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtpDigits(pasted.split(''));
            otpRefs.current[5]?.focus();
        }
    }, []);

    // Submit OTP verification
    const handleVerifyOtp = async (e) => {
        if (e) e.preventDefault();
        const code = otpDigits.join('');
        if (code.length !== 6) {
            setError(lang === 'ar' ? 'ÙŠØ±Ø¬Ù‰ Ø¥Ø¯Ø®Ø§Ù„ Ø§Ù„Ø±Ù…Ø² Ø§Ù„Ù…ÙƒÙˆÙ† Ù…Ù† 6 Ø£Ø±Ù‚Ø§Ù…' : 'Please enter the full 6-digit code');
            return;
        }
        setError('');
        setOtpLoading(true);
        const result = await verifyOtp(verifyUserId, verifyEmail, code);
        setOtpLoading(false);
        if (result.error) {
            setError(result.error.message || (lang === 'ar' ? 'Ø±Ù…Ø² ØºÙŠØ± ØµØ­ÙŠØ­' : 'Invalid code'));
            setOtpDigits(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
            setShakeForm(true);
            setTimeout(() => setShakeForm(false), 600);
        } else {
            setOtpSuccess(true);
            // Reload session so AuthContext knows we're logged in
            const sessionData = await reloadSession();
            // Wait a moment to show success, then redirect
            setTimeout(() => {
                checkOnboardingRedirect(sessionData?.profile, sessionData?.user);
            }, 1000);
        }
    };

    // Resend OTP
    const handleResendOtp = async () => {
        if (resendCooldown > 0 || resendLoading) return;
        setResendLoading(true);
        setError('');
        const result = await resendOtp(verifyUserId, verifyEmail);
        setResendLoading(false);
        if (result.error) {
            setError(result.error.message || (lang === 'ar' ? 'ÙØ´Ù„ Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„' : 'Failed to resend'));
        } else {
            setResendCooldown(60);
            setError('');
            setOtpDigits(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        }
    };


    const availableMajors = useMemo(() => {
        return MAJORS_BY_FACULTY['cs'] || [];
    }, []);

    // Clear field error when user types
    const clearFieldError = (field) => {
        setFieldErrors(prev => {
            if (!prev[field]) return prev;
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    // Strong password validation (matching old auth.js rules)
    const validatePassword = (pw) => {
        const errors = [];
        if (pw.length < 8) errors.push('Must be at least 8 characters');
        if (!/[A-Z]/.test(pw)) errors.push('Must include an uppercase letter');
        if (!/[0-9]/.test(pw)) errors.push('Must include a number');
        if (COMMON_PASSWORDS.some(w => pw.toLowerCase() === w)) errors.push('This password is too common');
        return errors;
    };

    // Check if user needs onboarding (no skills set)
    const checkOnboardingRedirect = (userProfile, userObj) => {
        const role = userObj?.role || userProfile?.role;
        const isAdmin = !!(userObj?.is_admin || userObj?.role === 'admin' || userProfile?.is_admin || userProfile?.role === 'admin' || role === 'admin');
        const isTrainer = role === 'trainer';

        if (isAdmin || isTrainer) {
            navigate('/courses');
            return false;
        }

        if (!userProfile || !userProfile.user_skills || userProfile.user_skills.length === 0) {
            navigate('/onboarding');
            return true;
        }
        navigate('/courses');
        return false;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(''); setFieldErrors({});
        setLoading(true);
        const result = await login(loginEmail, loginPw);
        setLoading(false);
        if (result.error) {
            setError(t('auth_error_invalid'));
            setShakeForm(true);
            setTimeout(() => setShakeForm(false), 600);
        } else if (result.requiresVerification) {
            // Email not verified — show OTP screen
            const vd = result.verificationData;
            enterVerifyMode(vd.user_id, vd.email);
        } else {
            checkOnboardingRedirect(result.profile, result.user);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError(''); setFieldErrors({});

        // Field-level validation
        const errors = {};
        if (!regName.trim()) errors.name = lang === 'ar' ? 'يرجى إدخال اسمك الكامل' : 'Please enter your full name';
        if (!regUsername.trim()) {
            errors.username = lang === 'ar' ? 'يرجى إدخال اسم المستخدم' : 'Please enter a username';
        } else if (regUsername.trim().length < 3 || regUsername.trim().length > 16) {
            errors.username = lang === 'ar' ? 'يجب أن يكون اسم المستخدم بين 3 و 16 حرفاً' : 'Username must be between 3 and 16 characters';
        } else if (!/^[a-zA-Z0-9_\.]+$/.test(regUsername.trim())) {
            errors.username = lang === 'ar' ? 'يمكن لاسم المستخدم أن يحتوي فقط على أحرف وأرقام و شرطات سفلية ونقاط' : 'Username can only contain alphanumeric characters, underscores, and dots';
        }
        if (!regEmail.trim()) errors.email = lang === 'ar' ? 'يرجى إدخال بريدك الإلكتروني' : 'Email address is required';
        else if (!isValidUniversityEmail(regEmail)) errors.email = lang === 'ar' ? 'يجب استخدام البريد الجامعي فقط (@nmu.edu.eg)' : 'Please use your university email (@nmu.edu.eg)';
        if (!regYear) errors.year = lang === 'ar' ? 'يرجى اختيار السنة الدراسية' : 'Please select your academic year';
        if (!regMajor) errors.major = lang === 'ar' ? 'يرجى إدخال/اختيار تخصصك' : 'Please tell us your major';

        // Strong password validation
        const pwErrors = validatePassword(regPw);
        if (pwErrors.length) errors.password = pwErrors[0];
        if (regPw !== regPwConfirm) errors.confirmPw = lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';

        if (Object.keys(errors).length) {
            setFieldErrors(errors);
            setError(Object.values(errors)[0]);
            setShakeForm(true);
            setTimeout(() => setShakeForm(false), 600);
            return;
        }

        setLoading(true);
        const studentId = extractStudentId(regEmail);
        const result = await register(regEmail, regPw, {
            full_name_en: regName,
            username: regUsername.trim(),
            student_id: studentId || null,
            college_key: 'cs',
            academic_year: regYear,
            major: regMajor || null,
            role: 'student'
        });
        setLoading(false);
        if (result.error) {
            setError(result.error.message || t('error_generic'));
            setShakeForm(true);
            setTimeout(() => setShakeForm(false), 600);
        } else if (result.requiresVerification) {
            // Show OTP verification screen
            const vd = result.verificationData;
            enterVerifyMode(vd.user_id, vd.email);
        } else {
            navigate('/onboarding');
        }
    };

    return (
        <div className="auth-page">
            <div className="bg-glow" />

            {/* Brand panel */}
            <div className="auth-brand">
                <Link to="/" className="auth-brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="/assets/university_logo.png" alt="NMU ERTH Training Center" style={{ height: '48px', objectFit: 'contain' }} />
                    <span className="logo-text">NMU ERTH<span className="logo-accent"> Training Center</span></span>
                </Link>
                <div className="auth-brand-content">
                    <div className="auth-brand-tag">
                        <span className="auth-brand-tag-dot" />
                        New Mansoura University
                    </div>
                    <h2>
                        {lang === 'ar' ? 'ÙƒÙˆÙ‘Ù† Ù Ø±ÙŠÙ‚Ùƒ' : 'Find your'}<br />
                        <span className="gradient-text">{lang === 'ar' ? 'Ø§Ù„Ù…Ø«Ø§Ù„ÙŠ Ø¨Ø°ÙƒØ§Ø¡.' : 'perfect team.'}</span>
                    </h2>
                    <p>{lang === 'ar' ? 'ERTH Training Center ÙŠØ­Ù„Ù„ Ù…Ù‡Ø§Ø±Ø§ØªÙƒ ÙˆØ£Ø³Ù„ÙˆØ¨ Ø¹Ù…Ù„Ùƒ Ù„ØªÙˆØµÙŠÙ„Ùƒ Ø¨Ø£ÙØ¶Ù„ Ø§Ù„Ø²Ù…Ù„Ø§Ø¡ Ù„Ù…Ø´Ø§Ø±ÙŠØ¹Ùƒ Ø§Ù„Ø£ÙƒØ§Ø¯ÙŠÙ…ÙŠØ© Ø¹Ø¨Ø± Ø¬Ù…Ø¹ Ù…Ø§Ù†Ø³ÙˆØ±Ø© Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©.' : 'ERTH Training Center matches students by skill, work style, and availability â€” so you spend less time searching and more time building.'}</p>
                    <div className="auth-features">
                        <div className="auth-feature-item">
                            <Brain size={18} className="auth-feature-icon" />
                            <span>{lang === 'ar' ? 'ØªÙˆØ§ÙÙ‚ Ø°ÙƒÙŠ Ù…Ø¨Ù†ÙŠ Ø¹Ù„Ù‰ Ø§Ù„Ù…Ù‡Ø§Ø±Ø§Øª Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠØ©' : 'Smart matching based on real skills and proficiency levels'}</span>
                        </div>
                        <div className="auth-feature-item">
                            <Users size={18} className="auth-feature-icon" />
                            <span>{lang === 'ar' ? 'Ø§Ù†Ø´Ø± Ù…Ø´Ø±ÙˆØ¹Ùƒ ÙˆØ§Ø³ØªÙ‚Ø·Ø¨ Ø²Ù…Ù„Ø§Ø¡Ùƒ Ø§Ù„Ù…Ù†Ø§Ø³Ø¨ÙŠÙ†' : 'Post your project and attract teammates with the exact skills you need'}</span>
                        </div>
                        <div className="auth-feature-item">
                            <Star size={18} className="auth-feature-icon" />
                            <span>{lang === 'ar' ? 'Ø§Ø¨Ù†Ù Ø³Ø¬Ù„Ùƒ Ø§Ù„Ø£ÙƒØ§Ø¯ÙŠÙ…ÙŠ Ø¨ØªÙ‚ÙŠÙŠÙ…Ø§Øª Ø­Ù‚ÙŠÙ‚ÙŠØ© Ù…Ù† Ø§Ù„Ø²Ù…Ù„Ø§Ø¡' : 'Build your academic reputation through honest, structured peer reviews'}</span>
                        </div>
                    </div>
                </div>
                <div className="auth-brand-bottom">
                    <p className="auth-brand-copy">&copy; 2026 ERTH Training Center &middot; New Mansoura University</p>
                </div>
                <div className="auth-brand-decoration">
                    <div className="auth-orb auth-orb--1" />
                    <div className="auth-orb auth-orb--2" />
                </div>
            </div>

            {/* Form panel */}
            <div className="auth-form-panel">
                <div className="auth-form-container" style={{ maxWidth: tab === 'register' ? '520px' : '420px' }}>
                    {/* Mobile logo */}
                    <div className="auth-mobile-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <img src="/assets/university_logo.png" alt="NMU ERTH Training Center" style={{ height: '36px', objectFit: 'contain' }} />
                        NMU ERTH <span>Training Center</span>
                    </div>

                    {/* Tabs */}
                    <div className="auth-tabs">
                        <button className={`auth-tab ${tab === 'login' ? 'auth-tab--active' : ''}`} onClick={() => { setTab('login'); setError(''); setFieldErrors({}); }}>
                            {t('login')}
                        </button>
                        <button className={`auth-tab ${tab === 'register' ? 'auth-tab--active' : ''}`} onClick={() => { setTab('register'); setError(''); setFieldErrors({}); }}>
                            {t('register')}
                        </button>
                    </div>

                    {/* Heading */}
                    <div className="auth-heading">
                        <h1>{tab === 'login' ? t('login_title') : t('register_title')}</h1>
                        <p>{tab === 'login' ? t('login_subtitle') : t('register_subtitle')}</p>
                    </div>

                    {error && <div className="auth-error">{error}</div>}

                    {/* â”€â”€ OTP Verification Screen â”€â”€ */}
                    {verifyMode ? (
                        <div className={`auth-form otp-verify-form ${shakeForm ? 'form-shake' : ''}`}>
                            <div className="otp-verify-header">
                                <div className="otp-icon-wrap">
                                    {otpSuccess ? <ShieldCheck size={32} /> : <Mail size={32} />}
                                </div>
                                <h2>{otpSuccess ? (lang === 'ar' ? 'ØªÙ… Ø§Ù„ØªØ­Ù‚Ù‚ Ø¨Ù†Ø¬Ø§Ø­!' : 'Email Verified!') : (lang === 'ar' ? 'ØªØ­Ù‚Ù‚ Ù…Ù† Ø¨Ø±ÙŠØ¯Ùƒ' : 'Check Your Email')}</h2>
                                <p className="otp-subtitle">
                                    {otpSuccess
                                        ? (lang === 'ar' ? 'Ø¬Ø§Ø±ÙŠ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„...' : 'Logging you in...')
                                        : (lang === 'ar'
                                            ? <>Ø£Ø±Ø³Ù„Ù†Ø§ Ø±Ù…Ø² ØªØ­Ù‚Ù‚ Ø¥Ù„Ù‰ <strong>{verifyEmail}</strong><br/><span style={{fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px', display: 'block'}}>ÙŠØ±Ø¬Ù‰ Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ù…Ø¬Ù„Ø¯ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¹Ø´ÙˆØ§Ø¦ÙŠ (Junk/Spam) Ø¥Ø°Ø§ Ù„Ù… ØªØ¬Ø¯Ù‡</span></>
                                            : <>We sent a 6-digit code to <strong>{verifyEmail}</strong><br/><span style={{fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px', display: 'block'}}>Please check your Junk/Spam folder if you don't see it</span></>)}
                                </p>
                            </div>
                            {!otpSuccess && (
                                <>
                                    <form onSubmit={handleVerifyOtp}>
                                        <div className="otp-inputs">
                                            {otpDigits.map((digit, i) => (
                                                <input key={i} ref={el => otpRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKeyDown(i, e)} onPaste={i === 0 ? handleOtpPaste : undefined} className="otp-digit" autoComplete="one-time-code" />
                                            ))}
                                        </div>
                                        <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={otpLoading || otpDigits.join('').length !== 6}>
                                            {otpLoading ? <Loader2 size={18} className="spin" /> : <>{lang === 'ar' ? 'ØªØ­Ù‚Ù‚' : 'Verify'} <ShieldCheck size={18} /></>}
                                        </button>
                                    </form>
                                    <div className="otp-actions">
                                        <button className="otp-resend-btn" onClick={handleResendOtp} disabled={resendCooldown > 0 || resendLoading}>
                                            {resendLoading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                                            {resendCooldown > 0 ? (lang === 'ar' ? `Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ø¥Ø±Ø³Ø§Ù„ (${resendCooldown}Ø«)` : `Resend (${resendCooldown}s)`) : (lang === 'ar' ? 'Ø¥Ø¹Ø§Ø¯Ø© Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ù…Ø²' : 'Resend Code')}
                                        </button>
                                        <button className="otp-back-btn" type="button" onClick={() => { setVerifyMode(false); setError(''); }}>
                                            <ArrowLeft size={14} /> {lang === 'ar' ? 'Ø±Ø¬ÙˆØ¹' : 'Back'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : resetMode ? (
                        <div className="auth-form otp-verify-form">
                            <div className="otp-verify-header">
                                <div className="otp-icon-wrap">
                                    {resetSuccess ? <ShieldCheck size={32} /> : <KeyRound size={32} />}
                                </div>
                                <h2>{resetSuccess ? (lang === 'ar' ? 'ØªÙ… Ø§Ù„ØªØºÙŠÙŠØ± Ø¨Ù†Ø¬Ø§Ø­!' : 'Password Reset!') : resetStep === 1 ? (lang === 'ar' ? 'Ù†Ø³ÙŠØª ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±' : 'Forgot Password') : resetStep === 2 ? (lang === 'ar' ? 'Ø£Ø¯Ø®Ù„ Ø§Ù„Ø±Ù…Ø²' : 'Enter Code') : (lang === 'ar' ? 'ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Ø¬Ø¯ÙŠØ¯Ø©' : 'New Password')}</h2>
                                <p className="otp-subtitle">
                                    {resetSuccess ? (lang === 'ar' ? 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªÙˆØ¬ÙŠÙ‡ Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„...' : 'Redirecting to login...')
                                        : resetStep === 1 ? (lang === 'ar' ? 'Ø£Ø¯Ø®Ù„ Ø¨Ø±ÙŠØ¯Ùƒ ÙˆØ³Ù†Ø±Ø³Ù„ Ù„Ùƒ Ø±Ù…Ø² ØªØ­Ù‚Ù‚' : "Enter your email and we'll send you a verification code")
                                        : resetStep === 2 ? (<>{lang === 'ar' ? <>Ø£Ø±Ø³Ù„Ù†Ø§ Ø±Ù…Ø²Ø§Ù‹ Ø¥Ù„Ù‰ <strong>{resetEmail}</strong></> : <>We sent a code to <strong>{resetEmail}</strong></>}<br/><span style={{fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px', display: 'block'}}>{lang === 'ar' ? 'ØªØ­Ù‚Ù‚ Ù…Ù† Ù…Ø¬Ù„Ø¯ Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¹Ø´ÙˆØ§Ø¦ÙŠ (Junk/Spam)' : 'Check your Junk/Spam folder if needed'}</span></>)
                                        : (lang === 'ar' ? 'Ø§Ø®ØªØ± ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Ø¬Ø¯ÙŠØ¯Ø© Ù‚ÙˆÙŠØ©' : 'Choose a strong new password')}
                                </p>
                            </div>
                            {!resetSuccess && (<>
                                {resetStep === 1 && (
                                    <form onSubmit={handleResetRequest} style={{width: '100%'}}>
                                        <div className="form-group">
                                            <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder={lang === 'ar' ? 'Ø¨Ø±ÙŠØ¯Ùƒ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ' : 'yourname@nmu.edu.eg'} required autoFocus style={{textAlign: 'center'}} />
                                        </div>
                                        <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={resetLoading}>
                                            {resetLoading ? <Loader2 size={18} className="spin" /> : <>{lang === 'ar' ? 'Ø¥Ø±Ø³Ø§Ù„ Ø§Ù„Ø±Ù…Ø²' : 'Send Code'} <ArrowRight size={18} /></>}
                                        </button>
                                    </form>
                                )}
                                {resetStep === 2 && (
                                    <form onSubmit={handleResetVerify} style={{width: '100%'}}>
                                        <div className="otp-inputs">
                                            {resetOtpDigits.map((digit, i) => (
                                                <input key={i} ref={el => resetOtpRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={digit} onChange={e => handleResetOtpChange(i, e.target.value)} onKeyDown={e => handleResetOtpKeyDown(i, e)} onPaste={i === 0 ? handleResetOtpPaste : undefined} className="otp-digit" autoComplete="one-time-code" />
                                            ))}
                                        </div>
                                        <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={resetLoading || resetOtpDigits.join('').length !== 6}>
                                            {resetLoading ? <Loader2 size={18} className="spin" /> : <>{lang === 'ar' ? 'ØªØ­Ù‚Ù‚' : 'Verify'} <ShieldCheck size={18} /></>}
                                        </button>
                                    </form>
                                )}
                                {resetStep === 3 && (
                                    <form onSubmit={handleResetSetPassword} style={{width: '100%'}}>
                                        <div className="form-group">
                                            <label>{lang === 'ar' ? 'ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©' : 'New Password'}</label>
                                            <input type="password" value={resetNewPw} onChange={e => setResetNewPw(e.target.value)} minLength={8} required autoFocus />
                                        </div>
                                        <div className="form-group">
                                            <label>{lang === 'ar' ? 'ØªØ£ÙƒÙŠØ¯ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±' : 'Confirm Password'}</label>
                                            <input type="password" value={resetConfirmPw} onChange={e => setResetConfirmPw(e.target.value)} required />
                                        </div>
                                        <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={resetLoading}>
                                            {resetLoading ? <Loader2 size={18} className="spin" /> : <>{lang === 'ar' ? 'ØªØ¹ÙŠÙŠÙ† ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±' : 'Set Password'} <ShieldCheck size={18} /></>}
                                        </button>
                                    </form>
                                )}
                                <div className="otp-actions">
                                    <button className="otp-back-btn" type="button" onClick={() => { setResetMode(false); setResetStep(1); setError(''); setResetOtpDigits(['','','','','','']); setResetNewPw(''); setResetConfirmPw(''); }}>
                                        <ArrowLeft size={14} /> {lang === 'ar' ? 'Ø±Ø¬ÙˆØ¹ Ù„ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„' : 'Back to Login'}
                                    </button>
                                </div>
                            </>)}
                        </div>
                    ) : tab === 'login' ? (
                        <form className={`auth-form ${shakeForm ? 'form-shake' : ''}`} onSubmit={handleLogin}>
                            <div className="form-group">
                                <label>{t('email')}</label>
                                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="student@nmu.edu.eg" required autoFocus autoComplete="email" />
                            </div>
                            <div className="form-group">
                                <div className="form-label-row">
                                    <label>{t('password')}</label>
                                    <a href="#" className="forgot-link" onClick={(e) => {
                                        e.preventDefault();
                                        setResetEmail(loginEmail);
                                        setResetMode(true);
                                        setResetStep(1);
                                        setError('');
                                    }}>{t('forgot_password')}</a>
                                </div>
                                <div className="input-with-icon">
                                    <input type={showPw ? 'text' : 'password'} value={loginPw} onChange={e => setLoginPw(e.target.value)} required />
                                    <button type="button" className="input-icon-btn" onClick={() => setShowPw(!showPw)}>
                                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={loading}>
                                {loading ? <Loader2 size={18} className="spin" /> : <>{t('login')} <ArrowRight size={18} /></>}
                            </button>
                            <p className="auth-toggle">{t('no_account')} <button type="button" className="auth-toggle-link" onClick={() => setTab('register')}>{t('register')}</button></p>
                        </form>
                    ) : (
                        <form className={`auth-form ${shakeForm ? 'form-shake' : ''}`} onSubmit={handleRegister}>
                            {/* Name */}
                            <div className={`form-group ${fieldErrors.name ? 'has-error' : ''}`}>
                                <label>{t('full_name')}</label>
                                <input type="text" value={regName} onChange={e => { setRegName(e.target.value); clearFieldError('name'); }} placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} required autoFocus autoComplete="name" />
                                {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
                            </div>

                            {/* Username */}
                            <div className={`form-group ${fieldErrors.username ? 'has-error' : ''}`}>
                                <label>{t('username')}</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-2)', fontSize: '0.95rem', pointerEvents: 'none' }}>@</span>
                                    <input type="text" value={regUsername} onChange={e => { setRegUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '')); clearFieldError('username'); }} placeholder={lang === 'ar' ? 'اسم_المستخدم' : 'your_username'} required autoComplete="username" maxLength={16} style={{ paddingLeft: '30px' }} />
                                </div>
                                <span className="field-hint" style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '4px', display: 'block' }}>{t('username_hint')}</span>
                                {fieldErrors.username && <span className="field-error">{fieldErrors.username}</span>}
                            </div>

                            {/* Email */}
                            <div className={`form-group ${fieldErrors.email ? 'has-error' : ''}`}>
                                <label>{t('email')}</label>
                                <input type="email" value={regEmail} onChange={e => { setRegEmail(e.target.value); clearFieldError('email'); }} placeholder="yourname@nmu.edu.eg" required />
                                {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
                            </div>

                            {/* Year & Major */}
                            <div className="form-row">
                                <div className={`form-group ${fieldErrors.year ? 'has-error' : ''}`}>
                                    <label>{t('academic_year')}</label>
                                    <select value={regYear} onChange={e => { setRegYear(e.target.value); clearFieldError('year'); }} required>
                                        <option value=""> </option>
                                        {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>{t(`year_${y}`)}</option>)}
                                        <option value="grad">{t('graduate')}</option>
                                    </select>
                                    {fieldErrors.year && <span className="field-error">{fieldErrors.year}</span>}
                                </div>

                                <div className={`form-group ${fieldErrors.major ? 'has-error' : ''}`}>
                                    <label>{lang === 'ar' ? 'التخصص' : 'Major'}</label>
                                    {availableMajors.length > 0 ? (
                                        <select value={regMajor} onChange={e => { setRegMajor(e.target.value); clearFieldError('major'); }} required>
                                            <option value="">{lang === 'ar' ? 'Ø§Ø®ØªØ± ØªØ®ØµØµÙƒ...' : 'Select your major...'}</option>
                                            {availableMajors.map(m => <option key={m.value} value={m.value}>{lang === 'ar' ? m.label_ar : m.label}</option>)}
                                        </select>
                                    ) : (
                                        <input type="text" value={regMajor} onChange={e => { setRegMajor(e.target.value); clearFieldError('major'); }} placeholder={lang === 'ar' ? 'Ø£Ø¯Ø®Ù„ ØªØ®ØµØµÙƒ (Ù…Ø«Ø§Ù„: Ø¹Ù„ÙˆÙ… Ø­Ø§Ø³Ø¨)' : 'Enter your major (e.g. Computer Science)'} required />
                                    )}
                                    {fieldErrors.major && <span className="field-error">{fieldErrors.major}</span>}
                                </div>
                            </div>


                            {/* Password + Confirm */}
                            <div className="form-row">
                                <div className={`form-group ${fieldErrors.password ? 'has-error' : ''}`}>
                                    <label>{t('password')}</label>
                                    <div className="input-with-icon">
                                        <input type={showPw ? 'text' : 'password'} value={regPw} onChange={e => { setRegPw(e.target.value); clearFieldError('password'); }} minLength={8} required />
                                        <button type="button" className="input-icon-btn" onClick={() => setShowPw(!showPw)}>
                                            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <PasswordStrength password={regPw} />
                                    {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
                                </div>
                                <div className={`form-group ${fieldErrors.confirmPw ? 'has-error' : ''}`}>
                                    <label>{t('confirm_password')}</label>
                                    <div className="input-with-icon">
                                        <input type={showConfirmPw ? 'text' : 'password'} value={regPwConfirm} onChange={e => { setRegPwConfirm(e.target.value); clearFieldError('confirmPw'); }} required />
                                        <button type="button" className="input-icon-btn" onClick={() => setShowConfirmPw(!showConfirmPw)}>
                                            {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {fieldErrors.confirmPw && <span className="field-error">{fieldErrors.confirmPw}</span>}
                                </div>
                            </div>

                            <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={loading}>
                                {loading ? <Loader2 size={18} className="spin" /> : <>{t('register')} <ArrowRight size={18} /></>}
                            </button>
                            <p className="auth-toggle">{t('have_account')} <button type="button" className="auth-toggle-link" onClick={() => setTab('login')}>{t('login')}</button></p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
