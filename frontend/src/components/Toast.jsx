import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

const ToastContext = createContext(null);
const ConfirmContext = createContext(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    return ctx;
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    return ctx || (async (opts) => {
        if (window.__showGlobalConfirm) return await window.__showGlobalConfirm(opts);
        return true;
    });
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const [confirmState, setConfirmState] = useState(null);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message, type = 'info', duration = 4500) => {
        if (!message) return;
        const msgStr = typeof message === 'object' ? (message?.message || JSON.stringify(message)) : String(message);
        const id = Date.now() + Math.random().toString(36).substr(2, 5);

        // Auto-detect type if not explicitly set or set to default
        let detectedType = type;
        if (type === 'info' || !type) {
            const lower = msgStr.toLowerCase();
            if (lower.includes('خطأ') || lower.includes('فشل') || lower.includes('error') || lower.includes('failed') || lower.includes('invalid') || lower.includes('rejected')) {
                detectedType = 'error';
            } else if (lower.includes('تم') || lower.includes('نجاح') || lower.includes('success') || lower.includes('saved') || lower.includes('approved') || lower.includes('accepted')) {
                detectedType = 'success';
            } else if (lower.includes('تحذير') || lower.includes('تنبيه') || lower.includes('warning') || lower.includes('حد أقصى') || lower.includes('limit') || lower.includes('مغلق')) {
                detectedType = 'warning';
            }
        }

        setToasts(prev => [...prev.slice(-6), { id, message: msgStr, type: detectedType }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    // Create a flexible toast object that can be called as a function or via methods
    const toastObj = useCallback((msg, type, dur) => addToast(msg, type, dur), [addToast]);
    toastObj.success = useCallback((msg, dur) => addToast(msg, 'success', dur), [addToast]);
    toastObj.error = useCallback((msg, dur) => addToast(msg, 'error', dur), [addToast]);
    toastObj.warning = useCallback((msg, dur) => addToast(msg, 'warning', dur), [addToast]);
    toastObj.info = useCallback((msg, dur) => addToast(msg, 'info', dur), [addToast]);
    toastObj.showToast = toastObj;

    // ── Global GUI Confirmation Dialog Promise ──────────────────────────────
    const confirmFn = useCallback((options) => {
        return new Promise((resolve) => {
            const opts = typeof options === 'string' ? { message: options } : (options || {});
            setConfirmState({
                isOpen: true,
                title: opts.title || '',
                message: opts.message || '',
                confirmText: opts.confirmText || '',
                cancelText: opts.cancelText || '',
                variant: opts.variant || 'danger',
                resolve
            });
        });
    }, []);

    const handleConfirmClose = useCallback(() => {
        if (confirmState?.resolve) confirmState.resolve(false);
        setConfirmState(null);
    }, [confirmState]);

    const handleConfirmOk = useCallback(() => {
        if (confirmState?.resolve) confirmState.resolve(true);
        setConfirmState(null);
    }, [confirmState]);

    // ── Global window.alert Override (GUI Interceptor) ──────────────────────────
    useEffect(() => {
        const originalAlert = window.alert;
        window.__appToast = (msg, type = 'info') => addToast(msg, type);
        window.__showGlobalConfirm = confirmFn;

        window.alert = function (msg) {
            if (msg === undefined || msg === null) return;
            addToast(msg, 'info', 5000);
        };

        return () => {
            window.alert = originalAlert;
        };
    }, [addToast, confirmFn]);

    return (
        <ConfirmContext.Provider value={confirmFn}>
            <ToastContext.Provider value={toastObj}>
                {children}

                {/* Global GUI Confirmation Modal */}
                {confirmState?.isOpen && (
                    <ConfirmModal
                        isOpen={confirmState.isOpen}
                        title={confirmState.title}
                        message={confirmState.message}
                        confirmText={confirmState.confirmText}
                        cancelText={confirmState.cancelText}
                        variant={confirmState.variant}
                        onClose={handleConfirmClose}
                        onConfirm={handleConfirmOk}
                    />
                )}

                <div className="gui-toast-container" aria-live="polite">
                {toasts.map(t => (
                    <div key={t.id} className={`gui-toast gui-toast--${t.type} animate-slide-in`}>
                        <span className="gui-toast-icon">
                            {t.type === 'success' && <CheckCircle2 size={20} />}
                            {t.type === 'error' && <AlertCircle size={20} />}
                            {t.type === 'warning' && <AlertTriangle size={20} />}
                            {t.type === 'info' && <Info size={20} />}
                        </span>
                        <div className="gui-toast-content">
                            <span className="gui-toast-message">{t.message}</span>
                        </div>
                        <button className="gui-toast-close" onClick={() => removeToast(t.id)} aria-label="Close">
                            <X size={15} />
                        </button>
                    </div>
                ))}
            </div>
            <style>{`
                .gui-toast-container {
                    position: fixed;
                    top: 1.25rem;
                    right: 1.25rem;
                    z-index: 999999;
                    display: flex;
                    flex-direction: column;
                    gap: 0.65rem;
                    max-width: 440px;
                    width: calc(100vw - 2.5rem);
                    pointer-events: none;
                }
                [dir="rtl"] .gui-toast-container {
                    right: auto;
                    left: 1.25rem;
                }
                .gui-toast {
                    pointer-events: auto;
                    display: flex;
                    align-items: flex-start;
                    gap: 0.85rem;
                    padding: 0.95rem 1.15rem;
                    background: rgba(17, 24, 39, 0.94);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45), 0 4px 10px rgba(0, 0, 0, 0.2);
                    backdrop-filter: blur(16px);
                    -webkit-backdrop-filter: blur(16px);
                    color: #f3f4f6;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .gui-toast--success {
                    border-left: 4px solid #10b981;
                    border-color: rgba(16, 185, 129, 0.3);
                    background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(17, 24, 39, 0.96) 100%);
                }
                [dir="rtl"] .gui-toast--success {
                    border-left: 1px solid rgba(16, 185, 129, 0.3);
                    border-right: 4px solid #10b981;
                }
                .gui-toast--success .gui-toast-icon { color: #34d399; }

                .gui-toast--error {
                    border-left: 4px solid #ef4444;
                    border-color: rgba(239, 68, 68, 0.35);
                    background: linear-gradient(135deg, rgba(239, 68, 68, 0.14) 0%, rgba(17, 24, 39, 0.96) 100%);
                }
                [dir="rtl"] .gui-toast--error {
                    border-left: 1px solid rgba(239, 68, 68, 0.35);
                    border-right: 4px solid #ef4444;
                }
                .gui-toast--error .gui-toast-icon { color: #f87171; }

                .gui-toast--warning {
                    border-left: 4px solid #f59e0b;
                    border-color: rgba(245, 158, 11, 0.35);
                    background: linear-gradient(135deg, rgba(245, 158, 11, 0.14) 0%, rgba(17, 24, 39, 0.96) 100%);
                }
                [dir="rtl"] .gui-toast--warning {
                    border-left: 1px solid rgba(245, 158, 11, 0.35);
                    border-right: 4px solid #f59e0b;
                }
                .gui-toast--warning .gui-toast-icon { color: #fbbf24; }

                .gui-toast--info {
                    border-left: 4px solid #38bdf8;
                    border-color: rgba(56, 189, 248, 0.3);
                    background: linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(17, 24, 39, 0.96) 100%);
                }
                [dir="rtl"] .gui-toast--info {
                    border-left: 1px solid rgba(56, 189, 248, 0.3);
                    border-right: 4px solid #38bdf8;
                }
                .gui-toast--info .gui-toast-icon { color: #38bdf8; }

                .gui-toast-icon {
                    flex-shrink: 0;
                    margin-top: 1px;
                }
                .gui-toast-content {
                    flex: 1;
                }
                .gui-toast-message {
                    font-size: 0.88rem;
                    font-weight: 600;
                    line-height: 1.45;
                    word-break: break-word;
                }
                .gui-toast-close {
                    background: transparent;
                    border: none;
                    padding: 3px;
                    color: #9ca3af;
                    border-radius: 6px;
                    flex-shrink: 0;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s ease;
                }
                .gui-toast-close:hover {
                    color: #fff;
                    background: rgba(255, 255, 255, 0.1);
                }

                @keyframes toastSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-12px) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                .animate-slide-in {
                    animation: toastSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>
            </ToastContext.Provider>
        </ConfirmContext.Provider>
    );
}
