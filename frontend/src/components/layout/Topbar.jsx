import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../../contexts/I18nContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getNotifications, markNotificationsRead, clearAllNotifications, changePassword } from '../../services/api';
import { Menu, Bell, Check, Trash2, Sun, Moon, Languages, GraduationCap, FolderKanban, PlusCircle, Users, Star, MapPin, UserCircle, Shield, Activity, LogOut, ChevronDown, X, Loader2, CheckCircle2, Circle, Save, FileText, Trophy, FolderOpen, UserCheck } from 'lucide-react';
import './Topbar.css';

function relTime(dateStr, lang) {
    const utcStr = dateStr ? dateStr.trim().replace(' ', 'T') + 'Z' : null;
    const diff = utcStr ? (Date.now() - new Date(utcStr).getTime()) / 1000 : 0;
    if (diff < 60) return lang === 'ar' ? 'الآن' : 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}${lang === 'ar' ? 'د' : 'm'}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${lang === 'ar' ? 'س' : 'h'}`;
    return `${Math.floor(diff / 86400)}${lang === 'ar' ? 'ي' : 'd'}`;
}

const TYPE_LABELS = {
    en: { application: 'Application', accepted: 'Accepted', rejected: 'Declined', invite: 'Invite', pending: 'Update', idea: 'Project Idea', team: 'Team Update' },
    ar: { application: 'طلب جديد', accepted: 'قُبل', rejected: 'مرفوض', invite: 'دعوة', pending: 'معلق', idea: 'فكرة مشروع', team: 'تحديث الفريق' },
};

export default function Topbar({ onMenuClick }) {
    const { t, lang, setLang } = useI18n();
    const { user, profile, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [showNotifs, setShowNotifs] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const notifRef = useRef(null);
    const userRef = useRef(null);

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

    const isAdmin = !!(user?.is_admin || user?.role === 'admin' || profile?.is_admin || profile?.role === 'admin');
    const isStaff = !!(
        ['ta', 'lecturer', 'professor'].includes(user?.role) ||
        ['ta', 'lecturer', 'professor'].includes(profile?.role)
    );

    const isItemUnread = (n) => !n.is_read || n.is_read === 0 || n.is_read === '0' || n.is_read === false;

    useEffect(() => {
        if (user) {
            const loadNotifs = () => getNotifications().then(n => setNotifications(n || []));
            loadNotifs();
            const iv = setInterval(loadNotifs, 10000);
            window.addEventListener('focus', loadNotifs);
            return () => {
                clearInterval(iv);
                window.removeEventListener('focus', loadNotifs);
            };
        }
    }, [user]);

    useEffect(() => {
        function handleClick(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
            if (userRef.current && !userRef.current.contains(e.target)) setShowUserMenu(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const unread = notifications.filter(isItemUnread).length;
    const prevUnreadRef = useRef(unread);

    useEffect(() => {
        if (unread > prevUnreadRef.current) {
            try {
                const ac = new (window.AudioContext || window.webkitAudioContext)();
                if (ac.state === 'suspended') ac.resume();
                const osc = ac.createOscillator();
                const gain = ac.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(600, ac.currentTime);
                osc.frequency.exponentialRampToValueAtTime(1200, ac.currentTime + 0.1);
                gain.gain.setValueAtTime(0, ac.currentTime);
                gain.gain.linearRampToValueAtTime(0.2, ac.currentTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, ac.currentTime + 0.3);
                osc.connect(gain);
                gain.connect(ac.destination);
                osc.start(ac.currentTime);
                osc.stop(ac.currentTime + 0.3);
            } catch (e) { console.warn('Audio play blocked:', e); }
        }
        prevUnreadRef.current = unread;
    }, [unread]);

    const handleBell = async () => {
        setShowNotifs(!showNotifs);
        if (!showNotifs && unread > 0) {
            await markNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        }
    };

    const handleMarkAllRead = async () => {
        await markNotificationsRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const handleClearAll = async () => {
        await clearAllNotifications();
        setNotifications([]);
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const getTypeLabel = (type) => {
        const labels = lang === 'ar' ? TYPE_LABELS.ar : TYPE_LABELS.en;
        return labels[type] || type || '';
    };

    const getTypeColor = (type) => {
        const colors = { application: '#6366f1', accepted: '#22c55e', rejected: '#f43f5e', invite: '#14b8a6', pending: '#E8A830' };
        return colors[type] || '#888888';
    };

    const isTrainer = !!(user?.role === 'trainer' || profile?.role === 'trainer');

    // Build nav items for University Training System
    const navItems = [
        { to: '/dashboard', icon: <Activity size={16} />, label: lang === 'ar' ? 'لوحة التحكم' : 'Dashboard' },
        { to: '/courses', icon: <GraduationCap size={16} />, label: lang === 'ar' ? 'الدورات التدريبية' : 'Courses' },
        { 
            to: '/submitted-projects', 
            icon: <FileText size={16} />, 
            label: (isAdmin || isTrainer)
                ? (lang === 'ar' ? 'مشاريع المتدربين' : 'Trainee Projects')
                : (lang === 'ar' ? 'مشروعي وفكرتي' : 'My Project & Idea')
        },
    ];

    if (isAdmin || isTrainer) {
        navItems.push({ to: '/trainees', icon: <Users size={16} />, label: lang === 'ar' ? 'المتدربين' : 'Trainees' });
    }

    if (isAdmin) {
        navItems.push({
            to: '/trainers',
            icon: <UserCheck size={16} />,
            label: lang === 'ar' ? 'إدارة المدربين' : 'Trainers'
        });
    }

    const displayName = profile?.full_name || profile?.full_name || user?.email?.split('@')[0] || '';
    const initials = displayName.charAt(0).toUpperCase();

    return (
        <>
            <header className="topbar">
                {/* Mobile hamburger */}
                <button className="topbar-hamburger" onClick={onMenuClick}><Menu size={22} /></button>

                {/* Logo */}
                <Link to="/" className="topbar-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src="/assets/university_logo.png" alt="NMU Training Center" className="topbar-logo-img" style={{ height: '36px', width: 'auto' }} />
                    <span className="topbar-logo-text">NMU<span className="topbar-logo-accent"> Training Center</span></span>
                </Link>

                {/* Desktop Nav Links */}
                <nav className="topbar-nav">
                    {navItems.map(item => (
                        <NavLink key={item.to} to={item.to} className={({ isActive }) => `topbar-nav-link ${isActive ? 'topbar-nav-link--active' : ''}`}>
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Right Actions */}
                <div className="topbar-actions">

                    {/* Notifications */}
                    <div className="topbar-notif-wrap" ref={notifRef}>
                        <button className="topbar-btn notif-btn" onClick={handleBell}>
                            <Bell size={18} />
                            {unread > 0 && <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>}
                        </button>
                        {showNotifs && (
                            <div className="notif-dropdown">
                                <div className="notif-header">
                                    <span>{lang === 'ar' ? 'الإشعارات' : 'Notifications'}</span>
                                    <div className="notif-header-actions">
                                        {unread > 0 && (
                                            <button className="notif-action-btn" onClick={handleMarkAllRead} title="Mark all read">
                                                <Check size={14} />
                                            </button>
                                        )}
                                        {notifications.length > 0 && (
                                            <button className="notif-action-btn notif-action-btn--danger" onClick={handleClearAll} title="Clear all">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {notifications.length === 0 ? (
                                    <div className="notif-empty">{lang === 'ar' ? 'لا توجد إشعارات' : 'No notifications yet'}</div>
                                ) : (
                                    <div className="notif-list">
                                        {notifications.slice(0, 20).map(n => (
                                            <div key={n.id} className={`notif-item ${isItemUnread(n) ? 'notif-item--unread' : ''}`}
                                                onClick={() => {
                                                    setShowNotifs(false);
                                                    if (n.type === 'training_evaluation') {
                                                        navigate('/courses?tab=evaluations');
                                                    } else if (n.type === 'chat' && n.project_id) {
                                                        navigate(`/project/${n.project_id}/chat`);
                                                    } else if (n.project_id) {
                                                        navigate(`/project/${n.project_id}`);
                                                    } else if (n.type === 'idea' || n.type === 'team' || n.type === 'training_idea') {
                                                        navigate('/trainee-projects');
                                                    } else if (n.type === 'invite' || n.type === 'pending' || n.type === 'application') {
                                                        navigate('/trainee-projects');
                                                    } else if (n.type === 'new_content' || n.type === 'topic') {
                                                        navigate('/courses');
                                                    } else {
                                                        navigate('/dashboard');
                                                    }
                                                }}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <div className="notif-item-top">
                                                    <span className="notif-type-label" style={{ color: getTypeColor(n.type) }}>{getTypeLabel(n.type)}</span>
                                                    <span className="notif-time">{relTime(n.created_at, lang)}</span>
                                                </div>
                                                <div className="notif-msg">{lang === 'ar' ? (n.message_ar || n.message_en || n.message) : (n.message_en || n.message_ar || n.message)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* User Avatar + Dropdown */}
                    <div className="topbar-user-wrap" ref={userRef}>
                        <button className="topbar-user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                            {profile?.avatar_url || user?.avatar_url ? (
                                <img src={profile?.avatar_url || user?.avatar_url} alt={displayName} className="topbar-avatar" style={{ border: 'none', objectFit: 'cover', padding: 0 }} />
                            ) : (
                                <div className="topbar-avatar">{initials}</div>
                            )}
                            <span className="topbar-user-name">{displayName.split(' ')[0]}</span>
                            <ChevronDown size={14} className={`topbar-user-chevron ${showUserMenu ? 'topbar-user-chevron--open' : ''}`} />
                        </button>
                        {showUserMenu && (
                            <div className="topbar-user-dropdown">

                                <button className="topbar-dropdown-item" onClick={() => { setShowUserMenu(false); setShowPasswordModal(true); }}>
                                    <Shield size={16} />
                                    {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                                </button>
                                <div className="topbar-dropdown-divider" />
                                <button className="topbar-dropdown-item topbar-dropdown-item--danger" onClick={() => { setShowUserMenu(false); handleLogout(); }}>
                                    <LogOut size={16} />
                                    {t('nav_logout')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

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
        </>
    );
}
