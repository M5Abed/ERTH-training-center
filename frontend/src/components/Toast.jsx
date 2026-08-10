import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
    return useContext(ToastContext);
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = 'info') => addToast(message, type), [addToast]);

    return (
        <ToastContext.Provider value={showToast}>
            {children}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast toast--${t.type}`}>
                        <span className="toast-icon">
                            {t.type === 'success' && <CheckCircle size={18} />}
                            {t.type === 'error' && <AlertCircle size={18} />}
                            {t.type === 'info' && <Info size={18} />}
                        </span>
                        <span className="toast-message">{t.message}</span>
                        <button className="toast-close" onClick={() => removeToast(t.id)}><X size={14} /></button>
                    </div>
                ))}
            </div>
            <style>{`
        .toast-container { position: fixed; top: 1rem; right: 1rem; z-index: 9999; display: flex; flex-direction: column; gap: 0.5rem; max-width: 400px; }
        [dir="rtl"] .toast-container { right: auto; left: 1rem; }
        .toast { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1rem; background: var(--card); border: 1px solid var(--border); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); animation: slideInRight 0.3s ease forwards; backdrop-filter: blur(12px); }
        .toast--success { border-color: rgba(16,185,129,0.3); }
        .toast--success .toast-icon { color: var(--primary); }
        .toast--error { border-color: rgba(251,113,133,0.3); }
        .toast--error .toast-icon { color: var(--rose); }
        .toast--info .toast-icon { color: var(--accent-l); }
        .toast-icon { flex-shrink: 0; }
        .toast-message { flex: 1; font-size: 0.8125rem; font-weight: 500; }
        .toast-close { padding: 2px; color: var(--muted); border-radius: 4px; flex-shrink: 0; }
        .toast-close:hover { color: var(--text); }
      `}</style>
        </ToastContext.Provider>
    );
}
