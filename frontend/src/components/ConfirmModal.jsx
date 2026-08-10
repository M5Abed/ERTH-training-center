import { Loader2, AlertTriangle, X, CheckCircle, Info } from 'lucide-react';
import { useI18n } from '../contexts/I18nContext';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText,
    cancelText,
    isLoading = false,
    variant = 'danger' // 'danger', 'warning', 'info', 'success'
}) {
    const { lang, t } = useI18n();

    if (!isOpen) return null;

    const getIcon = () => {
        switch (variant) {
            case 'danger': return <AlertTriangle size={48} style={{ color: 'var(--danger, #ef4444)', marginBottom: '1rem' }} />;
            case 'warning': return <AlertTriangle size={48} style={{ color: 'var(--amber, #f59e0b)', marginBottom: '1rem' }} />;
            case 'success': return <CheckCircle size={48} style={{ color: 'var(--green, #22c55e)', marginBottom: '1rem' }} />;
            default: return <Info size={48} style={{ color: 'var(--primary-l)', marginBottom: '1rem' }} />;
        }
    };

    const getHeaderColor = () => {
        switch (variant) {
            case 'danger': return 'var(--danger, #ef4444)';
            case 'warning': return 'var(--amber, #f59e0b)';
            case 'success': return 'var(--green, #22c55e)';
            default: return 'var(--text)';
        }
    };

    const getConfirmButtonClass = () => {
        switch (variant) {
            case 'danger': return 'btn-danger';
            case 'warning': return 'btn-amber';
            case 'success': return 'btn-success';
            default: return 'btn-primary';
        }
    };

    return (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !isLoading) onClose(); }}>
            <div className="modal-box modal-box--sm animate-scale-up">
                <div className="modal-header">
                    <h3 style={{ color: getHeaderColor() }}>{title || (lang === 'ar' ? 'تأكيد' : 'Confirm')}</h3>
                    {!isLoading && (
                        <button className="modal-close" onClick={onClose}><X size={18} /></button>
                    )}
                </div>
                <div className="modal-body" style={{ textAlign: 'center' }}>
                    {getIcon()}
                    <p style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>{message}</p>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-ghost btn-md" onClick={onClose} disabled={isLoading}>
                        {cancelText || t('cancel') || (lang === 'ar' ? 'إلغاء' : 'Cancel')}
                    </button>
                    <button className={`btn ${getConfirmButtonClass()} btn-md`} onClick={onConfirm} disabled={isLoading}>
                        {isLoading ? <Loader2 size={16} className="spin" /> : (confirmText || (lang === 'ar' ? 'تأكيد' : 'Confirm'))}
                    </button>
                </div>
            </div>
        </div>
    );
}
