import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const setTheme = useCallback(() => {}, []);
    const toggleTheme = useCallback(() => {}, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('thinktank_theme', 'light');
    }, []);

    return (
        <ThemeContext.Provider value={{ theme: 'light', setTheme, toggleTheme, isDark: false }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
