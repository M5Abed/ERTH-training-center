import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        // Enforce light mode as default and migrate legacy dark cache
        const stored = localStorage.getItem('thinktank_theme_v2');
        if (!stored) {
            localStorage.setItem('thinktank_theme', 'light');
            localStorage.setItem('thinktank_theme_v2', 'light');
            return 'light';
        }
        return stored;
    });

    const setTheme = useCallback((newTheme) => {
        const val = typeof newTheme === 'function' ? newTheme(theme) : newTheme;
        setThemeState(val);
        document.documentElement.setAttribute('data-theme', val);
        localStorage.setItem('thinktank_theme', val);
        localStorage.setItem('thinktank_theme_v2', val);
    }, [theme]);

    const toggleTheme = useCallback(() => {
        setThemeState(prev => {
            const next = prev === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('thinktank_theme', next);
            localStorage.setItem('thinktank_theme_v2', next);
            return next;
        });
    }, []);

    useEffect(() => {
        const currentTheme = localStorage.getItem('thinktank_theme_v2') || 'light';
        document.documentElement.setAttribute('data-theme', currentTheme);
        setThemeState(currentTheme);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
