import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../contexts/I18nContext';
import { useAuth } from '../contexts/AuthContext';
import { verifyOtp, resendOtp, requestPasswordReset, verifyResetOtp, resetSetPassword } from '../services/api';
import { Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, Mail, ArrowLeft, RefreshCw, KeyRound, AlertCircle, Lock, Check, X } from 'lucide-react';
import './Auth.css';

export default function Auth() {
    const { t, lang } = useI18n();
    const { login, reloadSession } = useAuth();
    const navigate = useNavigate();

    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [shakeForm, setShakeForm] = useState(false);

    // Login state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPw, setLoginPw] = useState('');

    // Verification state (for unverified accounts if any)
    const [verifyMode, setVerifyMode] = useState(false);
    const [verifyUserId, setVerifyUserId] = useState(null);
    const [verifyEmail, setVerifyEmail] = useState('');
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [otpLoading, setOtpLoading] = useState(false);
    const [otpSuccess, setOtpSuccess] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendLoading, setResendLoading] = useState(false);
    const otpRefs = useRef([]);

    // Forgot password state
    const [resetMode, setResetMode] = useState(false);
    const [resetStep, setResetStep] = useState(1); // 1=email, 2=otp, 3=new password
    const [resetEmail, setResetEmail] = useState('');
    const [resetOtpDigits, setResetOtpDigits] = useState(['', '', '', '', '', '']);
    const [resetToken, setResetToken] = useState('');
    const [resetNewPw, setResetNewPw] = useState('');
    const [resetConfirmPw, setResetConfirmPw] = useState('');
    const [showResetNewPw, setShowResetNewPw] = useState(false);
    const [showResetConfirmPw, setShowResetConfirmPw] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState(false);
    const resetOtpRefs = useRef([]);

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

    // Enter verification mode (called after login with unverified email)
    const enterVerifyMode = useCallback((userId, email) => {
        setVerifyUserId(userId);
        setVerifyEmail(email);
        setVerifyMode(true);
        setOtpDigits(['', '', '', '', '', '']);
        setOtpSuccess(false);
        setError('');
        setResendCooldown(60);
    }, []);

    // Handle OTP digit input with auto-advance
    const handleOtpChange = useCallback((index, value) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        setOtpDigits(prev => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });
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
            setError(lang === 'ar' ? 'يرجى إدخال الرمز المكون من 6 أرقام' : 'Please enter the full 6-digit code');
            return;
        }
        setError('');
        setOtpLoading(true);
        const result = await verifyOtp(verifyUserId, verifyEmail, code);
        setOtpLoading(false);
        if (result.error) {
            setError(result.error.message || (lang === 'ar' ? 'رمز غير صحيح' : 'Invalid code'));
            setOtpDigits(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
            setShakeForm(true);
            setTimeout(() => setShakeForm(false), 600);
        } else {
            setOtpSuccess(true);
            const sessionData = await reloadSession();
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
            setError(result.error.message || (lang === 'ar' ? 'فشل إعادة الإرسال' : 'Failed to resend'));
        } else {
            setResendCooldown(60);
            setError('');
            setOtpDigits(['', '', '', '', '', '']);
            otpRefs.current[0]?.focus();
        }
    };

    // Reset OTP input handlers
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
        if (!resetEmail.trim()) { setError(lang === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email address'); return; }
        setResetLoading(true); setError('');
        const result = await requestPasswordReset(resetEmail);
        setResetLoading(false);
        if (result.error) { setError(result.error.message); return; }
        setResetStep(2);
    };

    // Step 2: Verify reset OTP
    const handleResetVerify = async (e) => {
        if (e) e.preventDefault();
        const code = resetOtpDigits.join('');
        if (code.length !== 6) { setError(lang === 'ar' ? 'أدخل الرمز المكون من 6 أرقام' : 'Enter the 6-digit code'); return; }
        setResetLoading(true); setError('');
        const result = await verifyResetOtp(resetEmail, code);
        setResetLoading(false);
        if (result.error) { setError(result.error.message); return; }
        const token = result.reset_token || result.data?.reset_token || '';
        setResetToken(token);
        setResetStep(3);
    };

    // Step 3: Set new password
    const pwReqs = [
        { id: 'len', label: lang === 'ar' ? '8 أحرف على الأقل' : 'Minimum 8 characters', met: resetNewPw.length >= 8 },
        { id: 'upper', label: lang === 'ar' ? 'حرف كبير واحد على الأقل (A-Z)' : 'Must contain at least one uppercase letter', met: /[A-Z]/.test(resetNewPw) },
        { id: 'lower', label: lang === 'ar' ? 'حرف صغير واحد على الأقل (a-z)' : 'Must contain at least one lowercase letter', met: /[a-z]/.test(resetNewPw) },
        { id: 'num', label: lang === 'ar' ? 'رقم واحد على الأقل (0-9)' : 'Must contain at least one number', met: /[0-9]/.test(resetNewPw) },
        { id: 'special', label: lang === 'ar' ? 'رمز خاص واحد على الأقل (!@#$%...)' : 'Must contain at least one special character', met: /[^A-Za-z0-9]/.test(resetNewPw) },
    ];
    const allPwReqsMet = pwReqs.every(r => r.met);
    const passwordsMatch = resetConfirmPw.length > 0 && resetNewPw === resetConfirmPw;

    const handleResetSetPassword = async (e) => {
        if (e) e.preventDefault();
        if (!allPwReqsMet) {
            setError(lang === 'ar' ? 'يرجى استيفاء جميع شروط كلمة المرور' : 'Please meet all password requirements');
            return;
        }
        if (resetNewPw !== resetConfirmPw) {
            setError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
            return;
        }
        setResetLoading(true); setError('');
        const result = await resetSetPassword(resetEmail, resetToken, resetNewPw);
        setResetLoading(false);
        if (result.error) { setError(result.error.message); return; }
        setResetSuccess(true);
        setTimeout(() => {
            setResetMode(false);
            setResetStep(1);
            setResetSuccess(false);
            setLoginEmail(resetEmail);
            setLoginPw('');
            setError('');
        }, 1500);
    };

    // Check if user needs onboarding
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
        setError('');
        setLoading(true);
        const result = await login(loginEmail, loginPw);
        setLoading(false);
        if (result.error) {
            setError(result.error.message || t('auth_error_invalid') || 'Invalid email or password. Please try again.');
            setShakeForm(true);
            setTimeout(() => setShakeForm(false), 600);
        } else if (result.requiresVerification) {
            const vd = result.verificationData;
            enterVerifyMode(vd.user_id, vd.email);
        } else {
            checkOnboardingRedirect(result.profile, result.user);
        }
    };

    return (
        <div className="auth-page">
            <div className="bg-glow" />

            {/* Brand Header */}
            <div className="auth-brand">
                <Link to="/" className="auth-brand-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="/assets/university_logo.png" alt="NMU ERTH Training Center" style={{ height: '48px', objectFit: 'contain' }} />
                    <span className="logo-text">NMU ERTH<span className="logo-accent"> Training Center</span></span>
                </Link>
            </div>

            {/* Form panel */}
            <div className="auth-form-panel">
                <div className="auth-form-container" style={{ maxWidth: '430px' }}>
                    {/* Mobile logo */}
                    <div className="auth-mobile-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '1.25rem' }}>
                        <img src="/assets/university_logo.png" alt="NMU ERTH Training Center" style={{ height: '36px', objectFit: 'contain' }} />
                        <span style={{ fontWeight: 700 }}>NMU ERTH <span style={{ color: 'var(--primary, #8b0000)' }}>Training Center</span></span>
                    </div>

                    {/* Heading */}
                    <div className="auth-heading">
                        <h1>{t('login_title') || 'Welcome Back'}</h1>
                        <p>{t('login_subtitle') || 'Sign in to access your training dashboard and courses.'}</p>
                    </div>

                    {/* Highlighted Error Alert Banner */}
                    {error && (
                        <div className="auth-error" role="alert">
                            <AlertCircle size={20} style={{ flexShrink: 0, color: '#dc2626' }} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* ── OTP Verification Screen ── */}
                    {verifyMode ? (
                        <div className={`auth-form otp-verify-form ${shakeForm ? 'form-shake' : ''}`}>
                            <div className="otp-verify-header">
                                <div className="otp-icon-wrap">
                                    {otpSuccess ? <ShieldCheck size={32} /> : <Mail size={32} />}
                                </div>
                                <h2>{otpSuccess ? (lang === 'ar' ? 'تم التحقق بنجاح!' : 'Email Verified!') : (lang === 'ar' ? 'تحقق من بريدك' : 'Check Your Email')}</h2>
                                <p className="otp-subtitle">
                                    {otpSuccess
                                        ? (lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Logging you in...')
                                        : (lang === 'ar'
                                            ? <>أرسلنا رمز تحقق إلى <strong>{verifyEmail}</strong><br/><span style={{fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px', display: 'block'}}>يرجى التحقق من مجلد البريد العشوائي (Junk/Spam) إذا لم تجده</span></>
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
                                            {otpLoading ? <Loader2 size={18} className="spin" /> : <>{lang === 'ar' ? 'تحقق' : 'Verify'} <ShieldCheck size={18} /></>}
                                        </button>
                                    </form>
                                    <div className="otp-actions">
                                        <button className="otp-resend-btn" onClick={handleResendOtp} disabled={resendCooldown > 0 || resendLoading}>
                                            {resendLoading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />}
                                            {resendCooldown > 0 ? (lang === 'ar' ? `إعادة الإرسال (${resendCooldown}ث)` : `Resend (${resendCooldown}s)`) : (lang === 'ar' ? 'إعادة إرسال الرمز' : 'Resend Code')}
                                        </button>
                                        <button className="otp-back-btn" type="button" onClick={() => { setVerifyMode(false); setError(''); }}>
                                            <ArrowLeft size={14} /> {lang === 'ar' ? 'رجوع' : 'Back'}
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
                                <h2>{resetSuccess ? (lang === 'ar' ? 'تم التغيير بنجاح!' : 'Password Reset!') : resetStep === 1 ? (lang === 'ar' ? 'نسيت كلمة المرور' : 'Forgot Password') : resetStep === 2 ? (lang === 'ar' ? 'أدخل الرمز' : 'Enter Code') : (lang === 'ar' ? 'كلمة مرور جديدة' : 'New Password')}</h2>
                                <p className="otp-subtitle">
                                    {resetSuccess ? (lang === 'ar' ? 'جاري التوجيه لتسجيل الدخول...' : 'Redirecting to login...')
                                        : resetStep === 1 ? (lang === 'ar' ? 'أدخل بريدك وسنرسل لك رمز تحقق' : "Enter your email and we'll send you a verification code")
                                        : resetStep === 2 ? (<>{lang === 'ar' ? <>أرسلنا رمزاً إلى <strong>{resetEmail}</strong></> : <>We sent a code to <strong>{resetEmail}</strong></>}<br/><span style={{fontSize: '0.8rem', color: 'var(--muted)', marginTop: '4px', display: 'block'}}>{lang === 'ar' ? 'تحقق من مجلد البريد العشوائي (Junk/Spam)' : 'Check your Junk/Spam folder if needed'}</span></>)
                                        : (lang === 'ar' ? 'اختر كلمة مرور جديدة قوية' : 'Choose a strong new password')}
                                </p>
                            </div>
                            {!resetSuccess && (<>
                                {resetStep === 1 && (
                                    <form onSubmit={handleResetRequest} style={{width: '100%'}}>
                                        <div className="form-group">
                                            <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder={lang === 'ar' ? 'بريدك الإلكتروني' : 'yourname@nmu.edu.eg'} required autoFocus style={{textAlign: 'center'}} />
                                        </div>
                                        <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={resetLoading}>
                                            {resetLoading ? <Loader2 size={18} className="spin" /> : <>{lang === 'ar' ? 'إرسال الرمز' : 'Send Code'} <ArrowRight size={18} /></>}
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
                                            {resetLoading ? <Loader2 size={18} className="spin" /> : <>{lang === 'ar' ? 'تحقق' : 'Verify'} <ShieldCheck size={18} /></>}
                                        </button>
                                    </form>
                                )}
                                {resetStep === 3 && (
                                    <form onSubmit={handleResetSetPassword} style={{width: '100%'}}>
                                        <div className="form-group">
                                            <label>{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                                            <div className="input-with-icon">
                                                <input 
                                                    type={showResetNewPw ? 'text' : 'password'} 
                                                    value={resetNewPw} 
                                                    onChange={e => setResetNewPw(e.target.value)} 
                                                    required 
                                                    autoFocus 
                                                    placeholder="••••••••"
                                                />
                                                <button type="button" className="input-icon-btn" onClick={() => setShowResetNewPw(!showResetNewPw)}>
                                                    {showResetNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Password Requirements Checklist */}
                                        <div className="pw-requirements-box">
                                            <div className="pw-req-title">{lang === 'ar' ? 'شروط كلمة المرور:' : 'Password Requirements:'}</div>
                                            {pwReqs.map(req => (
                                                <div key={req.id} className={`pw-req-item ${req.met ? 'met' : 'unmet'}`}>
                                                    <span className="pw-req-icon">
                                                        {req.met ? <Check size={12} strokeWidth={3} /> : '•'}
                                                    </span>
                                                    <span>{req.label}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="form-group">
                                            <label>{lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                                            <div className="input-with-icon">
                                                <input 
                                                    type={showResetConfirmPw ? 'text' : 'password'} 
                                                    value={resetConfirmPw} 
                                                    onChange={e => setResetConfirmPw(e.target.value)} 
                                                    required 
                                                    placeholder="••••••••"
                                                />
                                                <button type="button" className="input-icon-btn" onClick={() => setShowResetConfirmPw(!showResetConfirmPw)}>
                                                    {showResetConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                             {resetConfirmPw && (
                                                 <div className={`pw-match-indicator ${passwordsMatch ? 'matched' : 'mismatch'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                     {passwordsMatch ? <Check size={13} /> : <X size={13} />}
                                                     <span>
                                                         {passwordsMatch 
                                                             ? (lang === 'ar' ? 'كلمتا المرور متطابقتان' : 'Passwords match') 
                                                             : (lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match')}
                                                     </span>
                                                 </div>
                                             )}
                                        </div>

                                        <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={resetLoading || !allPwReqsMet || !passwordsMatch}>
                                            {resetLoading ? <Loader2 size={18} className="spin" /> : <>{lang === 'ar' ? 'تعيين كلمة المرور' : 'Set Password'} <ShieldCheck size={18} /></>}
                                        </button>
                                    </form>
                                )}
                                <div className="otp-actions">
                                    <button className="otp-back-btn" type="button" onClick={() => { setResetMode(false); setResetStep(1); setError(''); setResetOtpDigits(['','','','','','']); setResetNewPw(''); setResetConfirmPw(''); }}>
                                        <ArrowLeft size={14} /> {lang === 'ar' ? 'رجوع لتسجيل الدخول' : 'Back to Login'}
                                    </button>
                                </div>
                            </>)}
                        </div>
                    ) : (
                        <form className={`auth-form ${shakeForm ? 'form-shake' : ''}`} onSubmit={handleLogin}>
                            <div className="form-group">
                                <label>{t('email') || 'Email Address'}</label>
                                <input type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} placeholder="student@nmu.edu.eg" required autoFocus autoComplete="email" />
                            </div>
                            <div className="form-group">
                                <div className="form-label-row">
                                    <label>{t('password') || 'Password'}</label>
                                    <a href="#" className="forgot-link" onClick={(e) => {
                                        e.preventDefault();
                                        setResetEmail(loginEmail);
                                        setResetMode(true);
                                        setResetStep(1);
                                        setError('');
                                    }}>{t('forgot_password') || 'Forgot your password?'}</a>
                                </div>
                                <div className="input-with-icon">
                                    <input type={showPw ? 'text' : 'password'} value={loginPw} onChange={e => setLoginPw(e.target.value)} required />
                                    <button type="button" className="input-icon-btn" onClick={() => setShowPw(!showPw)}>
                                        {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={loading}>
                                {loading ? <Loader2 size={18} className="spin" /> : <>{t('login') || 'Sign In'} <ArrowRight size={18} /></>}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
