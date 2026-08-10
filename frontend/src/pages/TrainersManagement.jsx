import { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext';
import { UserPlus, Users, Loader2, X } from 'lucide-react';
import './TrainersManagement.css';

export default function TrainersManagement() {
    const { lang } = useI18n();
    const [trainers, setTrainers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // New trainer form (Single unified name field accepting Arabic or English)
    const [email, setEmail] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [department, setDepartment] = useState('');
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchTrainers();
    }, []);

    const fetchTrainers = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/users.php');
            const data = await res.json();
            if (res.ok && data.users) {
                setTrainers(data.users.filter(u => u.role === 'trainer' || u.role === 'ta' || u.role === 'professor'));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTrainer = async (e) => {
        e.preventDefault();
        setCreating(true);
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/create_trainer.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    full_name_en: fullName,
                    full_name_ar: fullName,
                    password,
                    department
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSuccess(lang === 'ar' ? 'تم إنشاء حساب المدرب بنجاح!' : 'Trainer account created successfully!');
                setEmail(''); setFullName(''); setPassword(''); setDepartment('');
                fetchTrainers();
                setTimeout(() => setShowModal(false), 1500);
            } else {
                setError(data.error || 'Failed to create trainer');
            }
        } catch (e) {
            setError('Connection error');
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="trainers-page container">
            <div className="page-header">
                <div>
                    <h1>{lang === 'ar' ? 'إدارة حسابات المدربين (Trainers)' : 'Trainers Management'}</h1>
                    <p>{lang === 'ar' ? 'إضافة وإدارة أعضاء هيئة التدريس والمدربين المسؤولين عن التدريب الصيفي' : 'Create and manage faculty trainers responsible for university summer training courses.'}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <UserPlus size={18} />
                    {lang === 'ar' ? 'إضافة مدرب جديد' : 'Add New Trainer'}
                </button>
            </div>

            {loading ? (
                <div className="loader-container">
                    <Loader2 className="spin" size={32} />
                </div>
            ) : trainers.length === 0 ? (
                <div className="empty-state">
                    <Users size={48} />
                    <h3>{lang === 'ar' ? 'لا يوجد مدربون حالياً' : 'No Trainers Found'}</h3>
                    <p>{lang === 'ar' ? 'انقر على "إضافة مدرب جديد" لإنشاء حساب مدرب.' : 'Click "Add New Trainer" to create a trainer account.'}</p>
                </div>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                            <th>{lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}</th>
                            <th>{lang === 'ar' ? 'القسم / التخصص' : 'Department'}</th>
                            <th>{lang === 'ar' ? 'الدور' : 'Role'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {trainers.map((t, idx) => (
                            <tr key={t.id}>
                                <td>{idx + 1}</td>
                                <td><strong>{t.full_name_en || t.full_name_ar || t.username}</strong></td>
                                <td>{t.email}</td>
                                <td>{t.department || 'Computer Science'}</td>
                                <td><span className="source-tag">TRAINER</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Create Trainer Modal — Single Unified Input for Name */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()}>
                        <div className="modal-header-row">
                            <div>
                                <h2>
                                    <UserPlus size={22} className="text-primary" />
                                    {lang === 'ar' ? 'إضافة مدرب جديد' : 'Add New Trainer'}
                                </h2>
                                <p className="hint-text">
                                    {lang === 'ar' ? 'أدخل بيانات المدرب الجديد لإنشاء حساب أكاديمي' : 'Enter new trainer details to create an academic account'}
                                </p>
                            </div>
                            <button type="button" className="modal-close-btn" onClick={() => setShowModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        {error && <div className="alert alert-error">{error}</div>}
                        {success && <div className="alert alert-success">{success}</div>}

                        <form onSubmit={handleCreateTrainer} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'الاسم الكامل *' : 'Full Name *'}</label>
                                <input
                                    type="text"
                                    required
                                    value={fullName}
                                    onChange={e => setFullName(e.target.value)}
                                    placeholder={lang === 'ar' ? 'مثال: د. أحمد حسن / Dr. Ahmed Hassan' : 'e.g. Dr. Ahmed Hassan / د. أحمد حسن'}
                                />
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'البريد الإلكتروني الجامعي *' : 'University Email Address *'}</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="trainer@nu.edu.eg"
                                />
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'كلمة المرور الأولية *' : 'Initial Password *'}</label>
                                <input
                                    type="password"
                                    required
                                    minLength="8"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'القسم / التخصص' : 'Department / Specialty'}</label>
                                <input
                                    type="text"
                                    value={department}
                                    onChange={e => setDepartment(e.target.value)}
                                    placeholder={lang === 'ar' ? 'مثال: هندسة البرمجيات' : 'e.g. Software Engineering'}
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                                    {lang === 'ar' ? 'إلغاء' : 'Cancel'}
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={creating}>
                                    {creating ? <Loader2 className="spin" size={16} /> : (lang === 'ar' ? 'إنشاء الحساب' : 'Create Account')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
