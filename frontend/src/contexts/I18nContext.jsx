import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { en } from '../data/translations-en';
import { ar } from '../data/translations-ar';

const translations = { en, ar };
const I18nContext = createContext();

export function I18nProvider({ children }) {
    const [lang, setLangState] = useState(() => localStorage.getItem('thinktank_lang') || 'en');

    const setLang = useCallback((l) => {
        setLangState(l);
        localStorage.setItem('thinktank_lang', l);
        document.documentElement.setAttribute('dir', l === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', l);
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', lang);
    }, [lang]);

    const t = useCallback((key, vars = {}) => {
        const str = (translations[lang] || translations.en)[key] || key;
        return str.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
    }, [lang]);

    const dir = lang === 'ar' ? 'rtl' : 'ltr';

    return (
        <I18nContext.Provider value={{ t, lang, setLang, dir }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useI18n() {
    const ctx = useContext(I18nContext);
    if (!ctx) throw new Error('useI18n must be used within I18nProvider');
    return ctx;
}
