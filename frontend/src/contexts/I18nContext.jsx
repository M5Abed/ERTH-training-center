import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { en } from '../data/translations-en';

const I18nContext = createContext();

export function I18nProvider({ children }) {
    const [lang] = useState('en');

    const setLang = useCallback(() => {
        // Enforce English only
        localStorage.setItem('thinktank_lang', 'en');
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'en');
    }, []);

    useEffect(() => {
        localStorage.setItem('thinktank_lang', 'en');
        document.documentElement.setAttribute('dir', 'ltr');
        document.documentElement.setAttribute('lang', 'en');
    }, []);

    const t = useCallback((key, vars = {}) => {
        const str = en[key] || key;
        return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    }, []);

    return (
        <I18nContext.Provider value={{ t, lang: 'en', setLang, dir: 'ltr' }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used within I18nProvider');
    return ctx;
}
