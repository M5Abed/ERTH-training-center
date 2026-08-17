import { useState, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';
import { getNotifications, changePassword } from '../../services/api';
import { FolderKanban, PlusCircle, Users, Star, MapPin, UserCircle, Shield, LogOut, X, Loader2, Save, Activity, CheckCircle2, Circle, FileText, Trophy, FolderOpen, UserCheck } from 'lucide-react';
import './Sidebar.css';

export default function Sidebar({ open, onClose }) {
    const { t, lang } = useI18n();
    const { user, profile, logout } = useAuth();
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    // Change password modal
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // Dynamic Password Requirements
    const hasLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const isPasswordValid = hasLength && hasUpper && hasLower && hasNumber && hasSpecial;

    // Delete account modal
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteError, setDeleteError] = useState('');

    useEffect(() => {
        if (user) {
            getNotifications().then(n => {
                setUnreadCount((n || []).filter(x => !x.is_read).length);
            });
        }
    }, [user]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const isAdmin = !!(user?.is_admin || user?.role === 'admin' || profile?.is_admin || profile?.role === 'admin');
    const isTrainer = !!(user?.role === 'trainer' || profile?.role === 'trainer');
    const isTrainee = !isAdmin && !isTrainer;

    const navItems = [];

    // Dashboard available to all
    navItems.push({
        to: '/dashboard',
        icon: <Activity size={20} />,
        label: 'Dashboard'
    });

    // Courses available to all
    navItems.push({
        to: '/courses',
        icon: <FolderKanban size={20} />,
        label: 'Training Courses'
    });

    // Submitted Projects / Ideas available to all
    navItems.push({
        to: '/submitted-projects',
        icon: <FileText size={20} />,
        label: (isAdmin || isTrainer)
            ? (lang === 'ar' ? 'مشاريع المتدربين' : 'Trainee Projects')
            : (lang === 'ar' ? 'مشروعي وفكرتي' : 'My Project & Idea')
    });

    // Academic Evaluations
    navItems.push({
        to: '/evaluations',
        icon: <CheckCircle2 size={20} />,
        label: lang === 'ar' ? 'التقييم الأكاديمي' : 'Academic Evaluations'
    });

    // Items available to Admin & Trainer
    if (isAdmin || isTrainer) {
        navItems.push({
            to: '/trainees',
            icon: <UserCheck size={20} />,
            label: 'Trainees Management'
        });
        navItems.push({
            to: '/approvals',
            icon: <CheckCircle2 size={20} />,
            label: 'Registration Requests'
        });
        navItems.push({
            to: '/trainers',
            icon: <Users size={20} />,
            label: 'Trainers Management'
        });
    }


    const filteredAdminItems = [];

    return (
        <>
            {open && <div className="sidebar-overlay" onClick={onClose} />}
            <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
                <div className="sidebar-header">
                    {/* Logo acts as home link */}
                    <NavLink to="/" className="sidebar-logo" onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <img src="/logo.png" alt="ERTH Training Center" style={{ height: '32px' }} />
                        <span className="logo-text">ERTH<span className="logo-accent"> Training Center</span></span>
                    </NavLink>
                    <button className="sidebar-close" onClick={onClose}><X size={20} /></button>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`} onClick={onClose}>
                            {item.icon}
                            <span>{item.label}</span>
                            {item.badge > 0 && <span className="sidebar-badge">{item.badge > 9 ? '9+' : item.badge}</span>}
                        </NavLink>
                    ))}
                    {filteredAdminItems.map(item => (
                        <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`} onClick={onClose}>
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    {user && (
                        <div className="sidebar-footer-container" style={{ position: 'relative' }}>
                            <div className="sidebar-user">
                                <div className="sidebar-avatar">
                                    {profile?.avatar_url
                                        ? <img src={profile.avatar_url} alt="" />
                                        : <span>{(profile?.full_name || profile?.full_name || user.email || '?')[0].toUpperCase()}</span>
                                    }
                                </div>
                                <div className="sidebar-user-info" onClick={() => setUserMenuOpen(!userMenuOpen)} style={{ cursor: 'pointer', flex: 1, userSelect: 'none' }}>
                                    <div className="sidebar-user-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        {profile?.full_name || profile?.full_name || (lang === 'ar' ? 'مستخدم' : 'User')}
                                        <span style={{ fontSize: '10px', opacity: 0.5, transform: userMenuOpen ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }}>▼</span>
                                    </div>
                                    <div className="sidebar-user-email">{user.email}</div>
                                </div>
                            </div>

                            {userMenuOpen && (
                                <>
                                    <div className="sidebar-user-dropdown-overlay" onClick={() => setUserMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
                                    <div className="sidebar-user-dropdown-floating">
                                        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => {
                                            setUserMenuOpen(false);
                                            setShowPasswordModal(true);
                                        }}>
                                            {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                                        </button>
                                        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--rose)' }} onClick={() => {
                                            setUserMenuOpen(false);
                                            setShowDeleteModal(true);
                                        }}>
                                            {lang === 'ar' ? 'حذف الحساب' : 'Delete Account'}
                                        </button>
                                        <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />
                                        <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start' }} onClick={() => {
                                            setUserMenuOpen(false);
                                            handleLogout();
                                        }}>
                                            <LogOut size={16} style={{ marginInlineEnd: '8px' }} />
                                            {t('nav_logout')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); } }}>
                    <div className="modal-box modal-box--sm" style={{ zIndex: 1000 }}>
                        <div className="modal-header">
                            <h3>{lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</h3>
                            <button className="modal-close" onClick={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); setPasswordSuccess(''); }}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            {passwordError && <div className="auth-error">{passwordError}</div>}
                            {passwordSuccess && <div style={{ padding: '0.75rem', background: 'rgba(16,185,129,0.1)', color: 'var(--emerald)', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={16} />{passwordSuccess}</div>}
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}</label>
                                <input type="password" value={currentPassword} onChange={e => { setCurrentPassword(e.target.value); setPasswordError(''); }} placeholder={lang === 'ar' ? 'أدخل كلمة المرور الحالية' : 'Enter current password'} />
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                                <input type="password" value={newPassword} onChange={e => { setNewPassword(e.target.value); setPasswordError(''); }} />
                                
                                {newPassword.length > 0 && (
                                    <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-1)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: hasLength ? 'var(--emerald)' : 'var(--text-2)' }}>
                                            {hasLength ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                            {lang === 'ar' ? '8 أحرف على الأقل' : 'At least 8 characters'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: hasUpper ? 'var(--emerald)' : 'var(--text-2)' }}>
                                            {hasUpper ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                            {lang === 'ar' ? 'حرف كبير واحد على الأقل' : 'At least one uppercase letter'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: hasLower ? 'var(--emerald)' : 'var(--text-2)' }}>
                                            {hasLower ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                            {lang === 'ar' ? 'حرف صغير واحد على الأقل' : 'At least one lowercase letter'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: hasNumber ? 'var(--emerald)' : 'var(--text-2)' }}>
                                            {hasNumber ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                            {lang === 'ar' ? 'رقم واحد على الأقل' : 'At least one number'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8125rem', color: hasSpecial ? 'var(--emerald)' : 'var(--text-2)' }}>
                                            {hasSpecial ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                            {lang === 'ar' ? 'رمز خاص واحد على الأقل (!@#$)' : 'At least one special character (!@#$)'}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label>{lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                                <input type="password" value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost btn-md" onClick={() => { setShowPasswordModal(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); }}>{t('cancel')}</button>
                            <button className="btn btn-primary btn-md" disabled={isChangingPassword || !isPasswordValid || !currentPassword} onClick={async () => {
                                if (!currentPassword) {
                                    setPasswordError(lang === 'ar' ? 'يرجى إدخال كلمة المرور الحالية' : 'Please enter your current password');
                                    return;
                                }
                                if (!isPasswordValid) {
                                    setPasswordError(lang === 'ar' ? 'كلمة المرور لا تستوفي المتطلبات' : 'Password does not meet requirements');
                                    return;
                                }
                                if (newPassword !== confirmPassword) {
                                    setPasswordError(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
                                    return;
                                }
                                setIsChangingPassword(true);
                                try {
                                    await changePassword(currentPassword, newPassword);
                                    setPasswordSuccess(lang === 'ar' ? 'تم تغيير كلمة المرور بنجاح!' : 'Password changed successfully!');
                                    setTimeout(() => {
                                        setShowPasswordModal(false);
                                        setCurrentPassword('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                        setPasswordError('');
                                        setPasswordSuccess('');
                                    }, 1500);
                                } catch (e) {
                                    setPasswordError(e?.message || (lang === 'ar' ? 'حدث خطأ أثناء تغيير كلمة المرور' : 'Error changing password. Please try again.'));
                                } finally {
                                    setIsChangingPassword(false);
                                }
                            }}>
                                {isChangingPassword ? <Loader2 size={16} className="spin" /> : <><Save size={16} /> {t('save')}</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}>
                    <div className="modal-box modal-box--sm" style={{ zIndex: 1000 }}>
                        <div className="modal-header">
                            <h3 style={{ color: 'var(--rose)' }}>{lang === 'ar' ? 'حذف الحساب' : 'Delete Account'}</h3>
                            <button className="modal-close" onClick={() => setShowDeleteModal(false)}><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-2)', lineHeight: 1.5, marginBottom: '1rem' }}>
                                {lang === 'ar'
                                    ? 'هل أنت متأكد من حذف الحساب نهائياً؟ لا يمكن التراجع عن هذا الإجراء وسيتم حذف جميع بياناتك ومشاريعك. يرجى إدخال كلمة المرور للتأكيد.'
                                    : 'Are you sure you want to permanently delete your account? This action cannot be undone and all your data and projects will be removed. Please enter your password to confirm.'}
                            </p>
                            
                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 500, display: 'block', marginBottom: '0.5rem' }}>
                                    {lang === 'ar' ? 'كلمة المرور الحالية' : 'Current Password'}
                                </label>
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    placeholder={lang === 'ar' ? 'أدخل كلمة المرور لتأكيد الحذف' : 'Enter password to confirm'}
                                    value={deletePassword}
                                    onChange={e => setDeletePassword(e.target.value)}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-1)', color: 'var(--text-1)' }}
                                />
                            </div>
                            
                            {deleteError && (
                                <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', color: 'var(--rose)', borderRadius: '6px', fontSize: '0.875rem', marginBottom: '1rem' }}>
                                    {deleteError}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-ghost btn-md" disabled={isDeletingAccount} onClick={() => {
                                setShowDeleteModal(false);
                                setDeletePassword('');
                                setDeleteError('');
                            }}>{t('cancel')}</button>
                            <button
                                className="btn btn-md"
                                style={{ background: 'var(--rose)', color: 'white' }}
                                disabled={isDeletingAccount || !deletePassword}
                                onClick={async () => {
                                    setDeleteError('');
                                    setIsDeletingAccount(true);
                                    try {
                                        const res = await fetch('/api/auth/delete-account.php', { 
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ password: deletePassword })
                                        });
                                        const data = await res.json();
                                        if (res.ok && data.success) {
                                            handleLogout();
                                        } else {
                                            setDeleteError(data.error || (lang === 'ar' ? 'حدث خطأ أثناء حذف الحساب' : 'Error deleting account.'));
                                            setIsDeletingAccount(false);
                                        }
                                    } catch (e) {
                                        setDeleteError(lang === 'ar' ? 'حدث خطأ أثناء الاتصال بالخادم' : 'Error connecting to server.');
                                        setIsDeletingAccount(false);
                                    }
                                }}
                            >
                                {isDeletingAccount ? <Loader2 size={16} className="spin" /> : (lang === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
