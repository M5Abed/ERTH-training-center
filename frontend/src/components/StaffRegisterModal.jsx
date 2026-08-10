import { useState } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { COLLEGES } from '../data/constants';
import { X, Loader2, UserPlus, CheckCircle } from 'lucide-react';
import './StaffRegisterModal.css';

const WEB3FORMS_KEY = 'c989f128-a600-47f3-841c-4a59e4cc30e8';

export default function StaffRegisterModal({ onClose }) {
    const { t, lang } = useI18n();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('ta');
    const [college, setCollege] = useState('');
    const [customCollege, setCustomCollege] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', text: '' }); // 'success' | 'error'

    const roleLabels = {
        ta: lang === 'ar' ? 'معيد' : 'Teaching Assistant',
        lecturer: lang === 'ar' ? 'مدرس' : 'Lecturer',
        professor: lang === 'ar' ? 'أستاذ' : 'Professor',
        supervisor: lang === 'ar' ? 'مشرف' : 'Supervisor',
    };

    const getCollegeName = (key) => {
        const c = COLLEGES.find(col => col.key === key);
        return c ? (lang === 'ar' ? c.ar : c.en) : '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', text: '' });

        // Validation
        if (!name.trim() || !email.trim() || !password.trim()) {
            setStatus({
                type: 'error',
                text: lang === 'ar' ? 'جميع الحقول المطلوبة يجب ملؤها' : 'All required fields must be filled',
            });
            return;
        }

        if (college === 'other' && !customCollege.trim()) {
            setStatus({
                type: 'error',
                text: lang === 'ar' ? 'يرجى كتابة اسم الكلية المخصصة' : 'Please type your custom college name',
            });
            return;
        }

        setLoading(true);

        try {
            const formData = {
                access_key: WEB3FORMS_KEY,
                subject: `New Academic Staff Registration - ${name.trim()}`,
                from_name: name.trim(),
                'Full Name': name.trim(),
                'Email Address': email.trim(),
                'Preferred Account Key': password.trim(),
                'Academic Role': roleLabels[role],
                College: college === 'other' ? customCollege.trim() : (college ? getCollegeName(college) : (lang === 'ar' ? 'غير محدد' : 'Not specified')),
            };

            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (result.success) {
                setStatus({
                    type: 'success',
                    text: lang === 'ar'
                        ? 'تم إرسال طلبك بنجاح! سنقوم بمراجعته وإنشاء حسابك قريباً.'
                        : 'Your registration request has been submitted successfully! We will review it and create your account shortly.',
                });
                setName(''); setEmail(''); setPassword(''); setRole('ta'); setCollege(''); setCustomCollege('');
            } else {
                throw new Error(result.message || 'Submission failed');
            }
        } catch (err) {
            console.error('Staff registration error:', err);
            setStatus({
                type: 'error',
                text: lang === 'ar'
                    ? 'حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.'
                    : 'Something went wrong while submitting your request. Please try again.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="staff-modal-overlay" onClick={onClose}>
            <div className="staff-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="staff-modal-header">
                    <div className="staff-modal-header-content">
                        <div className="staff-modal-icon-wrap">
                            <UserPlus size={22} />
                        </div>
                        <div>
                            <h2>{lang === 'ar' ? 'تسجيل كهيئة أكاديمية' : 'Register as Academic Staff'}</h2>
                            <p>{lang === 'ar' ? 'أرسل طلبك وسنقوم بإنشاء حسابك' : 'Submit your request and we will create your account'}</p>
                        </div>
                    </div>
                    <button className="staff-modal-close" onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </div>

                {/* Success state */}
                {status.type === 'success' ? (
                    <div className="staff-modal-success">
                        <div className="staff-success-icon"><CheckCircle size={48} /></div>
                        <h3>{lang === 'ar' ? 'تم الإرسال بنجاح!' : 'Request Submitted!'}</h3>
                        <p>{status.text}</p>
                        <button className="btn btn-primary btn-lg" onClick={onClose}>
                            {lang === 'ar' ? 'حسناً' : 'OK'}
                        </button>
                    </div>
                ) : (
                    <form className="staff-modal-form" onSubmit={handleSubmit}>
                        {/* Full Name */}
                        <div className="staff-form-group">
                            <label>{lang === 'ar' ? 'الاسم الكامل' : 'Full Name'} <span className="req">*</span></label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Full name'}
                                required
                                autoFocus
                            />
                        </div>

                        {/* Email */}
                        <div className="staff-form-group">
                            <label>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'} <span className="req">*</span></label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="email@nmu.edu.eg"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="staff-form-group">
                            <label>{lang === 'ar' ? 'كلمة المرور' : 'Password'} <span className="req">*</span></label>
                            <input
                                type="text"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder={lang === 'ar' ? '8 أحرف على الأقل' : 'Min 8 characters'}
                                required
                            />
                        </div>

                        {/* Role + College row */}
                        <div className="staff-form-row">
                            <div className="staff-form-group">
                                <label>{lang === 'ar' ? 'الدور' : 'Role'} <span className="req">*</span></label>
                                <select value={role} onChange={e => setRole(e.target.value)}>
                                    <option value="ta">{lang === 'ar' ? 'معيد' : 'Teaching Assistant'}</option>
                                    <option value="lecturer">{lang === 'ar' ? 'مدرس' : 'Lecturer'}</option>
                                    <option value="professor">{lang === 'ar' ? 'أستاذ' : 'Professor'}</option>
                                    <option value="supervisor">{lang === 'ar' ? 'مشرف' : 'Supervisor'}</option>
                                </select>
                            </div>

                            <div className="staff-form-group">
                                <label>{lang === 'ar' ? 'الكلية' : 'College'}</label>
                                <select value={college} onChange={e => { setCollege(e.target.value); setCustomCollege(''); }}>
                                    <option value="">{lang === 'ar' ? 'اختياري' : 'Optional'}</option>
                                    {COLLEGES.map(c => (
                                        <option key={c.key} value={c.key}>
                                            {lang === 'ar' ? c.ar : c.en}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {college === 'other' && (
                            <div className="staff-form-group animate-fade-in">
                                <label>{lang === 'ar' ? 'اسم الكلية المخصصة' : 'Custom College Name'} <span className="req">*</span></label>
                                <input
                                    type="text"
                                    value={customCollege}
                                    onChange={e => setCustomCollege(e.target.value)}
                                    placeholder={lang === 'ar' ? 'اكتب اسم كليتك هنا...' : 'Type your college name here...'}
                                    required
                                />
                            </div>
                        )}

                        {/* Error message */}
                        {status.type === 'error' && (
                            <div className="staff-form-error">{status.text}</div>
                        )}

                        {/* Submit */}
                        <button className="btn btn-primary btn-lg staff-submit-btn" type="submit" disabled={loading}>
                            {loading ? (
                                <><Loader2 size={18} className="spin" /> {lang === 'ar' ? 'جاري الإرسال...' : 'Submitting...'}</>
                            ) : (
                                <><UserPlus size={18} /> {lang === 'ar' ? 'إرسال الطلب' : 'Submit Request'}</>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
